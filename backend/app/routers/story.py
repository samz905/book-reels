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
    blocks: List[SceneBlock] = []  # Ordered content blocks (primary)
    scene_change: bool
    characters_in_scene: Optional[List[str]] = None
    location_id: Optional[str] = None
    # Legacy fields for backward compat
    description: Optional[str] = None
    action: Optional[str] = None
    dialogue: Optional[List[DialogueLine]] = None


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
                "blocks": [b.model_dump() for b in beat.blocks],
                "scene_change": beat.scene_change,
                "characters_in_scene": beat.characters_in_scene,
                "location_id": beat.location_id,
                # Legacy fields for backward compat
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


# ============================================================
# Few-Shot Examples (stored outside f-string to avoid brace escaping)
# ============================================================

FEW_SHOT_EXAMPLES = """
Here are examples of GREAT scripts. Study the rhythm — notice how content blocks flow freely (descriptions, actions, and dialogue interleave in whatever order serves the scene). Some scenes are dialogue-heavy, some are silent, some are pure action. Match quality, NOT structure.

EXAMPLE 1 — "The Donor":
{
  "title": "The Donor",
  "characters": [
    {"id": "victor", "name": "Victor", "gender": "male", "age": "late 60s", "appearance": "Gaunt face, oxygen tube in nose, expensive silk robe over hospital gown, eyes sharp despite frailty", "role": "protagonist"},
    {"id": "daniel", "name": "Daniel", "gender": "male", "age": "early 30s", "appearance": "Nervous energy, cheap suit that doesn't quite fit, fidgeting hands, looks like he hasn't slept", "role": "antagonist"}
  ],
  "locations": [
    {"id": "hospital_suite", "description": "Luxurious private hospital room, floor-to-ceiling windows overlooking the city, medical equipment disguised by expensive furnishings, fresh flowers everywhere", "atmosphere": "Sterile wealth, death waiting politely"}
  ],
  "beats": [
    {"beat_number": 1, "scene_heading": "INT. PRIVATE HOSPITAL SUITE - DAY", "content": [
      {"type": "description", "text": "Sunlight streams through floor-to-ceiling windows. A dying billionaire sits upright in a bed that costs more than most apartments."},
      {"type": "action", "text": "Daniel stands frozen in the doorway. Victor gestures impatiently at the chair beside his bed."},
      {"type": "dialogue", "character": "Victor", "line": "Sit. I don't have time for your nerves."}
    ], "scene_change": false, "characters_in_scene": ["victor", "daniel"], "location_id": "hospital_suite"},
    {"beat_number": 2, "scene_heading": "INT. PRIVATE HOSPITAL SUITE - DAY", "content": [
      {"type": "action", "text": "Daniel perches on the edge of the chair like he might bolt. Victor studies him with unsettling intensity."},
      {"type": "dialogue", "character": "Daniel", "line": "They said you picked me. Out of four hundred people on the list."},
      {"type": "action", "text": "Victor reaches for a glass of water. His hand trembles. He sets it down without drinking."},
      {"type": "dialogue", "character": "Victor", "line": "I did."}
    ], "scene_change": false, "characters_in_scene": ["victor", "daniel"], "location_id": "hospital_suite"},
    {"beat_number": 3, "scene_heading": "INT. PRIVATE HOSPITAL SUITE - DAY", "content": [
      {"type": "description", "text": "The heart monitor beeps steadily. Too steadily. Like a countdown."},
      {"type": "dialogue", "character": "Daniel", "line": "Why me? I'm nobody. I work at a grocery store."},
      {"type": "action", "text": "Victor's expression remains unreadable. He lets the silence stretch."},
      {"type": "dialogue", "character": "Victor", "line": "I don't want money."}
    ], "scene_change": false, "characters_in_scene": ["victor", "daniel"], "location_id": "hospital_suite"},
    {"beat_number": 4, "scene_heading": "INT. PRIVATE HOSPITAL SUITE - DAY", "content": [
      {"type": "action", "text": "Victor's hand moves to the drawer of his bedside table. He pulls out a yellowed envelope."},
      {"type": "description", "text": "He holds it like it weighs a thousand pounds. Daniel's eyes lock onto it."},
      {"type": "dialogue", "character": "Victor", "line": "When I'm gone, you'll understand why I chose you."}
    ], "scene_change": false, "characters_in_scene": ["victor", "daniel"], "location_id": "hospital_suite"},
    {"beat_number": 5, "scene_heading": "INT. PRIVATE HOSPITAL SUITE - DAY", "content": [
      {"type": "action", "text": "The envelope slides across the sheets. Daniel opens it with trembling hands."},
      {"type": "description", "text": "Inside: a photograph. A woman holding a newborn. Radiant. The photo is thirty years old."},
      {"type": "action", "text": "Daniel's face goes white. Then confused. Then something worse."},
      {"type": "dialogue", "character": "Daniel", "line": "This is... this is my mother."}
    ], "scene_change": false, "characters_in_scene": ["victor", "daniel"], "location_id": "hospital_suite"},
    {"beat_number": 6, "scene_heading": "INT. PRIVATE HOSPITAL SUITE - DAY", "content": [
      {"type": "action", "text": "Daniel stares at the photo. At the date on the back. At the hospital bracelet on the baby's wrist."},
      {"type": "action", "text": "He looks up at Victor — really looks — searching for something in the old man's face."},
      {"type": "dialogue", "character": "Victor", "line": "She never told you about me, did she?"}
    ], "scene_change": false, "characters_in_scene": ["victor", "daniel"], "location_id": "hospital_suite"},
    {"beat_number": 7, "scene_heading": "INT. PRIVATE HOSPITAL SUITE - DAY", "content": [
      {"type": "description", "text": "The heart monitor's rhythm seems louder now. Victor's breathing is labored but his eyes are clear."},
      {"type": "action", "text": "Daniel stands abruptly. The chair scrapes. He backs toward the door."},
      {"type": "dialogue", "character": "Daniel", "line": "My father died when I was two. Car accident. She showed me the grave."},
      {"type": "dialogue", "character": "Victor", "line": "She showed you a grave."}
    ], "scene_change": false, "characters_in_scene": ["victor", "daniel"], "location_id": "hospital_suite"},
    {"beat_number": 8, "scene_heading": "INT. PRIVATE HOSPITAL SUITE - DAY", "content": [
      {"type": "action", "text": "Daniel's hand finds the door handle. Victor's voice stops him cold."},
      {"type": "action", "text": "Victor pulls a second photo from the envelope. Holds it up."},
      {"type": "description", "text": "It's Daniel's mother — at Victor's side — at what is clearly their wedding."},
      {"type": "dialogue", "character": "Victor", "line": "I'm not giving you my heart, son. I'm giving it back."}
    ], "scene_change": false, "characters_in_scene": ["victor", "daniel"], "location_id": "hospital_suite"}
  ]
}

EXAMPLE 2 — "Check Please":
{
  "title": "Check Please",
  "characters": [
    {"id": "mira", "name": "Mira", "gender": "female", "age": "late 20s", "appearance": "Red dress, dark hair pinned up elegantly, small tattoo behind ear, eyes that miss nothing", "role": "protagonist"},
    {"id": "jack", "name": "Jack", "gender": "male", "age": "early 30s", "appearance": "Tailored black suit, easy smile that doesn't reach his eyes, silver watch, clean shaven", "role": "antagonist"}
  ],
  "locations": [
    {"id": "restaurant", "description": "Intimate corner table, candlelight, white tablecloth, half-empty wine glasses, other diners a comfortable distance away", "atmosphere": "Romantic on the surface, dangerous underneath"}
  ],
  "beats": [
    {"beat_number": 1, "scene_heading": "INT. UPSCALE RESTAURANT - NIGHT", "content": [
      {"type": "description", "text": "Candlelight flickers across two faces. A perfect date. Except both of them are sweating."},
      {"type": "dialogue", "character": "Jack", "line": "You're not like other women I've met."},
      {"type": "action", "text": "Mira laughs. Her hand slides beneath the tablecloth. His does the same."},
      {"type": "dialogue", "character": "Mira", "line": "You have no idea."}
    ], "scene_change": false, "characters_in_scene": ["mira", "jack"], "location_id": "restaurant"},
    {"beat_number": 2, "scene_heading": "INT. UPSCALE RESTAURANT - NIGHT", "content": [
      {"type": "description", "text": "Under the table: two hands. Two guns. Pointed at each other."},
      {"type": "description", "text": "Above the table: two smiles."},
      {"type": "action", "text": "Mira sips her wine. Jack mirrors her. Neither breaks eye contact."},
      {"type": "dialogue", "character": "Jack", "line": "The risotto here is incredible."}
    ], "scene_change": false, "characters_in_scene": ["mira", "jack"], "location_id": "restaurant"},
    {"beat_number": 3, "scene_heading": "INT. UPSCALE RESTAURANT - NIGHT", "content": [
      {"type": "action", "text": "A waiter approaches. Both assassins tense. Fingers on triggers."},
      {"type": "action", "text": "The waiter refills their water glasses and leaves. They exhale."},
      {"type": "dialogue", "character": "Jack", "line": "Volkov sent you."},
      {"type": "dialogue", "character": "Mira", "line": "Volkov sent you."}
    ], "scene_change": false, "characters_in_scene": ["mira", "jack"], "location_id": "restaurant"},
    {"beat_number": 4, "scene_heading": "INT. UPSCALE RESTAURANT - NIGHT", "content": [
      {"type": "description", "text": "The realization lands. Same target. Same employer. Same lie."},
      {"type": "action", "text": "Mira's gun hand relaxes slightly. So does Jack's."},
      {"type": "dialogue", "character": "Mira", "line": "He's cleaning house."},
      {"type": "dialogue", "character": "Jack", "line": "Both of us. One dinner. Efficient."}
    ], "scene_change": false, "characters_in_scene": ["mira", "jack"], "location_id": "restaurant"},
    {"beat_number": 5, "scene_heading": "INT. UPSCALE RESTAURANT - NIGHT", "content": [
      {"type": "description", "text": "Something shifts between them. The guns stay where they are, but the tension changes flavor."},
      {"type": "dialogue", "character": "Jack", "line": "We could kill each other."},
      {"type": "action", "text": "Mira tilts her head. Considering."},
      {"type": "dialogue", "character": "Mira", "line": "We could."}
    ], "scene_change": false, "characters_in_scene": ["mira", "jack"], "location_id": "restaurant"},
    {"beat_number": 6, "scene_heading": "INT. UPSCALE RESTAURANT - NIGHT", "content": [
      {"type": "action", "text": "Mira leans forward. Conspiratorial. Dangerous."},
      {"type": "action", "text": "She traces the rim of her wine glass. Jack watches her finger like it's the most fascinating thing he's ever seen."},
      {"type": "dialogue", "character": "Mira", "line": "Or we split the fee for the person who actually deserves it."}
    ], "scene_change": false, "characters_in_scene": ["mira", "jack"], "location_id": "restaurant"},
    {"beat_number": 7, "scene_heading": "INT. UPSCALE RESTAURANT - NIGHT", "content": [
      {"type": "action", "text": "Jack's smile finally reaches his eyes. It's terrifying."},
      {"type": "action", "text": "He raises his wine glass. She raises hers. A toast to murder."},
      {"type": "description", "text": "The guns stay trained on each other. Trust has limits."},
      {"type": "dialogue", "character": "Jack", "line": "I was hoping you'd say that."}
    ], "scene_change": false, "characters_in_scene": ["mira", "jack"], "location_id": "restaurant"},
    {"beat_number": 8, "scene_heading": "INT. UPSCALE RESTAURANT - NIGHT", "content": [
      {"type": "action", "text": "The waiter reappears at their table. Oblivious. Professional."},
      {"type": "action", "text": "Both guns swivel silently beneath the tablecloth. Now pointing past each other. Toward the kitchen."},
      {"type": "dialogue", "character": "Waiter", "line": "Ready to order?"},
      {"type": "dialogue", "character": "Mira", "line": "Just the check."}
    ], "scene_change": false, "characters_in_scene": ["mira", "jack"], "location_id": "restaurant"}
  ]
}

EXAMPLE 3 — "Fading Echoes":
{
  "title": "Fading Echoes",
  "characters": [
    {"id": "kai", "name": "Kai", "gender": "male", "age": "early 20s", "appearance": "Lean and athletic, traditional training clothes soaked with sweat, fresh bruise on cheekbone, determined eyes", "role": "protagonist"},
    {"id": "sensei", "name": "Sensei Tanaka", "gender": "male", "age": "late 70s", "appearance": "Silver hair in topknot, weathered face, moves with painful slowness, wooden cane, faded training uniform", "role": "antagonist"},
    {"id": "akira", "name": "Akira", "gender": "male", "age": "late 20s", "appearance": "Sleek modern athletic wear, confident stance, expensive watch, looks like he belongs in a boardroom not a dojo", "role": "supporting"}
  ],
  "locations": [
    {"id": "dojo", "description": "Dimly lit training hall, worn wooden floors, weapons mounted on walls, single shaft of light from high window, dust motes floating", "atmosphere": "Sacred, heavy with history, something ending"}
  ],
  "beats": [
    {"beat_number": 1, "scene_heading": "INT. DOJO - DUSK", "content": [
      {"type": "description", "text": "Wooden swords clash. Kai attacks with everything he has. Sensei barely moves."},
      {"type": "action", "text": "Kai's strike goes wide. Sensei's cane taps his ankle. Kai hits the floor hard."},
      {"type": "dialogue", "character": "Sensei Tanaka", "line": "Your form is excellent. Your heart is elsewhere."}
    ], "scene_change": false, "characters_in_scene": ["kai", "sensei"], "location_id": "dojo"},
    {"beat_number": 2, "scene_heading": "INT. DOJO - DUSK", "content": [
      {"type": "action", "text": "Kai stays down. Breathing hard. Staring at the ceiling."},
      {"type": "action", "text": "Sensei lowers himself slowly, painfully, to sit beside him. His joints crack."},
      {"type": "dialogue", "character": "Kai", "line": "He offered me the job again."},
      {"type": "dialogue", "character": "Sensei Tanaka", "line": "And?"}
    ], "scene_change": false, "characters_in_scene": ["kai", "sensei"], "location_id": "dojo"},
    {"beat_number": 3, "scene_heading": "INT. DOJO - DUSK", "content": [
      {"type": "action", "text": "Kai sits up. Looks at the weapons on the wall. The photographs of students long gone."},
      {"type": "description", "text": "Empty spaces where students should be. The light from the high window is fading."},
      {"type": "dialogue", "character": "Kai", "line": "Akira says the dojo is dying. He says you're too proud to see it."}
    ], "scene_change": false, "characters_in_scene": ["kai", "sensei"], "location_id": "dojo"},
    {"beat_number": 4, "scene_heading": "INT. DOJO - DUSK", "content": [
      {"type": "description", "text": "Sensei's face betrays nothing. His gnarled fingers rest on his cane."},
      {"type": "action", "text": "He reaches into his robe. Pulls out a faded photograph."},
      {"type": "description", "text": "Two young men in training clothes. One is recognizably Sensei. The other..."},
      {"type": "dialogue", "character": "Sensei Tanaka", "line": "Do you know who this is?"}
    ], "scene_change": false, "characters_in_scene": ["kai", "sensei"], "location_id": "dojo"},
    {"beat_number": 5, "scene_heading": "INT. DOJO - DUSK", "content": [
      {"type": "action", "text": "Kai takes the photo. Studies it. The younger Sensei. The other man with the same sharp eyes as—"},
      {"type": "action", "text": "His expression shifts. Confusion. Recognition. Horror."},
      {"type": "dialogue", "character": "Kai", "line": "That's... that's Akira's father."},
      {"type": "dialogue", "character": "Sensei Tanaka", "line": "My greatest student. Until he chose the same path his son offers you."}
    ], "scene_change": false, "characters_in_scene": ["kai", "sensei"], "location_id": "dojo"},
    {"beat_number": 6, "scene_heading": "INT. DOJO - DUSK", "content": [
      {"type": "dialogue", "character": "Kai", "line": "What happened to him?"},
      {"type": "action", "text": "Sensei takes the photo back. His thumb brushes across the face of his lost student."},
      {"type": "dialogue", "character": "Sensei Tanaka", "line": "He got everything Akira is promising you."},
      {"type": "action", "text": "A long pause. The old man's eyes are distant."},
      {"type": "dialogue", "character": "Sensei Tanaka", "line": "And it hollowed him out."}
    ], "scene_change": false, "characters_in_scene": ["kai", "sensei"], "location_id": "dojo"},
    {"beat_number": 7, "scene_heading": "INT. DOJO - DUSK", "content": [
      {"type": "action", "text": "A door slides open behind them. Light spills in."},
      {"type": "action", "text": "Akira steps into the dojo. He sees them on the floor together. The photograph."},
      {"type": "action", "text": "His jaw tightens."},
      {"type": "dialogue", "character": "Akira", "line": "Telling old war stories, Sensei?"}
    ], "scene_change": false, "characters_in_scene": ["kai", "sensei", "akira"], "location_id": "dojo"},
    {"beat_number": 8, "scene_heading": "INT. DOJO - DUSK", "content": [
      {"type": "description", "text": "Three generations. Three choices. The last light catches the weapons on the wall."},
      {"type": "action", "text": "Sensei holds up the photograph so Akira can see it."},
      {"type": "action", "text": "Akira's confident mask cracks. Just for a moment."},
      {"type": "dialogue", "character": "Sensei Tanaka", "line": "Your father asked me to give you something before he died. I've been waiting until you were ready."}
    ], "scene_change": false, "characters_in_scene": ["kai", "sensei", "akira"], "location_id": "dojo"}
  ]
}

Now write YOUR script for the given idea. Be ORIGINAL — do NOT copy these examples. Use them only to understand the quality, rhythm, and format expected.
"""


