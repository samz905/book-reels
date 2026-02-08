"""
Moodboard generation endpoints for AI video workflow.
Step-by-step visual direction: Characters -> Setting -> Key Moment (SPIKE)
"""
import uuid
from typing import Optional, Literal, List, Dict
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..core import generate_image, generate_image_with_references, COST_IMAGE_GENERATION
from .story import Story, Character, Setting, Location, Beat

router = APIRouter()


# ============================================================
# Constants
# ============================================================

STYLE_PREFIXES = {
    "cinematic": "Cinematic still, photorealistic, shot on 35mm film, shallow depth of field, natural lighting, film grain, professional cinematography",
    "3d_animated": "3D animated, Pixar-style rendering, stylized realism, expressive features, vibrant colors, clean lighting, appealing design",
    "2d_animated": "2D animated, illustrated style, hand-drawn aesthetic, bold outlines, stylized, expressive, graphic shapes, flat lighting with soft shadows",
}


# ============================================================
# Request/Response Models
# ============================================================

class MoodboardImage(BaseModel):
    type: Literal["character", "setting", "location", "key_moment"]
    image_base64: str
    mime_type: str
    prompt_used: str


class ReferenceImage(BaseModel):
    """A reference image for visual consistency."""
    image_base64: str
    mime_type: str


# --- Protagonist (Style Anchor) ---
class GenerateProtagonistRequest(BaseModel):
    story: Story


class GenerateProtagonistResponse(BaseModel):
    character_id: str
    image: MoodboardImage
    prompt_used: str
    cost_usd: float = 0.0


# --- Character ---
class GenerateCharacterRequest(BaseModel):
    story: Story
    character_id: str
    protagonist_image: Optional[ReferenceImage] = None  # Style anchor for consistency


class GenerateCharacterResponse(BaseModel):
    character_id: str
    image: MoodboardImage
    prompt_used: str
    cost_usd: float = 0.0


class RefineCharacterRequest(BaseModel):
    story: Story
    character_id: str
    feedback: str
    protagonist_image: Optional[ReferenceImage] = None  # Style anchor for consistency


class RefineCharacterResponse(BaseModel):
    character_id: str
    image: MoodboardImage
    prompt_used: str
    cost_usd: float = 0.0


# --- Setting (formerly Environment) ---
class GenerateSettingRequest(BaseModel):
    story: Story
    protagonist_image: Optional[ReferenceImage] = None  # Style anchor for consistency


class GenerateSettingResponse(BaseModel):
    image: MoodboardImage
    prompt_used: str
    cost_usd: float = 0.0


class RefineSettingRequest(BaseModel):
    story: Story
    feedback: str
    protagonist_image: Optional[ReferenceImage] = None  # Style anchor for consistency


class RefineSettingResponse(BaseModel):
    image: MoodboardImage
    prompt_used: str
    cost_usd: float = 0.0


# --- Location ---
class GenerateLocationRequest(BaseModel):
    story: Story
    location_id: str
    protagonist_image: Optional[ReferenceImage] = None  # Style anchor for consistency


class GenerateLocationResponse(BaseModel):
    location_id: str
    image: MoodboardImage
    prompt_used: str
    cost_usd: float = 0.0


class RefineLocationRequest(BaseModel):
    story: Story
    location_id: str
    feedback: str
    protagonist_image: Optional[ReferenceImage] = None  # Style anchor for consistency


class RefineLocationResponse(BaseModel):
    location_id: str
    image: MoodboardImage
    prompt_used: str
    cost_usd: float = 0.0


