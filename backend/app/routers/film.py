"""
Film generation endpoints for AI video workflow.
Phase 4: Generate and assemble video shots using per-scene reference generation.
"""
import os
import uuid
import asyncio
import httpx
from datetime import datetime
from typing import Dict, Optional, List, Literal
from dataclasses import dataclass, field
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel

from ..core import (
    generate_video,
    generate_image_with_references,
    assemble_videos,
    COST_IMAGE_GENERATION,
    COST_VIDEO_VEO_FAST_PER_SECOND,
)

# Video duration and cost
VIDEO_DURATION_SECONDS = 8
COST_PER_VIDEO = VIDEO_DURATION_SECONDS * COST_VIDEO_VEO_FAST_PER_SECOND  # $1.20 per 8s clip

# Testing mode: limit shots for faster iteration
MAX_SHOTS_FOR_TESTING = 3  # Set to None for full film generation
SCENE_REFS_PER_SHOT = 3    # Nano Banana generates 3 scene-specific refs per shot
from ..config import TEMP_DIR, GOOGLE_GENAI_API_KEY
from .story import Story, Beat
from .moodboard import ApprovedVisuals, ReferenceImage

router = APIRouter()


# ============================================================
# Constants
# ============================================================

STYLE_PREFIXES = {
    "cinematic": "Cinematic shot, photorealistic, shot on 35mm film, shallow depth of field, natural lighting, film grain, professional cinematography",
    "3d_animated": "3D animated, Pixar-style rendering, stylized realism, expressive features, vibrant colors, clean lighting, appealing design",
    "2d_animated": "2D animated, illustrated style, hand-drawn aesthetic, bold outlines, stylized, expressive, graphic shapes, flat lighting with soft shadows",
}


# ============================================================
# Request/Response Models
# ============================================================

class KeyMomentRef(BaseModel):
    """Key moment image for video reference (SPIKE - emotional peak)."""
    image_base64: str
    mime_type: str


class GenerateFilmRequest(BaseModel):
    story: Story
    approved_visuals: ApprovedVisuals
    key_moment_image: KeyMomentRef  # Single SPIKE key moment for video reference


class GenerateFilmResponse(BaseModel):
    film_id: str
    status: str
    total_shots: int


class RegenerateShotRequest(BaseModel):
    """Request to regenerate a specific shot."""
    feedback: Optional[str] = None  # Optional feedback to modify the shot


class RegenerateShotResponse(BaseModel):
    """Response from shot regeneration."""
    film_id: str
    shot_number: int
    status: str
    preview_url: str


class CompletedShotInfo(BaseModel):
    number: int
    preview_url: str


class CostBreakdown(BaseModel):
    scene_refs_usd: float
    videos_usd: float
    total_usd: float


class FilmStatusResponse(BaseModel):
    film_id: str
    status: Literal["generating", "assembling", "ready", "failed"]
    current_shot: int
    total_shots: int
    phase: Literal["keyframe", "filming", "assembling"]
    completed_shots: List[CompletedShotInfo]
    final_video_url: Optional[str]
    error_message: Optional[str]
    cost: CostBreakdown


# ============================================================
# In-Memory Job Storage
# ============================================================

@dataclass
class CompletedShot:
    number: int
    video_path: str


@dataclass
class FilmJob:
    film_id: str
    status: Literal["generating", "assembling", "ready", "failed"]
    created_at: datetime

    # Input data
    story: Story
    approved_visuals: ApprovedVisuals
    key_moment_image: KeyMomentRef  # Single SPIKE key moment for video reference

    # Progress tracking
    total_shots: int
    current_shot: int = 0
    phase: Literal["keyframe", "filming", "assembling"] = "keyframe"

    # Completed work
    completed_shots: List[CompletedShot] = field(default_factory=list)

    # Output
    final_video_path: Optional[str] = None

    # Error tracking
    error_message: Optional[str] = None

    # Cost tracking (USD)
    cost_scene_refs: float = 0.0
    cost_videos: float = 0.0

    @property
    def cost_total(self) -> float:
        return self.cost_scene_refs + self.cost_videos


# In-memory storage (MVP - would use Redis/DB in production)
film_jobs: Dict[str, FilmJob] = {}


# ============================================================
# Helper Functions
# ============================================================

