"""
Image generation utility using Google GenAI.
Uses Gemini's native image generation capabilities.
Supports reference images for character/scene consistency.
"""
import asyncio
import base64
import gc
import io
import os
import random
from typing import Literal, List, Optional
from PIL import Image
from google.genai import types
from ..config import genai_client


MAX_RETRIES = 2
RETRY_BASE_DELAY = 5  # seconds
PER_CALL_TIMEOUT = 90  # seconds — kills individual hung API calls

# Concurrent image generations. Default 8 fits comfortably in 2GB (8×20MB=160MB peak).
# Override via env var if instance size changes.
IMAGE_GEN_MAX_CONCURRENT = int(os.getenv("IMAGE_GEN_MAX_CONCURRENT", "8"))
_image_gen_semaphore: Optional[asyncio.Semaphore] = None


def _get_image_gen_semaphore() -> asyncio.Semaphore:
    """Lazy-init semaphore (must be created inside a running event loop)."""
    global _image_gen_semaphore
    if _image_gen_semaphore is None:
        _image_gen_semaphore = asyncio.Semaphore(IMAGE_GEN_MAX_CONCURRENT)
    return _image_gen_semaphore


async def _retry_on_resource_exhausted(fn, *args, **kwargs):
    """Retry a sync function with exponential backoff on 429 RESOURCE_EXHAUSTED errors.

    Each individual API call is wrapped in a 90s timeout so a hung HTTP
    connection can't block the semaphore slot (or the whole batch) forever.
    """
    for attempt in range(MAX_RETRIES + 1):
        try:
            return await asyncio.wait_for(
                asyncio.to_thread(fn, *args, **kwargs),
                timeout=PER_CALL_TIMEOUT,
            )
        except asyncio.TimeoutError:
            if attempt < MAX_RETRIES:
                print(f"  API call timed out after {PER_CALL_TIMEOUT}s. Retrying... (attempt {attempt + 1}/{MAX_RETRIES})")
                continue
            raise TimeoutError(f"Image generation timed out after {MAX_RETRIES + 1} attempts ({PER_CALL_TIMEOUT}s each)")
        except Exception as e:
            error_str = str(e)
            is_retryable = ("429" in error_str or "RESOURCE_EXHAUSTED" in error_str
                            or "503" in error_str or "UNAVAILABLE" in error_str)
            if is_retryable:
                if attempt < MAX_RETRIES:
                    delay = RETRY_BASE_DELAY * (2 ** attempt)
                    jitter = delay * random.uniform(-0.3, 0.3)
                    delay = max(1, delay + jitter)
                    print(f"  Transient error. Retrying in {delay:.1f}s... (attempt {attempt + 1}/{MAX_RETRIES})")
                    await asyncio.sleep(delay)
                    continue
            raise


async def generate_image(
    prompt: str,
    aspect_ratio: Literal["9:16", "16:9", "1:1", "4:3", "3:4"] = "9:16",
    model: str = "gemini-3-pro-image-preview",
) -> dict:
    """
    Generate an image using Gemini's image generation capabilities.

    Args:
        prompt: Text description of the image to generate
        aspect_ratio: Aspect ratio hint for the image
        model: Model to use for generation

    Returns:
        dict with:
          - image_base64: Base64 encoded image data
          - mime_type: Image MIME type
    """
    sem = _get_image_gen_semaphore()
    async with sem:
        # Build the prompt with aspect ratio guidance
        full_prompt = f"Generate a high quality image: {prompt}"
        if aspect_ratio == "9:16":
            full_prompt += " The image should be in portrait orientation (taller than wide)."
        elif aspect_ratio == "16:9":
            full_prompt += " The image should be in landscape orientation (wider than tall)."

        # Use Gemini with image generation capability (with retry on 429)
        response = await _retry_on_resource_exhausted(
            genai_client.models.generate_content,
            model=model,
            contents=full_prompt,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE", "TEXT"],
            )
        )

        # Extract image from response
        if not response.candidates or not response.candidates[0].content or not response.candidates[0].content.parts:
            raise ValueError("Image generation returned empty response — the prompt may have been blocked by safety filters. Try rephrasing the description.")
        for part in response.candidates[0].content.parts:
            if hasattr(part, 'inline_data') and part.inline_data is not None:
                image_data = part.inline_data
                if hasattr(image_data, 'data') and image_data.data:
                    image_bytes = image_data.data
                    image_base64 = base64.b64encode(image_bytes).decode("utf-8")
                    return {
                        "image_base64": image_base64,
                        "mime_type": getattr(image_data, 'mime_type', 'image/png') or "image/png",
                    }

        # If no image in response, raise error
        raise ValueError(
            "No image was generated. The model may have returned text only. "
            f"Response parts: {[type(p).__name__ for p in response.candidates[0].content.parts]}"
        )


