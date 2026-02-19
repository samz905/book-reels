"""
JSON schemas for Claude structured outputs.

Each schema guarantees the LLM response is valid JSON matching the expected
structure.  Structured outputs use constrained decoding — the model literally
cannot produce tokens that violate the schema.

Rules enforced by the Anthropic API:
  - Every object must have "additionalProperties": false
  - "anyOf" is supported for union types (e.g. string | null)
"""

# ── Reusable fragments ─────────────────────────────────────────────────

_INGREDIENT_SCHEMA = {
    "type": "object",
    "properties": {
        "protagonist": {"type": "string"},
        "conflict_source": {"type": "string"},
        "immediate_tension": {"type": "string"},
        "secret": {"type": "string"},
        "spike_moment": {"type": "string"},
        "cliff_problem": {"type": "string"},
    },
    "required": [
        "protagonist",
        "conflict_source",
        "immediate_tension",
        "secret",
        "spike_moment",
        "cliff_problem",
    ],
    "additionalProperties": False,
}

_CHARACTER_SCHEMA = {
    "type": "object",
    "properties": {
        "id": {"type": "string"},
        "name": {"type": "string"},
        "gender": {"type": "string"},
        "age": {"type": "string"},
        "appearance": {"type": "string"},
        "role": {"type": "string", "enum": ["protagonist", "antagonist", "supporting"]},
    },
    "required": ["id", "name", "gender", "age", "appearance", "role"],
    "additionalProperties": False,
}

_LOCATION_SCHEMA = {
    "type": "object",
    "properties": {
        "id": {"type": "string"},
        "name": {"type": "string"},
        "description": {"type": "string"},
        "atmosphere": {"type": "string"},
    },
    "required": ["id", "name", "description", "atmosphere"],
    "additionalProperties": False,
}

_SCENE_SCHEMA = {
    "type": "object",
    "properties": {
        "scene_number": {"type": "integer"},
        "title": {"type": "string"},
        "duration": {"type": "string"},
        "characters_on_screen": {
            "type": "array",
            "items": {"type": "string"},
        },
        "setting_id": {"type": "string"},
        "action": {
            "type": "array",
            "items": {"type": "string"},
        },
        "dialogue": {
            "anyOf": [{"type": "string"}, {"type": "null"}],
        },
        "image_prompt": {"type": "string"},
        "regenerate_notes": {"type": "string"},
        "scene_heading": {"type": "string"},
        "scene_change": {"type": "boolean"},
    },
    "required": [
        "scene_number",
        "title",
        "duration",
        "characters_on_screen",
        "setting_id",
        "action",
        "dialogue",
        "image_prompt",
        "regenerate_notes",
        "scene_heading",
        "scene_change",
    ],
    "additionalProperties": False,
}

# ── Top-level schemas ───────────────────────────────────────────────────

STORY_SCHEMA = {
    "type": "object",
    "properties": {
        "ingredients": _INGREDIENT_SCHEMA,
        "characters": {
            "type": "array",
            "items": _CHARACTER_SCHEMA,
        },
        "locations": {
            "type": "array",
            "items": _LOCATION_SCHEMA,
        },
        "scenes": {
            "type": "array",
            "items": _SCENE_SCHEMA,
        },
    },
    "required": ["ingredients", "characters", "locations", "scenes"],
    "additionalProperties": False,
}

REFINED_SCENE_SCHEMA = _SCENE_SCHEMA

SCENE_DESCRIPTIONS_SCHEMA = {
    "type": "array",
    "items": {
        "type": "object",
        "properties": {
            "scene_number": {"type": "integer"},
            "title": {"type": "string"},
            "visual_description": {"type": "string"},
        },
        "required": ["scene_number", "title", "visual_description"],
        "additionalProperties": False,
    },
}

_DIALOGUE_DELIVERY_ITEM = {
    "type": "object",
    "properties": {
        "character": {"type": "string"},
        "verb": {"type": "string"},
    },
    "required": ["character", "verb"],
    "additionalProperties": False,
}

DIRECTOR_SCRIPTS_SCHEMA = {
    "type": "array",
    "items": {
        "type": "object",
        "properties": {
            "scene_number": {"type": "integer"},
            "shot_type": {"type": "string"},
            "camera_angle": {"type": "string"},
            "camera_movement": {"type": "string"},
            "sound_design": {"type": "string"},
            "dialogue_delivery": {
                "anyOf": [
                    {"type": "array", "items": _DIALOGUE_DELIVERY_ITEM},
                    {"type": "null"},
                ],
            },
            "style_note": {"type": "string"},
        },
        "required": [
            "scene_number",
            "shot_type",
            "camera_angle",
            "camera_movement",
            "sound_design",
            "dialogue_delivery",
            "style_note",
        ],
        "additionalProperties": False,
    },
}
