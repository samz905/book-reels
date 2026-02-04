"""
Story generation endpoints for AI video workflow.
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

DURATION_TO_SHOTS = {
    "1": {"min": 7, "max": 8},
    "2": {"min": 15, "max": 15},
    "3": {"min": 22, "max": 23},
}

BEAT_STRUCTURES = {
    "1": """Beats 1-2: Hook and setup
Beat 3: Inciting incident
Beats 4-5: Rising action
Beat 6: Climax
Beats 7-8: Resolution""",
    "2": """Beats 1-3: Setup (world, character, status quo)
Beat 4: Inciting incident
Beats 5-7: Rising action
Beats 8-9: Midpoint shift
Beats 10-12: Escalating conflict
Beat 13: Crisis / dark moment
Beat 14: Climax
Beat 15: Resolution""",
    "3": """Beats 1-4: Setup and world establishment
Beat 5: Inciting incident
Beats 6-10: Rising action (first half)
Beats 11-12: Midpoint
Beats 13-17: Rising action (second half)
Beats 18-19: Crisis
Beats 20-21: Climax
Beats 22-23: Resolution""",
}

STYLE_DISPLAY = {
    "cinematic": "Cinematic (photorealistic, shot on 35mm film)",
    "3d_animated": "3D Animated (Pixar-style rendering)",
    "2d_animated": "2D Animated (illustrated, hand-drawn aesthetic)",
}

STORY_SYSTEM_PROMPT = """You are a short film writer. Your job is to turn a story idea into a
structured beat sheet that can be directly visualized as video.

RULES:
1. Every beat = one 8-second video shot
2. Each beat must show ONE clear action (no "and then")
3. Write what we SEE and HEAR, not internal thoughts
4. Dialogue (if any) must be under 15 words per beat
5. The story must have a clear emotional arc
6. Everything must be visually achievable
7. Flag any beat where the scene changes location or jumps in time

OUTPUT: You must respond with valid JSON only. No markdown, no explanation, just the JSON object."""


# ============================================================
# Request/Response Models
# ============================================================

class Character(BaseModel):
    id: str
    name: str
    appearance: str
    role: Literal["protagonist", "supporting"]


class Setting(BaseModel):
    location: str
    time: str
    atmosphere: str


class Beat(BaseModel):
    beat_number: int
    description: str
    story_function: str  # hook, setup, inciting_incident, rising_action, midpoint, climax, resolution, crisis, etc.
    scene_change: bool
    dialogue: Optional[str] = None


class Story(BaseModel):
    id: str
    title: str
    characters: List[Character]
    setting: Setting
    beats: List[Beat]
    duration: str
    style: str


class GenerateStoryRequest(BaseModel):
    idea: str
    duration: Literal["1", "2", "3"]
    style: Literal["cinematic", "3d_animated", "2d_animated"]


class GenerateStoryResponse(BaseModel):
    story: Story
    cost_usd: float = 0.0


class RegenerateStoryRequest(BaseModel):
    idea: str
    duration: Literal["1", "2", "3"]
    style: Literal["cinematic", "3d_animated", "2d_animated"]
    feedback: Optional[str] = None


class RefineBeatRequest(BaseModel):
    story: Story
    beat_number: int
    feedback: str


class RefineBeatResponse(BaseModel):
    beat: Beat


# ============================================================
# Helper Functions
# ============================================================

def build_story_prompt(idea: str, duration: str, style: str, feedback: Optional[str] = None) -> str:
    """Build the user prompt for story generation."""
    shot_range = DURATION_TO_SHOTS[duration]
    beat_structure = BEAT_STRUCTURES[duration]
    style_display = STYLE_DISPLAY[style]

    prompt = f"""Create a {duration}-minute short film from this idea:

IDEA: "{idea}"

STYLE: {style_display}

This will be {shot_range['min']}-{shot_range['max']} shots (each 8 seconds long).

IMPORTANT: For any beat where the location changes or time jumps
significantly from the previous beat, set "scene_change": true.
This helps us handle visual transitions correctly.

