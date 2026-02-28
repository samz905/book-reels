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
from ..prompts import (
    STORY_SYSTEM_PROMPT, STORY_MODEL, STORY_FEW_SHOT_EXAMPLES,
    STORY_SCHEMA, REFINED_SCENE_SCHEMA, SCENE_DESCRIPTIONS_SCHEMA,
)

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
    "anime": "Anime (Studio Ghibli-style aesthetic)",
    "animated": "Animated (western animated style)",
    "pixar": "Pixar (3D Pixar-style rendering)",
}

# STORY_SYSTEM_PROMPT, STORY_MODEL, STORY_FEW_SHOT_EXAMPLES imported from ..prompts


# ============================================================
# Request/Response Models
# ============================================================

class Ingredients(BaseModel):
    """Story ingredients extracted from user idea (INTERNAL ONLY)."""
    protagonist: str
    conflict_source: Optional[str] = None
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
    origin: Optional[Literal["story", "ai"]] = "ai"  # "story" = pre-selected from library


class PreSelectedCharacter(BaseModel):
    """Character pre-selected from the story library before script generation."""
    id: str
    name: str
    gender: str
    age: str
    appearance: str
    role: Literal["protagonist", "antagonist", "supporting"]


class LibraryCharacter(BaseModel):
    """Character from the story library (all chars sent, AI picks relevant ones)."""
    id: str
    name: str
    gender: str = ""
    age: str = ""
    appearance: str = ""
    role: str = "supporting"


class PreSelectedLocation(BaseModel):
    """Location pre-selected from the story library before script generation."""
    id: str
    name: str
    description: str
    atmosphere: str


class LibraryLocation(BaseModel):
    """Location from the story library (all locs sent, AI picks relevant ones)."""
    id: str
    name: str
    description: str = ""
    atmosphere: str = ""


class Setting(BaseModel):
    """DEPRECATED - kept for backward compatibility. Use Location instead."""
    location: str
    time: str
    atmosphere: str


class Location(BaseModel):
    """A specific location/environment in the story."""
    id: str
    name: str = ""      # e.g. "Kitchen", "Hospital Suite" (empty for old data)
    description: str    # e.g. "Modern kitchen, granite countertops, harsh overhead lighting"
    atmosphere: str     # e.g. "Tense, claustrophobic"


class DialogueLine(BaseModel):
    """A single line of dialogue."""
    character: str
    line: str


class SceneBlock(BaseModel):
    """A single content block within a scene. Scenes are ordered lists of blocks."""
    type: Literal["description", "action", "dialogue"]
    text: str                          # Content text (description/action text, or dialogue line)
    character: Optional[str] = None    # Speaker name (dialogue blocks only)


# Max blocks per scene — keeps content within 8s clip capacity
MAX_BLOCKS_PER_SCENE = 5


class Beat(BaseModel):
    """Beat representation - accepts both client (scene_number) and internal (beat_number) formats."""
    # Accept either beat_number or scene_number from client
    beat_number: Optional[int] = None
    scene_number: Optional[int] = None
    # Internal fields - optional when receiving from client
    beat_type: Optional[str] = None  # hook, rise, spike, drop, cliff - INTERNAL ONLY
    time_range: Optional[str] = None  # "0:00-0:08" etc - INTERNAL ONLY
    scene_heading: Optional[str] = None  # "INT. KITCHEN - NIGHT"
    blocks: List[SceneBlock] = []  # Ordered content blocks (primary representation)
    scene_change: bool
    characters_in_scene: Optional[List[str]] = None  # character IDs present in this scene
    location_id: Optional[str] = None                # which location this scene takes place in
    # Legacy fields — kept for backward compat + Gemini output parsing
    description: Optional[str] = None
    action: Optional[str] = None
    dialogue: Optional[List[DialogueLine]] = None

    @property
    def number(self) -> int:
        """Get the beat/scene number regardless of which field was provided."""
        return self.beat_number or self.scene_number or 0


class Scene(BaseModel):
    """Structured scene model per Founders' Playbook format."""
    scene_number: int
    title: str = ""
    duration: str = "8 seconds"
    characters_on_screen: List[str] = []
    setting_id: str = ""
    action: str = ""
    dialogue: Optional[str] = None
    image_prompt: str = ""
    regenerate_notes: str = ""
    scene_change: bool = False
    scene_heading: Optional[str] = None
    # Internal only
    beat_type: Optional[str] = None
    time_range: Optional[str] = None


class Story(BaseModel):
    id: str
    title: str = ""  # Not used for episode naming — episode name set by user
    ingredients: Optional[Ingredients] = None
    characters: List[Character]
    setting: Optional[Setting] = None       # DEPRECATED
    locations: List[Location] = []
    scenes: List[Scene] = []                # NEW - primary representation
    beats: List[Beat] = []                  # DEPRECATED - backward compat for pipeline
    style: str


class GenerateStoryRequest(BaseModel):
    idea: str
    style: Literal["cinematic", "anime", "animated", "pixar"]
    characters: Optional[List[PreSelectedCharacter]] = None
    location: Optional[PreSelectedLocation] = None
    library_characters: Optional[List[LibraryCharacter]] = None
    library_locations: Optional[List[LibraryLocation]] = None
    # No duration - fixed at 1 minute


class GenerateStoryResponse(BaseModel):
    story: Story
    cost_usd: float = 0.0


class RegenerateStoryRequest(BaseModel):
    idea: str
    style: Literal["cinematic", "anime", "animated", "pixar"]
    feedback: Optional[str] = None
    characters: Optional[List[PreSelectedCharacter]] = None
    location: Optional[PreSelectedLocation] = None
    library_characters: Optional[List[LibraryCharacter]] = None
    library_locations: Optional[List[LibraryLocation]] = None
    # No duration - fixed at 1 minute


