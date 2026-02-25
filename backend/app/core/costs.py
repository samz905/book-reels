"""
Cost tracking for AI operations.

Pricing (as of 2026):
- Claude Sonnet 4.5: $3.00/1M input tokens, $15.00/1M output tokens
- Google Gemini 2.5 Flash Image: $0.30/1M input, $30.00/1M output (~$0.039/img)
- OpenAI GPT Image 1.5: $5.00/1M input, $10.00/1M output tokens
- Seedance 1.5 Pro Fast (Atlas Cloud): $0.022 per second
"""
from dataclasses import dataclass, field
from typing import List, Literal


# ============================================================
# Cost Constants (USD)
# ============================================================

# Text generation (Claude Sonnet 4.5)
COST_TEXT_INPUT_PER_1M_TOKENS = 3.00
COST_TEXT_OUTPUT_PER_1M_TOKENS = 15.00

# Image generation — Google Gemini 2.5 Flash Image (primary)
# $0.039/image (1290 output tokens at $30/1M)
# Used as pre-generation estimate only; actual cost comes from calculate_image_cost()
COST_IMAGE_GENERATION = 0.039

# Google Gemini 2.5 Flash Image token pricing (primary)
GOOGLE_IMAGE_INPUT_PER_1M = 0.30
GOOGLE_IMAGE_OUTPUT_PER_1M = 30.00

# OpenAI GPT Image 1.5 token pricing (fallback)
OPENAI_IMAGE_INPUT_PER_1M = 5.00
OPENAI_IMAGE_OUTPUT_PER_1M = 10.00

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
    """Estimate cost for image generation (pre-generation estimate)."""
    return num_images * COST_IMAGE_GENERATION


def calculate_image_cost(usage: dict) -> float:
    """Calculate actual cost from API token usage.

    Args:
        usage: dict with 'provider', 'input_tokens', 'output_tokens'

    Returns:
        Cost in USD
    """
    provider = usage.get("provider", "openai")
    input_tokens = usage.get("input_tokens", 0) or 0
    output_tokens = usage.get("output_tokens", 0) or 0

    if provider == "openai":
        return (input_tokens * OPENAI_IMAGE_INPUT_PER_1M / 1_000_000 +
                output_tokens * OPENAI_IMAGE_OUTPUT_PER_1M / 1_000_000)
    elif provider == "google":
        return (input_tokens * GOOGLE_IMAGE_INPUT_PER_1M / 1_000_000 +
                output_tokens * GOOGLE_IMAGE_OUTPUT_PER_1M / 1_000_000)
    return 0.0


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