def _base64_to_pil(base64_str: str, mime_type: str = "image/png") -> Image.Image:
    """Convert base64 string to PIL Image."""
    image_bytes = base64.b64decode(base64_str)
    return Image.open(io.BytesIO(image_bytes))


async def generate_image_with_references(
    prompt: str,
    reference_images: List[dict],  # List of {"image_base64": str, "mime_type": str}
    aspect_ratio: Literal["9:16", "16:9", "1:1", "4:3", "3:4", "5:4", "4:5", "2:3", "3:2"] = "9:16",
    resolution: Literal["1K", "2K", "4K"] = "2K",
    model: str = "gemini-3-pro-image-preview",
) -> dict:
    """
    Generate an image using reference images for consistency.
    Uses Gemini 3 Pro Preview which supports up to 14 reference images:
    - Up to 5 human images for character consistency
    - Up to 6 object images for scene consistency

    Concurrency-limited by semaphore to prevent OOM on memory-constrained
    instances (each call holds multiple uncompressed PIL Images).

    Args:
        prompt: Text description of the image to generate
        reference_images: List of dicts with image_base64 and mime_type
        aspect_ratio: Output aspect ratio
        resolution: Output resolution (1K, 2K, or 4K)
        model: Model to use (gemini-3-pro-image-preview)

    Returns:
        dict with:
          - image_base64: Base64 encoded image data
          - mime_type: Image MIME type
    """
    sem = _get_image_gen_semaphore()
    async with sem:
        # Build contents list: prompt first, then reference images
        contents = [prompt]
        pil_images = []  # Track for explicit cleanup

        try:
            # Add reference images as PIL Images
            for ref in reference_images:
                try:
                    pil_image = _base64_to_pil(ref["image_base64"], ref.get("mime_type", "image/png"))
                    pil_images.append(pil_image)
                    contents.append(pil_image)
                except Exception as e:
                    print(f"Warning: Could not load reference image: {e}")
                    continue

            print(f"Generating with {len(contents) - 1} reference images...")

            # Generate with reference images (with retry on 429)
            response = await _retry_on_resource_exhausted(
                genai_client.models.generate_content,
                model=model,
                contents=contents,
                config=types.GenerateContentConfig(
                    response_modalities=["TEXT", "IMAGE"],
                    image_config=types.ImageConfig(
                        aspect_ratio=aspect_ratio,
                        image_size=resolution,
                    ),
                )
            )

            # Extract image from response
            if not response.candidates or not response.candidates[0].content or not response.candidates[0].content.parts:
                raise ValueError("Image generation returned empty response — the prompt may have been blocked by safety filters. Try rephrasing the description.")
            for part in response.candidates[0].content.parts:
                if hasattr(part, 'inline_data') and part.inline_data is not None:
                    image_data = part.inline_data
                    if hasattr(image_data, 'data') and image_data.data:
                        image_bytes = image_data.data
                        image_base64 = base64.b64encode(image_bytes).decode("utf-8")
                        return {
                            "image_base64": image_base64,
                            "mime_type": getattr(image_data, 'mime_type', 'image/png') or "image/png",
                        }
                # Also check for as_image() method (newer API)
                if hasattr(part, 'as_image'):
                    try:
                        pil_img = part.as_image()
                        if pil_img:
                            # Convert PIL back to base64
                            buffer = io.BytesIO()
                            pil_img.save(buffer, format="PNG")
                            image_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
                            return {
                                "image_base64": image_base64,
                                "mime_type": "image/png",
                            }
                    except Exception:
                        pass

            # If no image in response, raise error
            raise ValueError(
                "No image was generated. The model may have returned text only. "
                f"Response parts: {[type(p).__name__ for p in response.candidates[0].content.parts]}"
            )
        finally:
            # Explicitly close PIL images and free memory
            for img in pil_images:
                try:
                    img.close()
                except Exception:
                    pass
            del contents, pil_images
            gc.collect()
