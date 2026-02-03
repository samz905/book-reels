"""
Moodboard generation endpoints for AI video workflow.
Step-by-step visual direction: Characters -> Environment -> Key Moments
"""
import uuid
from typing import Optional, Literal, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..core import generate_image, generate_image_with_references
from .story import Story, Character, Setting, Beat

router = APIRouter()


# ============================================================
# Constants
# ============================================================

STYLE_PREFIXES = {
    "cinematic": "Cinematic still, photorealistic, shot on 35mm film, shallow depth of field, natural lighting, film grain, professional cinematography",
    "3d_animated": "3D animated, Pixar-style rendering, stylized realism, expressive features, vibrant colors, clean lighting, appealing design",
    "2d_animated": "2D animated, illustrated style, hand-drawn aesthetic, bold outlines, stylized, expressive, graphic shapes, flat lighting with soft shadows",
}

KEY_MOMENT_TYPES = ["hook", "midpoint", "climax"]


# ============================================================
# Request/Response Models
# ============================================================

class MoodboardImage(BaseModel):
    type: Literal["character", "environment", "key_moment"]
    image_base64: str
    mime_type: str
    prompt_used: str


# --- Character ---
class GenerateCharacterRequest(BaseModel):
    story: Story
    character_id: str


class GenerateCharacterResponse(BaseModel):
    character_id: str
    image: MoodboardImage
    prompt_used: str


class RefineCharacterRequest(BaseModel):
    story: Story
    character_id: str
    feedback: str


class RefineCharacterResponse(BaseModel):
    character_id: str
    image: MoodboardImage
    prompt_used: str


# --- Environment ---
class GenerateEnvironmentRequest(BaseModel):
    story: Story


class GenerateEnvironmentResponse(BaseModel):
    image: MoodboardImage
    prompt_used: str


class RefineEnvironmentRequest(BaseModel):
    story: Story
    feedback: str


class RefineEnvironmentResponse(BaseModel):
    image: MoodboardImage
    prompt_used: str


# --- Key Moments (3 images: hook, midpoint, climax) ---
class ReferenceImage(BaseModel):
    """A reference image for visual consistency."""
    image_base64: str
    mime_type: str


class ApprovedVisuals(BaseModel):
    """Approved character and environment images for visual consistency."""
    character_images: List[ReferenceImage]  # Approved character reference images (up to 5)
    environment_image: ReferenceImage  # Approved environment reference image
    # Text descriptions as fallback/context
    character_descriptions: List[str]  # Appearance descriptions from approved chars
    environment_description: str  # Setting description from approved environment


class KeyMomentImage(BaseModel):
    moment_type: Literal["hook", "midpoint", "climax"]
    beat_number: int
    beat_description: str
    image: MoodboardImage
    prompt_used: str


class GenerateKeyMomentsRequest(BaseModel):
    story: Story
    approved_visuals: ApprovedVisuals


class GenerateKeyMomentsResponse(BaseModel):
    key_moments: List[KeyMomentImage]


class RefineKeyMomentRequest(BaseModel):
    story: Story
    approved_visuals: ApprovedVisuals
    moment_type: Literal["hook", "midpoint", "climax"]
    feedback: str


class RefineKeyMomentResponse(BaseModel):
    key_moment: KeyMomentImage


# ============================================================
# Helper Functions
# ============================================================

def get_character_by_id(story: Story, character_id: str) -> Character:
    """Get a specific character by ID."""
    for character in story.characters:
        if character.id == character_id:
            return character
    raise ValueError(f"Character with id '{character_id}' not found")


def get_beat_by_function(story: Story, function: str) -> Beat:
    """Get a beat by its story function."""
    for beat in story.beats:
        if beat.story_function == function:
            return beat
    # Fallbacks for each type
    if function == "hook" and story.beats:
        return story.beats[0]  # First beat
    if function == "midpoint" and story.beats:
        mid_idx = len(story.beats) // 2
        return story.beats[mid_idx]
    if function == "climax" and story.beats:
        return story.beats[-2] if len(story.beats) > 1 else story.beats[-1]
    raise ValueError(f"No beat found for function '{function}'")


# ============================================================
# Prompt Builders
# ============================================================

def build_character_prompt(story: Story, character: Character, feedback: Optional[str] = None) -> str:
    """Build the prompt for a specific character reference image."""
    style_prefix = STYLE_PREFIXES.get(story.style, STYLE_PREFIXES["cinematic"])

    prompt = f"""{style_prefix}

Portrait of {character.appearance}.

Expression: {story.setting.atmosphere}.

Simple background that suggests {story.setting.location} without distracting.

Character fills most of the frame, clearly visible from head to mid-torso.
Show enough detail to establish their complete look.

Portrait orientation, 9:16 aspect ratio."""

    if feedback:
        prompt += f"\n\nAdditional direction: {feedback}"

    return prompt


