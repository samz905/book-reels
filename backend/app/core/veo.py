"""
Video generation utility using Veo via Google GenAI.
"""
import time
import base64
from typing import Optional, List
from ..config import genai_client


async def generate_video(
    prompt: str,
    first_frame: Optional[str] = None,  # Base64 encoded image
    reference_images: Optional[List[str]] = None,  # List of base64 encoded images
    duration_seconds: int = 8,
    aspect_ratio: str = "9:16",
    model: str = "veo-3.1-generate-preview",
    poll_interval: int = 10,
) -> dict:
    """
    Generate a video using Veo.

    Args:
        prompt: Text description of the video to generate
        first_frame: Optional base64 encoded image to use as first frame (for frame chaining)
        reference_images: Optional list of base64 encoded reference images (for consistency)
        duration_seconds: Video duration in seconds (default: 8)
        aspect_ratio: Video aspect ratio (default: 9:16)
        model: The Veo model to use
        poll_interval: Seconds between status polls

    Returns:
        dict with:
          - video_url: URL to download the generated video
          - duration: Video duration in seconds
    """
    # Build request kwargs
    request_kwargs = {
        "model": model,
        "prompt": prompt,
    }

    # Add first frame if provided (for frame chaining)
    if first_frame:
        from google.genai import types
        # Decode base64 to bytes
        image_bytes = base64.b64decode(first_frame)
        request_kwargs["image"] = types.Image(
            image_bytes=image_bytes,
        )

    # Start video generation
    print(f"Starting video generation with model {model}...")
    operation = genai_client.models.generate_videos(**request_kwargs)

    # Poll until complete
    while not operation.done:
        print(f"Video generation in progress... (polling every {poll_interval}s)")
        time.sleep(poll_interval)
        operation = genai_client.operations.get(operation)

    # Get the generated video
    generated_video = operation.response.generated_videos[0]
    video_file = generated_video.video

    # Get the download URL
    video_url = video_file.uri

    print(f"Video generated successfully: {video_url}")

    return {
        "video_url": video_url,
        "duration": duration_seconds,
        "mime_type": getattr(video_file, 'mime_type', 'video/mp4') or "video/mp4",
    }
