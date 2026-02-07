"""
Video generation utility using Veo via Google GenAI.
Supports dual-anchoring: first_frame (temporal continuity) + reference_images (subject consistency).
"""
import asyncio
import time
import base64
from typing import Optional, List, Dict
from ..config import genai_client


async def generate_video(
    prompt: str,
    first_frame: Optional[Dict[str, str]] = None,  # {"image_base64": ..., "mime_type": ...}
    reference_images: Optional[List[Dict[str, str]]] = None,  # List of {"image_base64": ..., "mime_type": ...}
    duration_seconds: int = 8,
    aspect_ratio: str = "9:16",
    model: str = "veo-3.1-generate-preview",
    poll_interval: int = 10,
) -> dict:
    """
    Generate a video using Veo.

    IMPORTANT: first_frame and reference_images are MUTUALLY EXCLUSIVE.
    Veo 3.1 cannot use both simultaneously. If both are provided,
    reference_images takes precedence and first_frame is ignored.

    Args:
        prompt: Text description of the video to generate
        first_frame: Optional dict for temporal continuity (frame chaining)
        reference_images: Optional list of dicts for subject consistency (max 3)
        duration_seconds: Video duration in seconds (default: 8)
        aspect_ratio: Video aspect ratio (default: 9:16)
        model: The Veo model to use
        poll_interval: Seconds between status polls

    Returns:
        dict with:
          - video_url: URL to download the generated video
          - duration: Video duration in seconds
    """
    from google.genai import types

    # Mutual exclusivity: reference_images takes precedence over first_frame
    if first_frame and reference_images:
        print("WARNING: first_frame and reference_images are mutually exclusive in Veo. Using reference_images only.")
        first_frame = None

    # Build GenerateVideosConfig
    config_kwargs = {
        "aspect_ratio": aspect_ratio,
        "duration_seconds": duration_seconds,
    }

    # Add reference images for subject consistency (protagonist, antagonist, environment)
    if reference_images:
        veo_refs = []
        for ref in reference_images:
            img_bytes = base64.b64decode(ref["image_base64"])
            veo_refs.append(
                types.VideoGenerationReferenceImage(
                    image=types.Image(
                        image_bytes=img_bytes,
                        mime_type=ref.get("mime_type", "image/png"),
                    ),
                    reference_type="ASSET",
                )
            )
        config_kwargs["reference_images"] = veo_refs
        print(f"  Passing {len(veo_refs)} reference images for subject consistency")

    request_kwargs = {
        "model": model,
        "prompt": prompt,
        "config": types.GenerateVideosConfig(**config_kwargs),
    }

    # Add first frame if provided (for temporal continuity / frame chaining)
    if first_frame:
        image_bytes = base64.b64decode(first_frame["image_base64"])
        request_kwargs["image"] = types.Image(
            image_bytes=image_bytes,
            mime_type=first_frame.get("mime_type", "image/png"),
        )

    # Start video generation
    print(f"Starting video generation with model {model}...")
    operation = genai_client.models.generate_videos(**request_kwargs)

    # Poll until complete (use asyncio.sleep to not block the event loop)
    while not operation.done:
        print(f"Video generation in progress... (polling every {poll_interval}s)")
        await asyncio.sleep(poll_interval)
        operation = genai_client.operations.get(operation)

    # Get the generated video
    if not operation.response or not operation.response.generated_videos:
        raise ValueError(
            f"Video generation returned no results. "
            f"Response: {operation.response}"
        )

    generated_video = operation.response.generated_videos[0]
    video_file = generated_video.video

    if not video_file or not video_file.uri:
        raise ValueError(
            f"Video generation returned no video file. "
            f"Generated video: {generated_video}"
        )

    video_url = video_file.uri

    print(f"Video generated successfully: {video_url}")

    return {
        "video_url": video_url,
        "duration": duration_seconds,
        "mime_type": getattr(video_file, 'mime_type', 'video/mp4') or "video/mp4",
    }