async def generate_scene_references(
    beat: Beat,
    story: Story,
    approved_visuals: ApprovedVisuals,
) -> List[dict]:
    """Generate 3 scene-specific reference images via Nano Banana (Gemini image gen).

    For each shot, selects the relevant character refs + location ref from the
    approved moodboard, then generates 3 composite images showing those characters
    in that location from different angles. These 3 scene refs are what Veo receives.

    Returns:
        List of 3 dicts, each with image_base64 and mime_type
    """
    style_prefix = STYLE_PREFIXES.get(story.style, STYLE_PREFIXES["cinematic"])

    # 1. Select character refs for this scene
    char_refs = []
    char_names = []

    if beat.characters_in_scene and approved_visuals.character_image_map:
        # Use per-character mapping (preferred)
        for char_id in beat.characters_in_scene:
            if char_id in approved_visuals.character_image_map:
                ref = approved_visuals.character_image_map[char_id]
                char_refs.append({
                    "image_base64": ref.image_base64,
                    "mime_type": ref.mime_type,
                })
            # Get character name
            char = next((c for c in story.characters if c.id == char_id), None)
            if char:
                char_names.append(f"{char.name} ({char.age} {char.gender})")
    else:
        # Fallback: use all character images in order
        for i, char in enumerate(story.characters):
            if i < len(approved_visuals.character_images):
                ref = approved_visuals.character_images[i]
                char_refs.append({
                    "image_base64": ref.image_base64,
                    "mime_type": ref.mime_type,
                })
            char_names.append(f"{char.name} ({char.age} {char.gender})")

    # 2. Select location ref for this scene
    location_ref = None
    location_desc = ""
    if beat.location_id and approved_visuals.location_images:
        if beat.location_id in approved_visuals.location_images:
            loc_img = approved_visuals.location_images[beat.location_id]
            location_ref = {
                "image_base64": loc_img.image_base64,
                "mime_type": loc_img.mime_type,
            }
        location_desc = approved_visuals.location_descriptions.get(beat.location_id, "")

    if not location_ref and approved_visuals.setting_image:
        location_ref = {
            "image_base64": approved_visuals.setting_image.image_base64,
            "mime_type": approved_visuals.setting_image.mime_type,
        }
        location_desc = approved_visuals.setting_description or ""

    # 3. Combine all refs (Gemini can handle 5+ reference images)
    all_refs = char_refs[:]
    if location_ref:
        all_refs.append(location_ref)

    print(f"  Scene refs: {len(char_refs)} character(s) + {'1 location' if location_ref else 'no location'} = {len(all_refs)} total input refs")

    # 4. Generate 3 scene refs in parallel with different angle prompts
    angle_variants = [
        "medium shot, eye level, showing full scene composition",
        "over-the-shoulder shot, slightly low angle, intimate perspective",
        "wide establishing shot, slight high angle, environmental context",
    ]

    async def gen_one_ref(angle_desc: str) -> dict:
        action_line = f"\nAction: {beat.action}" if beat.action else ""
        prompt = f"""{style_prefix}

Generate a reference image for this scene.
Scene: {beat.description}{action_line}
Characters: {', '.join(char_names)}
Location: {location_desc}

Camera: {angle_desc}

Show these exact characters in this exact location.
Maintain character appearances precisely from references.
Maintain location appearance precisely from references.

Portrait orientation, 9:16 aspect ratio."""

        result = await generate_image_with_references(
            prompt=prompt,
            reference_images=all_refs,
            aspect_ratio="9:16",
            resolution="2K",
        )
        return {
            "image_base64": result["image_base64"],
            "mime_type": result.get("mime_type", "image/png"),
        }

    # Run all 3 in parallel
    results = await asyncio.gather(*[gen_one_ref(angle) for angle in angle_variants])
    return list(results)


def build_shot_prompt(beat: Beat, story: Story) -> str:
    """Build the Veo prompt for a video shot."""
    style_prefix = STYLE_PREFIXES.get(story.style, STYLE_PREFIXES["cinematic"])

    # Get characters in this scene
    if beat.characters_in_scene:
        scene_chars = [c for c in story.characters if c.id in beat.characters_in_scene]
    else:
        scene_chars = story.characters

    chars = "\n".join([f"- {c.name} ({c.age} {c.gender}): {c.appearance}" for c in scene_chars])

    # Get location for this beat
    location_desc = ""
    atmosphere = ""
    if beat.location_id and story.locations:
        loc = next((l for l in story.locations if l.id == beat.location_id), None)
        if loc:
            location_desc = loc.description
            atmosphere = loc.atmosphere
    if not location_desc and story.setting:
        location_desc = f"{story.setting.location}, {story.setting.time}"
        atmosphere = story.setting.atmosphere

    # Use scene_heading if available
    heading = beat.scene_heading or ""

    prompt = f"""{style_prefix}

{heading}

SETTING: {location_desc}
ATMOSPHERE: {atmosphere}

SCENE: {beat.description}

CHARACTERS:
{chars}"""

    if beat.action:
        prompt += f"\n\nACTION: {beat.action}"

    if beat.dialogue:
        dialogue_lines = "\n".join([f'{d.character}: "{d.line}"' for d in beat.dialogue])
        prompt += f"\n\nDIALOGUE:\n{dialogue_lines}"

    prompt += "\n\n8-second video shot. Smooth, cinematic camera movement.\nPortrait orientation 9:16."

    return prompt


