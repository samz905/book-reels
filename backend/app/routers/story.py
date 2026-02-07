"""
Story generation endpoints for AI video workflow.
Uses retention-optimized beat structure (Hook/Rise/Spike/Drop/Cliff).
"""
import json
import uuid
from typing import Optional, List, Literal
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..core import generate_text, estimate_story_cost

router = APIRouter()


# ============================================================
# Constants
# ============================================================

# Fixed at 8 shots (8 seconds each = ~64 seconds)
TOTAL_SHOTS = 8

# Beat type mapping (INTERNAL ONLY - never expose to client)
BEAT_NUMBER_TO_TYPE = {
    1: "hook",
    2: "rise",
    3: "rise",
    4: "spike",
    5: "spike",
    6: "drop",
    7: "drop",
    8: "cliff",
}

# Time ranges for each beat (INTERNAL ONLY)
BEAT_TIME_RANGES = {
    1: "0:00-0:08",
    2: "0:08-0:16",
    3: "0:16-0:24",
    4: "0:24-0:32",
    5: "0:32-0:40",
    6: "0:40-0:48",
    7: "0:48-0:56",
    8: "0:56-1:04",
}

STYLE_DISPLAY = {
    "cinematic": "Cinematic (photorealistic, shot on 35mm film)",
    "3d_animated": "3D Animated (Pixar-style rendering)",
    "2d_animated": "2D Animated (illustrated, hand-drawn aesthetic)",
}

# New retention-optimized system prompt
STORY_SYSTEM_PROMPT = """You are a vertical short-form scriptwriter specializing in 60-second episodes
designed for maximum viewer retention.

Your stories are engineered around VIEWER PSYCHOLOGY, not traditional story structure.

ABSOLUTE RULES:
- NO exposition
- NO narration
- NO backstory
- NO emotional resolution
- ONLY present-moment conflict
- ONLY dialogue and action
- Every line must INCREASE tension
- End BEFORE emotional release
- Start MID-ACTION (viewer must feel they joined late)

OUTPUT: Valid JSON only. No markdown, no explanation."""


# ============================================================
# Request/Response Models
# ============================================================

class Ingredients(BaseModel):
    """Story ingredients extracted from user idea (INTERNAL ONLY)."""
    protagonist: str
    antagonist: str
    immediate_tension: str
    secret: str
    spike_moment: str
    cliff_problem: str


class Character(BaseModel):
    id: str
    name: str
    gender: str  # e.g. "male", "female"
    age: str  # e.g. "mid-30s", "late 20s", "early 50s"
    appearance: str
    role: Literal["protagonist", "antagonist", "supporting"]


class Setting(BaseModel):
    """DEPRECATED - kept for backward compatibility. Use Location instead."""
    location: str
    time: str
    atmosphere: str


class Location(BaseModel):
    """A specific location/environment in the story."""
    id: str
    description: str   # e.g. "Modern kitchen, granite countertops, harsh overhead lighting"
    atmosphere: str     # e.g. "Tense, claustrophobic"


class DialogueLine(BaseModel):
    """A single line of dialogue."""
    character: str
    line: str


class Beat(BaseModel):
    """Beat representation - accepts both client (scene_number) and internal (beat_number) formats."""
    # Accept either beat_number or scene_number from client
    beat_number: Optional[int] = None
    scene_number: Optional[int] = None
    # Internal fields - optional when receiving from client
    beat_type: Optional[str] = None  # hook, rise, spike, drop, cliff - INTERNAL ONLY
    time_range: Optional[str] = None  # "0:00-0:08" etc - INTERNAL ONLY
    scene_heading: Optional[str] = None  # "INT. KITCHEN - NIGHT"
    description: str
    action: Optional[str] = None  # Physical movements, gestures, expressions
    scene_change: bool
    dialogue: Optional[List[DialogueLine]] = None  # Structured dialogue lines
    # Per-scene tracking for reference image selection
    characters_in_scene: Optional[List[str]] = None  # character IDs present in this scene
    location_id: Optional[str] = None                # which location this scene takes place in

    @property
    def number(self) -> int:
        """Get the beat/scene number regardless of which field was provided."""
        return self.beat_number or self.scene_number or 0


