# Core utilities package
from .claude import generate_text_claude
from .imagen import generate_image, generate_image_with_references
from .seedance import generate_video as generate_video_seedance
from .ffmpeg import extract_frame, assemble_videos
from .costs import (
    CostSummary,
    estimate_story_cost,
    estimate_image_cost,
    estimate_video_cost,
    estimate_film_cost,
    COST_IMAGE_GENERATION,
    COST_VIDEO_SEEDANCE_FAST_PER_SECOND,
)

# All text generation uses Claude
generate_text = generate_text_claude

# Video generation uses Seedance (Atlas Cloud)
generate_video = generate_video_seedance


__all__ = [
    "generate_text",
    "generate_text_claude",
    "generate_image",
    "generate_image_with_references",
    "generate_video",
    "generate_video_seedance",
    "extract_frame",
    "assemble_videos",
    "CostSummary",
    "estimate_story_cost",
    "estimate_image_cost",
    "estimate_video_cost",
    "estimate_film_cost",
    "COST_IMAGE_GENERATION",
    "COST_VIDEO_SEEDANCE_FAST_PER_SECOND",
]
