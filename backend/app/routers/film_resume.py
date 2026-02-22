"""
Restart recovery for interrupted Seedance video generations.

When the server restarts mid-generation, this module:
1. Finds clip jobs that were "generating" when the server stopped
2. Resumes polling Atlas Cloud for their prediction_ids
3. Completes the full download → upload → job completion flow

Called automatically on startup via lifespan in main.py.
"""
import asyncio
import httpx
import uuid
from typing import Optional

from ..config import ATLASCLOUD_API_KEY
from ..core.seedance import POLL_URL_TEMPLATE, POLL_TIMEOUT_SECONDS
from ..supabase_client import get_supabase, async_update_gen_job, async_touch_gen_job


async def resume_interrupted_videos():
    """Resume polling for video generations interrupted by server restart.

    Finds all "generating" clip jobs with prediction_ids and resumes polling.
    Only resumes jobs that are <5min old (fresh jobs that haven't been marked stale).
    """
    sb = get_supabase()
    if not sb:
        print("[startup] Supabase not configured - skip video resume")
        return

    # Find clip jobs that were generating when server restarted
    jobs = sb.table("gen_jobs").select("*").eq("status", "generating").eq("job_type", "clip").execute()

    if not jobs.data:
        print("[startup] No interrupted clip jobs to resume")
        return

    resumed_count = 0
    for job in jobs.data:
        result = job.get("result")
        if not result or "prediction_id" not in result:
            continue  # No prediction_id to resume

        # Validate required metadata
        prediction_id = result.get("prediction_id")
        generation_id = result.get("generation_id")
        scene_number = result.get("scene_number")

        if not all([prediction_id, generation_id, scene_number]):
            print(f"[startup] Skip job {job['id'][:8]} - missing metadata")
            continue

        job_id = job["id"]
        print(f"[startup] Resuming clip gen: {job_id[:8]} (scene {scene_number}, prediction {prediction_id[:16]})")

        # Resume polling in background
        asyncio.create_task(
            resume_clip_polling(
                job_id=job_id,
                prediction_id=prediction_id,
                generation_id=generation_id,
                scene_number=scene_number,
            )
        )
        resumed_count += 1

    print(f"[startup] Resumed {resumed_count} interrupted video generation(s)")


async def resume_clip_polling(
    job_id: str,
    prediction_id: str,
    generation_id: str,
    scene_number: int,
):
    """Poll Atlas Cloud for a prediction_id and complete the full video flow.

    Flow: Poll → Download → Upload to Storage → Update job with Storage URL

    This completes the exact same steps as normal clip generation, ensuring
    the video ends up in Supabase Storage (not just Atlas Cloud temp URL).
    """
    from .film import download_video, COST_PER_VIDEO

    poll_url = POLL_URL_TEMPLATE.format(prediction_id=prediction_id)
    headers = {"Authorization": f"Bearer {ATLASCLOUD_API_KEY}"}

    # Heartbeat callback
    async def heartbeat():
        await async_touch_gen_job(job_id)

    elapsed = 0
    last_heartbeat = 0

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            while elapsed < POLL_TIMEOUT_SECONDS:
                await asyncio.sleep(3)
                elapsed += 3

                response = await client.get(poll_url, headers=headers)
                response.raise_for_status()
                result = response.json()

                status = result["data"]["status"]

                if status in ("completed", "succeeded"):
                    atlas_url = result["data"]["outputs"][0]
                    print(f"[resume] Video completed on Atlas: {atlas_url[:80]}")

                    # Download + upload to Storage (same as normal clip generation)
                    clip_id = uuid.uuid4().hex[:12]
                    video_path, storage_url = await download_video(
                        atlas_url,
                        clip_id,
                        scene_number,
                        generation_id=generation_id,
                    )

                    print(f"[resume] Uploaded to Storage: {storage_url[:80]}")

                    # Mark job as completed with Storage URL (permanent)
                    await async_update_gen_job(
                        job_id, "completed",
                        result={
                            "video_url": storage_url,
                            "cost": COST_PER_VIDEO,
                        }
                    )
                    print(f"[resume] Job {job_id[:8]} completed successfully")
                    return

                if status == "failed":
                    error = result["data"].get("error", "Generation failed")
                    print(f"[resume] Job {job_id[:8]} failed: {error}")
                    await async_update_gen_job(job_id, "failed", error=error)
                    return

                # Heartbeat every 30s
                if elapsed - last_heartbeat >= 30:
                    await heartbeat()
                    last_heartbeat = elapsed

                # Progress log every 15s
                if elapsed % 15 == 0:
                    print(f"[resume] Still polling {job_id[:8]}... ({elapsed}s elapsed)")

    except Exception as e:
        print(f"[resume] Polling failed for {job_id[:8]}: {e}")
        await async_update_gen_job(job_id, "failed", error=f"Resume polling failed: {str(e)}")