class Story(BaseModel):
    id: str
    title: str
    ingredients: Optional[Ingredients] = None  # Internal only - not sent by client
    characters: List[Character]
    setting: Optional[Setting] = None  # DEPRECATED - backward compat
    locations: List[Location] = []     # NEW - multiple locations
    beats: List[Beat]
    style: str


class GenerateStoryRequest(BaseModel):
    idea: str
    style: Literal["cinematic", "3d_animated", "2d_animated"]
    # No duration - fixed at 1 minute


class GenerateStoryResponse(BaseModel):
    story: Story
    cost_usd: float = 0.0


class RegenerateStoryRequest(BaseModel):
    idea: str
    style: Literal["cinematic", "3d_animated", "2d_animated"]
    feedback: Optional[str] = None
    # No duration - fixed at 1 minute


class RefineBeatRequest(BaseModel):
    story: Story
    beat_number: int
    feedback: str


class RefineBeatResponse(BaseModel):
    beat: Beat


# Client-facing models (sanitized)
class BeatClient(BaseModel):
    """Client-facing beat representation (sanitized - no beat_type or time_range)."""
    scene_number: int
    scene_heading: Optional[str] = None
    description: str
    action: Optional[str] = None
    scene_change: bool
    dialogue: Optional[List[DialogueLine]] = None
    characters_in_scene: Optional[List[str]] = None
    location_id: Optional[str] = None


class LocationClient(BaseModel):
    """Client-facing location representation."""
    id: str
    description: str
    atmosphere: str


class StoryClient(BaseModel):
    """Client-facing story representation (sanitized)."""
    id: str
    title: str
    characters: List[Character]
    setting: Optional[Setting] = None  # DEPRECATED - backward compat
    locations: List[LocationClient] = []
    beats: List[BeatClient]
    style: str


class GenerateStoryResponseClient(BaseModel):
    """Client-facing response (sanitized)."""
    story: StoryClient
    cost_usd: float = 0.0


# ============================================================
# Helper Functions
# ============================================================

def sanitize_story_for_client(story: Story) -> dict:
    """Strip internal fields (beat_type, time_range, ingredients) before sending to client."""
    result = {
        "id": story.id,
        "title": story.title,
        "characters": [c.model_dump() for c in story.characters],
        "locations": [loc.model_dump() for loc in story.locations],
        "beats": [
            {
                "scene_number": beat.beat_number,
                "scene_heading": beat.scene_heading,
                "description": beat.description,
                "action": beat.action,
                "scene_change": beat.scene_change,
                "dialogue": [d.model_dump() for d in beat.dialogue] if beat.dialogue else None,
                "characters_in_scene": beat.characters_in_scene,
                "location_id": beat.location_id,
            }
            for beat in story.beats
        ],
        "style": story.style,
    }

    # Backward compat: derive setting from first location
    if story.setting:
        result["setting"] = story.setting.model_dump()
    elif story.locations:
        result["setting"] = {
            "location": story.locations[0].description,
            "time": "",
            "atmosphere": story.locations[0].atmosphere,
        }

    return result