# --- Key Moment (SPIKE - emotional peak, 1 image) ---
class ApprovedVisuals(BaseModel):
    """Approved character and setting/location images for visual consistency."""
    character_images: List[ReferenceImage]  # Approved character reference images (up to 5)
    character_image_map: Dict[str, ReferenceImage] = {}  # char_id -> image (for per-scene selection)
    setting_image: Optional[ReferenceImage] = None  # DEPRECATED - backward compat
    location_images: Dict[str, ReferenceImage] = {}  # location_id -> image
    # Text descriptions as fallback/context
    character_descriptions: List[str]  # Appearance descriptions from approved chars
    setting_description: Optional[str] = None  # DEPRECATED - backward compat
    location_descriptions: Dict[str, str] = {}  # location_id -> description


class KeyMomentImage(BaseModel):
    beat_number: int
    beat_description: str
    image: MoodboardImage
    prompt_used: str


class GenerateKeyMomentRequest(BaseModel):
    story: Story
    approved_visuals: ApprovedVisuals


class GenerateKeyMomentResponse(BaseModel):
    key_moment: KeyMomentImage
    cost_usd: float = 0.0


class RefineKeyMomentRequest(BaseModel):
    story: Story
    approved_visuals: ApprovedVisuals
    feedback: str


class RefineKeyMomentResponse(BaseModel):
    key_moment: KeyMomentImage
    cost_usd: float = 0.0


# ============================================================
# Helper Functions
# ============================================================

def get_character_by_id(story: Story, character_id: str) -> Character:
    """Get a specific character by ID."""
    for character in story.characters:
        if character.id == character_id:
            return character
    raise ValueError(f"Character with id '{character_id}' not found")


def get_spike_beat(story: Story) -> Beat:
    """Get the SPIKE beat (emotional peak - beat_type == 'spike', typically beats 4-5)."""
    # First try to find a beat with beat_type "spike"
    for beat in story.beats:
        if beat.beat_type == "spike":
            return beat
    # Fallback: return beat 4 or 5 (the middle/peak of the story)
    if len(story.beats) >= 5:
        return story.beats[3]  # beat_number 4 (0-indexed)
    elif len(story.beats) >= 4:
        return story.beats[3]
    else:
        # Very short story, return middle beat
        mid_idx = len(story.beats) // 2
        return story.beats[mid_idx]


# ============================================================
# Prompt Builders
# ============================================================

def _get_atmosphere(story: Story) -> str:
    """Get atmosphere from locations (preferred) or deprecated setting."""
    if story.locations:
        return story.locations[0].atmosphere
    if story.setting:
        return story.setting.atmosphere
    return "dramatic"


def _get_location_hint(story: Story) -> str:
    """Get a location hint for character backgrounds."""
    if story.locations:
        return story.locations[0].description
    if story.setting:
        return story.setting.location
    return "a dramatic environment"


def build_protagonist_prompt(story: Story, protagonist: Character) -> str:
    """Build the prompt for protagonist (style anchor - no references)."""
    style_prefix = STYLE_PREFIXES.get(story.style, STYLE_PREFIXES["cinematic"])

    return f"""{style_prefix}

Portrait of {protagonist.name}, a {protagonist.age} {protagonist.gender}. {protagonist.appearance}.

Expression: {_get_atmosphere(story)}.

Simple background suggesting {_get_location_hint(story)}.

Character clearly visible, head to mid-torso.
Show the tension in their posture and expression.

This character defines the visual style for the entire film.
Establish clear design language: eye style, proportions, line weight.

Portrait orientation, 9:16 aspect ratio."""


def build_character_prompt(story: Story, character: Character, feedback: Optional[str] = None, use_reference: bool = False) -> str:
    """Build the prompt for a specific character reference image."""
    style_prefix = STYLE_PREFIXES.get(story.style, STYLE_PREFIXES["cinematic"])

    prompt = f"""{style_prefix}

Portrait of {character.name}, a {character.age} {character.gender}. {character.appearance}.

Expression: {_get_atmosphere(story)}.

Simple background that suggests {_get_location_hint(story)} without distracting.

Character fills most of the frame, clearly visible from head to mid-torso.
Show enough detail to establish their complete look."""

    if use_reference:
        prompt += """

STYLE REFERENCE ONLY: Match the art style, color palette, lighting, and rendering quality of the reference image.
Do NOT copy the reference person's face, body, or features. Generate a completely different-looking person based on the character description above."""

    prompt += "\n\nPortrait orientation, 9:16 aspect ratio."

    if feedback:
        prompt += f"\n\nAdditional direction: {feedback}"

    return prompt


