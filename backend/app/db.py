"""
SQLite persistence layer for Oddega.

Stores generation sessions and film job state so they survive
server restarts and page reloads.

Database location: backend/data/bookreels.db
"""
import os
import json
import aiosqlite
from datetime import datetime, timezone
from typing import Optional

# Database path — sibling to temp/
_DB_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
os.makedirs(_DB_DIR, exist_ok=True)
DB_PATH = os.path.join(_DB_DIR, "bookreels.db")

_db: Optional[aiosqlite.Connection] = None


async def get_db() -> aiosqlite.Connection:
    """Get or create the singleton DB connection."""
    global _db
    if _db is None:
        _db = await aiosqlite.connect(DB_PATH)
        _db.row_factory = aiosqlite.Row
        await _db.execute("PRAGMA journal_mode=WAL")
        await _db.execute("PRAGMA foreign_keys=ON")
    return _db


async def init_db():
    """Create tables and mark interrupted jobs on startup."""
    db = await get_db()

    await db.executescript("""
        CREATE TABLE IF NOT EXISTS generations (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL DEFAULT 'Untitled',
            style TEXT NOT NULL DEFAULT 'cinematic',
            status TEXT NOT NULL DEFAULT 'drafting',
            film_id TEXT,
            thumbnail_base64 TEXT,
            state_json TEXT NOT NULL DEFAULT '{}',
            cost_total REAL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS film_jobs (
            film_id TEXT PRIMARY KEY,
            generation_id TEXT,
            status TEXT NOT NULL,
            total_shots INTEGER NOT NULL,
            current_shot INTEGER DEFAULT 0,
            phase TEXT DEFAULT 'filming',
            completed_shots_json TEXT DEFAULT '[]',
            final_video_path TEXT,
            error_message TEXT,
            cost_scene_refs REAL DEFAULT 0,
            cost_videos REAL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (generation_id) REFERENCES generations(id)
        );
    """)

    # Mark any in-flight jobs as interrupted (server crashed mid-generation)
    await db.execute(
        "UPDATE film_jobs SET status='interrupted', updated_at=? WHERE status IN ('generating','assembling')",
        (_now(),),
    )
    await db.execute(
        """UPDATE generations SET status='interrupted', updated_at=?
           WHERE status='filming'
           AND film_id IN (SELECT film_id FROM film_jobs WHERE status='interrupted')""",
        (_now(),),
    )
    await db.commit()


async def close_db():
    """Close the DB connection on shutdown."""
    global _db
    if _db:
        await _db.close()
        _db = None


# ------------------------------------------------------------------
# Generations CRUD
# ------------------------------------------------------------------

async def create_generation(gen_id: str, title: str, style: str, state: dict) -> None:
    db = await get_db()
    now = _now()
    await db.execute(
        """INSERT INTO generations (id, title, style, status, state_json, created_at, updated_at)
           VALUES (?, ?, ?, 'drafting', ?, ?, ?)""",
        (gen_id, title, style, json.dumps(state), now, now),
    )
    await db.commit()


async def update_generation(gen_id: str, **kwargs) -> None:
    """Partial update — only set provided fields."""
    db = await get_db()
    allowed = {"title", "style", "status", "film_id", "thumbnail_base64", "state_json", "cost_total"}
    sets = []
    vals = []
    for k, v in kwargs.items():
        if k in allowed:
            if k == "state_json" and isinstance(v, dict):
                v = json.dumps(v)
            sets.append(f"{k}=?")
            vals.append(v)
    if not sets:
        return
    sets.append("updated_at=?")
    vals.append(_now())
    vals.append(gen_id)
    await db.execute(f"UPDATE generations SET {', '.join(sets)} WHERE id=?", vals)
    await db.commit()


async def get_generation(gen_id: str) -> Optional[dict]:
    db = await get_db()
    cursor = await db.execute("SELECT * FROM generations WHERE id=?", (gen_id,))
    row = await cursor.fetchone()
    if not row:
        return None
    d = dict(row)
    d["state"] = json.loads(d.pop("state_json"))
    return d


async def list_generations(limit: int = 50) -> list:
    """Return summaries (no state_json) ordered by most recent."""
    db = await get_db()
    cursor = await db.execute(
        """SELECT id, title, style, status, film_id, thumbnail_base64, cost_total, created_at, updated_at
           FROM generations ORDER BY updated_at DESC LIMIT ?""",
        (limit,),
    )
    rows = await cursor.fetchall()
    return [dict(r) for r in rows]


async def delete_generation(gen_id: str) -> None:
    db = await get_db()
    await db.execute("DELETE FROM film_jobs WHERE generation_id=?", (gen_id,))
    await db.execute("DELETE FROM generations WHERE id=?", (gen_id,))
    await db.commit()


# ------------------------------------------------------------------
# Film Jobs CRUD (write-through cache)
# ------------------------------------------------------------------

async def save_film_job(data: dict) -> None:
    """Upsert a film job row."""
    db = await get_db()
    now = _now()
    await db.execute(
        """INSERT INTO film_jobs
               (film_id, generation_id, status, total_shots, current_shot, phase,
                completed_shots_json, final_video_path, error_message,
                cost_scene_refs, cost_videos, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(film_id) DO UPDATE SET
               status=excluded.status,
               total_shots=excluded.total_shots,
               current_shot=excluded.current_shot,
               phase=excluded.phase,
               completed_shots_json=excluded.completed_shots_json,
               final_video_path=excluded.final_video_path,
               error_message=excluded.error_message,
               cost_scene_refs=excluded.cost_scene_refs,
               cost_videos=excluded.cost_videos,
               updated_at=excluded.updated_at""",
        (
            data["film_id"],
            data.get("generation_id"),
            data["status"],
            data["total_shots"],
            data.get("current_shot", 0),
            data.get("phase", "filming"),
            data.get("completed_shots_json", "[]"),
            data.get("final_video_path"),
            data.get("error_message"),
            data.get("cost_scene_refs", 0),
            data.get("cost_videos", 0),
            now,
            now,
        ),
    )
    await db.commit()


async def load_film_job(film_id: str) -> Optional[dict]:
    db = await get_db()
    cursor = await db.execute("SELECT * FROM film_jobs WHERE film_id=?", (film_id,))
    row = await cursor.fetchone()
    if not row:
        return None
    d = dict(row)
    d["completed_shots"] = json.loads(d.pop("completed_shots_json"))
    return d


async def load_all_active_film_jobs() -> list:
    """Load non-terminal film jobs for rehydration into memory on startup."""
    db = await get_db()
    cursor = await db.execute(
        "SELECT * FROM film_jobs WHERE status NOT IN ('ready', 'failed')"
    )
    rows = await cursor.fetchall()
    result = []
    for row in rows:
        d = dict(row)
        d["completed_shots"] = json.loads(d.pop("completed_shots_json"))
        result.append(d)
    return result


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()
