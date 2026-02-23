"""
Image generation via Atlas Cloud (Nano Banana Pro / Gemini 3 Pro Image Preview).

Supports:
- T2I (text-to-image, no references)
- Reference-based generation (character/scene consistency)
- Image editing via text feedback

Pricing: $0.15 per image (Ultra tier)
"""
import asyncio
import os
import random
import uuid
from typing import Literal, List, Optional

import httpx

from ..config import ATLASCLOUD_API_KEY
from ..supabase_client import async_upload_image_base64


# ============================================================
# Atlas Cloud Image API
# ============================================================

ATLAS_IMAGE_URL = "https://api.atlascloud.ai/api/v1/model/generateImage"
T2I_MODEL = "google/nano-banana-pro/text-to-image-ultra"
EDIT_MODEL = "google/nano-banana-pro/edit-ultra"

# Retry config
MAX_RETRIES = 4  # 5 total attempts
RETRY_BASE_DELAY = 5  # seconds — base for exponential backoff
POST_TIMEOUT = 15  # seconds — POST returns instantly (just submits the job)
POLL_INTERVAL = 3  # seconds between poll requests
POLL_TIMEOUT = 300  # seconds (5 min) — Ultra tier can be slow

_RETRYABLE_STATUS = {429, 500, 502, 503, 504}

POLL_URL_TEMPLATE = "https://api.atlascloud.ai/api/v1/model/prediction/{prediction_id}"

# Rate limiting: enforces both concurrency and images-per-minute (IPM).
# Atlas Cloud is far more resilient than direct Gemini — higher defaults.
IMAGE_GEN_MAX_CONCURRENT = int(os.getenv("IMAGE_GEN_MAX_CONCURRENT", "8"))
IMAGE_GEN_IPM = int(os.getenv("IMAGE_GEN_IPM", "60"))


# ============================================================
# Rate Limiter
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
# Helpers
# ============================================================

async def _ensure_ref_url(ref: dict) -> str:
    """Ensure a reference image dict has a public URL.

    If only base64 is available, upload to Supabase Storage and return the URL.
    """
    url = ref.get("image_url")
    if url:
        return url
    b64 = ref.get("image_base64")
    if b64:
        path = f"temp/{uuid.uuid4().hex}.png"
        return await async_upload_image_base64(
            "_refs", path, b64, ref.get("mime_type", "image/png"),
        )
    raise ValueError("Reference image has neither image_url nor image_base64")


def _extract_image(data: dict) -> Optional[dict]:
    """Extract base64 image from Atlas Cloud response data.

    Atlas Cloud response format (verified):
      data.outputs: list — URLs or base64 strings depending on enable_base64_output
      data.status: "completed" | "succeeded" | "starting" | "processing" | "failed"

    Returns dict with image_base64/mime_type, or None if no image found.
    """
    outputs = data.get("outputs")
    if not outputs or not isinstance(outputs, list):
        return None

    b64 = outputs[0]
    if not isinstance(b64, str) or not b64:
        return None

    # Strip data URI prefix if present (data:image/png;base64,...)
    if b64.startswith("data:"):
        b64 = b64.split(",", 1)[1]

    # If it looks like a URL (not base64), we need to download it
    if b64.startswith("http"):
        return {"image_url_to_fetch": b64}

    return {"image_base64": b64, "mime_type": "image/png"}


async def _atlas_image_request(payload: dict) -> dict:
    """POST to Atlas Cloud image API. Handles both sync and async (polling) modes.

    Sync mode (enable_sync_mode=true): POST blocks until image ready, returns in <2s.
    Async fallback: POST returns prediction_id, poll until complete.

    Returns dict with image_base64 and mime_type.
    """
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {ATLASCLOUD_API_KEY}",
    }

    for attempt in range(MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=POST_TIMEOUT) as client:
                print(f"  [imagen] POST to Atlas Cloud (attempt {attempt + 1}/{MAX_RETRIES + 1})...")
                resp = await client.post(
                    ATLAS_IMAGE_URL, headers=headers, json=payload,
                )

                # Retry on transient HTTP errors
                if resp.status_code in _RETRYABLE_STATUS and attempt < MAX_RETRIES:
                    delay = RETRY_BASE_DELAY * (2 ** attempt) + random.uniform(0, 2)
                    print(
                        f"  [imagen] HTTP {resp.status_code} — "
                        f"retry {attempt + 1}/{MAX_RETRIES} in {delay:.1f}s"
                    )
                    await asyncio.sleep(delay)
                    continue

                resp.raise_for_status()
                result = resp.json()
                data = result.get("data", result)

                print(f"  [imagen] Response status={data.get('status')}, "
                      f"has_outputs={bool(data.get('outputs'))}, id={data.get('id', 'N/A')}")

                # ── Sync path: outputs already present ──
                extracted = _extract_image(data)
                if extracted and "image_base64" in extracted:
                    return extracted
                if extracted and "image_url_to_fetch" in extracted:
                    # enable_base64_output was false or ignored — download the URL
                    img_resp = await client.get(extracted["image_url_to_fetch"], timeout=30)
                    img_resp.raise_for_status()
                    import base64
                    b64 = base64.b64encode(img_resp.content).decode()
                    return {"image_base64": b64, "mime_type": "image/png"}

                # ── Async path: need to poll ──
                prediction_id = data.get("id")
                if not prediction_id:
                    print(f"  [imagen] No outputs and no prediction_id. Full keys: {list(data.keys())}")
                    raise ValueError(f"Unexpected Atlas Cloud response: {list(data.keys())}")

                print(f"  [imagen] Got prediction_id={prediction_id}, polling...")
                return await _poll_prediction(client, prediction_id)

        except httpx.TimeoutException:
            if attempt < MAX_RETRIES:
                print(f"  [imagen] Timeout ({POST_TIMEOUT}s) — retry {attempt + 1}/{MAX_RETRIES}")
                await asyncio.sleep(RETRY_BASE_DELAY)
                continue
            raise TimeoutError(
                f"Image generation timed out after {MAX_RETRIES + 1} attempts "
                f"({POST_TIMEOUT}s each)"
            )

    raise RuntimeError("Image generation failed after all retries")


