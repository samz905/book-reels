"""
Universal background job router.
Every generation type (text, image, video) flows through POST /jobs/submit.
Backend processes asynchronously, writes results to gen_jobs in Supabase.
Frontend receives updates via Supabase Realtime.
"""
import asyncio
import traceback
import uuid
from typing import Optional, Dict, Any, List

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

from ..supabase_client import (
    async_create_gen_job,
    async_update_gen_job,
    async_upload_image_base64,
    get_supabase,
)
from ..core import (
    generate_text,
    generate_image,
    generate_image_with_references,
    estimate_story_cost,
    COST_IMAGE_GENERATION,
)
from ..prompts import (
    STORY_MODEL,
    STORY_SCHEMA,
    REFINED_SCENE_SCHEMA,
    SCENE_DESCRIPTIONS_SCHEMA,
)

# Import router modules for their handler logic
from . import story as story_mod
from . import moodboard as moodboard_mod
from . import film as film_mod
from . import asset_gen as asset_gen_mod

router = APIRouter()


# ============================================================
# Request/Response Models
# ============================================================

class SubmitJobRequest(BaseModel):
    generation_id: str
    job_type: str       # e.g. "script", "protagonist", "character", "location", "film"
    target_id: str = "" # e.g. character_id, location_id, scene_number
    backend_path: str   # e.g. "/story/generate", "/moodboard/generate-protagonist"
    payload: dict       # The request body for the backend endpoint


class SubmitJobResponse(BaseModel):
    job_id: str
    status: str


# ============================================================
# Submit Endpoint
# ============================================================

