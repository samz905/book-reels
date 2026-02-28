"""
Image generation via Google GenAI (Gemini 2.5 Flash Image).

Single provider, zero retries, zero fallback.
45s timeout — fail fast, user retries via UI.

OpenAI helpers kept as dead code for potential future fallback.

Public API:
  generate_image(prompt, aspect_ratio) -> {"image_base64", "mime_type", "usage"}
  generate_image_with_references(prompt, refs, ...) -> {"image_base64", "mime_type", "usage"}
  edit_image(current_image_url, feedback) -> {"image_base64", "mime_type", "usage"}
"""
import asyncio
import base64
import contextvars
import gc
import io
import os
from typing import Awaitable, Callable, Literal, List, Optional

import httpx
from PIL import Image
from google.genai import types

from ..config import genai_client, OPENAI_API_KEY
from .costs import calculate_image_cost


# ============================================================
# ContextVar — lets the job system inject a callback without
# threading on_start through 12+ moodboard functions.
# Set by jobs.py run_job(), consumed once by _google_generate().
# ============================================================

_on_start_ctx: contextvars.ContextVar[Optional[Callable[[], Awaitable[None]]]] = contextvars.ContextVar(
    "_on_start_ctx", default=None
)


def set_on_generation_start(callback: Optional[Callable[[], Awaitable[None]]]) -> None:
    """Set a callback to fire when the rate-limiter slot is acquired.

    Used by the job system to transition gen_jobs from "queued" to "generating"
    at the honest moment — after the semaphore is acquired, before the API call.
    The callback fires once, then is cleared automatically.
    """
    _on_start_ctx.set(callback)


# ============================================================
# Models & Config
# ============================================================

GENAI_IMAGE_MODEL = "gemini-2.5-flash-image"  # Nano Banana — stable prod model
GOOGLE_CALL_TIMEOUT = 45  # ~25-35s avg, 45s covers P99

# OpenAI — kept for future fallback, not used in any public function
OPENAI_MODEL = "gpt-5-mini"
PER_CALL_TIMEOUT = 60

# Rate limiting for Google
IMAGE_GEN_MAX_CONCURRENT = int(os.getenv("IMAGE_GEN_MAX_CONCURRENT", "4"))
IMAGE_GEN_IPM = int(os.getenv("IMAGE_GEN_IPM", "10"))

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


# ============================================================
# Rate Limiter
# ============================================================

class _ImageRateLimiter:
    """Enforces concurrency + images-per-minute.

    Supports an ``on_acquired`` callback that fires right after the semaphore
    slot is obtained — used by the job system to transition gen_jobs from
    "queued" to "generating" at the honest moment.
    """

    def __init__(self, max_concurrent: int, ipm: int):
        self._sem = asyncio.Semaphore(max_concurrent)
        self._interval = 60.0 / max(ipm, 1)
        self._last_call = 0.0
        self._lock = asyncio.Lock()

    async def acquire(
        self, on_acquired: Optional[Callable[[], Awaitable[None]]] = None,
    ) -> None:
        """Acquire a rate-limiter slot, enforce IPM, call *on_acquired*."""
        await self._sem.acquire()
        if on_acquired:
            try:
                await on_acquired()
            except Exception:
                pass  # never let callback failure affect generation
        async with self._lock:
            now = asyncio.get_event_loop().time()
            wait = self._interval - (now - self._last_call)
            if wait > 0:
                await asyncio.sleep(wait)
            self._last_call = asyncio.get_event_loop().time()

    def release(self) -> None:
        self._sem.release()

    # Keep context-manager protocol for callers that don't need on_acquired
    async def __aenter__(self):
        await self.acquire()
        return self

    async def __aexit__(self, *exc):
        self.release()


_rate_limiter: Optional[_ImageRateLimiter] = None


def _get_rate_limiter() -> _ImageRateLimiter:
    global _rate_limiter
    if _rate_limiter is None:
        _rate_limiter = _ImageRateLimiter(IMAGE_GEN_MAX_CONCURRENT, IMAGE_GEN_IPM)
        print(f"[imagen] Rate limiter: {IMAGE_GEN_MAX_CONCURRENT} concurrent, {IMAGE_GEN_IPM} IPM")
    return _rate_limiter


# ============================================================
# Helpers
# ============================================================

def _b64_to_pil(b64: str, mime_type: str = "image/png") -> Image.Image:
    return Image.open(io.BytesIO(base64.b64decode(b64)))