async def download_video(video_url: str, film_id: str, shot_number: int) -> str:
    """Download video from Google's authenticated URL and save locally."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            video_url,
            headers={"x-goog-api-key": GOOGLE_GENAI_API_KEY},
            follow_redirects=True,
            timeout=120.0,
        )
        response.raise_for_status()

        filename = f"{film_id}_shot_{shot_number:02d}.mp4"
        filepath = os.path.join(TEMP_DIR, filename)

        with open(filepath, "wb") as f:
            f.write(response.content)

        return filepath


async def generate_shot_with_retry(
    beat: Beat,
    prompt: str,
    reference_images: List[dict],  # 3 scene-specific refs (required)
    max_retries: int = 2,
) -> dict:
    """Generate a video shot with retry logic. Uses reference_images only (no first_frame)."""
    last_error = None

    for attempt in range(max_retries + 1):
        try:
            print(f"  Attempt {attempt + 1}/{max_retries + 1} for shot {beat.number}")
            result = await generate_video(
                prompt=prompt,
                reference_images=reference_images,
                duration_seconds=8,
                aspect_ratio="9:16",
            )
            return result
        except Exception as e:
            last_error = e
            print(f"  Shot {beat.number} attempt {attempt + 1} failed: {e}")
            if attempt < max_retries:
                await asyncio.sleep(2)  # Brief pause before retry

    raise Exception(f"Shot {beat.number} failed after {max_retries + 1} attempts: {last_error}")


# ============================================================
# Background Generation Task
# ============================================================

async def process_single_shot(i: int, beat: Beat, job: "FilmJob") -> None:
    """Process a single shot: generate scene refs → generate video → download.

    Updates job.completed_shots and cost fields in-place.
    Safe in asyncio (single-threaded, no lock needed).
    """
    print(f"\n--- Shot {i + 1}/{job.total_shots}: Beat {beat.number} ---")
    print(f"Description: {beat.description[:100]}...")
    print(f"Characters: {beat.characters_in_scene}")
    print(f"Location: {beat.location_id}")

    # STEP 1: Generate 3 scene-specific reference images via Nano Banana
    print(f"[Shot {beat.number}] Generating 3 scene-specific reference images...")
    scene_refs = await generate_scene_references(
        beat=beat,
        story=job.story,
        approved_visuals=job.approved_visuals,
    )
    job.cost_scene_refs += COST_IMAGE_GENERATION * SCENE_REFS_PER_SHOT
    print(f"[Shot {beat.number}] Scene refs generated (cost: ${COST_IMAGE_GENERATION * SCENE_REFS_PER_SHOT:.2f})")

    # STEP 2: Generate video shot with ONLY reference_images (no first_frame)
    shot_prompt = build_shot_prompt(beat, job.story)
    print(f"[Shot {beat.number}] Generating video with {len(scene_refs)} scene refs...")
    video_result = await generate_shot_with_retry(
        beat=beat,
        prompt=shot_prompt,
        reference_images=scene_refs,
    )
    job.cost_videos += COST_PER_VIDEO
    print(f"[Shot {beat.number}] Video generated (cost: ${COST_PER_VIDEO:.2f}, total so far: ${job.cost_total:.2f})")

    # STEP 3: Download video
    print(f"[Shot {beat.number}] Downloading video...")
    video_path = await download_video(
        video_result["video_url"],
        job.film_id,
        beat.number,
    )
    print(f"[Shot {beat.number}] Video saved to: {video_path}")

    # Record completed shot
    job.completed_shots.append(CompletedShot(
        number=beat.number,
        video_path=video_path,
    ))
    job.current_shot = len(job.completed_shots)
    print(f"[Shot {beat.number}] Complete! ({job.current_shot}/{job.total_shots} done)")


async def run_film_generation(film_id: str):
    """Background task to generate all shots in parallel using per-scene reference generation."""
    job = film_jobs.get(film_id)
    if not job:
        return

    try:
        print(f"\n{'='*60}")
        print(f"Starting film generation (parallel): {job.film_id}")
        print(f"Total shots: {job.total_shots}")
        print(f"{'='*60}\n")

        # Limit beats for testing if configured
        beats_to_process = job.story.beats
        if MAX_SHOTS_FOR_TESTING is not None:
            beats_to_process = job.story.beats[:MAX_SHOTS_FOR_TESTING]
            print(f"TESTING MODE: Limiting to {MAX_SHOTS_FOR_TESTING} shots")
            job.total_shots = len(beats_to_process)

        # Launch all shots in parallel
        job.phase = "filming"
        tasks = [
            process_single_shot(i, beat, job)
            for i, beat in enumerate(beats_to_process)
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Check for failures
        failures = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                failures.append((beats_to_process[i].number, str(result)))

        if failures:
            failed_shots = ", ".join(f"Shot {num}: {err}" for num, err in failures)
            print(f"WARNING: {len(failures)} shot(s) failed: {failed_shots}")
            if len(failures) == len(beats_to_process):
                raise Exception(f"All shots failed. {failed_shots}")
            print(f"Continuing with {len(job.completed_shots)} successful shots...")

        # Sort completed shots by beat number for proper assembly order
        job.completed_shots.sort(key=lambda s: s.number)

        # Assembly phase
        print(f"\n{'='*60}")
        print("Assembling final video...")
        print(f"{'='*60}\n")

        job.phase = "assembling"
        video_paths = [shot.video_path for shot in job.completed_shots]

        assembly_result = await assemble_videos(video_paths, crossfade_duration=0.0)

        job.final_video_path = assembly_result["output_path"]
        job.status = "ready"

        print(f"\n{'='*60}")
        print(f"Film generation complete!")
        print(f"Final video: {job.final_video_path}")
        print(f"Duration: {assembly_result['duration']}s")
        print(f"{'='*60}\n")

    except Exception as e:
        import traceback
        print(f"\n{'='*60}")
        print(f"Film generation failed!")
        print(f"Error: {e}")
        print(traceback.format_exc())
        print(f"{'='*60}\n")

        job.status = "failed"
        job.error_message = str(e)


# ============================================================
# Endpoints
# ============================================================

@router.post("/generate", response_model=GenerateFilmResponse)
async def generate_film(request: GenerateFilmRequest, background_tasks: BackgroundTasks):
    """
    Start film generation from approved story and visuals.

    Returns immediately with a film_id to poll for status.
    """
    film_id = uuid.uuid4().hex[:12]

    job = FilmJob(
        film_id=film_id,
        status="generating",
        created_at=datetime.now(),
        story=request.story,
        approved_visuals=request.approved_visuals,
        key_moment_image=request.key_moment_image,
        total_shots=len(request.story.beats),
    )

    film_jobs[film_id] = job

    # Start generation in background
    background_tasks.add_task(run_film_generation, film_id)

    return GenerateFilmResponse(
        film_id=film_id,
        status="generating",
        total_shots=job.total_shots,
    )


@router.get("/{film_id}", response_model=FilmStatusResponse)
async def get_film_status(film_id: str):
    """
    Poll film generation status.
    """
    job = film_jobs.get(film_id)
    if not job:
        raise HTTPException(status_code=404, detail="Film not found")

    completed_shots = [
        CompletedShotInfo(
            number=shot.number,
            preview_url=f"/film/{film_id}/shot/{shot.number}",
        )
        for shot in job.completed_shots
    ]

    return FilmStatusResponse(
        film_id=job.film_id,
        status=job.status,
        current_shot=job.current_shot,
        total_shots=job.total_shots,
        phase=job.phase,
        completed_shots=completed_shots,
        final_video_url=f"/film/{film_id}/final" if job.final_video_path else None,
        error_message=job.error_message,
        cost=CostBreakdown(
            scene_refs_usd=round(job.cost_scene_refs, 4),
            videos_usd=round(job.cost_videos, 4),
            total_usd=round(job.cost_total, 4),
        ),
    )


@router.get("/{film_id}/shot/{shot_number}")
async def get_shot_preview(film_id: str, shot_number: int):
    """
    Stream a completed shot video.
    """
    job = film_jobs.get(film_id)
    if not job:
        raise HTTPException(status_code=404, detail="Film not found")

    # Find the shot
    shot = next((s for s in job.completed_shots if s.number == shot_number), None)
    if not shot:
        raise HTTPException(status_code=404, detail="Shot not found")

    if not os.path.exists(shot.video_path):
        raise HTTPException(status_code=404, detail="Video file not found")

    return FileResponse(
        shot.video_path,
        media_type="video/mp4",
        filename=f"shot_{shot_number:02d}.mp4",
    )


@router.get("/{film_id}/final")
async def get_final_video(film_id: str):
    """
    Stream the final assembled video.
    """
    job = film_jobs.get(film_id)
    if not job:
        raise HTTPException(status_code=404, detail="Film not found")

    if job.status != "ready" or not job.final_video_path:
        raise HTTPException(status_code=400, detail="Film not ready yet")

    if not os.path.exists(job.final_video_path):
        raise HTTPException(status_code=404, detail="Video file not found")

    # Use story title for filename
    safe_title = "".join(c for c in job.story.title if c.isalnum() or c in " -_").strip()
    filename = f"{safe_title or 'film'}.mp4"

    return FileResponse(
        job.final_video_path,
        media_type="video/mp4",
        filename=filename,
    )


@router.post("/{film_id}/shot/{shot_number}/regenerate", response_model=RegenerateShotResponse)
async def regenerate_shot(
    film_id: str,
    shot_number: int,
    request: RegenerateShotRequest,
    background_tasks: BackgroundTasks
):
    """
    Regenerate a specific shot with optional feedback.

    The shot will be regenerated using the same beat but with modified prompt if feedback provided.
    """
    job = film_jobs.get(film_id)
    if not job:
        raise HTTPException(status_code=404, detail="Film not found")

    if job.status not in ["ready", "failed"]:
        raise HTTPException(status_code=400, detail="Film must be ready or failed to regenerate shots")

    # Find the beat for this shot number
    beat = next((b for b in job.story.beats if b.number == shot_number), None)
    if not beat:
        raise HTTPException(status_code=404, detail=f"Beat {shot_number} not found")

    # Start regeneration in background
    background_tasks.add_task(
        run_shot_regeneration,
        job,
        beat,
        request.feedback
    )

    return RegenerateShotResponse(
        film_id=film_id,
        shot_number=shot_number,
        status="regenerating",
        preview_url=f"/film/{film_id}/shot/{shot_number}",
    )


async def run_shot_regeneration(job: FilmJob, beat: Beat, feedback: Optional[str]):
    """Background task to regenerate a single shot using per-scene reference generation."""
    try:
        print(f"\n{'='*60}")
        print(f"Regenerating shot {beat.number} for film {job.film_id}")
        if feedback:
            print(f"Feedback: {feedback}")
        print(f"{'='*60}\n")

        # Generate 3 scene-specific reference images
        print("Generating 3 scene-specific reference images...")
        scene_refs = await generate_scene_references(
            beat=beat,
            story=job.story,
            approved_visuals=job.approved_visuals,
        )
        job.cost_scene_refs += COST_IMAGE_GENERATION * SCENE_REFS_PER_SHOT

        # Generate video shot with scene refs only (no first_frame)
        shot_prompt = build_shot_prompt(beat, job.story)
        if feedback:
            shot_prompt += f"\n\nADJUSTMENT: {feedback}"

        print(f"Generating video shot with {len(scene_refs)} scene refs...")
        video_result = await generate_shot_with_retry(
            beat=beat,
            prompt=shot_prompt,
            reference_images=scene_refs,
        )
        job.cost_videos += COST_PER_VIDEO

        # Download video
        video_path = await download_video(
            video_result["video_url"],
            job.film_id,
            beat.number,
        )

        # Update completed shots
        existing_shot = next((s for s in job.completed_shots if s.number == beat.number), None)
        if existing_shot:
            # Delete old video file
            if os.path.exists(existing_shot.video_path):
                os.remove(existing_shot.video_path)
            existing_shot.video_path = video_path
        else:
            job.completed_shots.append(CompletedShot(
                number=beat.number,
                video_path=video_path,
            ))

        # Re-assemble the film
        print("Re-assembling film with new shot...")
        job.completed_shots.sort(key=lambda s: s.number)
        video_paths = [shot.video_path for shot in job.completed_shots]

        assembly_result = await assemble_videos(video_paths, crossfade_duration=0.0)
        job.final_video_path = assembly_result["output_path"]
        job.status = "ready"

        print(f"Shot {beat.number} regenerated successfully!")

    except Exception as e:
        import traceback
        print(f"Shot regeneration failed: {e}")
        print(traceback.format_exc())
        job.error_message = f"Shot {beat.number} regeneration failed: {e}"
