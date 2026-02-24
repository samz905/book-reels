"""
Image generation via Google GenAI SDK (primary) + OpenAI GPT Image (fallback).

Primary: Gemini 3 Pro Image Preview — T2I, reference-based generation, editing
Fallback: GPT Image 1.5 — triggered only on transient Google errors (503/429/UNAVAILABLE)

Public API (unchanged):
  generate_image(prompt, aspect_ratio, model) -> {"image_base64", "mime_type"}
  generate_image_with_references(prompt, refs, ...) -> {"image_base64", "mime_type"}
  edit_image(current_image_url, feedback) -> {"image_base64", "mime_type"}
"""
import asyncio
import base64
import gc
import io
import os
import random
from typing import Literal, List, Optional

import httpx
from PIL import Image
from google.genai import types

from ..config import genai_client, OPENAI_API_KEY


# ============================================================
# Models & Config
# ============================================================

GENAI_IMAGE_MODEL = "gemini-3-pro-image-preview"

MAX_RETRIES = 3       # 4 total attempts before fallback
RETRY_BASE_DELAY = 5  # seconds — base for exponential backoff
PER_CALL_TIMEOUT = 60  # seconds — healthy calls return in 3-10s

# Transient error strings that trigger retry + OpenAI fallback
_TRANSIENT_MARKERS = ("429", "503", "500", "502", "504",
                      "UNAVAILABLE", "RESOURCE_EXHAUSTED",
                      "DEADLINE_EXCEEDED", "INTERNAL", "timed out")

# Rate limiting — confirmed Google GenAI image IPM limits:
#   Free: 2 IPM | Tier 1 (paid): 20 IPM | Tier 2: 100 IPM
# Defaults target Tier 1 with safety margin. Override via env vars.
IMAGE_GEN_MAX_CONCURRENT = int(os.getenv("IMAGE_GEN_MAX_CONCURRENT", "4"))
IMAGE_GEN_IPM = int(os.getenv("IMAGE_GEN_IPM", "10"))


# ============================================================
# Rate Limiter (unchanged)
# ============================================================

class _ImageRateLimiter:
    """Enforces concurrency + images-per-minute across all callers.

    Semaphore caps how many API calls are in-flight simultaneously.
    The IPM pacing ensures calls are spaced at least (60/IPM) seconds apart,
    preventing bursts that trigger throttling.
    """

    def __init__(self, max_concurrent: int, ipm: int):
        self._sem = asyncio.Semaphore(max_concurrent)
        self._interval = 60.0 / max(ipm, 1)
        self._last_call = 0.0
        self._lock = asyncio.Lock()

    async def __aenter__(self):
        await self._sem.acquire()
        async with self._lock:
            now = asyncio.get_event_loop().time()
            wait = self._interval - (now - self._last_call)
            if wait > 0:
                await asyncio.sleep(wait)
            self._last_call = asyncio.get_event_loop().time()
        return self

    async def __aexit__(self, *exc):
        self._sem.release()


_rate_limiter: Optional[_ImageRateLimiter] = None


def _get_rate_limiter() -> _ImageRateLimiter:
    """Lazy-init rate limiter (must be created inside a running event loop)."""
    global _rate_limiter
    if _rate_limiter is None:
        _rate_limiter = _ImageRateLimiter(IMAGE_GEN_MAX_CONCURRENT, IMAGE_GEN_IPM)
        print(f"[imagen] Rate limiter: {IMAGE_GEN_MAX_CONCURRENT} concurrent, {IMAGE_GEN_IPM} IPM")
    return _rate_limiter


# ============================================================
# Google GenAI Helpers
# ============================================================

def _b64_to_pil(b64: str, mime_type: str = "image/png") -> Image.Image:
    """Convert base64 string to PIL Image for Google GenAI SDK."""
    return Image.open(io.BytesIO(base64.b64decode(b64)))


def _is_transient(error: Exception) -> bool:
    """Check if an error is transient (should trigger retry/fallback)."""
    error_str = str(error).upper()
    return any(t in error_str for t in _TRANSIENT_MARKERS)


def _extract_genai_image(response) -> dict:
    """Extract base64 image from Google GenAI generate_content response."""
    if (not response.candidates or not response.candidates[0].content
            or not response.candidates[0].content.parts):
        raise ValueError(
            "Image generation returned empty response — "
            "the prompt may have been blocked by safety filters."
        )

    for part in response.candidates[0].content.parts:
        if hasattr(part, "inline_data") and part.inline_data is not None:
            data = part.inline_data
            if hasattr(data, "data") and data.data:
                b64 = base64.b64encode(data.data).decode("utf-8")
                mime = getattr(data, "mime_type", "image/png") or "image/png"
                return {"image_base64": b64, "mime_type": mime}

    # Fallback: try part.as_image() which returns PIL Image
    for part in response.candidates[0].content.parts:
        try:
            pil_img = part.as_image()
            if pil_img:
                buf = io.BytesIO()
                pil_img.save(buf, format="PNG")
                b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
                return {"image_base64": b64, "mime_type": "image/png"}
        except Exception:
            pass

    raise ValueError(
        "No image in response. Parts: "
        f"{[type(p).__name__ for p in response.candidates[0].content.parts]}"
    )