def _extract_genai_image(response) -> dict:
    """Extract base64 image + usage from Google GenAI response."""
    if (not response.candidates or not response.candidates[0].content
            or not response.candidates[0].content.parts):
        raise ValueError(
            "Image generation returned empty response — "
            "the prompt may have been blocked by safety filters."
        )

    image_result = None
    for part in response.candidates[0].content.parts:
        if hasattr(part, "inline_data") and part.inline_data is not None:
            data = part.inline_data
            if hasattr(data, "data") and data.data:
                b64 = base64.b64encode(data.data).decode("utf-8")
                mime = getattr(data, "mime_type", "image/png") or "image/png"
                image_result = {"image_base64": b64, "mime_type": mime}
                break

    if not image_result:
        for part in response.candidates[0].content.parts:
            try:
                pil_img = part.as_image()
                if pil_img:
                    buf = io.BytesIO()
                    pil_img.save(buf, format="PNG")
                    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
                    image_result = {"image_base64": b64, "mime_type": "image/png"}
                    break
            except Exception:
                pass

    if not image_result:
        raise ValueError(
            "No image in response. Parts: "
            f"{[type(p).__name__ for p in response.candidates[0].content.parts]}"
        )

    usage: dict = {"provider": "google", "model": GENAI_IMAGE_MODEL}
    if hasattr(response, "usage_metadata") and response.usage_metadata:
        um = response.usage_metadata
        usage["input_tokens"] = getattr(um, "prompt_token_count", 0) or 0
        usage["output_tokens"] = getattr(um, "candidates_token_count", 0) or 0
        usage["total_tokens"] = getattr(um, "total_token_count", 0) or 0
    usage["cost_usd"] = calculate_image_cost(usage)
    image_result["usage"] = usage
    return image_result


# ============================================================
# OpenAI helpers (dead code — kept for future fallback)
# ============================================================

_openai_client = None


def _get_openai_client():
    global _openai_client
    if _openai_client is None and OPENAI_API_KEY:
        from openai import AsyncOpenAI
        _openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)
    return _openai_client


def _image_tool(size: str = "1024x1536", quality: str = "medium",
                input_fidelity: Optional[str] = None) -> dict:
    tool: dict = {
        "type": "image_generation",
        "quality": quality,
        "size": size,
        "moderation": "low",
    }
    if input_fidelity:
        tool["input_fidelity"] = input_fidelity
    return tool


def _extract_responses_image(response) -> tuple:
    for output in response.output:
        if output.type == "image_generation_call":
            usage: dict = {"provider": "openai", "model": OPENAI_MODEL}
            if hasattr(response, "usage") and response.usage:
                u = response.usage
                usage["input_tokens"] = getattr(u, "input_tokens", 0) or 0
                usage["output_tokens"] = getattr(u, "output_tokens", 0) or 0
                usage["total_tokens"] = getattr(u, "total_tokens", 0) or 0
            usage["cost_usd"] = calculate_image_cost(usage)
            return output.result, usage
    raise ValueError("No image in response — prompt may have been blocked")


def _ref_to_input_image(ref: dict) -> Optional[dict]:
    url = ref.get("image_url")
    if url:
        return {"type": "input_image", "image_url": url}
    b64 = ref.get("image_base64")
    if b64:
        mime = ref.get("mime_type", "image/png")
        return {"type": "input_image", "image_url": f"data:{mime};base64,{b64}"}
    return None


# ============================================================
# Core Google GenAI call
# ============================================================

async def _google_generate(
    contents: list,
    aspect_ratio: str = "9:16",
    image_size: str = "2K",
    on_start: Optional[Callable[[], Awaitable[None]]] = None,
) -> dict:
    """Google GenAI — runs under rate limiter, 45s timeout.

    *on_start* fires right after the rate-limiter slot is acquired, before the
    actual API call.  Used by the job system to mark gen_jobs "generating".

    If no explicit *on_start* is passed, falls back to the contextvar set by
    ``set_on_generation_start()`` (consumed once, then cleared).
    """
    if not genai_client:
        raise ValueError("Google GenAI client not configured (GOOGLE_API_KEY missing)")

    # Resolve callback: explicit param > contextvar > None
    effective_on_start = on_start
    if effective_on_start is None:
        effective_on_start = _on_start_ctx.get(None)
        if effective_on_start is not None:
            _on_start_ctx.set(None)  # consume — fire once per job

    config = types.GenerateContentConfig(
        response_modalities=["IMAGE"],
        image_config=types.ImageConfig(
            aspect_ratio=aspect_ratio,
            image_size=image_size,
        ),
    )

    rl = _get_rate_limiter()
    await rl.acquire(on_acquired=effective_on_start)
    try:
        response = await asyncio.wait_for(
            asyncio.to_thread(
                genai_client.models.generate_content,
                model=GENAI_IMAGE_MODEL,
                contents=contents,
                config=config,
            ),
            timeout=GOOGLE_CALL_TIMEOUT,
        )
        return _extract_genai_image(response)
    finally:
        rl.release()