def build_setting_prompt(story: Story, feedback: Optional[str] = None, use_reference: bool = False) -> str:
    """Build the prompt for setting reference image. DEPRECATED - use build_location_prompt."""
    style_prefix = STYLE_PREFIXES.get(story.style, STYLE_PREFIXES["cinematic"])

    location = story.setting.location if story.setting else _get_location_hint(story)
    time = story.setting.time if story.setting else ""
    atmosphere = story.setting.atmosphere if story.setting else _get_atmosphere(story)

    prompt = f"""{style_prefix}

{location}.

{time}.

Atmosphere: {atmosphere}.

The space should feel charged, claustrophobic, or tense.
Wide establishing shot showing the world.

No characters in frame."""

    if use_reference:
        prompt += """

CRITICAL: Match the visual style of the reference image exactly.
Same rendering approach, same color treatment, same texture quality."""

    prompt += "\n\nPortrait orientation, 9:16 aspect ratio."

    if feedback:
        prompt += f"\n\nAdditional direction: {feedback}"

    return prompt


def build_location_prompt(
    story: Story,
    location: Location,
    feedback: Optional[str] = None,
    use_reference: bool = False,
) -> str:
    """Build the prompt for a specific location reference image."""
    style_prefix = STYLE_PREFIXES.get(story.style, STYLE_PREFIXES["cinematic"])

    prompt = f"""{style_prefix}

{location.description}.

Atmosphere: {location.atmosphere}.

The space should feel charged and atmospheric.
Wide establishing shot showing the environment.

No characters in frame.

Portrait orientation, 9:16 aspect ratio."""

    if use_reference:
        prompt += """

CRITICAL: Match the visual style of the reference image exactly.
Same rendering approach, same color treatment, same texture quality."""

    if feedback:
        prompt += f"\n\nAdditional direction: {feedback}"

    return prompt


def build_key_moment_prompt(
    story: Story,
    beat: Beat,
    approved_visuals: ApprovedVisuals,
    feedback: Optional[str] = None
) -> str:
    """Build the prompt for the SPIKE key moment image (emotional peak) with character/setting consistency."""
    style_prefix = STYLE_PREFIXES.get(story.style, STYLE_PREFIXES["cinematic"])

    # Build character appearance list
    chars_description = "\n".join([f"- {desc}" for desc in approved_visuals.character_descriptions])

    # Get location description for this beat
    setting_desc = ""
    if beat.location_id and approved_visuals.location_descriptions:
        setting_desc = approved_visuals.location_descriptions.get(beat.location_id, "")
    if not setting_desc:
        setting_desc = approved_visuals.setting_description or ""

    prompt = f"""{style_prefix}

SCENE: {beat.description}

SETTING: {setting_desc}

CHARACTERS IN SCENE:
{chars_description}

MOMENT TYPE: EMOTIONAL PEAK - The highest emotional payoff.
This is the moment viewers came for - reveal, betrayal, kiss, power move, or discovery.
Maximum dramatic tension.

Mood: {story.setting.atmosphere}

Show the full scene with characters in action, not a close-up portrait.
Medium or wide shot showing body language and environment context.
Dynamic cinematic composition.

Portrait orientation, 9:16 aspect ratio."""

    if feedback:
        prompt += f"\n\nAdditional direction: {feedback}"

    return prompt


# ============================================================
# Protagonist Endpoint (Style Anchor)
# ============================================================