@router.post("/submit", response_model=SubmitJobResponse)
async def submit_job(request: SubmitJobRequest, background_tasks: BackgroundTasks):
    """
    Submit any generation as a background job.
    Returns immediately with job_id. Results delivered via Supabase Realtime.
    """
    try:
        row = await async_create_gen_job(
            generation_id=request.generation_id,
            job_type=request.job_type,
            target_id=request.target_id,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create job: {e}")

    job_id = row["id"]

    # If a task is already running for this job, return the existing ID
    # without spawning a duplicate background task.
    if not row.get("_already_generating"):
        background_tasks.add_task(run_job, job_id, request)

    return SubmitJobResponse(job_id=job_id, status="generating")


# ============================================================
# Background Task Dispatcher
# ============================================================

async def run_job(job_id: str, request: SubmitJobRequest):
    """Execute the generation and update gen_jobs with result."""
    try:
        handler = ROUTE_HANDLERS.get(request.backend_path)
        if not handler:
            raise ValueError(f"Unknown backend_path: {request.backend_path}")

        # Film handlers need job_id for incremental progress updates
        is_film = request.backend_path.startswith("/film/")
        if is_film:
            result = await handler(request.payload, job_id=job_id)
        else:
            result = await handler(request.payload)

        # Upload any base64 images in the result to Storage
        result = await upload_result_images(
            request.generation_id,
            request.job_type,
            request.target_id,
            result,
        )

        await async_update_gen_job(job_id, "completed", result=result)
        print(f"[job] {request.job_type}/{request.target_id} completed")

    except Exception as e:
        # Extract clean message: HTTPException.detail is user-friendly,
        # otherwise fall back to str(e).
        error_msg = getattr(e, "detail", None) or str(e)
        print(f"[job] {request.job_type}/{request.target_id} FAILED: {error_msg}")
        print(traceback.format_exc())
        await async_update_gen_job(job_id, "failed", error=error_msg)


# ============================================================
# Image Upload Helper
# ============================================================

async def upload_result_images(
    generation_id: str,
    job_type: str,
    target_id: str,
    result: dict,
) -> dict:
    """
    Find image_base64 fields in result, upload to Storage, replace with image_url.
    Handles both top-level and nested structures.
    """
    if not generation_id:
        return result

    sb = get_supabase()
    if not sb:
        return result

    # Top-level image
    result = await _upload_image_in_dict(result, generation_id, job_type, target_id, "main")

    # Nested: image field (MoodboardImage-shaped)
    if "image" in result and isinstance(result["image"], dict):
        result["image"] = await _upload_image_in_dict(
            result["image"], generation_id, job_type, target_id, "image"
        )

    # Nested: images list
    if "images" in result and isinstance(result["images"], list):
        for i, img in enumerate(result["images"]):
            if isinstance(img, dict):
                result["images"][i] = await _upload_image_in_dict(
                    img, generation_id, job_type, target_id, f"image_{i}"
                )

    # Nested: key_moment / key_moments
    if "key_moment" in result and isinstance(result["key_moment"], dict):
        km = result["key_moment"]
        if "image" in km and isinstance(km["image"], dict):
            km["image"] = await _upload_image_in_dict(
                km["image"], generation_id, job_type, target_id, "key_moment"
            )

    if "key_moments" in result and isinstance(result["key_moments"], list):
        for i, km in enumerate(result["key_moments"]):
            if isinstance(km, dict) and "image" in km and isinstance(km["image"], dict):
                km["image"] = await _upload_image_in_dict(
                    km["image"], generation_id, job_type, target_id, f"key_moment_{i}"
                )

    # Nested: scene_images list
    if "scene_images" in result and isinstance(result["scene_images"], list):
        for i, si in enumerate(result["scene_images"]):
            if isinstance(si, dict) and "image" in si and isinstance(si["image"], dict):
                si["image"] = await _upload_image_in_dict(
                    si["image"], generation_id, job_type, target_id, f"scene_{i}"
                )

    return result


async def _upload_image_in_dict(d: dict, gen_id: str, job_type: str, target_id: str, label: str) -> dict:
    """If dict has image_base64, upload it and replace with image_url."""
    if "image_base64" not in d or not d["image_base64"]:
        return d
    try:
        mime = d.get("mime_type", "image/png")
        ext = "png" if "png" in mime else "jpg" if "jpeg" in mime or "jpg" in mime else "webp"
        safe_target = target_id.replace("/", "_") if target_id else "default"
        path = f"{job_type}/{safe_target}/{label}.{ext}"
        url = await async_upload_image_base64(gen_id, path, d["image_base64"], mime)
        d["image_url"] = url
        del d["image_base64"]
    except Exception as e:
        print(f"[upload] Warning: failed to upload {label}: {e}")
        # Keep base64 as fallback
    return d


# ============================================================
# Route Handlers — each calls existing core functions directly
# ============================================================

async def handle_story_generate(payload: dict) -> dict:
    """Handle /story/generate."""
    req = story_mod.GenerateStoryRequest(**payload)
    pre_char_ids = {c.id for c in req.characters} if req.characters else None
    prompt = story_mod.build_story_prompt(
        req.idea, req.style,
        characters=req.characters,
        location=req.location,
    )
    response = await generate_text(
        prompt=prompt,
        system_prompt=story_mod.STORY_SYSTEM_PROMPT,
        output_schema=STORY_SCHEMA,
    )
    story_obj = story_mod.parse_story_response(
        response, req.style,
        pre_selected_char_ids=pre_char_ids,
        pre_selected_chars=req.characters,
        pre_selected_location=req.location,
    )
    cost = estimate_story_cost(len(story_obj.scenes) or len(story_obj.beats))
    sanitized = story_mod.sanitize_story_for_client(story_obj)
    return {"story": sanitized, "cost_usd": round(cost, 4)}


async def handle_story_regenerate(payload: dict) -> dict:
    """Handle /story/regenerate."""
    req = story_mod.RegenerateStoryRequest(**payload)
    pre_char_ids = {c.id for c in req.characters} if req.characters else None
    prompt = story_mod.build_story_prompt(
        req.idea, req.style,
        feedback=req.feedback,
        characters=req.characters,
        location=req.location,
    )
    response = await generate_text(
        prompt=prompt,
        system_prompt=story_mod.STORY_SYSTEM_PROMPT,
        output_schema=STORY_SCHEMA,
    )
    story_obj = story_mod.parse_story_response(
        response, req.style,
        pre_selected_char_ids=pre_char_ids,
        pre_selected_chars=req.characters,
        pre_selected_location=req.location,
    )
    cost = estimate_story_cost(len(story_obj.scenes) or len(story_obj.beats))
    sanitized = story_mod.sanitize_story_for_client(story_obj)
    return {"story": sanitized, "cost_usd": round(cost, 4)}


async def handle_story_parse_script(payload: dict) -> dict:
    """Handle /story/parse-script."""
    req = story_mod.ParseScriptRequest(**payload)
    prompt = story_mod.build_parse_script_prompt(req.script, req.style)
    response = await generate_text(
        prompt=prompt,
        system_prompt=story_mod.STORY_SYSTEM_PROMPT,
        output_schema=STORY_SCHEMA,
    )
    story_obj = story_mod.parse_story_response(response, req.style)
    cost = estimate_story_cost(len(story_obj.scenes) or len(story_obj.beats))
    sanitized = story_mod.sanitize_story_for_client(story_obj)
    return {"story": sanitized, "cost_usd": round(cost, 4)}


async def handle_refine_beat(payload: dict) -> dict:
    """Handle /story/refine-beat."""
    req = story_mod.RefineBeatRequest(**payload)
    # Reuse the endpoint logic directly — it's complex with context building
    import json as _json

    scene_num = req.beat_number
    current_scene = None
    for s in req.story.scenes:
        if s.scene_number == scene_num:
            current_scene = s
            break

    current_beat = None
    for b in req.story.beats:
        if b.beat_number == scene_num:
            current_beat = b
            break

    if not current_scene and not current_beat:
        raise ValueError(f"Scene {scene_num} not found in story")

    if current_scene and not current_beat:
        current_beat = story_mod.Beat(**story_mod.scene_to_beat(current_scene))
    if current_beat and not current_scene:
        current_scene = story_mod.beat_to_scene(current_beat.model_dump(), scene_num)

    def _scene_summary(s):
        parts = [f"Scene {s.scene_number} — {s.title}:"]
        if s.action:
            parts.append(f"  Action: {s.action}")
        if s.dialogue:
            parts.append(f"  Dialogue: {s.dialogue}")
        if s.image_prompt:
            parts.append(f"  Visual: {s.image_prompt}")
        return "\n".join(parts)

    if req.story.scenes:
        scenes_context = "\n\n".join([_scene_summary(s) for s in req.story.scenes])
    else:
        def _beat_summary(b):
            parts = [f"Scene {b.beat_number}:"]
            if b.blocks:
                for block in b.blocks:
                    if block.type == "dialogue" and block.character:
                        parts.append(f'  {block.character}: "{block.text}"')
                    else:
                        parts.append(f"  {block.text}")
            return "\n".join(parts)
        scenes_context = "\n\n".join([_beat_summary(b) for b in req.story.beats])

    characters_context = "\n".join([
        f"- {c.name} ({c.age} {c.gender}): {c.appearance}"
        for c in req.story.characters
    ])
    locations_context = "\n".join([
        f"- {loc.id} ({loc.name}): {loc.description} ({loc.atmosphere})"
        for loc in req.story.locations
    ]) if req.story.locations else "No locations defined"

    all_char_ids = [c.id for c in req.story.characters]
    location_ids = [loc.id for loc in req.story.locations] if req.story.locations else []

    prompt = f"""You are refining Scene {scene_num} of a story.

STORY TITLE: {req.story.title}

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

USER FEEDBACK: {req.feedback}

Rewrite ONLY Scene {scene_num} incorporating the feedback while maintaining story continuity.
Remember: NO exposition, NO backstory, ONLY present-moment conflict.

OUTPUT FORMAT (JSON only, no explanation):
{{
  "scene_number": {scene_num},
  "title": "Short 2-4 word title",
  "duration": "{current_scene.duration}",
  "characters_on_screen": {_json.dumps(current_scene.characters_on_screen or all_char_ids)},
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
        model=STORY_MODEL,
        output_schema=REFINED_SCENE_SCHEMA,
    )

    scene_data = _json.loads(response)
    scene_data["scene_number"] = scene_data.get("scene_number", scene_num)
    scene_data["beat_type"] = story_mod.BEAT_NUMBER_TO_TYPE.get(scene_num, "rise")
    scene_data["time_range"] = story_mod.BEAT_TIME_RANGES.get(scene_num, "0:00-0:08")

    if not scene_data.get("characters_on_screen"):
        scene_data["characters_on_screen"] = all_char_ids
    if not scene_data.get("setting_id") and location_ids:
        scene_data["setting_id"] = location_ids[0]
    # Structured outputs guarantees action is array — join to string for Scene model
    if isinstance(scene_data.get("action"), list):
        scene_data["action"] = "\n".join(scene_data["action"])

    refined_scene = story_mod.Scene(**scene_data)
    beat_dict = story_mod.scene_to_beat(refined_scene)
    beat = story_mod.Beat(**beat_dict)

    return {"beat": beat.model_dump()}


async def handle_scene_descriptions(payload: dict) -> dict:
    """Handle /story/generate-scene-descriptions."""
    req = story_mod.GenerateSceneDescriptionsRequest(**payload)
    # Call the endpoint logic directly (reuse from story router)
    import json as _json

    story_obj = req.story
    scenes = story_obj.scenes
    if not scenes and story_obj.beats:
        scenes = [
            story_mod.beat_to_scene(b.model_dump(), b.number)
            for b in story_obj.beats
        ]
    if not scenes:
        raise ValueError("Story has no scenes or beats")

    characters_context = "\n".join([
        f"- {c.name} (id: {c.id}, {c.age} {c.gender}): {c.appearance}"
        for c in story_obj.characters
    ])
    locations_context = "\n".join([
        f"- {loc.id} ({loc.name}): {loc.description} ({loc.atmosphere})"
        for loc in story_obj.locations
    ]) if story_obj.locations else "No locations defined"

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
    style_display = story_mod.STYLE_DISPLAY.get(story_obj.style, story_obj.style)

    prompt = f"""You are generating cinematic visual descriptions for a vertical short film.

STORY TITLE: {story_obj.title}
STYLE: {style_display}

CHARACTERS:
{characters_context}

LOCATIONS:
{locations_context}

SCENES:
{scenes_text}

For each scene, write a 1-2 sentence cinematic visual description suitable for generating a still image. Describe what the CAMERA SEES — character positioning, expressions, lighting, composition. Include specific character names.

OUTPUT FORMAT (JSON array only, no markdown, no explanation):
[
  {{"scene_number": 1, "title": "Short 2-4 word title", "visual_description": "1-2 sentence cinematic description of what the camera sees..."}},
  ...
]

RULES:
- One entry per scene (exactly {len(scenes)} entries)
- Focus on VISUAL details: framing, lighting, body language, spatial relationships
- Include character NAMES (not IDs) in descriptions
- Keep each description to 1-2 sentences
- Make descriptions suitable for image generation prompts
- Output ONLY the JSON array"""

    response = await generate_text(
        prompt=prompt,
        system_prompt="You are a cinematographer writing shot descriptions. Output valid JSON only.",
        model=STORY_MODEL,
        output_schema=SCENE_DESCRIPTIONS_SCHEMA,
    )

    descriptions_data = _json.loads(response)
    descriptions = [
        {
            "scene_number": d["scene_number"],
            "title": d.get("title", f"Scene {d['scene_number']}"),
            "visual_description": d["visual_description"],
        }
        for d in descriptions_data
    ]
    cost = estimate_story_cost(1)
    return {"descriptions": descriptions, "cost_usd": round(cost, 4)}


# ============================================================
# Moodboard Handlers
# ============================================================

async def handle_protagonist(payload: dict) -> dict:
    """Handle /moodboard/generate-protagonist."""
    req = moodboard_mod.GenerateProtagonistRequest(**payload)
    # Call the endpoint function directly and serialize
    result = await moodboard_mod.generate_protagonist(req)
    return result.model_dump()


async def handle_character(payload: dict) -> dict:
    """Handle /moodboard/generate-character."""
    req = moodboard_mod.GenerateCharacterRequest(**payload)
    result = await moodboard_mod.generate_character(req)
    return result.model_dump()


async def handle_refine_character(payload: dict) -> dict:
    """Handle /moodboard/refine-character."""
    req = moodboard_mod.RefineCharacterRequest(**payload)
    result = await moodboard_mod.refine_character(req)
    return result.model_dump()


async def handle_location(payload: dict) -> dict:
    """Handle /moodboard/generate-location."""
    req = moodboard_mod.GenerateLocationRequest(**payload)
    result = await moodboard_mod.generate_location(req)
    return result.model_dump()


async def handle_refine_location(payload: dict) -> dict:
    """Handle /moodboard/refine-location."""
    req = moodboard_mod.RefineLocationRequest(**payload)
    result = await moodboard_mod.refine_location(req)
    return result.model_dump()


async def handle_key_moment(payload: dict) -> dict:
    """Handle /moodboard/generate-key-moment."""
    req = moodboard_mod.GenerateKeyMomentRequest(**payload)
    result = await moodboard_mod.generate_key_moment(req)
    return result.model_dump()


async def handle_refine_key_moment(payload: dict) -> dict:
    """Handle /moodboard/refine-key-moment."""
    req = moodboard_mod.RefineKeyMomentRequest(**payload)
    result = await moodboard_mod.refine_key_moment(req)
    return result.model_dump()


async def handle_scene_images(payload: dict) -> dict:
    """Handle /moodboard/generate-scene-images."""
    req = moodboard_mod.GenerateSceneImagesRequest(**payload)
    result = await moodboard_mod.generate_scene_images(req)
    return result.model_dump()


async def handle_generate_single_scene_image(payload: dict) -> dict:
    """Handle /moodboard/generate-scene-image (single scene, returns single image)."""
    batch_payload = {
        "story": payload.get("story"),
        "approved_visuals": payload.get("approved_visuals"),
        "scene_descriptions": [{
            "scene_number": payload["scene_number"],
            "visual_description": payload.get("visual_description", ""),
        }],
    }
    req = moodboard_mod.GenerateSceneImagesRequest(**batch_payload)
    result = await moodboard_mod.generate_scene_images(req)
    data = result.model_dump()
    scene_images = data.get("scene_images", [])
    if scene_images:
        si = scene_images[0]
        return {
            "image": si["image"],
            "prompt_used": si.get("prompt_used"),
            "cost_usd": data.get("cost_usd"),
        }
    return {"error": "No image generated"}


async def handle_refine_scene_image(payload: dict) -> dict:
    """Handle /moodboard/refine-scene-image."""
    req = moodboard_mod.RefineSceneImageRequest(**payload)
    result = await moodboard_mod.refine_scene_image(req)
    return result.model_dump()


# ============================================================
# Film Handlers
# ============================================================

async def handle_film_generate(payload: dict, job_id: str = "") -> dict:
    """Handle /film/generate with incremental gen_jobs progress updates.

    Each shot completion triggers persist_film_job() which pushes progress
    to gen_jobs via Supabase, enabling Realtime updates to the frontend.
    """
    from datetime import datetime

    req = film_mod.GenerateFilmRequest(**payload)
    film_id = uuid.uuid4().hex[:12]

    # Build storyboard image map from request
    sb_images: dict = {}
    if req.storyboard_images:
        for bn, ref in req.storyboard_images.items():
            sb_images[int(bn)] = {"image_url": ref.image_url, "mime_type": ref.mime_type}

    job = film_mod.FilmJob(
        film_id=film_id,
        status="generating",
        created_at=datetime.now(),
        story=req.story,
        approved_visuals=req.approved_visuals,
        total_shots=len(req.story.beats),
        generation_id=req.generation_id,
        storyboard_images=sb_images,
    )
    # Attach gen_job_id so persist_film_job() pushes incremental updates
    job.gen_job_id = job_id  # type: ignore[attr-defined]

    film_mod.film_jobs[film_id] = job
    await film_mod.run_film_generation(film_id)

    return _film_result(job)


async def handle_film_with_prompts(payload: dict, job_id: str = "") -> dict:
    """Handle /film/generate-with-prompts with incremental progress."""
    from datetime import datetime

    req = film_mod.GenerateWithPromptsRequest(**payload)
    film_id = uuid.uuid4().hex[:12]

    prompt_map = {s.beat_number: s.veo_prompt for s in req.edited_shots}
    beats_to_process = [b for b in req.story.beats if b.number in prompt_map]

    # Build storyboard image map (prefer per-shot reference_image, then storyboard_images)
    sb_images: dict = {}
    if req.storyboard_images:
        for bn, ref in req.storyboard_images.items():
            sb_images[int(bn)] = {"image_url": ref.image_url, "mime_type": ref.mime_type}
    for shot in req.edited_shots:
        if shot.reference_image and shot.reference_image.image_url:
            sb_images[shot.beat_number] = {
                "image_url": shot.reference_image.image_url,
                "mime_type": shot.reference_image.mime_type,
            }

    job = film_mod.FilmJob(
        film_id=film_id,
        status="generating",
        created_at=datetime.now(),
        story=req.story,
        approved_visuals=req.approved_visuals,
        total_shots=len(beats_to_process),
        generation_id=req.generation_id,
        storyboard_images=sb_images,
    )
    job.gen_job_id = job_id  # type: ignore[attr-defined]

    film_mod.film_jobs[film_id] = job

    await film_mod.run_film_generation(film_id, prompt_map)
    return _film_result(job)


async def handle_prompt_preview(payload: dict, job_id: str = "") -> dict:
    """Handle /film/preview-prompts."""
    req = film_mod.GenerateFilmRequest(**payload)
    result = await film_mod.preview_prompts(req)
    return result.model_dump()


async def handle_shot_regenerate(payload: dict, job_id: str = "") -> dict:
    """Handle /film/{id}/shot/{n}/regenerate."""
    film_id = payload.get("film_id")
    shot_number = payload.get("shot_number")
    feedback = payload.get("feedback")

    job = film_mod.film_jobs.get(film_id)
    if not job:
        raise ValueError(f"Film {film_id} not found")

    # Attach gen_job_id for incremental updates
    if job_id:
        job.gen_job_id = job_id  # type: ignore[attr-defined]

    beat = next((b for b in job.story.beats if b.number == shot_number), None)
    if not beat:
        raise ValueError(f"Beat {shot_number} not found")

    await film_mod.run_shot_regeneration(job, beat, feedback)

    shot = next((s for s in job.completed_shots if s.number == shot_number), None)
    return {
        "film_id": film_id,
        "shot_number": shot_number,
        "status": "ready",
        "preview_url": shot.storage_url if shot else "",
        "veo_prompt": shot.veo_prompt if shot else "",
        "cost": {
            "scene_refs_usd": round(job.cost_scene_refs, 4),
            "videos_usd": round(job.cost_videos, 4),
            "total_usd": round(job.cost_total, 4),
        },
    }


def _film_result(job: film_mod.FilmJob) -> dict:
    """Extract final result dict from a FilmJob."""
    return {
        "film_id": job.film_id,
        "status": job.status,
        "total_shots": job.total_shots,
        "completed_shots": [
            {"number": s.number, "storage_url": s.storage_url, "veo_prompt": s.veo_prompt}
            for s in job.completed_shots
        ],
        "final_video_url": job.final_storage_url,
        "error_message": job.error_message,
        "cost": {
            "scene_refs_usd": round(job.cost_scene_refs, 4),
            "videos_usd": round(job.cost_videos, 4),
            "total_usd": round(job.cost_total, 4),
        },
    }


# ============================================================
# Asset Gen Handlers
# ============================================================

async def handle_asset_character_image(payload: dict) -> dict:
    """Handle /assets/generate-character-image.

    Wraps result in MoodboardImage-shaped structure so upload_result_images
    uploads the nested image and applyCompletedJob gets result.image.
    """
    req = asset_gen_mod.GenerateCharacterImageRequest(**payload)
    result = await asset_gen_mod.generate_character_image(req)
    data = result.model_dump()
    return {
        "character_id": payload.get("character_id"),
        "image": {
            "type": "character",
            "image_base64": data["image_base64"],
            "mime_type": data["mime_type"],
            "prompt_used": data.get("prompt_used", ""),
        },
        "prompt_used": data.get("prompt_used", ""),
        "cost_usd": data.get("cost_usd", 0),
    }


async def handle_asset_location_image(payload: dict) -> dict:
    """Handle /assets/generate-location-image.

    Wraps result in MoodboardImage-shaped structure so upload_result_images
    uploads the nested image and applyCompletedJob gets result.image.
    """
    req = asset_gen_mod.GenerateLocationImageRequest(**payload)
    result = await asset_gen_mod.generate_location_image(req)
    data = result.model_dump()
    return {
        "location_id": payload.get("location_id"),
        "image": {
            "type": "location",
            "image_base64": data["image_base64"],
            "mime_type": data["mime_type"],
            "prompt_used": data.get("prompt_used", ""),
        },
        "prompt_used": data.get("prompt_used", ""),
        "cost_usd": data.get("cost_usd", 0),
    }


async def handle_clip_generate(payload: dict, job_id: str = "") -> dict:
    """Handle /film/generate-clip — generate a single scene clip."""
    req = film_mod.GenerateClipRequest(**payload)
    result = await film_mod.generate_single_clip(req)
    return result


async def handle_assemble_clips(payload: dict, job_id: str = "") -> dict:
    """Handle /film/assemble-clips — assemble clips into final video."""
    req = film_mod.AssembleClipsRequest(**payload)
    result = await film_mod.assemble_clips(req)
    return result


# ============================================================
# Route Handler Map
# ============================================================

ROUTE_HANDLERS = {
    # Story
    "/story/generate": handle_story_generate,
    "/story/regenerate": handle_story_regenerate,
    "/story/parse-script": handle_story_parse_script,
    "/story/refine-beat": handle_refine_beat,
    "/story/generate-scene-descriptions": handle_scene_descriptions,

    # Moodboard
    "/moodboard/generate-protagonist": handle_protagonist,
    "/moodboard/generate-character": handle_character,
    "/moodboard/refine-character": handle_refine_character,
    "/moodboard/generate-location": handle_location,
    "/moodboard/refine-location": handle_refine_location,
    "/moodboard/generate-key-moment": handle_key_moment,
    "/moodboard/refine-key-moment": handle_refine_key_moment,
    "/moodboard/generate-scene-images": handle_scene_images,
    "/moodboard/generate-scene-image": handle_generate_single_scene_image,
    "/moodboard/refine-scene-image": handle_refine_scene_image,

    # Film
    "/film/generate": handle_film_generate,
    "/film/generate-with-prompts": handle_film_with_prompts,
    "/film/preview-prompts": handle_prompt_preview,
    "/film/shot/regenerate": handle_shot_regenerate,

    # Clips (per-scene video generation)
    "/film/generate-clip": handle_clip_generate,
    "/film/assemble-clips": handle_assemble_clips,

    # Asset gen (creator dashboard)
    "/assets/generate-character-image": handle_asset_character_image,
    "/assets/generate-location-image": handle_asset_location_image,
}
