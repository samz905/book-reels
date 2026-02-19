# Prompt templates for AI generation
from .story_system import STORY_SYSTEM_PROMPT, STORY_MODEL
from .story_examples import STORY_FEW_SHOT_EXAMPLES
from .response_schemas import (
    STORY_SCHEMA,
    REFINED_SCENE_SCHEMA,
    SCENE_DESCRIPTIONS_SCHEMA,
    DIRECTOR_SCRIPTS_SCHEMA,
)

__all__ = [
    "STORY_SYSTEM_PROMPT",
    "STORY_MODEL",
    "STORY_FEW_SHOT_EXAMPLES",
    "STORY_SCHEMA",
    "REFINED_SCENE_SCHEMA",
    "SCENE_DESCRIPTIONS_SCHEMA",
    "DIRECTOR_SCRIPTS_SCHEMA",
]