# ============================================================
# Public API
# ============================================================

async def generate_image(
    prompt: str,
    aspect_ratio: Literal["9:16", "16:9", "1:1", "4:3", "3:4", "5:4", "4:5", "2:3", "3:2"] = "9:16",
    model: Optional[str] = None,
    on_start: Optional[Callable[[], Awaitable[None]]] = None,
) -> dict:
    """Generate an image (text-to-image, no references).

    Google GenAI only. Zero retries, zero fallback.
    *on_start* fires when the rate-limiter slot is acquired.
    """
    full_prompt = f"Generate a high quality image: {prompt}"
    if aspect_ratio == "9:16":
        full_prompt += " The image MUST be in true portrait orientation (taller than wide, 9:16 aspect ratio). Do NOT rotate a landscape image. Do NOT add white padding or letterboxing. Compose the content natively for portrait format."
    elif aspect_ratio == "16:9":
        full_prompt += " The image should be in landscape orientation (wider than tall)."

    result = await _google_generate(
        contents=[full_prompt],
        aspect_ratio=aspect_ratio,
        on_start=on_start,
    )
    usage = result.get("usage", {})
    print(f"  [imagen] T2I ({usage.get('total_tokens', '?')} tokens, ${usage.get('cost_usd', 0):.4f})")
    return result


async def generate_image_with_references(
    prompt: str,
    reference_images: List[dict],
    aspect_ratio: Literal["9:16", "16:9", "1:1", "4:3", "3:4", "5:4", "4:5", "2:3", "3:2"] = "9:16",
    resolution: Literal["1K", "2K", "4K"] = "2K",
    model: Optional[str] = None,
    on_start: Optional[Callable[[], Awaitable[None]]] = None,
) -> dict:
    """Generate an image using reference images for style consistency.

    Google GenAI only. Zero retries, zero fallback.
    *on_start* fires when the rate-limiter slot is acquired.
    """
    if not reference_images:
        print("[imagen] No reference images — falling back to T2I")
        return await generate_image(prompt, aspect_ratio, on_start=on_start)

    print(f"[imagen] Generating with {len(reference_images)} reference images...")

    pil_images: List[Image.Image] = []
    try:
        for ref in reference_images:
            b64 = ref.get("image_base64")
            if b64:
                try:
                    pil_images.append(_b64_to_pil(b64, ref.get("mime_type", "image/png")))
                except Exception:
                    pass
            elif ref.get("image_url"):
                try:
                    async with httpx.AsyncClient() as http_client:
                        resp = await http_client.get(ref["image_url"], timeout=30)
                        resp.raise_for_status()
                        pil_images.append(Image.open(io.BytesIO(resp.content)))
                except Exception:
                    pass

        if not pil_images:
            print("[imagen] No valid reference images — falling back to T2I")
            return await generate_image(prompt, aspect_ratio)

        final_prompt = prompt
        if aspect_ratio == "9:16":
            final_prompt += " The image MUST be in true portrait orientation (taller than wide). Do NOT rotate a landscape image or add padding."
        contents = [final_prompt] + pil_images[:14]
        result = await _google_generate(
            contents=contents,
            aspect_ratio=aspect_ratio,
            image_size=resolution,
            on_start=on_start,
        )
        usage = result.get("usage", {})
        print(f"  [imagen] Ref-based ({usage.get('total_tokens', '?')} tokens, ${usage.get('cost_usd', 0):.4f})")
        return result

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
    on_start: Optional[Callable[[], Awaitable[None]]] = None,
) -> dict:
    """Edit an existing image via text feedback.

    Google GenAI only. Zero retries, zero fallback.
    Downloads image, sends PIL + edit prompt.
    *on_start* fires when the rate-limiter slot is acquired.
    """
    edit_prompt = f"Edit this image: {feedback}"

    pil_image = None
    try:
        async with httpx.AsyncClient() as http_client:
            resp = await http_client.get(current_image_url, timeout=30)
            resp.raise_for_status()
            pil_image = Image.open(io.BytesIO(resp.content))

        result = await _google_generate(
            contents=[edit_prompt, pil_image],
            aspect_ratio="9:16",
            on_start=on_start,
        )
        usage = result.get("usage", {})
        print(f"  [imagen] Edit ({usage.get('total_tokens', '?')} tokens, ${usage.get('cost_usd', 0):.4f})")
        return result

    finally:
        if pil_image:
            try:
                pil_image.close()
            except Exception:
                pass
