"""
Standalone asset image generation for Creator Dashboard.
Generates character and location images without needing full Story context.
"""
import base64
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx

from ..core import generate_image, generate_image_with_references, COST_IMAGE_GENERATION

router = APIRouter()


def _friendly_image_error(raw: str) -> str:
    """Convert raw API error strings to user-friendly messages."""
    upper = raw.upper()
    if "UNAVAILABLE" in upper or "503" in upper:
        return "The image model is temporarily overloaded. Please try again in a minute."
    if "RESOURCE_EXHAUSTED" in upper or "429" in upper:
        return "Rate limit reached. Please wait a moment and try again."
    if "SAFETY" in upper or "BLOCK" in upper:
        return "Image was blocked by safety filters. Try adjusting the description."
    if "EMPTY RESPONSE" in upper:
        return "Image generation returned nothing — the prompt may have been blocked. Try rephrasing."
    return "Image generation failed. Please try again."


# ============================================================
# Visual Style Prefixes (4 styles)
# ============================================================

STYLE_PREFIXES = {
    "cinematic": (
        "Cinematic still, photorealistic, shot on 35mm film, "
        "shallow depth of field, natural lighting, film grain, "
        "professional cinematography"
    ),
    "anime": (
        "Studio Ghibli anime style, warm watercolor aesthetic, "
        "soft lighting, detailed expressive eyes, lush painted backgrounds, "
        "Miyazaki-inspired, gentle cel-shading"
    ),
    "animated": (
        "2D animated, illustrated style, hand-drawn aesthetic, "
        "bold outlines, stylized, expressive, graphic shapes, "
        "flat lighting with soft shadows"
    ),
    "pixar": (
        "3D animated, Pixar-style rendering, stylized realism, "
        "expressive features, vibrant colors, clean lighting, appealing design"
    ),
}


# ============================================================
# Request/Response Models
# ============================================================

class ReferenceImage(BaseModel):
    image_base64: Optional[str] = None
    image_url: Optional[str] = None
    mime_type: str


async def resolve_ref_base64(ref: ReferenceImage) -> str:
    """Return base64 for a ReferenceImage, fetching from URL if needed."""
    if ref.image_base64:
        return ref.image_base64
    if ref.image_url:
        async with httpx.AsyncClient() as client:
            resp = await client.get(ref.image_url, timeout=30)
            resp.raise_for_status()
            return base64.b64encode(resp.content).decode()
    raise ValueError("ReferenceImage has neither image_base64 nor image_url")


class GenerateCharacterImageRequest(BaseModel):
    name: str
    age: str
    gender: str = ""
    description: str
    visual_style: Optional[str] = None
    reference_image: Optional[ReferenceImage] = None


class GenerateLocationImageRequest(BaseModel):
    name: str
    description: str
    atmosphere: str = ""
    visual_style: Optional[str] = None
    reference_image: Optional[ReferenceImage] = None


class GeneratedImageResponse(BaseModel):
    image_base64: str
    mime_type: str
    prompt_used: str
    cost_usd: float


# ============================================================
# Endpoints
# ============================================================

@router.post("/generate-character-image", response_model=GeneratedImageResponse)
async def generate_character_image(request: GenerateCharacterImageRequest):
    """Generate a character portrait from name/age/description + visual style or reference image."""
    try:
        # Build style prefix
        if request.reference_image:
            style_prefix = "Match the visual style of the reference image exactly."
        elif request.visual_style and request.visual_style in STYLE_PREFIXES:
            style_prefix = STYLE_PREFIXES[request.visual_style]
        else:
            style_prefix = STYLE_PREFIXES["cinematic"]

        gender_str = f" {request.gender}" if request.gender else ""

        prompt = f"""{style_prefix}

Full body portrait of {request.name}, a {request.age}{gender_str}. {request.description}.

Plain white background. No scenery, no props, no distractions.

Full body visible head to toe, centered in frame.
Show enough detail to establish their complete look.

Portrait orientation, 9:16 aspect ratio."""

        if request.reference_image:
            prompt += (
                "\n\nSTYLE REFERENCE ONLY: Match the art style, color palette, "
                "lighting, and rendering quality of the reference image. "
                "Do NOT copy the reference person's face, body, or features. "
                "Generate a completely different-looking person based on the "
                "character description above."
            )
            # Resolve reference image base64 (fetch from URL if needed)
            ref_base64 = await resolve_ref_base64(request.reference_image)
            refs = [{
                "image_base64": ref_base64,
                "mime_type": request.reference_image.mime_type,
            }]
            result = await generate_image_with_references(
                prompt=prompt,
                reference_images=refs,
                aspect_ratio="9:16",
            )
        else:
            result = await generate_image(prompt=prompt, aspect_ratio="9:16")

        return GeneratedImageResponse(
            image_base64=result["image_base64"],
            mime_type=result["mime_type"],
            prompt_used=prompt,
            cost_usd=COST_IMAGE_GENERATION,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=_friendly_image_error(str(e)))


@router.post("/generate-location-image", response_model=GeneratedImageResponse)
async def generate_location_image(request: GenerateLocationImageRequest):
    """Generate a location/environment image from name/description + visual style or reference image."""
    try:
        # Build style prefix
        if request.reference_image:
            style_prefix = "Match the visual style of the reference image exactly."
        elif request.visual_style and request.visual_style in STYLE_PREFIXES:
            style_prefix = STYLE_PREFIXES[request.visual_style]
        else:
            style_prefix = STYLE_PREFIXES["cinematic"]

        atmosphere_str = f"\n\nAtmosphere: {request.atmosphere}." if request.atmosphere else ""

        prompt = f"""{style_prefix}

{request.name}. {request.description}.{atmosphere_str}

The space should feel charged and atmospheric.
Wide establishing shot showing the environment.

No characters in frame.

Portrait orientation, 9:16 aspect ratio."""

        if request.reference_image:
            prompt += (
                "\n\nCRITICAL: Match the visual style of the reference image exactly. "
                "Same rendering approach, same color treatment, same texture quality."
            )
            # Resolve reference image base64 (fetch from URL if needed)
            ref_base64 = await resolve_ref_base64(request.reference_image)
            refs = [{
                "image_base64": ref_base64,
                "mime_type": request.reference_image.mime_type,
            }]
            result = await generate_image_with_references(
                prompt=prompt,
                reference_images=refs,
                aspect_ratio="9:16",
            )
        else:
            result = await generate_image(prompt=prompt, aspect_ratio="9:16")

        return GeneratedImageResponse(
            image_base64=result["image_base64"],
            mime_type=result["mime_type"],
            prompt_used=prompt,
            cost_usd=COST_IMAGE_GENERATION,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=_friendly_image_error(str(e)))
