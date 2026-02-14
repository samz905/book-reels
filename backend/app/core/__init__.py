# Core utilities package
from .gemini import generate_text as generate_text_gemini
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

# All text generation uses Gemini
generate_text = generate_text_gemini


__all__ = [
    "generate_text",
    "generate_text_gemini",
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