def build_story_prompt(idea: str, style: str, feedback: Optional[str] = None) -> str:
    """Build the user prompt for story generation using retention formula."""
    style_display = STYLE_DISPLAY[style]

    prompt = f"""Turn this idea into a 60-second vertical episode:

IDEA: "{idea}"
STYLE: {style_display}

STEP 1 - Extract these ingredients from the idea:
- Protagonist: Who we follow
- Antagonist/Opposing Force: Source of conflict
- Immediate Tension: What's at stake RIGHT NOW
- Hidden Information/Secret/Desire: What's being concealed
- High-Impact Moment: The emotional spike that could happen
- Worse Problem: What follows the spike

STEP 2 - Write exactly 8 scenes using this time map:

SCENE 1 (0:00-0:08) - Start MID-EXPLOSION
Open with dialogue or action ALREADY IN PROGRESS.
No setup. No explanation.
A confrontation, accusation, kiss, slap, discovery, or shocking line.
Viewer must feel they joined too late.

SCENE 2-3 (0:08-0:24) - Escalate through conflict
Through emotionally charged dialogue or action, make clear:
- Who these people are to each other
- What the conflict is
- Why this moment matters RIGHT NOW
No backstory. Only tension.

SCENE 4-5 (0:24-0:40) - Deliver the dopamine hit
The highest emotional payoff. Must be ONE of:
- Reveal
- Betrayal
- Power move
- Kiss
- Humiliation
- Discovery
- Threat
This is the moment viewers came for.

SCENE 6-7 (0:40-0:56) - Show the aftermath
The consequence of the spike:
- A realization
- A shift in power
- A new problem created
- A vulnerable reaction
Do NOT resolve tension. DEEPEN it.

SCENE 8 (0:56-1:04) - End on a WORSE question
A new, more dangerous unanswered question than at the start:
- Someone overheard
- A door opens
- A message arrives
- A third person enters
- A shocking line
HARD CUT. No resolution.

OUTPUT FORMAT (JSON):
{{
  "title": "Provocative 2-4 word title",

  "ingredients": {{
    "protagonist": "...",
    "antagonist": "...",
    "immediate_tension": "...",
    "secret": "...",
    "spike_moment": "...",
    "cliff_problem": "..."
  }},

  "characters": [
    {{
      "id": "unique_id",
      "name": "Name",
      "gender": "male or female",
      "age": "rough age like mid-30s, late 20s, early 50s",
      "appearance": "4-5 specific visual details we will SEE (hair, clothing, distinguishing features)",
      "role": "protagonist|antagonist|supporting"
    }}
  ],

  "locations": [
    {{
      "id": "loc_1",
      "description": "Specific location with visual details (lighting, furniture, textures)",
      "atmosphere": "Tense, charged, intimate, etc."
    }}
  ],

  "beats": [
    {{
      "beat_number": 1,
      "scene_heading": "INT. KITCHEN - NIGHT",
      "description": "2-3 sentences. Visual, atmospheric. What the CAMERA sees when the scene opens.",
      "action": "What the characters are DOING. Physical movements, gestures, expressions.",
      "scene_change": false,
      "dialogue": [
        {{ "character": "Elena", "line": "Who is she, Marcus?" }},
        {{ "character": "Marcus", "line": "..." }}
      ],
      "characters_in_scene": ["char_id_1", "char_id_2"],
      "location_id": "loc_1"
    }}
  ]
}}

SCENE WRITING RULES:
- scene_heading: Standard screenplay format (INT/EXT. LOCATION - TIME)
- description: 2-3 sentences. Visual, atmospheric. What the CAMERA sees.
- action: Physical movements, expressions, gestures. Show don't tell.
- dialogue: Array of character lines. Keep dialogue punchy. Can be 1 line or several — whatever fits the scene. Some scenes may have no dialogue at all (use null).

Remember:
- 8 scenes total
- Each scene = one 8-second video shot
- NO backstory, NO exposition
- End BEFORE resolution
- The cliff must create a WORSE unanswered question"""

    if feedback:
        prompt += f"""

USER FEEDBACK (incorporate this into the new version):
{feedback}"""

    return prompt


def parse_story_response(response_text: str, style: str) -> Story:
    """Parse the AI response into a Story object, adding internal beat metadata."""
    # Clean up response - remove markdown code blocks if present
    cleaned = response_text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    if cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    # Parse JSON
    data = json.loads(cleaned)

    # Add metadata
    data["id"] = str(uuid.uuid4())
    data["style"] = style

    # Backward compat: if response has "setting" but no "locations", auto-convert
    if "setting" in data and "locations" not in data:
        setting = data["setting"]
        data["locations"] = [{
            "id": "loc_main",
            "description": f"{setting.get('location', '')}, {setting.get('time', '')}",
            "atmosphere": setting.get("atmosphere", ""),
        }]

    # Ensure all character IDs are available for defaulting
    all_char_ids = [c.get("id", "") for c in data.get("characters", [])]

    # Add internal beat_type and time_range to each beat
    for beat in data.get("beats", []):
        beat_num = beat.get("beat_number", 1)
        beat["beat_type"] = BEAT_NUMBER_TO_TYPE.get(beat_num, "rise")
        beat["time_range"] = BEAT_TIME_RANGES.get(beat_num, "0:00-0:08")

        # Default characters_in_scene to all characters if not specified
        if not beat.get("characters_in_scene"):
            beat["characters_in_scene"] = all_char_ids

        # Default location_id to first location if not specified
        if not beat.get("location_id") and data.get("locations"):
            beat["location_id"] = data["locations"][0]["id"]

        # Normalize dialogue: handle string (legacy) or list (new format)
        raw_dialogue = beat.get("dialogue")
        if isinstance(raw_dialogue, str):
            beat["dialogue"] = [{"character": "Unknown", "line": raw_dialogue}]
        elif isinstance(raw_dialogue, list):
            pass  # Already in correct format
        else:
            beat["dialogue"] = None

    return Story(**data)


