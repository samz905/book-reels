"""
Moodboard generation endpoints for AI video workflow.
Step-by-step visual direction: Characters -> Setting -> Key Moment (SPIKE)
"""
import asyncio
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
    count: int = 1  # Number of images to generate (1-3)


class GenerateProtagonistResponse(BaseModel):
    character_id: str
    image: MoodboardImage
    images: List[MoodboardImage] = []  # All generated options (when count > 1)
    prompt_used: str
    cost_usd: float = 0.0


# --- Character ---
class GenerateCharacterRequest(BaseModel):
    story: Story
    character_id: str
    protagonist_image: Optional[ReferenceImage] = None  # Style anchor for consistency
    count: int = 1  # Number of images to generate (1-3)


class GenerateCharacterResponse(BaseModel):
    character_id: str
    image: MoodboardImage
    images: List[MoodboardImage] = []  # All generated options (when count > 1)
    prompt_used: str
    cost_usd: float = 0.0


class RefineCharacterRequest(BaseModel):
    story: Story
    character_id: str
    feedback: str
    protagonist_image: Optional[ReferenceImage] = None  # Style anchor for consistency
    reference_images: Optional[List[ReferenceImage]] = None  # User-uploaded refs (up to 5)


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
    count: int = 1  # Number of images to generate (1-3)


class GenerateLocationResponse(BaseModel):
    location_id: str
    image: MoodboardImage
    images: List[MoodboardImage] = []  # All generated options (when count > 1)
    prompt_used: str
    cost_usd: float = 0.0


class RefineLocationRequest(BaseModel):
    story: Story
    location_id: str
    feedback: str
    protagonist_image: Optional[ReferenceImage] = None  # Style anchor for consistency
    reference_images: Optional[List[ReferenceImage]] = None  # User-uploaded refs (up to 5)


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
    key_moment: KeyMomentImage  # Primary (spike) — backward compat
    key_moments: List[KeyMomentImage] = []  # All 3 distinct scenes
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


def get_key_beats(story: Story, count: int = 3) -> List[Beat]:
    """Pick `count` distinct, visually interesting beats spread across the story arc.
    Prefers spike first, then beats from different locations/scene changes for visual variety."""
    if len(story.beats) <= count:
        return list(story.beats)

    selected: List[Beat] = []
    used_indices: set = set()

    # 1. Always include the spike beat
    spike = get_spike_beat(story)
    spike_idx = next((i for i, b in enumerate(story.beats) if b.number == spike.number), 0)
    selected.append(spike)
    used_indices.add(spike_idx)

    # 2. Pick remaining beats that maximize visual variety (different locations, spread out)
    # Priority: beat_type order, prefer scene_change, prefer different location_id
    used_locations = {spike.location_id} if spike.location_id else set()
    candidates = []
    for i, beat in enumerate(story.beats):
        if i in used_indices:
            continue
        # Score: different location = +3, scene_change = +2, distance from selected = +1
        loc_bonus = 3 if (beat.location_id and beat.location_id not in used_locations) else 0
        change_bonus = 2 if beat.scene_change else 0
        # Prefer beats spread across the story (early vs late)
        dist = min(abs(i - idx) for idx in used_indices)
        candidates.append((i, beat, loc_bonus + change_bonus + dist))

    # Sort by score descending
    candidates.sort(key=lambda x: x[2], reverse=True)

    for idx, beat, _ in candidates:
        if len(selected) >= count:
            break
        selected.append(beat)
        used_indices.add(idx)
        if beat.location_id:
            used_locations.add(beat.location_id)

    # Sort by beat number for chronological order
    selected.sort(key=lambda b: b.number)
    return selected


# ============================================================
# Shot Variations for Batch Generation
# ============================================================

CHARACTER_SHOT_VARIATIONS = [
    "Medium close-up, front-facing, neutral expression. Character fills most of the frame, clearly visible from head to mid-torso.",
    "Three-quarter view, slight tilt, showing personality through posture. Shoulders and upper body visible, environmental hints in background.",
    "Full body shot from mid-distance, dynamic pose showing their physicality. Full silhouette visible with room to breathe.",
]

