"""
Shared Supabase client for Storage uploads and gen_jobs CRUD.
Used by the /jobs router and film generation.

Sync functions are kept for startup-only code (mark_stale_jobs_failed).
All hot-path functions have async_ variants that run in a thread pool
to avoid blocking the asyncio event loop.
"""
import asyncio
import base64
from datetime import datetime, timezone
from typing import Optional

from .config import SUPABASE_URL, SUPABASE_SERVICE_KEY, AI_ASSETS_BUCKET

_client = None


def get_supabase():
    """Get shared Supabase client (lazy init, singleton)."""
    global _client
    if _client is None and SUPABASE_URL and SUPABASE_SERVICE_KEY:
        from supabase import create_client
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return _client


def upload_asset(generation_id: str, path: str, data: bytes, mime: str) -> str:
    """Upload bytes to ai-assets bucket, return public URL."""
    sb = get_supabase()
    if not sb:
        raise RuntimeError("Supabase not configured")
    storage_path = f"{generation_id}/{path}"
    sb.storage.from_(AI_ASSETS_BUCKET).upload(
        storage_path, data,
        file_options={"content-type": mime, "upsert": "true"},
    )
    return sb.storage.from_(AI_ASSETS_BUCKET).get_public_url(storage_path)


def upload_image_base64(generation_id: str, path: str, b64: str, mime: str = "image/png") -> str:
    """Upload base64-encoded image, return public URL."""
    return upload_asset(generation_id, path, base64.b64decode(b64), mime)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_gen_job(
    generation_id: str,
    job_type: str,
    target_id: str = "",
) -> dict:
    """Create or upsert a gen_jobs row. Returns the row dict.

    If a job with the same (generation_id, job_type, target_id) is already
    "generating", returns it as-is with ``_already_generating=True`` so the
    caller can skip spawning a duplicate background task.
    """
    sb = get_supabase()
    if not sb:
        raise RuntimeError("Supabase not configured")

    # Check for an already-running job to prevent duplicate background tasks
    existing = (
        sb.table("gen_jobs")
        .select("*")
        .eq("generation_id", generation_id)
        .eq("job_type", job_type)
        .eq("target_id", target_id)
        .eq("status", "generating")
        .execute()
    )
    if existing.data:
        row = existing.data[0]
        row["_already_generating"] = True
        return row

    row = sb.table("gen_jobs").upsert(
        {
            "generation_id": generation_id,
            "job_type": job_type,
            "target_id": target_id,
            "status": "generating",
            "result": None,
            "error_message": None,
            "updated_at": _now_iso(),
        },
        on_conflict="generation_id,job_type,target_id",
    ).execute()
    return row.data[0]


def update_gen_job(
    job_id: str,
    status: str,
    result: Optional[dict] = None,
    error: Optional[str] = None,
):
    """Update a gen_jobs row (status, result, error)."""
    sb = get_supabase()
    if not sb:
        return
    update: dict = {"status": status, "updated_at": _now_iso()}
    if result is not None:
        update["result"] = result
    if error is not None:
        update["error_message"] = error
    sb.table("gen_jobs").update(update).eq("id", job_id).execute()


def touch_gen_job(job_id: str):
    """Touch a gen_jobs row (update updated_at timestamp only).

    Used as heartbeat during long-running operations like Seedance polling
    to prevent the job from appearing stale and getting auto-failed on restart.
    """
    sb = get_supabase()
    if not sb:
        return
    sb.table("gen_jobs").update({"updated_at": _now_iso()}).eq("id", job_id).execute()


# ============================================================
# Async wrappers — run sync Supabase calls in thread pool
# so the asyncio event loop is never blocked.
# ============================================================

async def async_create_gen_job(
    generation_id: str,
    job_type: str,
    target_id: str = "",
) -> dict:
    return await asyncio.to_thread(create_gen_job, generation_id, job_type, target_id)


async def async_update_gen_job(
    job_id: str,
    status: str,
    result: Optional[dict] = None,
    error: Optional[str] = None,
):
    await asyncio.to_thread(update_gen_job, job_id, status, result, error)


async def async_upload_asset(generation_id: str, path: str, data: bytes, mime: str) -> str:
    return await asyncio.to_thread(upload_asset, generation_id, path, data, mime)


async def async_upload_image_base64(generation_id: str, path: str, b64: str, mime: str = "image/png") -> str:
    return await asyncio.to_thread(upload_image_base64, generation_id, path, b64, mime)


async def async_touch_gen_job(job_id: str):
    """Async wrapper for touch_gen_job (heartbeat update)."""
    await asyncio.to_thread(touch_gen_job, job_id)


# ============================================================
# Startup-only (sync is fine — runs before event loop serves requests)
# ============================================================

def mark_stale_jobs_failed(cutoff_minutes: int = 5):
    """Mark jobs stuck in 'generating' as failed (e.g. after server restart)."""
    sb = get_supabase()
    if not sb:
        return
    from datetime import timedelta
    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=cutoff_minutes)).isoformat()
    sb.table("gen_jobs").update({
        "status": "failed",
        "error_message": "Interrupted by server restart",
        "updated_at": _now_iso(),
    }).eq("status", "generating").lt("updated_at", cutoff).execute()
    print(f"[startup] Marked stale gen_jobs (>{cutoff_minutes}min) as failed")
