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

    Retries transient Supabase errors (connection resets, timeouts) up to 3×.
    """
    import time

    sb = get_supabase()
    if not sb:
        raise RuntimeError("Supabase not configured")

    last_err = None
    for attempt in range(4):  # up to 4 attempts
        try:
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
        except Exception as e:
            last_err = e
            if attempt < 3:
                delay = 1.0 * (2 ** attempt)
                print(f"[supabase] create_gen_job retry {attempt + 1}/3 in {delay}s: {e}")
                time.sleep(delay)

    raise last_err  # type: ignore[misc]


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

def _check_and_resume_or_fail_clips(clip_jobs: list):
    """Check Atlas Cloud for stale clip jobs - resume if completed, fail if not.

    Safety-first: Any errors → mark job as failed (current behavior).
    Timeouts: 5s per check to prevent startup hang.
    """
    import httpx
    from .config import ATLASCLOUD_API_KEY
    from .core.seedance import POLL_URL_TEMPLATE

    sb = get_supabase()
    if not sb:
        return

    for job in clip_jobs:
        job_id = job["id"]
        result = job.get("result", {})
        prediction_id = result.get("prediction_id")

        if not prediction_id:
            # No prediction_id - mark failed (defensive)
            try:
                sb.table("gen_jobs").update({
                    "status": "failed",
                    "error_message": "No prediction_id found for resume",
                    "updated_at": _now_iso(),
                }).eq("id", job_id).execute()
            except Exception:
                pass
            continue

        try:
            # Check Atlas Cloud status (5s timeout)
            poll_url = POLL_URL_TEMPLATE.format(prediction_id=prediction_id)
            headers = {"Authorization": f"Bearer {ATLASCLOUD_API_KEY}"}

            with httpx.Client(timeout=5.0) as client:
                response = client.get(poll_url, headers=headers)
                response.raise_for_status()
                atlas_result = response.json()

            status = atlas_result["data"]["status"]

            if status in ("completed", "succeeded"):
                # Video completed! Don't mark as failed - let resume handle it
                print(f"[startup] Clip {job_id[:8]} completed on Atlas - will resume")
                continue  # Leave as "generating" for resume_interrupted_videos()

            elif status == "failed":
                # Failed on Atlas - mark failed with Atlas error
                error = atlas_result["data"].get("error", "Generation failed on Atlas Cloud")
                sb.table("gen_jobs").update({
                    "status": "failed",
                    "error_message": f"Atlas Cloud: {error}",
                    "updated_at": _now_iso(),
                }).eq("id", job_id).execute()
                print(f"[startup] Clip {job_id[:8]} failed on Atlas")

            else:
                # Still generating on Atlas - mark failed (took too long, >5min stale)
                sb.table("gen_jobs").update({
                    "status": "failed",
                    "error_message": "Interrupted by server restart (still generating on Atlas after >5min)",
                    "updated_at": _now_iso(),
                }).eq("id", job_id).execute()
                print(f"[startup] Clip {job_id[:8]} still generating on Atlas - marking failed")

        except Exception as e:
            # Any error (timeout, network, etc) - mark failed (fail-safe)
            try:
                sb.table("gen_jobs").update({
                    "status": "failed",
                    "error_message": f"Interrupted by server restart (could not check Atlas: {str(e)[:100]})",
                    "updated_at": _now_iso(),
                }).eq("id", job_id).execute()
                print(f"[startup] Clip {job_id[:8]} Atlas check failed - marking failed: {e}")
            except Exception:
                pass  # Even error handling can't break startup


def mark_stale_jobs_failed(cutoff_minutes: int = 5):
    """Mark jobs stuck in 'generating' as failed (e.g. after server restart).

    For clip jobs with prediction_ids, checks Atlas Cloud first to see if they
    completed while server was down. This prevents losing completed videos.
    """
    sb = get_supabase()
    if not sb:
        return
    from datetime import timedelta

    cutoff = (datetime.now(timezone.utc) - timedelta(minutes=cutoff_minutes)).isoformat()

    # Get all stale jobs (for smart clip handling)
    stale_jobs_response = sb.table("gen_jobs").select("*").eq("status", "generating").lt("updated_at", cutoff).execute()
    stale_jobs = stale_jobs_response.data if stale_jobs_response.data else []

    if not stale_jobs:
        print(f"[startup] No stale gen_jobs (>{cutoff_minutes}min) found")
        return

    # Separate clip jobs (might have completed) from other jobs (mark failed immediately)
    clip_jobs_with_predictions = []
    jobs_to_fail = []

    for job in stale_jobs:
        if job.get("job_type") == "clip" and job.get("result") and "prediction_id" in job.get("result", {}):
            clip_jobs_with_predictions.append(job)
        else:
            jobs_to_fail.append(job["id"])

    # Mark non-clip jobs as failed immediately (current behavior)
    if jobs_to_fail:
        for job_id in jobs_to_fail:
            try:
                sb.table("gen_jobs").update({
                    "status": "failed",
                    "error_message": "Interrupted by server restart",
                    "updated_at": _now_iso(),
                }).eq("id", job_id).execute()
            except Exception as e:
                print(f"[startup] Warning: could not mark job {job_id[:8]} as failed: {e}")
        print(f"[startup] Marked {len(jobs_to_fail)} stale non-clip job(s) as failed")

    # Check clip jobs with Atlas Cloud (defensive - max 10 jobs, 5s timeout each)
    if clip_jobs_with_predictions:
        print(f"[startup] Checking {len(clip_jobs_with_predictions)} stale clip job(s) on Atlas Cloud...")
        _check_and_resume_or_fail_clips(clip_jobs_with_predictions[:10])  # Safety limit