def build_story_prompt(idea: str, style: str, feedback: Optional[str] = None) -> str:
    """Build the user prompt for story generation using retention formula + few-shot examples."""
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
      "content": [
        {{ "type": "description", "text": "What the camera sees..." }},
        {{ "type": "action", "text": "What characters physically do..." }},
        {{ "type": "dialogue", "character": "Name", "line": "What they say" }}
      ],
      "scene_change": false,
      "characters_in_scene": ["char_id_1", "char_id_2"],
      "location_id": "loc_1"
    }}
  ]
}}

SCENE WRITING RULES — every scene becomes an 8-second video clip:
- scene_heading: Standard screenplay format (INT/EXT. LOCATION - TIME)
- content: Array of blocks in FREE-FLOWING order. Mix and match:
  - {{"type": "description", "text": "..."}} — What the CAMERA sees. Specific objects, lighting, textures.
  - {{"type": "action", "text": "..."}} — What characters physically DO. Hands, eyes, posture, movement.
  - {{"type": "dialogue", "character": "Name", "line": "..."}} — Short, punchy lines.
- Blocks can appear in ANY order. Interleave them naturally — action between dialogue lines, description mid-scene, whatever serves the storytelling.
- A scene can have 2-5 content blocks. Vary the mix per scene.
- Silent scenes (no dialogue) are powerful — use them for impact moments.
- Write for the CAMERA: specific objects, textures, body language. Not emotions or internal states.

