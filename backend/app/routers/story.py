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
    "anime": "Anime (Studio Ghibli-style aesthetic)",
    "animated": "Animated (western animated style)",
    "pixar": "Pixar (3D Pixar-style rendering)",
}

STORY_SYSTEM_PROMPT = """You are an 8-Scene Vertical Episode Generator designed for maximum viewer retention.

CORE OBJECTIVE:
Generate a 1-minute vertical episode broken into 8 scenes (6-9 seconds each) that:
- Starts mid-conflict
- Escalates continuously
- Delivers one major emotional peak at Scene 4
- Expands consequences in Scenes 5-7
- Ends on an unresolved cliffhanger at Scene 8

GLOBAL CONSTRAINTS (NON-NEGOTIABLE):
1. Do NOT include exposition.
2. Do NOT include backstory explanations.
3. Every scene must introduce: new tension OR new information OR a power shift.
4. Emotional intensity must increase until Scene 4.
5. Scenes 5-7 must escalate consequences.
6. Scene 8 must introduce a new unanswered threat.
7. Keep dialogue short and sharp (1-2 lines max per scene).
8. Maintain visual consistency with the approved style/vibe.
9. Each scene must contain exactly ONE emotional move.
10. Do not label scenes with structural names (hook, rise, etc).

STRUCTURAL BLUEPRINT (follow strictly):

Scene 1 — Immediate Disruption (6-9s)
  Drop viewer into action mid-moment. Dialogue already in progress OR action already happening.
  No explanation. Viewer feels late.
  Visual: Tight framing, unstable composition, high emotional tension.

Scene 2 — Clarified Conflict (6-9s)
  Make stakes visible through behavior. Relationship implied through conflict.
  Stakes hinted. Emotional escalation.
  Visual: Medium framing, push-in, environment subtly visible.

Scene 3 — Pressure Intensifies (6-9s)
  Threat, accusation, or secret hinted. Clear directional tension.
  Stakes feel heavier than Scene 2.
  Visual: Closer proximity, sharper eye contact, less negative space.

Scene 4 — Peak Emotional Moment (6-9s)
  Biggest emotional payoff. Must include ONE of: Reveal, Betrayal, Power move, Kiss, Humiliation, Discovery, Explicit threat.
  This is the highest intensity point in the episode.
  Visual: Clear framing shift (close-up OR dramatic reveal OR reversal of spatial dominance).

Scene 5 — Impact Reaction (6-9s)
  Show the emotional consequence. Power dynamic shifts. Emotional impact visible.
  Visual: Stillness, heavier tone, breathing space.

Scene 6 — External Consequence (6-9s)
  The peak creates a new complication.
  Must include: A new element entering (person, message, sound, object) OR a new layer of danger.
  Visual: Introduce new focal element in frame.

Scene 7 — Escalation to Edge (6-9s)
  Make the problem worse and urgent. Forced choice OR irreversible motion begins.
  Stakes feel higher than Scene 6.
  Visual: Movement, approaching interruption, physical or emotional narrowing.

Scene 8 — Cliffhanger (6-9s)
  End with a worse unanswered question.
  A new threat OR hidden truth revealed OR dangerous arrival OR final line that destabilizes everything.
  Hard cut. No resolution. No emotional closure.

VIBE APPLICATION RULES:
Lighting, color palette, environment continuity, and camera style remain consistent across all scenes.
Only the emotional intensity changes. Do not change time of day, overall mood, or visual style.

SELF-CHECK BEFORE FINALIZING:
Verify: Scene 1 begins mid-event, Scene 4 is strongest emotional spike, stakes escalate after Scene 4,
Scene 8 introduces a NEW unresolved danger, exactly 8 scenes, no exposition, vibe remains consistent.
If any condition fails, revise before returning.

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
    title: str
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
    # No duration - fixed at 1 minute


class GenerateStoryResponse(BaseModel):
    story: Story
    cost_usd: float = 0.0


class RegenerateStoryRequest(BaseModel):
    idea: str
    style: Literal["cinematic", "anime", "animated", "pixar"]
    feedback: Optional[str] = None
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


def build_story_prompt(idea: str, style: str, feedback: Optional[str] = None) -> str:
    """Build the user prompt for story generation using Playbook structural blueprint."""
    style_display = STYLE_DISPLAY[style]

    prompt = f"""Turn this idea into a 1-minute vertical episode with exactly 8 scenes:

IDEA: "{idea}"
STYLE: {style_display}

