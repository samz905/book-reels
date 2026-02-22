"""
Video generation via Seedance 1.5 Pro (Fast) on Atlas Cloud.

Async polling model: POST to generate → poll prediction_id → return video URL.
"""
import asyncio
import httpx
from typing import Optional

from ..config import ATLASCLOUD_API_KEY

SEEDANCE_MODEL = "bytedance/seedance-v1.5-pro/image-to-video-fast"
GENERATE_URL = "https://api.atlascloud.ai/api/v1/model/generateVideo"
POLL_URL_TEMPLATE = "https://api.atlascloud.ai/api/v1/model/prediction/{prediction_id}"

# Polling config
POLL_INTERVAL_SECONDS = 3
POLL_TIMEOUT_SECONDS = 600  # 10 minute timeout (Atlas Cloud can be slow during peak hours)


async def generate_video(
    prompt: str,
    image_url: str,
    duration: int = 8,
    aspect_ratio: str = "9:16",
    generate_audio: bool = True,
    resolution: str = "720p",
    heartbeat_callback: Optional[callable] = None,
    job_id: Optional[str] = None,
    generation_id: Optional[str] = None,
    scene_number: Optional[int] = None,
) -> dict:
    """Generate a video using Seedance 1.5 Pro (Fast) via Atlas Cloud.

    Args:
        prompt: Script/scene content describing what should happen
        image_url: Public URL of the first-frame image (storyboard image)
        duration: Video duration in seconds (4-12)
        aspect_ratio: Video aspect ratio (e.g. "9:16", "16:9")
        generate_audio: Whether to generate synchronized audio
        resolution: Video resolution (e.g. "720p")
        heartbeat_callback: Optional async callback to call every 30s during polling
                           (used to update job timestamps and prevent stale detection)
        job_id: Optional gen_job ID for persistence (enables restart recovery)
        generation_id: Optional generation ID (required for restart recovery)
        scene_number: Optional scene number (required for restart recovery)

    Returns:
        dict with video_url (str)
    """
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {ATLASCLOUD_API_KEY}",
    }

    body = {
        "model": SEEDANCE_MODEL,
        "prompt": prompt,
        "image": image_url,
        "duration": duration,
        "aspect_ratio": aspect_ratio,
        "camera_fixed": False,
        "generate_audio": generate_audio,
        "resolution": resolution,
        "seed": -1,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Step 1: Submit generation request
        print(f"[Seedance] Submitting video generation ({duration}s, {aspect_ratio})...")
        response = await client.post(GENERATE_URL, headers=headers, json=body)
        response.raise_for_status()
        result = response.json()

        prediction_id = result["data"]["id"]
        print(f"[Seedance] Prediction ID: {prediction_id}")

        # Persist prediction_id for restart recovery (bulletproof mode)
        if job_id and generation_id is not None and scene_number is not None:
            from ..supabase_client import async_update_gen_job
            await async_update_gen_job(
                job_id, "generating",
                result={
                    "prediction_id": prediction_id,
                    "generation_id": generation_id,
                    "scene_number": scene_number,
                    "polling": True,
                }
            )
            print(f"[Seedance] Persisted prediction for restart recovery")

        # Step 2: Poll for completion
        poll_url = POLL_URL_TEMPLATE.format(prediction_id=prediction_id)
        poll_headers = {"Authorization": f"Bearer {ATLASCLOUD_API_KEY}"}
        elapsed = 0
        last_heartbeat = 0

        while elapsed < POLL_TIMEOUT_SECONDS:
            await asyncio.sleep(POLL_INTERVAL_SECONDS)
            elapsed += POLL_INTERVAL_SECONDS

            poll_response = await client.get(poll_url, headers=poll_headers)
            poll_response.raise_for_status()
            poll_result = poll_response.json()

            status = poll_result["data"]["status"]

            if status in ("completed", "succeeded"):
                video_url = poll_result["data"]["outputs"][0]
                print(f"[Seedance] Video generated in ~{elapsed}s: {video_url[:80]}...")
                return {"video_url": video_url}

            if status == "failed":
                error_msg = poll_result["data"].get("error") or "Generation failed"
                raise Exception(f"Seedance generation failed: {error_msg}")

            # Heartbeat: update job timestamp every 30s to prevent stale detection
            if heartbeat_callback and elapsed - last_heartbeat >= 30:
                try:
                    await heartbeat_callback()
                    last_heartbeat = elapsed
                except Exception as e:
                    print(f"[Seedance] Heartbeat callback failed: {e}")

            # Still processing
            if elapsed % 15 == 0:
                print(f"[Seedance] Still generating... ({elapsed}s elapsed)")

    raise TimeoutError(f"Seedance generation timed out after {POLL_TIMEOUT_SECONDS}s")