# ============================================================
# OpenAI Fallback
# ============================================================

_openai_client = None


def _get_openai_client():
    """Lazy-init async OpenAI client. Returns None if no API key."""
    global _openai_client
    if _openai_client is None and OPENAI_API_KEY:
        from openai import AsyncOpenAI
        _openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    return _openai_client


_OPENAI_SIZE_MAP = {
    "9:16": "1024x1536",
    "3:4": "1024x1536",
    "2:3": "1024x1536",
    "4:5": "1024x1536",
    "16:9": "1536x1024",
    "4:3": "1536x1024",
    "3:2": "1536x1024",
    "5:4": "1536x1024",
    "1:1": "1024x1024",
}


def _aspect_to_openai_size(aspect_ratio: str) -> str:
    return _OPENAI_SIZE_MAP.get(aspect_ratio, "1024x1024")


async def _openai_generate(prompt: str, aspect_ratio: str = "9:16") -> dict:
    """Generate image via OpenAI GPT Image 1.5."""
    client = _get_openai_client()
    if not client:
        raise RuntimeError("OpenAI fallback unavailable (no OPENAI_API_KEY)")

    result = await client.images.generate(
        model="gpt-image-1.5",
        prompt=prompt,
        n=1,
        size=_aspect_to_openai_size(aspect_ratio),
        quality="medium",
    )

    return {"image_base64": result.data[0].b64_json, "mime_type": "image/png"}


async def _openai_edit(image_b64: str, feedback: str) -> dict:
    """Edit image via OpenAI GPT Image 1.5."""
    client = _get_openai_client()
    if not client:
        raise RuntimeError("OpenAI fallback unavailable (no OPENAI_API_KEY)")

    img_file = io.BytesIO(base64.b64decode(image_b64))
    img_file.name = "image.png"

    result = await client.images.edit(
        model="gpt-image-1.5",
        image=img_file,
        prompt=feedback,
        n=1,
        size="1024x1536",
        quality="medium",
    )

    return {"image_base64": result.data[0].b64_json, "mime_type": "image/png"}


# ============================================================
# Core: GenAI call with retry + OpenAI fallback
# ============================================================

async def _genai_generate_content(
    contents: list,
    aspect_ratio: str = "9:16",
    image_size: str = "2K",
    model: str = GENAI_IMAGE_MODEL,
    fallback_prompt: Optional[str] = None,
) -> dict:
    """Call Google GenAI generate_content with IMAGE modality.

    Retries on transient errors, then falls back to OpenAI GPT Image.
    """
    config = types.GenerateContentConfig(
        response_modalities=["IMAGE"],
        image_config=types.ImageConfig(
            aspect_ratio=aspect_ratio,
            image_size=image_size,
        ),
    )

    last_error = None
    for attempt in range(MAX_RETRIES + 1):
        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    genai_client.models.generate_content,
                    model=model,
                    contents=contents,
                    config=config,
                ),
                timeout=PER_CALL_TIMEOUT,
            )
            return _extract_genai_image(response)

        except asyncio.TimeoutError:
            last_error = TimeoutError(
                f"Google image gen timed out after {PER_CALL_TIMEOUT}s"
            )
            if attempt < MAX_RETRIES:
                print(f"  [imagen] Timeout. Retry {attempt + 1}/{MAX_RETRIES}...")
                continue

        except Exception as e:
            last_error = e
            if _is_transient(e) and attempt < MAX_RETRIES:
                delay = RETRY_BASE_DELAY * (2 ** attempt) + random.uniform(0, 2)
                print(f"  [imagen] Transient error: {e}")
                print(f"  [imagen] Retry {attempt + 1}/{MAX_RETRIES} in {delay:.1f}s")
                await asyncio.sleep(delay)
                continue
            break  # Non-transient or final attempt

    # OpenAI fallback (only for transient errors)
    if _is_transient(last_error) and fallback_prompt and _get_openai_client():
        try:
            print(f"  [imagen] Google failed, falling back to OpenAI: {last_error}")
            result = await _openai_generate(fallback_prompt, aspect_ratio)
            print("  [imagen] OpenAI fallback succeeded")
            return result
        except Exception as openai_err:
            print(f"  [imagen] OpenAI fallback also failed: {openai_err}")

    raise last_error


# ============================================================
# Public API
# ============================================================