def build_environment_prompt(story: Story, feedback: Optional[str] = None) -> str:
    """Build the prompt for environment reference image."""
    style_prefix = STYLE_PREFIXES.get(story.style, STYLE_PREFIXES["cinematic"])

    prompt = f"""{style_prefix}

{story.setting.location}.

{story.setting.time}.

Atmosphere: {story.setting.atmosphere}.

Wide establishing shot showing the world.

No characters in frame.

Portrait orientation, 9:16 aspect ratio."""

    if feedback:
        prompt += f"\n\nAdditional direction: {feedback}"

    return prompt


def build_key_moment_prompt(
    story: Story,
    beat: Beat,
    moment_type: str,
    approved_visuals: ApprovedVisuals,
    feedback: Optional[str] = None
) -> str:
    """Build the prompt for a key moment image with character/environment consistency."""
    style_prefix = STYLE_PREFIXES.get(story.style, STYLE_PREFIXES["cinematic"])

    # Build character appearance list
    chars_description = "\n".join([f"- {desc}" for desc in approved_visuals.character_descriptions])

    # Moment-specific framing
    if moment_type == "hook":
        framing = "Opening shot that draws the viewer in. Establish the character and world."
    elif moment_type == "midpoint":
        framing = "Pivotal turning point. Show the shift in the character's journey."
    else:  # climax
        framing = "Peak dramatic moment. Maximum tension and emotion."

    prompt = f"""{style_prefix}

SCENE: {beat.description}

SETTING: {approved_visuals.environment_description}

CHARACTERS IN SCENE:
{chars_description}

MOMENT TYPE: {moment_type.upper()} - {framing}

Mood: {story.setting.atmosphere}

Show the full scene with characters in action, not a close-up portrait.
Medium or wide shot showing body language and environment context.
Dynamic cinematic composition.

Portrait orientation, 9:16 aspect ratio."""

    if feedback:
        prompt += f"\n\nAdditional direction: {feedback}"

    return prompt


# ============================================================
# Character Endpoints
# ============================================================