@router.post("/generate-protagonist", response_model=GenerateProtagonistResponse)
async def generate_protagonist(request: GenerateProtagonistRequest):
    """
    Generate protagonist image WITHOUT reference images (style anchor).

    The protagonist is generated first and defines the visual style for the entire film.
    All other characters and setting will use this image as reference.

    Input: { "story": {...} }
    Output: { "character_id": "...", "image": {...}, "prompt_used": "..." }
    """
    try:
        story = request.story

        # Find protagonist (role == "protagonist"), fallback to first character
        protagonist = next(
            (c for c in story.characters if c.role == "protagonist"),
            story.characters[0] if story.characters else None
        )

        if not protagonist:
            raise ValueError("No characters found in story")

        prompt = build_protagonist_prompt(story, protagonist)
        print(f"Generating protagonist '{protagonist.name}' as style anchor...")
        print(f"Prompt: {prompt[:200]}...")

        # NO reference_images - this is the style anchor
        result = await generate_image(prompt=prompt, aspect_ratio="9:16")

        return GenerateProtagonistResponse(
            character_id=protagonist.id,
            image=MoodboardImage(
                type="character",
                image_base64=result["image_base64"],
                mime_type=result["mime_type"],
                prompt_used=prompt
            ),
            prompt_used=prompt,
            cost_usd=COST_IMAGE_GENERATION
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        print(f"Error generating protagonist: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Character Endpoints
# ============================================================

@router.post("/generate-character", response_model=GenerateCharacterResponse)
async def generate_character(request: GenerateCharacterRequest):
    """
    Generate a reference image for a specific character.

    If protagonist_image is provided, uses it as style reference for consistency.

    Input: { "story": {...}, "character_id": "abc123", "protagonist_image": {...} }
    Output: { "character_id": "abc123", "image": {...}, "prompt_used": "..." }
    """
    try:
        story = request.story
        character = get_character_by_id(story, request.character_id)

        use_reference = request.protagonist_image is not None
        prompt = build_character_prompt(story, character, use_reference=use_reference)
        print(f"Generating character reference for '{character.name}'...")
        print(f"Using protagonist as style reference: {use_reference}")
        print(f"Prompt: {prompt[:200]}...")

        if request.protagonist_image:
            # Use protagonist as style reference
            result = await generate_image_with_references(
                prompt=prompt,
                reference_images=[{
                    "image_base64": request.protagonist_image.image_base64,
                    "mime_type": request.protagonist_image.mime_type,
                }],
                aspect_ratio="9:16",
            )
        else:
            result = await generate_image(prompt=prompt, aspect_ratio="9:16")

        return GenerateCharacterResponse(
            character_id=request.character_id,
            image=MoodboardImage(
                type="character",
                image_base64=result["image_base64"],
                mime_type=result["mime_type"],
                prompt_used=prompt
            ),
            prompt_used=prompt,
            cost_usd=COST_IMAGE_GENERATION
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

    If protagonist_image is provided, uses it as style reference for consistency.

    Input: { "story": {...}, "character_id": "abc123", "feedback": "make them older", "protagonist_image": {...} }
    Output: { "character_id": "abc123", "image": {...}, "prompt_used": "..." }
    """
    try:
        story = request.story
        character = get_character_by_id(story, request.character_id)

        use_reference = request.protagonist_image is not None
        prompt = build_character_prompt(story, character, request.feedback, use_reference=use_reference)
        print(f"Refining character '{character.name}' with feedback: {request.feedback}")
        print(f"Using protagonist as style reference: {use_reference}")
        print(f"Prompt: {prompt[:200]}...")

        if request.protagonist_image:
            # Use protagonist as style reference
            result = await generate_image_with_references(
                prompt=prompt,
                reference_images=[{
                    "image_base64": request.protagonist_image.image_base64,
                    "mime_type": request.protagonist_image.mime_type,
                }],
                aspect_ratio="9:16",
            )
        else:
            result = await generate_image(prompt=prompt, aspect_ratio="9:16")

        return RefineCharacterResponse(
            character_id=request.character_id,
            image=MoodboardImage(
                type="character",
                image_base64=result["image_base64"],
                mime_type=result["mime_type"],
                prompt_used=prompt
            ),
            prompt_used=prompt,
            cost_usd=COST_IMAGE_GENERATION
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        print(f"Error refining character: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Setting Endpoints (formerly Environment)
# ============================================================

@router.post("/generate-setting", response_model=GenerateSettingResponse)
async def generate_setting(request: GenerateSettingRequest):
    """
    Generate a setting reference image.

    If protagonist_image is provided, uses it as style reference for consistency.

    Input: { "story": {...}, "protagonist_image": {...} }
    Output: { "image": {...}, "prompt_used": "..." }
    """
    try:
        story = request.story

        use_reference = request.protagonist_image is not None
        prompt = build_setting_prompt(story, use_reference=use_reference)
        print(f"Generating setting reference...")
        print(f"Using protagonist as style reference: {use_reference}")
        print(f"Prompt: {prompt[:200]}...")

        if request.protagonist_image:
            # Use protagonist as style reference
            result = await generate_image_with_references(
                prompt=prompt,
                reference_images=[{
                    "image_base64": request.protagonist_image.image_base64,
                    "mime_type": request.protagonist_image.mime_type,
                }],
                aspect_ratio="9:16",
            )
        else:
            result = await generate_image(prompt=prompt, aspect_ratio="9:16")

        return GenerateSettingResponse(
            image=MoodboardImage(
                type="setting",
                image_base64=result["image_base64"],
                mime_type=result["mime_type"],
                prompt_used=prompt
            ),
            prompt_used=prompt,
            cost_usd=COST_IMAGE_GENERATION
        )

    except Exception as e:
        import traceback
        print(f"Error generating setting: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/refine-setting", response_model=RefineSettingResponse)
async def refine_setting(request: RefineSettingRequest):
    """
    Refine the setting image with feedback.

    If protagonist_image is provided, uses it as style reference for consistency.

    Input: { "story": {...}, "feedback": "make it darker", "protagonist_image": {...} }
    Output: { "image": {...}, "prompt_used": "..." }
    """
    try:
        story = request.story

        use_reference = request.protagonist_image is not None
        prompt = build_setting_prompt(story, request.feedback, use_reference=use_reference)
        print(f"Refining setting with feedback: {request.feedback}")
        print(f"Using protagonist as style reference: {use_reference}")
        print(f"Prompt: {prompt[:200]}...")

        if request.protagonist_image:
            # Use protagonist as style reference
            result = await generate_image_with_references(
                prompt=prompt,
                reference_images=[{
                    "image_base64": request.protagonist_image.image_base64,
                    "mime_type": request.protagonist_image.mime_type,
                }],
                aspect_ratio="9:16",
            )
        else:
            result = await generate_image(prompt=prompt, aspect_ratio="9:16")

        return RefineSettingResponse(
            image=MoodboardImage(
                type="setting",
                image_base64=result["image_base64"],
                mime_type=result["mime_type"],
                prompt_used=prompt
            ),
            prompt_used=prompt,
            cost_usd=COST_IMAGE_GENERATION
        )

    except Exception as e:
        import traceback
        print(f"Error refining setting: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Location Endpoints
# ============================================================

def _get_location_by_id(story: Story, location_id: str) -> Location:
    """Get a specific location by ID."""
    for loc in story.locations:
        if loc.id == location_id:
            return loc
    raise ValueError(f"Location with id '{location_id}' not found")


@router.post("/generate-location", response_model=GenerateLocationResponse)
async def generate_location(request: GenerateLocationRequest):
    """
    Generate a reference image for a specific location.

    If protagonist_image is provided, uses it as style reference for consistency.

    Input: { "story": {...}, "location_id": "loc_1", "protagonist_image": {...} }
    Output: { "location_id": "loc_1", "image": {...}, "prompt_used": "..." }
    """
    try:
        story = request.story
        location = _get_location_by_id(story, request.location_id)

        use_reference = request.protagonist_image is not None
        prompt = build_location_prompt(story, location, use_reference=use_reference)
        print(f"Generating location reference for '{location.id}'...")
        print(f"Using protagonist as style reference: {use_reference}")
        print(f"Prompt: {prompt[:200]}...")

        if request.protagonist_image:
            result = await generate_image_with_references(
                prompt=prompt,
                reference_images=[{
                    "image_base64": request.protagonist_image.image_base64,
                    "mime_type": request.protagonist_image.mime_type,
                }],
                aspect_ratio="9:16",
            )
        else:
            result = await generate_image(prompt=prompt, aspect_ratio="9:16")

        return GenerateLocationResponse(
            location_id=request.location_id,
            image=MoodboardImage(
                type="location",
                image_base64=result["image_base64"],
                mime_type=result["mime_type"],
                prompt_used=prompt
            ),
            prompt_used=prompt,
            cost_usd=COST_IMAGE_GENERATION
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        print(f"Error generating location: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/refine-location", response_model=RefineLocationResponse)
async def refine_location(request: RefineLocationRequest):
    """
    Refine a location image with feedback.

    Input: { "story": {...}, "location_id": "loc_1", "feedback": "make it darker", "protagonist_image": {...} }
    Output: { "location_id": "loc_1", "image": {...}, "prompt_used": "..." }
    """
    try:
        story = request.story
        location = _get_location_by_id(story, request.location_id)

        use_reference = request.protagonist_image is not None
        prompt = build_location_prompt(story, location, request.feedback, use_reference=use_reference)
        print(f"Refining location '{location.id}' with feedback: {request.feedback}")
        print(f"Using protagonist as style reference: {use_reference}")
        print(f"Prompt: {prompt[:200]}...")

        if request.protagonist_image:
            result = await generate_image_with_references(
                prompt=prompt,
                reference_images=[{
                    "image_base64": request.protagonist_image.image_base64,
                    "mime_type": request.protagonist_image.mime_type,
                }],
                aspect_ratio="9:16",
            )
        else:
            result = await generate_image(prompt=prompt, aspect_ratio="9:16")

        return RefineLocationResponse(
            location_id=request.location_id,
            image=MoodboardImage(
                type="location",
                image_base64=result["image_base64"],
                mime_type=result["mime_type"],
                prompt_used=prompt
            ),
            prompt_used=prompt,
            cost_usd=COST_IMAGE_GENERATION
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        print(f"Error refining location: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Key Moment Endpoint (SPIKE - emotional peak, 1 image)
# ============================================================

@router.post("/generate-key-moment", response_model=GenerateKeyMomentResponse)
async def generate_key_moment(request: GenerateKeyMomentRequest):
    """
    Generate 1 key moment reference image (SPIKE - emotional peak).
    Uses approved character and setting IMAGES for visual consistency.

    Input: {
        "story": {...},
        "approved_visuals": {
            "character_images": [{"image_base64": "...", "mime_type": "image/png"}, ...],
            "setting_image": {"image_base64": "...", "mime_type": "image/png"},
            "character_descriptions": ["tall man with...", ...],
            "setting_description": "Ancient dojo..."
        }
    }
    Output: { "key_moment": { "beat_number": 4, "image": {...}, ... } }
    """
    try:
        story = request.story
        approved = request.approved_visuals

        # Build reference images list (characters + location/setting)
        reference_images: List[dict] = []

        # Add character images (up to 5 for human consistency)
        for char_img in approved.character_images[:5]:
            reference_images.append({
                "image_base64": char_img.image_base64,
                "mime_type": char_img.mime_type,
            })

        # Add location image (prefer beat's location, fallback to first location, then setting)
        beat = get_spike_beat(story)
        location_img = None
        if beat.location_id and beat.location_id in approved.location_images:
            location_img = approved.location_images[beat.location_id]
        elif approved.location_images:
            location_img = next(iter(approved.location_images.values()))
        elif approved.setting_image:
            location_img = approved.setting_image

        if location_img:
            reference_images.append({
                "image_base64": location_img.image_base64,
                "mime_type": location_img.mime_type,
            })

        print(f"Using {len(reference_images)} reference images for consistency")

        # Get the SPIKE beat (emotional peak)
        beat = get_spike_beat(story)
        prompt = build_key_moment_prompt(story, beat, approved)

        print(f"Generating SPIKE key moment with reference images...")
        print(f"Prompt: {prompt[:300]}...")

        # Use generate_image_with_references for consistency
        result = await generate_image_with_references(
            prompt=prompt,
            reference_images=reference_images,
            aspect_ratio="9:16",
            resolution="2K"
        )

        # Derive description from blocks if legacy field is None
        beat_desc = beat.description or " ".join(
            b.text for b in (beat.blocks or []) if b.type in ("description", "action")
        ) or "Scene moment"

        key_moment = KeyMomentImage(
            beat_number=beat.number,
            beat_description=beat_desc,
            image=MoodboardImage(
                type="key_moment",
                image_base64=result["image_base64"],
                mime_type=result["mime_type"],
                prompt_used=prompt
            ),
            prompt_used=prompt
        )

        return GenerateKeyMomentResponse(key_moment=key_moment, cost_usd=COST_IMAGE_GENERATION)

    except Exception as e:
        import traceback
        print(f"Error generating key moment: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/refine-key-moment", response_model=RefineKeyMomentResponse)
async def refine_key_moment(request: RefineKeyMomentRequest):
    """
    Refine the key moment image with feedback.
    Uses approved character and setting IMAGES for visual consistency.

    Input: {
        "story": {...},
        "approved_visuals": {...},
        "feedback": "show more action"
    }
    Output: { "key_moment": {...} }
    """
    try:
        story = request.story
        approved = request.approved_visuals

        # Build reference images list
        reference_images: List[dict] = []
        for char_img in approved.character_images[:5]:
            reference_images.append({
                "image_base64": char_img.image_base64,
                "mime_type": char_img.mime_type,
            })

        # Add location/setting image
        beat = get_spike_beat(story)
        location_img = None
        if beat.location_id and beat.location_id in approved.location_images:
            location_img = approved.location_images[beat.location_id]
        elif approved.location_images:
            location_img = next(iter(approved.location_images.values()))
        elif approved.setting_image:
            location_img = approved.setting_image

        if location_img:
            reference_images.append({
                "image_base64": location_img.image_base64,
                "mime_type": location_img.mime_type,
            })
        prompt = build_key_moment_prompt(story, beat, approved, request.feedback)

        print(f"Refining key moment with feedback: {request.feedback}")
        print(f"Prompt: {prompt[:300]}...")

        # Use generate_image_with_references for consistency
        result = await generate_image_with_references(
            prompt=prompt,
            reference_images=reference_images,
            aspect_ratio="9:16",
            resolution="2K"
        )

        beat_desc = beat.description or " ".join(
            b.text for b in (beat.blocks or []) if b.type in ("description", "action")
        ) or "Scene moment"

        return RefineKeyMomentResponse(
            key_moment=KeyMomentImage(
                beat_number=beat.number,
                beat_description=beat_desc,
                image=MoodboardImage(
                    type="key_moment",
                    image_base64=result["image_base64"],
                    mime_type=result["mime_type"],
                    prompt_used=prompt
                ),
                prompt_used=prompt
            ),
            cost_usd=COST_IMAGE_GENERATION
        )

    except Exception as e:
        import traceback
        print(f"Error refining key moment: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))