async def generate_image(
    prompt: str,
    aspect_ratio: Literal["9:16", "16:9", "1:1", "4:3", "3:4", "5:4", "4:5", "2:3", "3:2"] = "9:16",
    model: str = GENAI_IMAGE_MODEL,
) -> dict:
    """Generate an image (text-to-image, no references).

    Returns:
        dict with image_base64 and mime_type
    """
    async with _get_rate_limiter():
        full_prompt = f"Generate a high quality image: {prompt}"
        if aspect_ratio == "9:16":
            full_prompt += " The image should be in portrait orientation (taller than wide)."
        elif aspect_ratio == "16:9":
            full_prompt += " The image should be in landscape orientation (wider than tall)."

        return await _genai_generate_content(
            contents=[full_prompt],
            aspect_ratio=aspect_ratio,
            model=model,
            fallback_prompt=full_prompt,
        )


async def generate_image_with_references(
    prompt: str,
    reference_images: List[dict],
    aspect_ratio: Literal["9:16", "16:9", "1:1", "4:3", "3:4", "5:4", "4:5", "2:3", "3:2"] = "9:16",
    resolution: Literal["1K", "2K", "4K"] = "2K",
    model: str = GENAI_IMAGE_MODEL,
) -> dict:
    """Generate an image using reference images for consistency.

    Google GenAI accepts PIL Images inline in the contents list (up to 14).
    ApprovedVisuals.resolve_urls() ensures refs have base64 before this is called.

    Returns:
        dict with image_base64 and mime_type
    """
    # Convert ref dicts to PIL Images
    pil_images = []
    for ref in reference_images:
        b64 = ref.get("image_base64")
        if b64:
            try:
                pil_images.append(_b64_to_pil(b64, ref.get("mime_type", "image/png")))
            except Exception as e:
                print(f"  [imagen] Failed to decode ref image: {e}")
        elif ref.get("image_url"):
            try:
                async with httpx.AsyncClient() as client:
                    resp = await client.get(ref["image_url"], timeout=30)
                    resp.raise_for_status()
                    pil_images.append(Image.open(io.BytesIO(resp.content)))
            except Exception as e:
                print(f"  [imagen] Failed to fetch ref from URL: {e}")

    if not pil_images:
        print("[imagen] No valid reference images — falling back to T2I")
        return await generate_image(prompt, aspect_ratio)

    print(f"[imagen] Generating with {len(pil_images)} reference images...")

    try:
        async with _get_rate_limiter():
            contents = [prompt] + pil_images[:14]

            return await _genai_generate_content(
                contents=contents,
                aspect_ratio=aspect_ratio,
                image_size=resolution,
                model=model,
                fallback_prompt=prompt,
            )
    finally:
        for img in pil_images:
            try:
                img.close()
            except Exception:
                pass
        del pil_images
        gc.collect()


async def edit_image(
    current_image_url: str,
    feedback: str,
) -> dict:
    """Edit an existing image via text feedback.

    Downloads the image from URL, passes it to Google GenAI with the edit prompt.
    Falls back to OpenAI images.edit() on transient errors.

    Returns:
        dict with image_base64 and mime_type
    """
    # Download the current image
    async with httpx.AsyncClient() as client:
        resp = await client.get(current_image_url, timeout=30)
        resp.raise_for_status()
        img_bytes = resp.content

    pil_image = Image.open(io.BytesIO(img_bytes))
    image_b64 = base64.b64encode(img_bytes).decode("utf-8")

    try:
        async with _get_rate_limiter():
            edit_prompt = f"Edit this image: {feedback}"
            config = types.GenerateContentConfig(
                response_modalities=["IMAGE"],
            )

            last_error = None
            for attempt in range(MAX_RETRIES + 1):
                try:
                    response = await asyncio.wait_for(
                        asyncio.to_thread(
                            genai_client.models.generate_content,
                            model=GENAI_IMAGE_MODEL,
                            contents=[edit_prompt, pil_image],
                            config=config,
                        ),
                        timeout=PER_CALL_TIMEOUT,
                    )
                    return _extract_genai_image(response)

                except asyncio.TimeoutError:
                    last_error = TimeoutError(
                        f"Google image edit timed out after {PER_CALL_TIMEOUT}s"
                    )
                    if attempt < MAX_RETRIES:
                        print(f"  [imagen] Edit timeout. Retry {attempt + 1}/{MAX_RETRIES}...")
                        continue

                except Exception as e:
                    last_error = e
                    if _is_transient(e) and attempt < MAX_RETRIES:
                        delay = RETRY_BASE_DELAY * (2 ** attempt) + random.uniform(0, 2)
                        print(f"  [imagen] Edit transient error: {e}")
                        print(f"  [imagen] Retry {attempt + 1}/{MAX_RETRIES} in {delay:.1f}s")
                        await asyncio.sleep(delay)
                        continue
                    break

            # OpenAI fallback for editing
            if _is_transient(last_error) and _get_openai_client():
                try:
                    print(f"  [imagen] Google edit failed, falling back to OpenAI: {last_error}")
                    result = await _openai_edit(image_b64, feedback)
                    print("  [imagen] OpenAI edit fallback succeeded")
                    return result
                except Exception as openai_err:
                    print(f"  [imagen] OpenAI edit fallback also failed: {openai_err}")

            raise last_error
    finally:
        try:
            pil_image.close()
        except Exception:
            pass