LOCATION_SHOT_VARIATIONS = [
    "Wide establishing shot showing the full environment. Dramatic composition with depth.",
    "Medium shot focusing on the atmosphere and key details. Slightly lower angle to emphasize scale.",
    "Close-up of the most distinctive architectural or environmental feature. Moody, textured.",
]


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


BEAT_TYPE_DESCRIPTIONS = {
    "hook": "OPENING HOOK — The moment that grabs the audience. First impression, intrigue, a world revealed.",
    "rise": "RISING TENSION — Stakes are climbing. Characters commit, obstacles emerge, momentum builds.",
    "spike": "EMOTIONAL PEAK — The highest emotional payoff. Reveal, betrayal, kiss, power move, or discovery. Maximum dramatic tension.",
    "drop": "AFTERMATH — The dust settles. Characters process what just happened. Quiet intensity.",
    "cliff": "CLIFFHANGER — The final image that leaves audiences wanting more. Unanswered questions, new threats, or bittersweet endings.",
}


def build_key_moment_prompt(
    story: Story,
    beat: Beat,
    approved_visuals: ApprovedVisuals,
    feedback: Optional[str] = None
) -> str:
    """Build the prompt for a key moment image with character/setting consistency."""
    style_prefix = STYLE_PREFIXES.get(story.style, STYLE_PREFIXES["cinematic"])

    # Build character appearance list — prefer only chars in scene
    if beat.characters_in_scene:
        chars_in_scene = []
        for desc in approved_visuals.character_descriptions:
            for cid in beat.characters_in_scene:
                # desc format: "Name (age gender): appearance"
                char = next((c for c in story.characters if c.id == cid), None)
                if char and desc.startswith(char.name):
                    chars_in_scene.append(f"- {desc}")
        chars_description = "\n".join(chars_in_scene) if chars_in_scene else "\n".join([f"- {d}" for d in approved_visuals.character_descriptions])
    else:
        chars_description = "\n".join([f"- {desc}" for desc in approved_visuals.character_descriptions])

    # Get location description for this beat
    setting_desc = ""
    if beat.location_id and approved_visuals.location_descriptions:
        setting_desc = approved_visuals.location_descriptions.get(beat.location_id, "")
    if not setting_desc:
        setting_desc = approved_visuals.setting_description or ""

    # Scene description — prefer blocks, fallback to legacy
    scene_desc = beat.description or " ".join(
        b.text for b in (beat.blocks or []) if b.type in ("description", "action")
    ) or "Scene moment"

    # Beat type description
    moment_type = BEAT_TYPE_DESCRIPTIONS.get(beat.beat_type or "spike", BEAT_TYPE_DESCRIPTIONS["spike"])

    atmosphere = story.setting.atmosphere if story.setting else "intense"

    prompt = f"""{style_prefix}

SCENE {beat.number}: {scene_desc}

{beat.scene_heading or ""}

SETTING: {setting_desc}

CHARACTERS IN SCENE:
{chars_description}

MOMENT TYPE: {moment_type}

Mood: {atmosphere}

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
    Generate protagonist image(s) WITHOUT reference images (style anchor).

    The protagonist is generated first and defines the visual style for the entire film.
    Set count=3 to generate 3 diverse scene options in parallel.

    Input: { "story": {...}, "count": 3 }
    Output: { "character_id": "...", "image": {...}, "images": [...], "prompt_used": "..." }
    """
    try:
        story = request.story
        count = min(max(request.count, 1), 3)

        # Find protagonist (role == "protagonist"), fallback to first character
        protagonist = next(
            (c for c in story.characters if c.role == "protagonist"),
            story.characters[0] if story.characters else None
        )

        if not protagonist:
            raise ValueError("No characters found in story")

        base_prompt = build_protagonist_prompt(story, protagonist)
        print(f"Generating {count} protagonist image(s) for '{protagonist.name}' as style anchor...")

        if count == 1:
            result = await generate_image(prompt=base_prompt, aspect_ratio="9:16")
            img = MoodboardImage(
                type="character",
                image_base64=result["image_base64"],
                mime_type=result["mime_type"],
                prompt_used=base_prompt
            )
            return GenerateProtagonistResponse(
                character_id=protagonist.id,
                image=img,
                images=[img],
                prompt_used=base_prompt,
                cost_usd=COST_IMAGE_GENERATION
            )

        # Batch: generate diverse shots in parallel
        async def gen_variant(i: int):
            variation = CHARACTER_SHOT_VARIATIONS[i % len(CHARACTER_SHOT_VARIATIONS)]
            # Replace the generic framing line with the variation
            prompt = base_prompt.replace(
                "Character clearly visible, head to mid-torso.\nShow the tension in their posture and expression.",
                variation
            )
            return await generate_image(prompt=prompt, aspect_ratio="9:16"), prompt

        results = await asyncio.gather(*[gen_variant(i) for i in range(count)], return_exceptions=True)
        images = []
        first_prompt = base_prompt
        for i, r in enumerate(results):
            if isinstance(r, Exception):
                print(f"Warning: Protagonist variant {i} failed: {r}")
                continue
            result, prompt = r
            images.append(MoodboardImage(
                type="character",
                image_base64=result["image_base64"],
                mime_type=result["mime_type"],
                prompt_used=prompt
            ))
            if i == 0:
                first_prompt = prompt

        if not images:
            raise ValueError("All image generation attempts failed")

        return GenerateProtagonistResponse(
            character_id=protagonist.id,
            image=images[0],
            images=images,
            prompt_used=first_prompt,
            cost_usd=COST_IMAGE_GENERATION * len(images)
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
    Generate reference image(s) for a specific character.

    If protagonist_image is provided, uses it as style reference for consistency.
    Set count=3 to generate 3 diverse scene options in parallel.

    Input: { "story": {...}, "character_id": "abc123", "protagonist_image": {...}, "count": 3 }
    Output: { "character_id": "abc123", "image": {...}, "images": [...], "prompt_used": "..." }
    """
    try:
        story = request.story
        count = min(max(request.count, 1), 3)
        character = get_character_by_id(story, request.character_id)

        use_reference = request.protagonist_image is not None
        base_prompt = build_character_prompt(story, character, use_reference=use_reference)
        print(f"Generating {count} character reference(s) for '{character.name}'...")
        print(f"Using protagonist as style reference: {use_reference}")

        refs = []
        if request.protagonist_image:
            refs = [{"image_base64": request.protagonist_image.image_base64, "mime_type": request.protagonist_image.mime_type}]

        async def gen_variant(i: int):
            variation = CHARACTER_SHOT_VARIATIONS[i % len(CHARACTER_SHOT_VARIATIONS)]
            prompt = base_prompt.replace(
                "Character fills most of the frame, clearly visible from head to mid-torso.\nShow enough detail to establish their complete look.",
                variation
            )
            if refs:
                return await generate_image_with_references(prompt=prompt, reference_images=refs, aspect_ratio="9:16"), prompt
            else:
                return await generate_image(prompt=prompt, aspect_ratio="9:16"), prompt

        if count == 1:
            result, prompt = await gen_variant(0)
            img = MoodboardImage(type="character", image_base64=result["image_base64"], mime_type=result["mime_type"], prompt_used=prompt)
            return GenerateCharacterResponse(
                character_id=request.character_id, image=img, images=[img],
                prompt_used=prompt, cost_usd=COST_IMAGE_GENERATION
            )

        results = await asyncio.gather(*[gen_variant(i) for i in range(count)], return_exceptions=True)
        images = []
        first_prompt = base_prompt
        for i, r in enumerate(results):
            if isinstance(r, Exception):
                print(f"Warning: Character variant {i} failed: {r}")
                continue
            result, prompt = r
            images.append(MoodboardImage(type="character", image_base64=result["image_base64"], mime_type=result["mime_type"], prompt_used=prompt))
            if i == 0:
                first_prompt = prompt

        if not images:
            raise ValueError("All image generation attempts failed")

        return GenerateCharacterResponse(
            character_id=request.character_id, image=images[0], images=images,
            prompt_used=first_prompt, cost_usd=COST_IMAGE_GENERATION * len(images)
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
    Refine a character image with feedback and optional reference images.

    Accepts protagonist_image for style consistency + up to 5 user-uploaded reference_images.

    Input: { "story": {...}, "character_id": "abc123", "feedback": "make them older",
             "protagonist_image": {...}, "reference_images": [{...}] }
    Output: { "character_id": "abc123", "image": {...}, "prompt_used": "..." }
    """
    try:
        story = request.story
        character = get_character_by_id(story, request.character_id)

        # Build reference list: protagonist + user-uploaded refs
        refs = []
        if request.protagonist_image:
            refs.append({"image_base64": request.protagonist_image.image_base64, "mime_type": request.protagonist_image.mime_type})
        if request.reference_images:
            for ref in request.reference_images[:5]:
                refs.append({"image_base64": ref.image_base64, "mime_type": ref.mime_type})

        use_reference = len(refs) > 0
        prompt = build_character_prompt(story, character, request.feedback, use_reference=use_reference)
        print(f"Refining character '{character.name}' with feedback: {request.feedback}")
        print(f"Reference images: {len(refs)} (protagonist + {len(refs) - (1 if request.protagonist_image else 0)} user-uploaded)")
        print(f"Prompt: {prompt[:200]}...")

        if refs:
            result = await generate_image_with_references(
                prompt=prompt,
                reference_images=refs,
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
    Generate reference image(s) for a specific location.

    If protagonist_image is provided, uses it as style reference for consistency.
    Set count=3 to generate 3 diverse scene options in parallel.

    Input: { "story": {...}, "location_id": "loc_1", "protagonist_image": {...}, "count": 3 }
    Output: { "location_id": "loc_1", "image": {...}, "images": [...], "prompt_used": "..." }
    """
    try:
        story = request.story
        count = min(max(request.count, 1), 3)
        location = _get_location_by_id(story, request.location_id)

        use_reference = request.protagonist_image is not None
        base_prompt = build_location_prompt(story, location, use_reference=use_reference)
        print(f"Generating {count} location reference(s) for '{location.id}'...")

        refs = []
        if request.protagonist_image:
            refs = [{"image_base64": request.protagonist_image.image_base64, "mime_type": request.protagonist_image.mime_type}]

        async def gen_variant(i: int):
            variation = LOCATION_SHOT_VARIATIONS[i % len(LOCATION_SHOT_VARIATIONS)]
            prompt = base_prompt.replace(
                "The space should feel charged and atmospheric.\nWide establishing shot showing the environment.",
                variation
            )
            if refs:
                return await generate_image_with_references(prompt=prompt, reference_images=refs, aspect_ratio="9:16"), prompt
            else:
                return await generate_image(prompt=prompt, aspect_ratio="9:16"), prompt

        if count == 1:
            result, prompt = await gen_variant(0)
            img = MoodboardImage(type="location", image_base64=result["image_base64"], mime_type=result["mime_type"], prompt_used=prompt)
            return GenerateLocationResponse(
                location_id=request.location_id, image=img, images=[img],
                prompt_used=prompt, cost_usd=COST_IMAGE_GENERATION
            )

        results = await asyncio.gather(*[gen_variant(i) for i in range(count)], return_exceptions=True)
        images = []
        first_prompt = base_prompt
        for i, r in enumerate(results):
            if isinstance(r, Exception):
                print(f"Warning: Location variant {i} failed: {r}")
                continue
            result, prompt = r
            images.append(MoodboardImage(type="location", image_base64=result["image_base64"], mime_type=result["mime_type"], prompt_used=prompt))
            if i == 0:
                first_prompt = prompt

        if not images:
            raise ValueError("All image generation attempts failed")

        return GenerateLocationResponse(
            location_id=request.location_id, image=images[0], images=images,
            prompt_used=first_prompt, cost_usd=COST_IMAGE_GENERATION * len(images)
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
    Refine a location image with feedback and optional reference images.

    Accepts protagonist_image for style consistency + up to 5 user-uploaded reference_images.

    Input: { "story": {...}, "location_id": "loc_1", "feedback": "make it darker",
             "protagonist_image": {...}, "reference_images": [{...}] }
    Output: { "location_id": "loc_1", "image": {...}, "prompt_used": "..." }
    """
    try:
        story = request.story
        location = _get_location_by_id(story, request.location_id)

        # Build reference list: protagonist + user-uploaded refs
        refs = []
        if request.protagonist_image:
            refs.append({"image_base64": request.protagonist_image.image_base64, "mime_type": request.protagonist_image.mime_type})
        if request.reference_images:
            for ref in request.reference_images[:5]:
                refs.append({"image_base64": ref.image_base64, "mime_type": ref.mime_type})

        use_reference = len(refs) > 0
        prompt = build_location_prompt(story, location, request.feedback, use_reference=use_reference)
        print(f"Refining location '{location.id}' with feedback: {request.feedback}")
        print(f"Reference images: {len(refs)}")
        print(f"Prompt: {prompt[:200]}...")

        if refs:
            result = await generate_image_with_references(
                prompt=prompt,
                reference_images=refs,
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
    Generate 3 key moment reference images from distinct scenes.
    Uses approved character and setting IMAGES for visual consistency.

    Each key moment uses the relevant characters and location for its beat.

    Input: {
        "story": {...},
        "approved_visuals": {
            "character_images": [{"image_base64": "...", "mime_type": "image/png"}, ...],
            "character_image_map": {"char_id": {"image_base64": "...", ...}},
            "setting_image": {"image_base64": "...", "mime_type": "image/png"},
            "location_images": {"loc_id": {"image_base64": "...", ...}},
            "character_descriptions": ["tall man with...", ...],
            "setting_description": "Ancient dojo..."
        }
    }
    Output: { "key_moment": {...}, "key_moments": [{...}, {...}, {...}] }
    """
    try:
        story = request.story
        approved = request.approved_visuals

        # Pick 3 distinct beats across the story arc
        key_beats = get_key_beats(story, count=3)
        print(f"Generating {len(key_beats)} key moment images from beats: {[b.number for b in key_beats]}")

        async def generate_one_key_moment(beat: Beat) -> KeyMomentImage:
            """Generate a single key moment image for one beat."""
            # Build per-beat reference images (characters in scene + scene location)
            refs: List[dict] = []

            # Add character refs relevant to this beat
            if beat.characters_in_scene and approved.character_image_map:
                for char_id in beat.characters_in_scene:
                    if char_id in approved.character_image_map:
                        char_ref = approved.character_image_map[char_id]
                        refs.append({"image_base64": char_ref.image_base64, "mime_type": char_ref.mime_type})
            # Fallback: use all character images if no per-beat info
            if not refs:
                for char_img in approved.character_images[:5]:
                    refs.append({"image_base64": char_img.image_base64, "mime_type": char_img.mime_type})

            # Add location image for this beat
            location_img = None
            if beat.location_id and beat.location_id in approved.location_images:
                location_img = approved.location_images[beat.location_id]
            elif approved.location_images:
                location_img = next(iter(approved.location_images.values()))
            elif approved.setting_image:
                location_img = approved.setting_image

            if location_img:
                refs.append({"image_base64": location_img.image_base64, "mime_type": location_img.mime_type})

            prompt = build_key_moment_prompt(story, beat, approved)
            print(f"  Beat {beat.number}: {len(refs)} refs, prompt: {prompt[:150]}...")

            result = await generate_image_with_references(
                prompt=prompt,
                reference_images=refs,
                aspect_ratio="9:16",
                resolution="2K"
            )

            beat_desc = beat.description or " ".join(
                b.text for b in (beat.blocks or []) if b.type in ("description", "action")
            ) or "Scene moment"

            return KeyMomentImage(
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

        # Generate all key moments in parallel
        results = await asyncio.gather(
            *[generate_one_key_moment(beat) for beat in key_beats],
            return_exceptions=True
        )

        # Filter out failures
        key_moments: List[KeyMomentImage] = []
        for r in results:
            if isinstance(r, KeyMomentImage):
                key_moments.append(r)
            else:
                print(f"  Key moment generation failed: {r}")

        if not key_moments:
            raise ValueError("All key moment generations failed")

        total_cost = len(key_moments) * COST_IMAGE_GENERATION
        return GenerateKeyMomentResponse(
            key_moment=key_moments[0],  # backward compat
            key_moments=key_moments,
            cost_usd=total_cost,
        )

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