OUTPUT FORMAT (JSON):
{{
  "title": "Short evocative title (2-4 words)",

  "characters": [
    {{
      "id": "unique_id",
      "name": "Character Name or Description",
      "appearance": "Physical description we will see on screen (4-5 specific visual details: build, coloring, clothing, distinguishing features)",
      "role": "protagonist|supporting"
    }}
  ],

  "setting": {{
    "location": "Primary location, be specific",
    "time": "Time of day / lighting quality",
    "atmosphere": "Mood and feeling of the world"
  }},

  "beats": [
    {{
      "beat_number": 1,
      "description": "1-2 sentences of what we SEE. Include what we HEAR if dialogue or important sound.",
      "story_function": "hook|inciting_incident|rising_action|midpoint|climax|resolution",
      "scene_change": false
    }}
  ]
}}

STRUCTURE FOR {duration} MINUTE FILM:

{beat_structure}"""

    if feedback:
        prompt += f"""

USER FEEDBACK (incorporate this into the new version):
{feedback}"""

    return prompt


def parse_story_response(response_text: str, duration: str, style: str) -> Story:
    """Parse the AI response into a Story object."""
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
    data["duration"] = duration
    data["style"] = style

    return Story(**data)


# ============================================================
# Endpoints
# ============================================================

@router.post("/generate", response_model=GenerateStoryResponse)
async def generate_story(request: GenerateStoryRequest):
    """
    Generate story beats from an idea.

    Input: { "idea": "...", "duration": "1"|"2"|"3", "style": "cinematic"|"3d_animated"|"2d_animated" }
    Output: { "story": { "id": "...", "title": "...", "characters": [...], "setting": {...}, "beats": [...] } }
    """
    try:
        prompt = build_story_prompt(request.idea, request.duration, request.style)

        response = await generate_text(
            prompt=prompt,
            system_prompt=STORY_SYSTEM_PROMPT,
            model="gemini-2.0-flash"
        )

        story = parse_story_response(response, request.duration, request.style)
        cost = estimate_story_cost(len(story.beats))
        return GenerateStoryResponse(story=story, cost_usd=round(cost, 4))

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response as JSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/regenerate", response_model=GenerateStoryResponse)
async def regenerate_story(request: RegenerateStoryRequest):
    """
    Regenerate entire story with optional feedback.

    Input: { "idea": "...", "duration": "...", "style": "...", "feedback": "optional feedback" }
    Output: { "story": { ... } }
    """
    try:
        prompt = build_story_prompt(
            request.idea,
            request.duration,
            request.style,
            request.feedback
        )

        response = await generate_text(
            prompt=prompt,
            system_prompt=STORY_SYSTEM_PROMPT,
            model="gemini-2.0-flash"
        )

        story = parse_story_response(response, request.duration, request.style)
        cost = estimate_story_cost(len(story.beats))
        return GenerateStoryResponse(story=story, cost_usd=round(cost, 4))

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

        # Build context from all beats
        beats_context = "\n".join([
            f"Beat {b.beat_number} ({b.story_function}): {b.description}"
            for b in request.story.beats
        ])

        # Build characters context
        characters_context = "\n".join([
            f"- {c.name}: {c.appearance}"
            for c in request.story.characters
        ])

        prompt = f"""You are refining Beat {request.beat_number} of a story.

STORY TITLE: {request.story.title}

CHARACTERS:
{characters_context}

SETTING: {request.story.setting.location}, {request.story.setting.time}
ATMOSPHERE: {request.story.setting.atmosphere}

ALL BEATS FOR CONTEXT:
{beats_context}

CURRENT BEAT {request.beat_number} TO REFINE:
Description: {current_beat.description}
Story Function: {current_beat.story_function}
Scene Change: {current_beat.scene_change}

USER FEEDBACK: {request.feedback}

Rewrite ONLY Beat {request.beat_number} incorporating the feedback while maintaining story continuity.

OUTPUT FORMAT (JSON only, no explanation):
{{
  "beat_number": {request.beat_number},
  "description": "1-2 sentences of what we SEE",
  "story_function": "{current_beat.story_function}",
  "scene_change": {str(current_beat.scene_change).lower()},
  "dialogue": null
}}"""

        system_prompt = """You are a short film writer refining a single beat of a story.
Keep the beat consistent with the overall story but incorporate the user's feedback.
Write what we SEE and HEAR, not internal thoughts.
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
        beat = Beat(**beat_data)

        return RefineBeatResponse(beat=beat)

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response as JSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