STEP 1 — Extract story ingredients:
- Protagonist: Who we follow
- Antagonist/Opposing Force: Source of conflict
- Immediate Tension: What's at stake RIGHT NOW
- Hidden Information/Secret: What's being concealed
- Peak Moment: The emotional spike (Scene 4)
- Cliff Problem: What new danger emerges at the end

STEP 2 — Create characters:
For each: id (snake_case), name, gender, age (e.g. "mid-30s"), appearance (4-5 specific visual details we will SEE on camera), role (protagonist/antagonist/supporting).

STEP 3 — Create locations:
For each: id (e.g. "loc_1"), name (short name like "Kitchen" or "Hospital Suite"), description (specific visual details — lighting, furniture, textures), atmosphere (emotional tone).

STEP 4 — Write exactly 8 scenes following the structural blueprint.
For each scene provide ALL of these fields:
- scene_number: 1-8
- title: Short descriptive name (2-4 words)
- duration: "X seconds" (6-9)
- characters_on_screen: Array of character IDs present in the scene
- setting_id: Location ID for this scene
- action: 1-2 sentences of what characters physically do
- dialogue: "CHARACTER: line" format with 1-2 lines max, or null for silent scenes
- image_prompt: What the camera sees — composition, framing, lighting, character positions, expressions, key objects. Write for a camera operator.
- regenerate_notes: What can vary visually without breaking story continuity
- scene_heading: Standard screenplay format (INT/EXT. LOCATION - TIME)
- scene_change: true if location differs from previous scene

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
      "age": "rough age like mid-30s",
      "appearance": "4-5 specific visual details",
      "role": "protagonist|antagonist|supporting"
    }}
  ],

  "locations": [
    {{
      "id": "loc_1",
      "name": "Kitchen",
      "description": "Specific visual details of the location",
      "atmosphere": "Emotional tone"
    }}
  ],

  "scenes": [
    {{
      "scene_number": 1,
      "title": "The Accusation",
      "duration": "8 seconds",
      "characters_on_screen": ["char_1", "char_2"],
      "setting_id": "loc_1",
      "action": "What characters physically do in 1-2 sentences",
      "dialogue": "VICTOR: Sit down.",
      "image_prompt": "Tight close-up of two faces in harsh kitchen light, granite countertop between them, one hand flat on surface, other backing toward door",
      "regenerate_notes": "Exact hand positions and background objects can vary",
      "scene_heading": "INT. KITCHEN - NIGHT",
      "scene_change": false
    }}
  ]
}}

CRITICAL RULES:
- Exactly 8 scenes, each 6-9 seconds
- NO backstory, NO exposition
- Dialogue: 1-2 lines max per scene, short and sharp
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

5. Give the episode a provocative 2-4 word title.

OUTPUT FORMAT (JSON only, no markdown):
{{
  "title": "Provocative 2-4 word title",

  "ingredients": {{
    "protagonist": "Who we follow",
    "antagonist": "Source of conflict",
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


def parse_story_response(response_text: str, style: str) -> Story:
    """Parse the AI response into a Story object with both scenes and beats populated."""
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
        prompt = build_story_prompt(request.idea, request.style)

        response = await generate_text(
            prompt=prompt,
            system_prompt=STORY_SYSTEM_PROMPT,
        )

        story = parse_story_response(response, request.style)
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
        prompt = build_story_prompt(
            request.idea,
            request.style,
            request.feedback
        )

        response = await generate_text(
            prompt=prompt,
            system_prompt=STORY_SYSTEM_PROMPT,
        )

        story = parse_story_response(response, request.style)
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
  "action": "1-2 sentences of what characters physically do",
  "dialogue": "CHARACTER: line (1-2 lines max, or null)",
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

        scene_data = json.loads(cleaned)

        # Ensure scene_number is set
        scene_data["scene_number"] = scene_data.get("scene_number", scene_num)
        scene_data["beat_type"] = BEAT_NUMBER_TO_TYPE.get(scene_num, "rise")
        scene_data["time_range"] = BEAT_TIME_RANGES.get(scene_num, "0:00-0:08")

        # Default characters/setting if missing
        if not scene_data.get("characters_on_screen"):
            scene_data["characters_on_screen"] = all_char_ids
        if not scene_data.get("setting_id") and location_ids:
            scene_data["setting_id"] = location_ids[0]

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
        )

        story = parse_story_response(response, request.style)
        cost = estimate_story_cost(len(story.scenes) or len(story.beats))

        # Return full internal story (not sanitized)
        return GenerateStoryResponse(story=story, cost_usd=round(cost, 4))

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response as JSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