class ParseScriptRequest(BaseModel):
    script: str
    style: Literal["cinematic", "anime", "animated", "pixar"] = "cinematic"


class RefineBeatRequest(BaseModel):
    story: Story
    beat_number: int
    feedback: str


class RefineBeatResponse(BaseModel):
    beat: Beat


# Client-facing models (sanitized)
class SceneClient(BaseModel):
    """Client-facing scene representation."""
    scene_number: int
    title: str = ""
    duration: str = "8 seconds"
    characters_on_screen: List[str] = []
    setting_id: str = ""
    action: str = ""
    dialogue: Optional[str] = None
    image_prompt: str = ""
    regenerate_notes: str = ""
    scene_change: bool = False
    scene_heading: Optional[str] = None


class BeatClient(BaseModel):
    """DEPRECATED - Client-facing beat representation."""
    scene_number: int
    scene_heading: Optional[str] = None
    blocks: List[SceneBlock] = []
    scene_change: bool
    characters_in_scene: Optional[List[str]] = None
    location_id: Optional[str] = None
    description: Optional[str] = None
    action: Optional[str] = None
    dialogue: Optional[List[DialogueLine]] = None


class LocationClient(BaseModel):
    """Client-facing location representation."""
    id: str
    name: str = ""
    description: str
    atmosphere: str