async def _poll_prediction(client: httpx.AsyncClient, prediction_id: str) -> dict:
    """Poll Atlas Cloud for prediction completion. Same pattern as Seedance."""
    poll_url = POLL_URL_TEMPLATE.format(prediction_id=prediction_id)
    poll_headers = {"Authorization": f"Bearer {ATLASCLOUD_API_KEY}"}
    elapsed = 0

    while elapsed < POLL_TIMEOUT:
        await asyncio.sleep(POLL_INTERVAL)
        elapsed += POLL_INTERVAL

        poll_resp = await client.get(poll_url, headers=poll_headers, timeout=15)
        poll_resp.raise_for_status()
        poll_data = poll_resp.json().get("data", poll_resp.json())

        status = poll_data.get("status", "")

        if status in ("completed", "succeeded"):
            extracted = _extract_image(poll_data)
            if extracted and "image_base64" in extracted:
                print(f"  [imagen] Image ready in ~{elapsed}s")
                return extracted
            if extracted and "image_url_to_fetch" in extracted:
                import base64
                img_resp = await client.get(extracted["image_url_to_fetch"], timeout=30)
                img_resp.raise_for_status()
                b64 = base64.b64encode(img_resp.content).decode()
                print(f"  [imagen] Image ready in ~{elapsed}s (downloaded from URL)")
                return {"image_base64": b64, "mime_type": "image/png"}
            raise ValueError(f"Prediction completed but no outputs: {list(poll_data.keys())}")

        if status == "failed":
            error_msg = poll_data.get("error") or "Image generation failed"
            raise Exception(f"Atlas Cloud image generation failed: {error_msg}")

        if elapsed % 10 == 0:
            print(f"  [imagen] Still generating... ({elapsed}s, status={status})")

    raise TimeoutError(f"Image generation polling timed out after {POLL_TIMEOUT}s")


# ============================================================
# Public API
# ============================================================

async def generate_image(
    prompt: str,
    aspect_ratio: Literal["9:16", "16:9", "1:1", "4:3", "3:4", "5:4", "4:5", "2:3", "3:2"] = "9:16",
    model: str = T2I_MODEL,
) -> dict:
    """Generate an image (text-to-image, no references).

    Args:
        prompt: Text description of the image to generate
        aspect_ratio: Aspect ratio hint for the image
        model: Atlas Cloud model ID

    Returns:
        dict with image_base64 and mime_type
    """
    async with _get_rate_limiter():
        full_prompt = f"Generate a high quality image: {prompt}"
        if aspect_ratio == "9:16":
            full_prompt += " The image should be in portrait orientation (taller than wide)."
        elif aspect_ratio == "16:9":
            full_prompt += " The image should be in landscape orientation (wider than tall)."

        payload = {
            "model": model,
            "prompt": full_prompt,
            "enable_base64_output": True,
        }

        return await _atlas_image_request(payload)


async def generate_image_with_references(
    prompt: str,
    reference_images: List[dict],  # List of {"image_base64": str, "mime_type": str} and/or {"image_url": str}
    aspect_ratio: Literal["9:16", "16:9", "1:1", "4:3", "3:4", "5:4", "4:5", "2:3", "3:2"] = "9:16",
    resolution: Literal["1K", "2K", "4K"] = "2K",
    model: str = EDIT_MODEL,
) -> dict:
    """Generate an image using reference images for consistency.

    Uses Atlas Cloud Edit endpoint which accepts 1-10 reference image URLs.

    Args:
        prompt: Text description of the image to generate
        reference_images: List of dicts with image_base64/image_url and mime_type
        aspect_ratio: Output aspect ratio (passed as prompt hint)
        resolution: Output resolution hint
        model: Atlas Cloud model ID

    Returns:
        dict with image_base64 and mime_type
    """
    # Resolve refs to URLs BEFORE acquiring rate limiter (uploads may take time)
    image_urls = await asyncio.gather(
        *[_ensure_ref_url(ref) for ref in reference_images],
        return_exceptions=True,
    )
    # Filter out failures, log errors
    for i, u in enumerate(image_urls):
        if isinstance(u, Exception):
            print(f"  [imagen] Ref {i} failed: {u}")
    valid_urls = [u for u in image_urls if isinstance(u, str)]
    if not valid_urls:
        print("[imagen] No valid reference URLs — falling back to T2I")
        return await generate_image(prompt, aspect_ratio)

    print(f"[imagen] Generating with {len(valid_urls)} reference URLs...")

    async with _get_rate_limiter():
        payload = {
            "model": model,
            "prompt": prompt,
            "images": valid_urls[:10],  # Atlas Cloud limit: 10 images
            "enable_base64_output": True,
        }

        return await _atlas_image_request(payload)


async def edit_image(
    current_image_url: str,
    feedback: str,
) -> dict:
    """Edit an existing image via text feedback.

    Uses Atlas Cloud Edit endpoint with the current image as reference.

    Args:
        current_image_url: Public URL of the image to edit
        feedback: Text description of the desired edit

    Returns:
        dict with image_base64 and mime_type
    """
    async with _get_rate_limiter():
        payload = {
            "model": EDIT_MODEL,
            "prompt": feedback,
            "images": [current_image_url],
            "enable_base64_output": True,
        }

        return await _atlas_image_request(payload)
