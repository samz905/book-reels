"""
Cost tracking for AI operations.

Pricing (as of 2025):
- Claude Haiku 4.5: $0.80/1M input tokens, $4.00/1M output tokens
- Atlas Cloud Image (Nano Banana Pro Ultra): $0.15 per image
- Seedance 1.5 Pro Fast (Atlas Cloud): $0.022 per second
"""
from dataclasses import dataclass, field
from typing import List, Literal


# ============================================================
# Cost Constants (USD)
# ============================================================

# Text generation (Claude Haiku 4.5)
COST_TEXT_INPUT_PER_1M_TOKENS = 0.80
COST_TEXT_OUTPUT_PER_1M_TOKENS = 4.00

# Image generation — Google GenAI (Gemini 3 Pro Image Preview)
# OpenAI fallback (GPT Image 1.5): ~$0.04/image at medium quality
COST_IMAGE_GENERATION = 0.04

# Video generation — Seedance 1.5 Pro Fast (Atlas Cloud)
COST_VIDEO_SEEDANCE_FAST_PER_SECOND = 0.022

# Video generation (Veo 3.1) — deprecated, kept for reference
COST_VIDEO_VEO_FAST_PER_SECOND = 0.15
COST_VIDEO_VEO_STANDARD_PER_SECOND = 0.40

# Default video duration
VIDEO_DURATION_SECONDS = 8


# ============================================================
# Cost Tracking
# ============================================================

@dataclass
class CostItem:
    """A single cost item."""
    operation: str  # e.g., "story_generation", "character_image", "video_shot_1"
    model: str  # e.g., "gemini-2.0-flash", "veo-3.1-fast"
    cost_usd: float
    details: str = ""  # Optional details like "7 beats generated"


@dataclass
class CostSummary:
    """Summary of costs for a session."""
    items: List[CostItem] = field(default_factory=list)

    @property
    def total_usd(self) -> float:
        return sum(item.cost_usd for item in self.items)

    def add(self, operation: str, model: str, cost_usd: float, details: str = ""):
        self.items.append(CostItem(
            operation=operation,
            model=model,
            cost_usd=cost_usd,
            details=details,
        ))

    def to_dict(self) -> dict:
        return {
            "items": [
                {
                    "operation": item.operation,
                    "model": item.model,
                    "cost_usd": round(item.cost_usd, 4),
                    "details": item.details,
                }
                for item in self.items
            ],
            "total_usd": round(self.total_usd, 4),
        }


# ============================================================
# Cost Calculation Helpers
# ============================================================

def estimate_text_cost(input_tokens: int = 0, output_tokens: int = 0) -> float:
    """Estimate cost for text generation."""
    input_cost = (input_tokens / 1_000_000) * COST_TEXT_INPUT_PER_1M_TOKENS
    output_cost = (output_tokens / 1_000_000) * COST_TEXT_OUTPUT_PER_1M_TOKENS
    return input_cost + output_cost


def estimate_story_cost(num_beats: int) -> float:
    """Estimate cost for story generation.

    Typical story generation uses ~2000 input tokens (prompt + system)
    and ~1500-3000 output tokens depending on beat count.
    """
    # Rough estimates based on typical usage
    input_tokens = 2000
    output_tokens = 500 + (num_beats * 200)  # ~200 tokens per beat
    return estimate_text_cost(input_tokens, output_tokens)


def estimate_image_cost(num_images: int = 1) -> float:
    """Estimate cost for image generation."""
    return num_images * COST_IMAGE_GENERATION


def estimate_video_cost(
    duration_seconds: int = VIDEO_DURATION_SECONDS,
) -> float:
    """Estimate cost for video generation (Seedance 1.5 Pro Fast)."""
    return duration_seconds * COST_VIDEO_SEEDANCE_FAST_PER_SECOND


def estimate_film_cost(
    num_shots: int,
) -> dict:
    """Estimate total cost for film generation.

    Seedance uses existing storyboard images as first frames (no extra image cost).
    Returns breakdown of costs.
    """
    video_cost = num_shots * estimate_video_cost(VIDEO_DURATION_SECONDS)

    return {
        "videos": {
            "count": num_shots,
            "duration_each": VIDEO_DURATION_SECONDS,
            "cost_usd": round(video_cost, 4),
        },
        "total_usd": round(video_cost, 4),
    }