@router.post("/generate-character", response_model=GenerateCharacterResponse)
async def generate_character(request: GenerateCharacterRequest):
    """
    Generate a reference image for a specific character.

    Input: { "story": {...}, "character_id": "abc123" }
    Output: { "character_id": "abc123", "image": {...}, "prompt_used": "..." }
    """
    try:
        story = request.story
        character = get_character_by_id(story, request.character_id)

        prompt = build_character_prompt(story, character)
        print(f"Generating character reference for '{character.name}'...")
        print(f"Prompt: {prompt[:200]}...")

        result = await generate_image(prompt=prompt, aspect_ratio="9:16")

        return GenerateCharacterResponse(
            character_id=request.character_id,
            image=MoodboardImage(
                type="character",
                image_base64=result["image_base64"],
                mime_type=result["mime_type"],
                prompt_used=prompt
            ),
            prompt_used=prompt
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        print(f"Error generating character: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/refine-character", response_model=RefineCharacterResponse)
async def refine_character(request: RefineCharacterRequest):
    """
    Refine a character image with feedback.

    Input: { "story": {...}, "character_id": "abc123", "feedback": "make them older" }
    Output: { "character_id": "abc123", "image": {...}, "prompt_used": "..." }
    """
    try:
        story = request.story
        character = get_character_by_id(story, request.character_id)

        prompt = build_character_prompt(story, character, request.feedback)
        print(f"Refining character '{character.name}' with feedback: {request.feedback}")
        print(f"Prompt: {prompt[:200]}...")

        result = await generate_image(prompt=prompt, aspect_ratio="9:16")

        return RefineCharacterResponse(
            character_id=request.character_id,
            image=MoodboardImage(
                type="character",
                image_base64=result["image_base64"],
                mime_type=result["mime_type"],
                prompt_used=prompt
            ),
            prompt_used=prompt
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        print(f"Error refining character: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Environment Endpoints
# ============================================================

@router.post("/generate-environment", response_model=GenerateEnvironmentResponse)
async def generate_environment(request: GenerateEnvironmentRequest):
    """
    Generate an environment reference image.

    Input: { "story": {...} }
    Output: { "image": {...}, "prompt_used": "..." }
    """
    try:
        story = request.story

        prompt = build_environment_prompt(story)
        print(f"Generating environment reference...")
        print(f"Prompt: {prompt[:200]}...")

        result = await generate_image(prompt=prompt, aspect_ratio="9:16")

        return GenerateEnvironmentResponse(
            image=MoodboardImage(
                type="environment",
                image_base64=result["image_base64"],
                mime_type=result["mime_type"],
                prompt_used=prompt
            ),
            prompt_used=prompt
        )

    except Exception as e:
        import traceback
        print(f"Error generating environment: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/refine-environment", response_model=RefineEnvironmentResponse)
async def refine_environment(request: RefineEnvironmentRequest):
    """
    Refine the environment image with feedback.

    Input: { "story": {...}, "feedback": "make it darker" }
    Output: { "image": {...}, "prompt_used": "..." }
    """
    try:
        story = request.story

        prompt = build_environment_prompt(story, request.feedback)
        print(f"Refining environment with feedback: {request.feedback}")
        print(f"Prompt: {prompt[:200]}...")

        result = await generate_image(prompt=prompt, aspect_ratio="9:16")

        return RefineEnvironmentResponse(
            image=MoodboardImage(
                type="environment",
                image_base64=result["image_base64"],
                mime_type=result["mime_type"],
                prompt_used=prompt
            ),
            prompt_used=prompt
        )

    except Exception as e:
        import traceback
        print(f"Error refining environment: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Key Moments Endpoints (Hook, Midpoint, Climax)
# ============================================================

@router.post("/generate-key-moments", response_model=GenerateKeyMomentsResponse)
async def generate_key_moments(request: GenerateKeyMomentsRequest):
    """
    Generate 3 key moment reference images (hook, midpoint, climax).
    Uses approved character and environment IMAGES for visual consistency.

    Input: {
        "story": {...},
        "approved_visuals": {
            "character_images": [{"image_base64": "...", "mime_type": "image/png"}, ...],
            "environment_image": {"image_base64": "...", "mime_type": "image/png"},
            "character_descriptions": ["tall man with...", ...],
            "environment_description": "Ancient dojo..."
        }
    }
    Output: { "key_moments": [{ "moment_type": "hook", "image": {...}, ... }, ...] }
    """
    try:
        story = request.story
        approved = request.approved_visuals

        # Build reference images list (characters + environment)
        # Up to 5 character images + 1 environment = 6 reference images max
        reference_images: List[dict] = []

        # Add character images (up to 5 for human consistency)
        for char_img in approved.character_images[:5]:
            reference_images.append({
                "image_base64": char_img.image_base64,
                "mime_type": char_img.mime_type,
            })

        # Add environment image
        reference_images.append({
            "image_base64": approved.environment_image.image_base64,
            "mime_type": approved.environment_image.mime_type,
        })

        print(f"Using {len(reference_images)} reference images for consistency")

        key_moments: List[KeyMomentImage] = []

        for moment_type in KEY_MOMENT_TYPES:
            beat = get_beat_by_function(story, moment_type)
            prompt = build_key_moment_prompt(story, beat, moment_type, approved)

            print(f"Generating {moment_type} key moment with reference images...")
            print(f"Prompt: {prompt[:300]}...")

            # Use generate_image_with_references for consistency
            result = await generate_image_with_references(
                prompt=prompt,
                reference_images=reference_images,
                aspect_ratio="9:16",
                resolution="2K"
            )

            key_moments.append(KeyMomentImage(
                moment_type=moment_type,
                beat_number=beat.beat_number,
                beat_description=beat.description,
                image=MoodboardImage(
                    type="key_moment",
                    image_base64=result["image_base64"],
                    mime_type=result["mime_type"],
                    prompt_used=prompt
                ),
                prompt_used=prompt
            ))

        return GenerateKeyMomentsResponse(key_moments=key_moments)

    except Exception as e:
        import traceback
        print(f"Error generating key moments: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/refine-key-moment", response_model=RefineKeyMomentResponse)
async def refine_key_moment(request: RefineKeyMomentRequest):
    """
    Refine a single key moment image with feedback.
    Uses approved character and environment IMAGES for visual consistency.

    Input: {
        "story": {...},
        "approved_visuals": {...},
        "moment_type": "hook"|"midpoint"|"climax",
        "feedback": "show more action"
    }
    Output: { "key_moment": {...} }
    """
    try:
        story = request.story
        approved = request.approved_visuals
        moment_type = request.moment_type

        # Build reference images list
        reference_images: List[dict] = []
        for char_img in approved.character_images[:5]:
            reference_images.append({
                "image_base64": char_img.image_base64,
                "mime_type": char_img.mime_type,
            })
        reference_images.append({
            "image_base64": approved.environment_image.image_base64,
            "mime_type": approved.environment_image.mime_type,
        })

        beat = get_beat_by_function(story, moment_type)
        prompt = build_key_moment_prompt(story, beat, moment_type, approved, request.feedback)

        print(f"Refining {moment_type} key moment with feedback: {request.feedback}")
        print(f"Prompt: {prompt[:300]}...")

        # Use generate_image_with_references for consistency
        result = await generate_image_with_references(
            prompt=prompt,
            reference_images=reference_images,
            aspect_ratio="9:16",
            resolution="2K"
        )

        return RefineKeyMomentResponse(
            key_moment=KeyMomentImage(
                moment_type=moment_type,
                beat_number=beat.beat_number,
                beat_description=beat.description,
                image=MoodboardImage(
                    type="key_moment",
                    image_base64=result["image_base64"],
                    mime_type=result["mime_type"],
                    prompt_used=prompt
                ),
                prompt_used=prompt
            )
        )

    except Exception as e:
        import traceback
        print(f"Error refining key moment: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))