class StoryClient(BaseModel):
    """Client-facing story representation (sanitized)."""
    id: str
    title: str
    characters: List[Character]
    setting: Optional[Setting] = None
    locations: List[LocationClient] = []
    scenes: List[SceneClient] = []      # NEW - primary
    beats: List[BeatClient] = []        # DEPRECATED - backward compat
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
    result: dict = {
        "id": story.id,
        "title": story.title,
        "characters": [c.model_dump() for c in story.characters],
        "locations": [
            {"id": loc.id, "name": loc.name, "description": loc.description, "atmosphere": loc.atmosphere}
            for loc in story.locations
        ],
        "scenes": [
            {
                "scene_number": scene.scene_number,
                "title": scene.title,
                "duration": scene.duration,
                "characters_on_screen": scene.characters_on_screen,
                "setting_id": scene.setting_id,
                "action": scene.action,
                "dialogue": scene.dialogue,
                "image_prompt": scene.image_prompt,
                "regenerate_notes": scene.regenerate_notes,
                "scene_change": scene.scene_change,
                "scene_heading": scene.scene_heading,
            }
            for scene in story.scenes
        ],
        "beats": [
            {
                "scene_number": beat.beat_number,
                "scene_heading": beat.scene_heading,
                "blocks": [b.model_dump() for b in beat.blocks],
                "scene_change": beat.scene_change,
                "characters_in_scene": beat.characters_in_scene,
                "location_id": beat.location_id,
                "description": beat.description,
                "action": beat.action,
                "dialogue": [d.model_dump() for d in beat.dialogue] if beat.dialogue else None,
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


def scene_to_beat(scene: Scene) -> dict:
    """Convert a Scene to a Beat-compatible dict for backward compatibility."""
    blocks = []
    dialogue_list = []
    if scene.image_prompt:
        blocks.append({"type": "description", "text": scene.image_prompt})
    if scene.action:
        blocks.append({"type": "action", "text": scene.action})
    if scene.dialogue:
        for raw_line in scene.dialogue.strip().split("\n"):
            raw_line = raw_line.strip()
            if not raw_line:
                continue
            if ":" in raw_line:
                char, text = raw_line.split(":", 1)
                blocks.append({"type": "dialogue", "text": text.strip(), "character": char.strip()})
                dialogue_list.append({"character": char.strip(), "line": text.strip()})
            else:
                blocks.append({"type": "dialogue", "text": raw_line, "character": "Unknown"})
                dialogue_list.append({"character": "Unknown", "line": raw_line})

    return {
        "beat_number": scene.scene_number,
        "scene_number": scene.scene_number,
        "beat_type": scene.beat_type,
        "time_range": scene.time_range,
        "scene_heading": scene.scene_heading,
        "blocks": blocks,
        "scene_change": scene.scene_change,
        "characters_in_scene": scene.characters_on_screen,
        "location_id": scene.setting_id,
        "description": scene.image_prompt,
        "action": scene.action,
        "dialogue": dialogue_list if dialogue_list else None,
    }


def beat_to_scene(beat_data: dict, scene_num: int) -> Scene:
    """Convert a parsed beat dict to a Scene for forward compatibility."""
    desc_parts = []
    action_parts = []
    dialogue_parts = []

    for block in beat_data.get("blocks", []):
        if isinstance(block, dict):
            btype = block.get("type", "")
            if btype == "description":
                desc_parts.append(block.get("text", ""))
            elif btype == "action":
                action_parts.append(block.get("text", ""))
            elif btype == "dialogue":
                char = block.get("character", "Unknown")
                dialogue_parts.append(f"{char}: {block.get('text', '')}")

    if not desc_parts and beat_data.get("description"):
        desc_parts.append(beat_data["description"])
    if not action_parts and beat_data.get("action"):
        action_parts.append(beat_data["action"])
    if not dialogue_parts and beat_data.get("dialogue"):
        for d in beat_data["dialogue"]:
            if isinstance(d, dict):
                dialogue_parts.append(f"{d.get('character', 'Unknown')}: {d.get('line', '')}")

    return Scene(
        scene_number=scene_num,
        title=f"Scene {scene_num}",
        duration="8 seconds",
        characters_on_screen=beat_data.get("characters_in_scene") or [],
        setting_id=beat_data.get("location_id") or "",
        action=" ".join(action_parts),
        dialogue="\n".join(dialogue_parts) if dialogue_parts else None,
        image_prompt=" ".join(desc_parts),
        regenerate_notes="",
        scene_change=beat_data.get("scene_change", False),
        scene_heading=beat_data.get("scene_heading"),
        beat_type=beat_data.get("beat_type"),
        time_range=beat_data.get("time_range"),
    )


def build_story_prompt(
    idea: str,
    style: str,
    feedback: Optional[str] = None,
    characters: Optional[List[PreSelectedCharacter]] = None,
    location: Optional[PreSelectedLocation] = None,
    library_characters: Optional[List[LibraryCharacter]] = None,
    library_locations: Optional[List[LibraryLocation]] = None,
) -> str:
    """Build the user prompt for story generation using Playbook structural blueprint."""
    style_display = STYLE_DISPLAY[style]

    prompt = f"""Turn this idea into a 1-minute vertical episode with exactly 8 scenes:

IDEA: "{idea}"
STYLE: {style_display}

STEP 1 — Extract story ingredients:
- Protagonist: Who we follow
- Conflict Source: What person, force, or situation directly opposes the protagonist (must be visible on-screen)
- Immediate Tension: What's at stake RIGHT NOW
- Hidden Information/Secret: What's being concealed
- Peak Moment: The emotional spike (Scene 4)
- Cliff Problem: What new danger emerges at the end

STEP 2 — Create characters:
For each: id (snake_case), name, gender, age (e.g. "mid-30s"), appearance (4-5 specific visual details we will SEE on camera), role (protagonist/antagonist/supporting)."""

    # Inject pre-selected characters (legacy: explicit selection)
    if characters:
        char_lines = []
        for c in characters:
            char_lines.append(
                f'  - id: "{c.id}", name: "{c.name}", gender: "{c.gender}", '
                f'age: "{c.age}", appearance: "{c.appearance}", role: "{c.role}"'
            )
        prompt += f"""

PRE-SELECTED CHARACTERS (YOU MUST USE THESE EXACTLY — keep their id, name, gender, age, and role unchanged. You may enrich their appearance field):
{chr(10).join(char_lines)}
Create additional supporting characters ONLY if the story absolutely requires them. Any additional characters must have origin "ai"."""
    elif library_characters:
        # New: all library chars provided, AI picks the relevant ones
        char_lines = []
        for c in library_characters:
            char_lines.append(
                f'  - id: "{c.id}", name: "{c.name}", gender: "{c.gender}", '
                f'age: "{c.age}", appearance: "{c.appearance}", role: "{c.role}"'
            )
        prompt += f"""

STORY CHARACTER LIBRARY (pick the most relevant characters for this episode):
{chr(10).join(char_lines)}
For library characters: include them in the characters array using their EXACT id and name. Set origin to "story". You can write a short placeholder for appearance — all library fields are auto-filled from the database.
You may create additional supporting characters if the story requires them. Any new characters must have origin "ai"."""

    prompt += """

STEP 3 — Create locations:
For each: id (e.g. "loc_1"), name (short name like "Kitchen" or "Hospital Suite"), description (specific visual details — lighting, furniture, textures), atmosphere (emotional tone)."""

    # Inject pre-selected location + single-location constraint
    if location:
        prompt += f"""

PRE-SELECTED LOCATION (USE THIS for ALL 8 scenes — do NOT create additional locations):
  - id: "{location.id}", name: "{location.name}", description: "{location.description}", atmosphere: "{location.atmosphere}"
Every scene's setting_id MUST be "{location.id}". This follows the Vibe Application Rules: consistent environment across all scenes."""
    elif library_locations:
        # New: all library locs provided, AI picks the most fitting one
        loc_lines = []
        for loc in library_locations:
            loc_lines.append(
                f'  - id: "{loc.id}", name: "{loc.name}", description: "{loc.description}", atmosphere: "{loc.atmosphere}"'
            )
        prompt += f"""

STORY LOCATION LIBRARY (pick the SINGLE most appropriate location for this episode — all 8 scenes must use the same location):
{chr(10).join(loc_lines)}
Preserve the chosen location's id, name, description unchanged. You may create a new location ONLY if none from the library fit.
Every scene's setting_id MUST reference the chosen location. This follows the Vibe Application Rules: consistent environment across all scenes."""
    else:
        prompt += """

IMPORTANT: Create exactly ONE location. All 8 scenes MUST use the same location (same setting_id). This follows the Vibe Application Rules: lighting, color palette, environment, and camera style remain consistent. Only emotional intensity changes."""

    prompt += """

STEP 4 — Write exactly 8 scenes following the structural blueprint.
For each scene provide ALL of these fields:
- scene_number: 1-8
- title: Short descriptive name (2-4 words)
- duration: "X seconds" (6-9)
- characters_on_screen: Array of character IDs present in the scene
- setting_id: Location ID for this scene
- action: JSON ARRAY of 4-8 short fragment strings (each micro-action its own element, use "Beat." and "Silence." as pacing)
- dialogue: 2-4 rapid-fire "CHARACTER: line" exchanges (verbal sparring, thrust-and-parry), or null for silent scenes
- image_prompt: What the camera sees — composition, framing, lighting, character positions, expressions, key objects. Write for a camera operator.
- regenerate_notes: What can vary visually without breaking story continuity
- scene_heading: Standard screenplay format (INT/EXT. LOCATION - TIME)
- scene_change: true if location differs from previous scene

OUTPUT FORMAT (JSON):
{
  "ingredients": {
    "protagonist": "...",
    "conflict_source": "...",
    "immediate_tension": "...",
    "secret": "...",
    "spike_moment": "...",
    "cliff_problem": "..."
  },

  "characters": [
    {
      "id": "unique_id",
      "name": "Name",
      "gender": "male or female",
      "age": "rough age like mid-30s",
      "appearance": "4-5 specific visual details",
      "role": "protagonist|antagonist|supporting"
    }
  ],

  "locations": [
    {
      "id": "loc_1",
      "name": "Kitchen",
      "description": "Specific visual details of the location",
      "atmosphere": "Emotional tone"
    }
  ],

  "scenes": [
    {
      "scene_number": 1,
      "title": "The Accusation",
      "duration": "8 seconds",
      "characters_on_screen": ["char_1", "char_2"],
      "setting_id": "loc_1",
      "action": ["He steps closer.", "Blocking her path.", "She doesn't flinch.", "Beat.", "He stiffens."],
      "dialogue": "VICTOR: Sit down.\nANA: Make me.",
      "image_prompt": "Tight close-up of two faces in harsh kitchen light, granite countertop between them, one hand flat on surface, other backing toward door",
      "regenerate_notes": "Exact hand positions and background objects can vary",
      "scene_heading": "INT. KITCHEN - NIGHT",
      "scene_change": false
    }
  ]
}

SHOW, DON'T TELL:
- WRONG: "ALEX: The detective is closing in on us." (discussing absent character)
- RIGHT: "DETECTIVE: [entering] Don't move." (conflict happens on-screen)
- WRONG: Scene with only "Character turns and looks thoughtful." (too thin for 8 seconds)
- RIGHT: Scene with specific physical actions, spatial movement, and visual beats to fill 6-9 seconds

CRITICAL RULES:
- Exactly 8 scenes, each 6-9 seconds
- NO backstory, NO exposition
- Dialogue: 2-4 rapid-fire exchanges per scene (some scenes silent)
- End BEFORE resolution
- Scene 4 = emotional peak (biggest payoff)
- Scene 8 = NEW unanswered threat, hard cut
- image_prompt must be specific and visual: objects, textures, body language, composition, lighting"""

    if feedback:
        prompt += f"""

USER FEEDBACK (incorporate into the new version):
{feedback}"""

    return prompt


def build_parse_script_prompt(script: str, style: str) -> str:
    """Build the user prompt for parsing a user-provided script into structured scenes."""
    style_display = STYLE_DISPLAY.get(style, STYLE_DISPLAY["cinematic"])

    prompt = f"""You are given a user-written script. Parse it into a structured episode format.

STYLE: {style_display}

USER SCRIPT:
\"\"\"
{script}
\"\"\"

YOUR TASK:
1. Extract all characters from the script. For each, infer:
   - id (snake_case like "char_1")
   - name
   - gender (infer from name/context)
   - age (rough estimate like "mid-30s")
   - appearance (infer 4-5 specific visual details from context — hair, clothing, build, distinguishing features)
   - role (protagonist, antagonist, or supporting)

2. Extract all locations. For each:
   - id (like "loc_1")
   - name (short name like "Kitchen" or "Hospital Suite")
   - description (specific visual details — lighting, furniture, textures)
   - atmosphere (emotional tone)

3. Split the script into exactly 8 scenes (each 6-9 seconds, ~64 seconds total).
   - Preserve the user's dialogue and action as closely as possible
   - Redistribute content across 8 scenes to fit the time structure
   - Follow the structural blueprint: Scene 1=Disruption, Scene 4=Peak, Scene 8=Cliffhanger

4. For each scene provide ALL of these fields:
   - scene_number: 1-8
   - title: Short descriptive name (2-4 words)
   - duration: "X seconds" (6-9)
   - characters_on_screen: Array of character IDs present in the scene
   - setting_id: Location ID for this scene
   - action: 1-2 sentences of what characters physically do
   - dialogue: "CHARACTER: line" format with 1-2 lines max, or null for silent scenes
   - image_prompt: What the camera sees — composition, framing, lighting, character positions, expressions
   - regenerate_notes: What can vary visually without breaking story continuity
   - scene_heading: Standard screenplay format (INT/EXT. LOCATION - TIME)
   - scene_change: true if location differs from previous scene

OUTPUT FORMAT (JSON only, no markdown):
{{
  "ingredients": {{
    "protagonist": "Who we follow",
    "conflict_source": "Source of conflict (person, force, or situation visible on-screen)",
    "immediate_tension": "What's at stake",
    "secret": "What's hidden",
    "spike_moment": "Emotional peak",
    "cliff_problem": "Unresolved question"
  }},

  "characters": [
    {{
      "id": "char_1",
      "name": "Name",
      "gender": "male or female",
      "age": "mid-30s",
      "appearance": "4-5 specific visual details",
      "role": "protagonist|antagonist|supporting"
    }}
  ],

  "locations": [
    {{
      "id": "loc_1",
      "name": "Kitchen",
      "description": "Specific visual details",
      "atmosphere": "Emotional tone"
    }}
  ],

  "scenes": [
    {{
      "scene_number": 1,
      "title": "The Discovery",
      "duration": "8 seconds",
      "characters_on_screen": ["char_1"],
      "setting_id": "loc_1",
      "action": "What characters physically do",
      "dialogue": "VICTOR: Sit down.",
      "image_prompt": "Tight close-up of two faces in harsh kitchen light...",
      "regenerate_notes": "Exact hand positions can vary",
      "scene_heading": "INT. KITCHEN - NIGHT",
      "scene_change": false
    }}
  ]
}}

RULES:
- Exactly 8 scenes
- Preserve the user's words as closely as possible
- Infer visual details for characters and locations
- scene_change = true if location differs from previous scene
- image_prompt must be specific and visual: objects, textures, body language, composition
- Output ONLY valid JSON, no explanation"""

    return prompt


def parse_story_response(
    response_text: str,
    style: str,
    pre_selected_char_ids: Optional[set] = None,
    pre_selected_chars: Optional[List[PreSelectedCharacter]] = None,
    pre_selected_location: Optional[PreSelectedLocation] = None,
    library_characters: Optional[List[LibraryCharacter]] = None,
    library_locations: Optional[List[LibraryLocation]] = None,
) -> Story:
    """Parse the AI response into a Story object with both scenes and beats populated."""
    data = json.loads(response_text)

    # Add metadata
    data["id"] = str(uuid.uuid4())
    data["style"] = style

    # Backward compat: if response has "setting" but no "locations", auto-convert
    if "setting" in data and "locations" not in data:
        setting = data["setting"]
        data["locations"] = [{
            "id": "loc_main",
            "name": setting.get("location", "Main"),
            "description": f"{setting.get('location', '')}, {setting.get('time', '')}",
            "atmosphere": setting.get("atmosphere", ""),
        }]

    # Ensure location names are populated
    for loc in data.get("locations", []):
        if not loc.get("name"):
            loc["name"] = loc.get("id", "Location").replace("loc_", "").replace("_", " ").title()

    # Ensure all character IDs are available for defaulting
    all_char_ids = [c.get("id", "") for c in data.get("characters", [])]

    has_scenes = "scenes" in data and isinstance(data.get("scenes"), list) and len(data["scenes"]) > 0
    has_beats = "beats" in data and isinstance(data.get("beats"), list) and len(data["beats"]) > 0

    if has_scenes:
        # NEW FORMAT: AI returned scenes — populate scenes + derive beats
        for scene in data["scenes"]:
            scene_num = scene.get("scene_number", 1)
            scene["beat_type"] = BEAT_NUMBER_TO_TYPE.get(scene_num, "rise")
            scene["time_range"] = BEAT_TIME_RANGES.get(scene_num, "0:00-0:08")
            # Default characters_on_screen to all characters if not specified
            if not scene.get("characters_on_screen"):
                scene["characters_on_screen"] = all_char_ids
            # Default setting_id to first location if not specified
            if not scene.get("setting_id") and data.get("locations"):
                scene["setting_id"] = data["locations"][0]["id"]
            # Structured outputs guarantees action is array — join to string
            if isinstance(scene.get("action"), list):
                scene["action"] = "\n".join(scene["action"])

        # Derive beats from scenes for backward compatibility with pipeline
        data["beats"] = [scene_to_beat(Scene(**s)) for s in data["scenes"]]

    elif has_beats:
        # LEGACY FORMAT: AI returned beats — process beats + derive scenes
        for beat in data["beats"]:
            beat_num = beat.get("beat_number", 1)
            beat["beat_type"] = BEAT_NUMBER_TO_TYPE.get(beat_num, "rise")
            beat["time_range"] = BEAT_TIME_RANGES.get(beat_num, "0:00-0:08")
            if not beat.get("characters_in_scene"):
                beat["characters_in_scene"] = all_char_ids
            if not beat.get("location_id") and data.get("locations"):
                beat["location_id"] = data["locations"][0]["id"]

            # Handle content blocks format vs separate fields
            if beat.get("content") and isinstance(beat["content"], list):
                blocks = []
                desc_parts = []
                action_parts = []
                dialogue_list = []
                for block in beat["content"]:
                    btype = block.get("type", "")
                    if btype == "description":
                        blocks.append({"type": "description", "text": block.get("text", "")})
                        desc_parts.append(block.get("text", ""))
                    elif btype == "action":
                        blocks.append({"type": "action", "text": block.get("text", "")})
                        action_parts.append(block.get("text", ""))
                    elif btype == "dialogue":
                        char = block.get("character", "Unknown")
                        line = block.get("line", block.get("text", ""))
                        blocks.append({"type": "dialogue", "text": line, "character": char})
                        dialogue_list.append({"character": char, "line": line})
                beat["blocks"] = blocks
                beat["description"] = " ".join(desc_parts) if desc_parts else None
                beat["action"] = " ".join(action_parts) if action_parts else None
                beat["dialogue"] = dialogue_list if dialogue_list else None
                del beat["content"]
            else:
                raw_dialogue = beat.get("dialogue")
                if isinstance(raw_dialogue, str):
                    beat["dialogue"] = [{"character": "Unknown", "line": raw_dialogue}]
                elif not isinstance(raw_dialogue, list):
                    beat["dialogue"] = None
                if not beat.get("blocks"):
                    blocks = []
                    if beat.get("description"):
                        blocks.append({"type": "description", "text": beat["description"]})
                    if beat.get("action"):
                        blocks.append({"type": "action", "text": beat["action"]})
                    for d in (beat.get("dialogue") or []):
                        if isinstance(d, dict):
                            blocks.append({"type": "dialogue", "text": d.get("line", ""), "character": d.get("character", "")})
                    beat["blocks"] = blocks

        # Derive scenes from beats for new frontend
        data["scenes"] = [
            beat_to_scene(b, b.get("beat_number", i + 1)).model_dump()
            for i, b in enumerate(data["beats"])
        ]

    # Force-correct pre-selected characters: match by name and restore DB entity IDs.
    # The LLM may change the IDs it was given, so we match by name (case-insensitive)
    # and overwrite the generated char with the DB entity's fields.
    if pre_selected_chars:
        pre_by_name = {c.name.lower(): c for c in pre_selected_chars}
        pre_by_id = {c.id: c for c in pre_selected_chars}
        for char in data.get("characters", []):
            # Try ID match first, then name match
            matched = pre_by_id.get(char.get("id")) or pre_by_name.get(char.get("name", "").lower())
            if matched:
                char["id"] = matched.id
                char["name"] = matched.name
                char["gender"] = matched.gender
                char["age"] = matched.age
                char["appearance"] = matched.appearance
                char["role"] = matched.role
                char["origin"] = "story"
            else:
                char["origin"] = "ai"
    elif library_characters:
        # Library path: match by name (case-insensitive) to restore ALL fields from library
        # AI output is just an ID signal — library is the source of truth
        lib_by_name = {c.name.lower(): c for c in library_characters}
        lib_by_id = {c.id: c for c in library_characters}
        for char in data.get("characters", []):
            matched = lib_by_id.get(char.get("id")) or lib_by_name.get(char.get("name", "").lower())
            if matched:
                char["id"] = matched.id
                char["name"] = matched.name
                char["gender"] = matched.gender
                char["age"] = matched.age
                char["appearance"] = matched.appearance
                char["role"] = matched.role or char.get("role", "supporting")
                char["origin"] = "story"
            else:
                char["origin"] = "ai"
    elif pre_selected_char_ids:
        # Legacy path: only IDs available
        for char in data.get("characters", []):
            char["origin"] = "story" if char.get("id") in pre_selected_char_ids else "ai"
    else:
        for char in data.get("characters", []):
            char["origin"] = "ai"

    # Force-correct pre-selected location: restore DB entity ID
    if pre_selected_location:
        for loc in data.get("locations", []):
            if loc.get("id") == pre_selected_location.id or \
               loc.get("name", "").lower() == pre_selected_location.name.lower():
                loc["id"] = pre_selected_location.id
                loc["name"] = pre_selected_location.name
                loc["description"] = pre_selected_location.description
                loc["atmosphere"] = pre_selected_location.atmosphere
                break
    elif library_locations:
        # Library path: match by name — library is source of truth for all fields
        lib_loc_by_name = {l.name.lower(): l for l in library_locations}
        lib_loc_by_id = {l.id: l for l in library_locations}
        for loc in data.get("locations", []):
            matched = lib_loc_by_id.get(loc.get("id")) or lib_loc_by_name.get(loc.get("name", "").lower())
            if matched:
                loc["id"] = matched.id
                loc["name"] = matched.name
                loc["description"] = matched.description
                loc["atmosphere"] = matched.atmosphere
                break

    return Story(**data)


# ============================================================
# Endpoints
# ============================================================

@router.post("/generate", response_model=GenerateStoryResponseClient)
async def generate_story(request: GenerateStoryRequest):
    """
    Generate story beats from an idea.

    Input: { "idea": "...", "style": "cinematic"|"anime"|"animated"|"pixar" }
    Output: { "story": { "id": "...", "title": "...", "characters": [...], "setting": {...}, "beats": [...] } }

    Note: Duration is fixed at 1 minute (8 shots x 8 seconds = 64 seconds)
    """
    try:
        pre_char_ids = {c.id for c in request.characters} if request.characters else None
        lib_char_ids = {c.id for c in (request.library_characters or [])} if request.library_characters else None
        prompt = build_story_prompt(
            request.idea, request.style,
            characters=request.characters,
            location=request.location,
            library_characters=request.library_characters,
            library_locations=request.library_locations,
        )

        response = await generate_text(
            prompt=prompt,
            system_prompt=STORY_SYSTEM_PROMPT,
            model=STORY_MODEL,
            few_shot_examples=STORY_FEW_SHOT_EXAMPLES,
            output_schema=STORY_SCHEMA,
        )

        story = parse_story_response(
            response, request.style,
            pre_selected_char_ids=pre_char_ids or lib_char_ids,
            pre_selected_chars=request.characters,
            pre_selected_location=request.location,
            library_characters=request.library_characters,
            library_locations=request.library_locations,
        )
        cost = estimate_story_cost(len(story.scenes) or len(story.beats))

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
        pre_char_ids = {c.id for c in request.characters} if request.characters else None
        lib_char_ids = {c.id for c in (request.library_characters or [])} if request.library_characters else None
        prompt = build_story_prompt(
            request.idea,
            request.style,
            feedback=request.feedback,
            characters=request.characters,
            location=request.location,
            library_characters=request.library_characters,
            library_locations=request.library_locations,
        )

        response = await generate_text(
            prompt=prompt,
            system_prompt=STORY_SYSTEM_PROMPT,
            model=STORY_MODEL,
            few_shot_examples=STORY_FEW_SHOT_EXAMPLES,
            output_schema=STORY_SCHEMA,
        )

        story = parse_story_response(
            response, request.style,
            pre_selected_char_ids=pre_char_ids or lib_char_ids,
            pre_selected_chars=request.characters,
            pre_selected_location=request.location,
            library_characters=request.library_characters,
            library_locations=request.library_locations,
        )
        cost = estimate_story_cost(len(story.scenes) or len(story.beats))

        # Sanitize before returning to client
        sanitized = sanitize_story_for_client(story)
        return {"story": sanitized, "cost_usd": round(cost, 4)}

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response as JSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/parse-script", response_model=GenerateStoryResponseClient)
async def parse_script(request: ParseScriptRequest):
    """
    Parse a user-provided script into structured story beats.

    Input: { "script": "raw script text...", "style": "cinematic"|"anime"|"animated"|"pixar" }
    Output: { "story": { "id": "...", "title": "...", "characters": [...], "beats": [...] }, "cost_usd": ... }
    """
    try:
        prompt = build_parse_script_prompt(request.script, request.style)

        response = await generate_text(
            prompt=prompt,
            system_prompt=STORY_SYSTEM_PROMPT,
            model=STORY_MODEL,
            few_shot_examples=STORY_FEW_SHOT_EXAMPLES,
            output_schema=STORY_SCHEMA,
        )

        story = parse_story_response(response, request.style)
        cost = estimate_story_cost(len(story.scenes) or len(story.beats))

        sanitized = sanitize_story_for_client(story)
        return {"story": sanitized, "cost_usd": round(cost, 4)}

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse script response as JSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/refine-beat", response_model=RefineBeatResponse)
async def refine_beat(request: RefineBeatRequest):
    """
    Refine a specific scene/beat based on feedback.

    Input: { "story": {...}, "beat_number": 3, "feedback": "make it more dramatic" }
    Output: { "beat": { ... } }  (beat format for backward compat)
    """
    try:
        scene_num = request.beat_number

        # Find the current scene (prefer scenes, fall back to beats)
        current_scene = None
        for s in request.story.scenes:
            if s.scene_number == scene_num:
                current_scene = s
                break

        current_beat = None
        for b in request.story.beats:
            if b.beat_number == scene_num:
                current_beat = b
                break

        if not current_scene and not current_beat:
            raise HTTPException(status_code=400, detail=f"Scene {scene_num} not found in story")

        # If we have a scene but no beat, derive it; if beat but no scene, derive it
        if current_scene and not current_beat:
            current_beat = Beat(**scene_to_beat(current_scene))
        if current_beat and not current_scene:
            current_scene = beat_to_scene(current_beat.model_dump(), scene_num)

        # Build context from scenes (primary) or beats (fallback)
        def _scene_summary(s: Scene) -> str:
            parts = [f"Scene {s.scene_number} — {s.title}:"]
            if s.action:
                parts.append(f"  Action: {s.action}")
            if s.dialogue:
                parts.append(f"  Dialogue: {s.dialogue}")
            if s.image_prompt:
                parts.append(f"  Visual: {s.image_prompt}")
            return "\n".join(parts)

        if request.story.scenes:
            scenes_context = "\n\n".join([_scene_summary(s) for s in request.story.scenes])
        else:
            # Fallback: build from beats
            def _beat_summary(b: Beat) -> str:
                parts = [f"Scene {b.beat_number}:"]
                if b.blocks:
                    for block in b.blocks:
                        if block.type == "dialogue" and block.character:
                            parts.append(f"  {block.character}: \"{block.text}\"")
                        else:
                            parts.append(f"  {block.text}")
                return "\n".join(parts)
            scenes_context = "\n\n".join([_beat_summary(b) for b in request.story.beats])

        characters_context = "\n".join([
            f"- {c.name} ({c.age} {c.gender}): {c.appearance}"
            for c in request.story.characters
        ])

        locations_context = "\n".join([
            f"- {loc.id} ({loc.name}): {loc.description} ({loc.atmosphere})"
            for loc in request.story.locations
        ]) if request.story.locations else "No locations defined"

        all_char_ids = [c.id for c in request.story.characters]
        location_ids = [loc.id for loc in request.story.locations] if request.story.locations else []

        prompt = f"""You are refining Scene {scene_num} of a story.

STORY TITLE: {request.story.title}

CHARACTERS:
{characters_context}

LOCATIONS:
{locations_context}

ALL SCENES FOR CONTEXT:
{scenes_context}

CURRENT SCENE {scene_num} TO REFINE:
Title: {current_scene.title}
Scene Heading: {current_scene.scene_heading or "Not set"}
Action: {current_scene.action}
Dialogue: {current_scene.dialogue or "None"}
Image Prompt: {current_scene.image_prompt}
Characters: {current_scene.characters_on_screen or all_char_ids}
Setting: {current_scene.setting_id or (location_ids[0] if location_ids else "unknown")}

USER FEEDBACK: {request.feedback}

Rewrite ONLY Scene {scene_num} incorporating the feedback while maintaining story continuity.
Remember: NO exposition, NO backstory, ONLY present-moment conflict.

OUTPUT FORMAT (JSON only, no explanation):
{{
  "scene_number": {scene_num},
  "title": "Short 2-4 word title",
  "duration": "{current_scene.duration}",
  "characters_on_screen": {json.dumps(current_scene.characters_on_screen or all_char_ids)},
  "setting_id": "{current_scene.setting_id or (location_ids[0] if location_ids else 'loc_main')}",
  "action": ["Fragment 1.", "Fragment 2.", "Beat.", "Fragment 3."],
  "dialogue": "2-4 rapid-fire CHARACTER: line exchanges, or null for silent scenes",
  "image_prompt": "What the camera sees — composition, framing, lighting, expressions",
  "regenerate_notes": "What can vary visually without breaking continuity",
  "scene_heading": "INT/EXT. LOCATION - TIME",
  "scene_change": {str(current_scene.scene_change).lower()}
}}"""

        system_prompt = """You are a short film writer refining a single scene.
Keep the scene consistent with the overall story but incorporate the user's feedback.
Write what we SEE and HEAR, not internal thoughts.
NO exposition, NO backstory.
OUTPUT: Valid JSON only. No markdown, no explanation."""

        response = await generate_text(
            prompt=prompt,
            system_prompt=system_prompt,
            model=STORY_MODEL,
            output_schema=REFINED_SCENE_SCHEMA,
        )

        scene_data = json.loads(response)

        # Ensure scene_number is set
        scene_data["scene_number"] = scene_data.get("scene_number", scene_num)
        scene_data["beat_type"] = BEAT_NUMBER_TO_TYPE.get(scene_num, "rise")
        scene_data["time_range"] = BEAT_TIME_RANGES.get(scene_num, "0:00-0:08")

        # Default characters/setting if missing
        if not scene_data.get("characters_on_screen"):
            scene_data["characters_on_screen"] = all_char_ids
        if not scene_data.get("setting_id") and location_ids:
            scene_data["setting_id"] = location_ids[0]
        # Structured outputs guarantees action is array — join to string
        if isinstance(scene_data.get("action"), list):
            scene_data["action"] = "\n".join(scene_data["action"])

        # Build Scene object, then convert to Beat for backward compat response
        refined_scene = Scene(**scene_data)
        beat_dict = scene_to_beat(refined_scene)
        beat = Beat(**beat_dict)

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
            model=STORY_MODEL,
            few_shot_examples=STORY_FEW_SHOT_EXAMPLES,
            output_schema=STORY_SCHEMA,
        )

        story = parse_story_response(response, request.style)
        cost = estimate_story_cost(len(story.scenes) or len(story.beats))

        # Return full internal story (not sanitized)
        return GenerateStoryResponse(story=story, cost_usd=round(cost, 4))

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response as JSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Scene Descriptions Endpoint
# ============================================================

class GenerateSceneDescriptionsRequest(BaseModel):
    story: Story


class SceneVisualDescription(BaseModel):
    scene_number: int
    title: str
    visual_description: str


class GenerateSceneDescriptionsResponse(BaseModel):
    descriptions: List[SceneVisualDescription]
    cost_usd: float = 0.0


@router.post("/generate-scene-descriptions", response_model=GenerateSceneDescriptionsResponse)
async def generate_scene_descriptions(request: GenerateSceneDescriptionsRequest):
    """
    Generate 1-2 line cinematic visual descriptions for each of the 8 scenes.

    Input: { "story": {...} }
    Output: { "descriptions": [{"scene_number": 1, "title": "...", "visual_description": "..."}, ...] }
    """
    try:
        story = request.story

        # Get scenes — prefer scenes, derive from beats if needed
        scenes = story.scenes
        if not scenes and story.beats:
            scenes = [
                beat_to_scene(b.model_dump(), b.number)
                for b in story.beats
            ]

        if not scenes:
            raise HTTPException(status_code=400, detail="Story has no scenes or beats")

        # Build character descriptions for context
        characters_context = "\n".join([
            f"- {c.name} (id: {c.id}, {c.age} {c.gender}): {c.appearance}"
            for c in story.characters
        ])

        # Build location descriptions for context
        locations_context = "\n".join([
            f"- {loc.id} ({loc.name}): {loc.description} ({loc.atmosphere})"
            for loc in story.locations
        ]) if story.locations else "No locations defined"

        # Build scene summaries
        scene_summaries = []
        for s in scenes:
            parts = [f"Scene {s.scene_number} — {s.title}:"]
            if s.action:
                parts.append(f"  Action: {s.action}")
            if s.dialogue:
                parts.append(f"  Dialogue: {s.dialogue}")
            if s.image_prompt:
                parts.append(f"  Image Prompt: {s.image_prompt}")
            chars = s.characters_on_screen or []
            if chars:
                parts.append(f"  Characters: {', '.join(chars)}")
            scene_summaries.append("\n".join(parts))

        scenes_text = "\n\n".join(scene_summaries)

        prompt = f"""You are generating FIRST FRAME image prompts for an AI video pipeline.

CRITICAL CONTEXT: Each image you describe will be the ONLY visual input to a video generation model. The video model has NEVER seen these characters before — it will learn what each character looks like SOLELY from this single image. If a character is not clearly visible in the first frame, the video model cannot depict them at all during the clip.

STORY TITLE: {story.title}
STYLE: {STYLE_DISPLAY.get(story.style, story.style)}

CHARACTERS (use these exact appearance details in every description):
{characters_context}

LOCATIONS:
{locations_context}

SCENES:
{scenes_text}

For each scene, write a 2-3 sentence image prompt describing the FIRST FRAME — the frozen instant the scene begins, before any action unfolds.

FIRST FRAME RULES (NON-NEGOTIABLE):
1. EVERY character in characters_on_screen MUST be VISIBLY PRESENT in the image. The video model learns what characters look like from this frame alone — if someone is missing, the model cannot render them.
2. DESCRIBE each character by NAME with their key appearance details: "Kate (dark hair past shoulders, thin camisole, bare feet) stands at the counter" — NOT "she" or "a woman"
3. POSITION all characters in the frame so each one's face and body are clearly visible to the camera. No character should be obscured, off-screen, or with their back fully turned.
4. Include LOCATION details: environment, lighting, key objects
5. Describe a SINGLE FROZEN MOMENT — the instant before action begins
6. Write as a camera direction: shot type, framing, spatial arrangement

OUTPUT FORMAT (JSON array only, no markdown, no explanation):
[
  {{"scene_number": 1, "title": "Short 2-4 word title", "visual_description": "2-3 sentence first frame image prompt..."}},
  ...
]

RULES:
- Exactly {len(scenes)} entries, one per scene
- NEVER use pronouns (he/she/they) — always character names with appearance
- NEVER place a character off-screen, behind the camera, or arriving later
- Output ONLY the JSON array"""

        response = await generate_text(
            prompt=prompt,
            system_prompt="You are a cinematographer writing shot descriptions. Output valid JSON only.",
            model=STORY_MODEL,
            output_schema=SCENE_DESCRIPTIONS_SCHEMA,
        )

        descriptions_data = json.loads(response)

        descriptions = [
            SceneVisualDescription(
                scene_number=d["scene_number"],
                title=d.get("title", f"Scene {d['scene_number']}"),
                visual_description=d["visual_description"],
            )
            for d in descriptions_data
        ]

        cost = estimate_story_cost(1)  # One Flash call

        return GenerateSceneDescriptionsResponse(
            descriptions=descriptions,
            cost_usd=round(cost, 4),
        )

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response as JSON: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