# ============================================================
# Endpoints
# ============================================================

@router.post("/generate", response_model=GenerateStoryResponseClient)
async def generate_story(request: GenerateStoryRequest):
    """
    Generate story beats from an idea.

    Input: { "idea": "...", "style": "cinematic"|"3d_animated"|"2d_animated" }
    Output: { "story": { "id": "...", "title": "...", "characters": [...], "setting": {...}, "beats": [...] } }

    Note: Duration is fixed at 1 minute (8 shots x 8 seconds = 64 seconds)
    """
    try:
        prompt = build_story_prompt(request.idea, request.style)

        response = await generate_text(
            prompt=prompt,
            system_prompt=STORY_SYSTEM_PROMPT,
            model="gemini-2.0-flash"
        )

        story = parse_story_response(response, request.style)
        cost = estimate_story_cost(len(story.beats))

        # Sanitize before returning to client
        sanitized = sanitize_story_for_client(story)
        return {"story": sanitized, "cost_usd": round(cost, 4)}

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response as JSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/regenerate", response_model=GenerateStoryResponseClient)
async def regenerate_story(request: RegenerateStoryRequest):
    """
    Regenerate entire story with optional feedback.

    Input: { "idea": "...", "style": "...", "feedback": "optional feedback" }
    Output: { "story": { ... } }

    Note: Duration is fixed at 1 minute (8 shots x 8 seconds = 64 seconds)
    """
    try:
        prompt = build_story_prompt(
            request.idea,
            request.style,
            request.feedback
        )

        response = await generate_text(
            prompt=prompt,
            system_prompt=STORY_SYSTEM_PROMPT,
            model="gemini-2.0-flash"
        )

        story = parse_story_response(response, request.style)
        cost = estimate_story_cost(len(story.beats))

        # Sanitize before returning to client
        sanitized = sanitize_story_for_client(story)
        return {"story": sanitized, "cost_usd": round(cost, 4)}

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response as JSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/refine-beat", response_model=RefineBeatResponse)
async def refine_beat(request: RefineBeatRequest):
    """
    Refine a specific beat based on feedback.

    Input: { "story": {...}, "beat_number": 3, "feedback": "make it more dramatic" }
    Output: { "beat": { "beat_number": 3, "description": "...", ... } }
    """
    try:
        # Find the current beat
        current_beat = None
        for beat in request.story.beats:
            if beat.beat_number == request.beat_number:
                current_beat = beat
                break

        if not current_beat:
            raise HTTPException(status_code=400, detail=f"Beat {request.beat_number} not found in story")

        # Build context from all beats (without exposing beat_type)
        def _beat_summary(b: Beat) -> str:
            parts = [f"Scene {b.beat_number}: {b.description}"]
            if b.action:
                parts.append(f"  Action: {b.action}")
            if b.dialogue:
                for d in b.dialogue:
                    parts.append(f"  {d.character}: \"{d.line}\"")
            return "\n".join(parts)

        beats_context = "\n\n".join([_beat_summary(b) for b in request.story.beats])

        # Build characters context
        characters_context = "\n".join([
            f"- {c.name} ({c.age} {c.gender}): {c.appearance}"
            for c in request.story.characters
        ])

        # Build locations context
        locations_context = "\n".join([
            f"- {loc.id}: {loc.description} ({loc.atmosphere})"
            for loc in request.story.locations
        ]) if request.story.locations else "No locations defined"

        # Determine current setting context (backward compat)
        if request.story.locations:
            setting_context = locations_context
        elif request.story.setting:
            setting_context = f"{request.story.setting.location}, {request.story.setting.time}\nATMOSPHERE: {request.story.setting.atmosphere}"
        else:
            setting_context = "Not specified"

        # All character IDs for the output
        all_char_ids = [c.id for c in request.story.characters]
        location_ids = [loc.id for loc in request.story.locations] if request.story.locations else []

        # Format current dialogue for context
        current_dialogue_str = "None"
        if current_beat.dialogue:
            current_dialogue_str = json.dumps(
                [{"character": d.character, "line": d.line} for d in current_beat.dialogue]
            )

        prompt = f"""You are refining Scene {request.beat_number} of a story.

STORY TITLE: {request.story.title}

CHARACTERS:
{characters_context}

LOCATIONS:
{setting_context}

ALL SCENES FOR CONTEXT:
{beats_context}

CURRENT SCENE {request.beat_number} TO REFINE:
Scene Heading: {current_beat.scene_heading or "Not set"}
Description: {current_beat.description}
Action: {current_beat.action or "Not set"}
Dialogue: {current_dialogue_str}
Scene Change: {current_beat.scene_change}
Characters in scene: {current_beat.characters_in_scene or all_char_ids}
Location: {current_beat.location_id or (location_ids[0] if location_ids else "unknown")}

USER FEEDBACK: {request.feedback}

Rewrite ONLY Scene {request.beat_number} incorporating the feedback while maintaining story continuity.
Remember: NO exposition, NO backstory, ONLY present-moment conflict.

OUTPUT FORMAT (JSON only, no explanation):
{{
  "beat_number": {request.beat_number},
  "scene_heading": "INT/EXT. LOCATION - TIME",
  "description": "2-3 sentences. Visual, atmospheric. What the CAMERA sees.",
  "action": "Physical movements, expressions, gestures.",
  "scene_change": {str(current_beat.scene_change).lower()},
  "dialogue": [{{"character": "Name", "line": "What they say"}}],
  "characters_in_scene": {json.dumps(current_beat.characters_in_scene or all_char_ids)},
  "location_id": "{current_beat.location_id or (location_ids[0] if location_ids else 'loc_main')}"
}}"""

        system_prompt = """You are a short film writer refining a single scene.
Keep the scene consistent with the overall story but incorporate the user's feedback.
Write what we SEE and HEAR, not internal thoughts.
NO exposition, NO backstory.
OUTPUT: Valid JSON only. No markdown, no explanation."""

        response = await generate_text(
            prompt=prompt,
            system_prompt=system_prompt,
            model="gemini-2.0-flash"
        )

        # Clean up response
        cleaned = response.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        beat_data = json.loads(cleaned)

        # Add internal metadata
        beat_num = beat_data.get("beat_number", request.beat_number)
        beat_data["beat_type"] = BEAT_NUMBER_TO_TYPE.get(beat_num, "rise")
        beat_data["time_range"] = BEAT_TIME_RANGES.get(beat_num, "0:00-0:08")

        # Normalize dialogue format
        raw_dialogue = beat_data.get("dialogue")
        if isinstance(raw_dialogue, str):
            beat_data["dialogue"] = [{"character": "Unknown", "line": raw_dialogue}]
        elif not isinstance(raw_dialogue, list):
            beat_data["dialogue"] = None

        # Ensure scene_number is set for frontend compatibility
        beat_data["scene_number"] = beat_data.get("beat_number", request.beat_number)

        beat = Beat(**beat_data)

        return RefineBeatResponse(beat=beat)

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response as JSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Internal endpoint for other services (returns full internal data)
# ============================================================

@router.post("/generate-internal", response_model=GenerateStoryResponse)
async def generate_story_internal(request: GenerateStoryRequest):
    """
    Internal endpoint that returns full story data including beat_type and ingredients.
    Used by moodboard and film generation services.
    """
    try:
        prompt = build_story_prompt(request.idea, request.style)

        response = await generate_text(
            prompt=prompt,
            system_prompt=STORY_SYSTEM_PROMPT,
            model="gemini-2.0-flash"
        )

        story = parse_story_response(response, request.style)
        cost = estimate_story_cost(len(story.beats))

        # Return full internal story (not sanitized)
        return GenerateStoryResponse(story=story, cost_usd=round(cost, 4))

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response as JSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