Remember:
- 8 scenes total
- Each scene = one 8-second video shot
- NO backstory, NO exposition
- End BEFORE resolution
- The cliff must create a WORSE unanswered question"""

    # Add few-shot examples
    prompt += "\n\n" + FEW_SHOT_EXAMPLES

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

        # Handle content blocks format (new) vs separate fields (legacy)
        if beat.get("content") and isinstance(beat["content"], list):
            # New format: content blocks array — convert to blocks + derive legacy fields
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
            # Derive legacy fields for backward compat
            beat["description"] = " ".join(desc_parts) if desc_parts else None
            beat["action"] = " ".join(action_parts) if action_parts else None
            beat["dialogue"] = dialogue_list if dialogue_list else None
            # Remove content key so it doesn't confuse Pydantic
            del beat["content"]
        else:
            # Legacy format: separate description/action/dialogue fields
            raw_dialogue = beat.get("dialogue")
            if isinstance(raw_dialogue, str):
                beat["dialogue"] = [{"character": "Unknown", "line": raw_dialogue}]
            elif isinstance(raw_dialogue, list):
                pass  # Already in correct format
            else:
                beat["dialogue"] = None

            # Convert to blocks (ordered content)
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

        # Build context from all beats using blocks (without exposing beat_type)
        def _beat_summary(b: Beat) -> str:
            parts = [f"Scene {b.beat_number}:"]
            if b.blocks:
                for block in b.blocks:
                    if block.type == "description":
                        parts.append(f"  {block.text}")
                    elif block.type == "action":
                        parts.append(f"  {block.text}")
                    elif block.type == "dialogue" and block.character:
                        parts.append(f"  {block.character}: \"{block.text}\"")
            else:
                # Fallback to legacy fields
                if b.description:
                    parts.append(f"  {b.description}")
                if b.action:
                    parts.append(f"  {b.action}")
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

        # Format current scene content for context (from blocks or legacy)
        current_content_lines = []
        if current_beat.blocks:
            for block in current_beat.blocks:
                if block.type == "description":
                    current_content_lines.append(f"Description: {block.text}")
                elif block.type == "action":
                    current_content_lines.append(f"Action: {block.text}")
                elif block.type == "dialogue":
                    current_content_lines.append(f"{block.character}: \"{block.text}\"")
        else:
            if current_beat.description:
                current_content_lines.append(f"Description: {current_beat.description}")
            if current_beat.action:
                current_content_lines.append(f"Action: {current_beat.action}")
            if current_beat.dialogue:
                for d in current_beat.dialogue:
                    current_content_lines.append(f"{d.character}: \"{d.line}\"")
        current_content_str = "\n".join(current_content_lines) or "None"

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
{current_content_str}
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
  "content": [
    {{"type": "description", "text": "What the camera sees..."}},
    {{"type": "action", "text": "What characters physically do..."}},
    {{"type": "dialogue", "character": "Name", "line": "What they say"}}
  ],
  "scene_change": {str(current_beat.scene_change).lower()},
  "characters_in_scene": {json.dumps(current_beat.characters_in_scene or all_char_ids)},
  "location_id": "{current_beat.location_id or (location_ids[0] if location_ids else 'loc_main')}"
}}

Content blocks can appear in any order. Use 2-5 blocks per scene. Mix descriptions, actions, and dialogue freely."""

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

        # Handle content blocks (new) vs separate fields (legacy)
        if beat_data.get("content") and isinstance(beat_data["content"], list):
            blocks = []
            desc_parts = []
            action_parts = []
            dialogue_list = []
            for block in beat_data["content"]:
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
            beat_data["blocks"] = blocks
            beat_data["description"] = " ".join(desc_parts) if desc_parts else None
            beat_data["action"] = " ".join(action_parts) if action_parts else None
            beat_data["dialogue"] = dialogue_list if dialogue_list else None
            del beat_data["content"]
        else:
            # Legacy format
            raw_dialogue = beat_data.get("dialogue")
            if isinstance(raw_dialogue, str):
                beat_data["dialogue"] = [{"character": "Unknown", "line": raw_dialogue}]
            elif not isinstance(raw_dialogue, list):
                beat_data["dialogue"] = None

            blocks = []
            if beat_data.get("description"):
                blocks.append({"type": "description", "text": beat_data["description"]})
            if beat_data.get("action"):
                blocks.append({"type": "action", "text": beat_data["action"]})
            for d in (beat_data.get("dialogue") or []):
                if isinstance(d, dict):
                    blocks.append({"type": "dialogue", "text": d.get("line", ""), "character": d.get("character", "")})
            beat_data["blocks"] = blocks

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
