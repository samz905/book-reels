# Core utilities package
from .gemini import generate_text as _generate_text_gemini
from .claude import generate_text_claude as _generate_text_claude
from .imagen import generate_image, generate_image_with_references
from .veo import generate_video
from .ffmpeg import extract_frame, assemble_videos
from .costs import (
    CostSummary,
    estimate_story_cost,
    estimate_image_cost,
    estimate_video_cost,
    estimate_film_cost,
    COST_IMAGE_GENERATION,
    COST_VIDEO_VEO_FAST_PER_SECOND,
)
from ..config import TEXT_PROVIDER
from typing import Optional


async def generate_text(
    prompt: str,
    system_prompt: Optional[str] = None,
    **kwargs,
) -> str:
    """Unified text generation — routes to Claude or Gemini based on TEXT_PROVIDER config."""
    if TEXT_PROVIDER == "claude":
        return await _generate_text_claude(prompt=prompt, system_prompt=system_prompt, **kwargs)
    else:
        return await _generate_text_gemini(prompt=prompt, system_prompt=system_prompt, **kwargs)


# Keep direct access available for cases that need a specific provider
generate_text_gemini = _generate_text_gemini
generate_text_claude = _generate_text_claude


__all__ = [
    "generate_text",
    "generate_text_gemini",
    "generate_text_claude",
    "generate_image",
    "generate_image_with_references",
    "generate_video",
    "extract_frame",
    "assemble_videos",
    "CostSummary",
    "estimate_story_cost",
    "estimate_image_cost",
    "estimate_video_cost",
    "estimate_film_cost",
    "COST_IMAGE_GENERATION",
    "COST_VIDEO_VEO_FAST_PER_SECOND",
]
