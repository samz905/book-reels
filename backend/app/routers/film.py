"""
Film generation endpoints for AI video workflow.
Phase 4: Generate and assemble video shots using frame chaining.
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
    extract_frame,
    assemble_videos,
    COST_IMAGE_GENERATION,
    COST_VIDEO_VEO_FAST_PER_SECOND,
)

# Video duration and cost
VIDEO_DURATION_SECONDS = 8
COST_PER_VIDEO = VIDEO_DURATION_SECONDS * COST_VIDEO_VEO_FAST_PER_SECOND  # $1.20 per 8s clip

# Testing mode: limit shots for faster iteration
MAX_SHOTS_FOR_TESTING = 3  # Set to None for full film generation
MAX_REFERENCE_IMAGES = 3  # API limit for reference images
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
    keyframes_usd: float
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
    cost_keyframes: float = 0.0
    cost_videos: float = 0.0

    @property
    def cost_total(self) -> float:
        return self.cost_keyframes + self.cost_videos


# In-memory storage (MVP - would use Redis/DB in production)
film_jobs: Dict[str, FilmJob] = {}


# ============================================================
# Helper Functions
# ============================================================

def build_reference_images(
    key_moment: KeyMomentRef,
    approved_visuals: ApprovedVisuals
) -> List[dict]:
    """Build reference images list from approved visuals and key moment.

    Priority order (limited to MAX_REFERENCE_IMAGES=3):
    1. Key moment (shows characters in action) - most important
    2. Protagonist/first character
    3. Setting
    """
    refs = []

    # 1. Key moment is highest priority (shows characters + setting + action)
    refs.append({
        "image_base64": key_moment.image_base64,
        "mime_type": key_moment.mime_type,
    })

    # 2. Add protagonist/first character if we have room
    if len(refs) < MAX_REFERENCE_IMAGES and approved_visuals.character_images:
        refs.append({
            "image_base64": approved_visuals.character_images[0].image_base64,
            "mime_type": approved_visuals.character_images[0].mime_type,
        })

    # 3. Add setting if we have room
    if len(refs) < MAX_REFERENCE_IMAGES:
        refs.append({
            "image_base64": approved_visuals.setting_image.image_base64,
            "mime_type": approved_visuals.setting_image.mime_type,
        })

    return refs


def build_keyframe_prompt(beat: Beat, story: Story, approved: ApprovedVisuals) -> str:
    """Build prompt for generating a keyframe image."""
    style_prefix = STYLE_PREFIXES.get(story.style, STYLE_PREFIXES["cinematic"])

    chars_description = "\n".join([f"- {desc}" for desc in approved.character_descriptions])

    return f"""{style_prefix}

SCENE: {beat.description}

SETTING: {approved.setting_description}

CHARACTERS IN SCENE:
{chars_description}

Single frame establishing shot for video.
Show characters in the setting, ready for action.
Portrait orientation, 9:16 aspect ratio."""


def build_shot_prompt(beat: Beat, story: Story) -> str:
    """Build the Veo prompt for a video shot."""
    style_prefix = STYLE_PREFIXES.get(story.style, STYLE_PREFIXES["cinematic"])

    # Character context
    chars = "\n".join([f"- {c.name}: {c.appearance}" for c in story.characters])

    prompt = f"""{style_prefix}

SCENE: {beat.description}

SETTING: {story.setting.location}, {story.setting.time}
ATMOSPHERE: {story.setting.atmosphere}

CHARACTERS:
{chars}

8-second video shot. Smooth, cinematic camera movement.
Portrait orientation 9:16."""

    if beat.dialogue:
        prompt += f'\n\nDIALOGUE: "{beat.dialogue}"'

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
    first_frame: dict,  # {"image_base64": ..., "mime_type": ...}
    max_retries: int = 2
) -> dict:
    """Generate a video shot with retry logic."""
    last_error = None

    for attempt in range(max_retries + 1):
        try:
            print(f"  Attempt {attempt + 1}/{max_retries + 1} for shot {beat.number}")
            result = await generate_video(
                prompt=prompt,
                first_frame=first_frame,
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

async def run_film_generation(film_id: str):
    """Background task to generate all shots sequentially."""
    job = film_jobs.get(film_id)
    if not job:
        return

    try:
        print(f"\n{'='*60}")
        print(f"Starting film generation: {job.film_id}")
        print(f"Total shots: {job.total_shots}")
        print(f"{'='*60}\n")

        # Build reference images from approved visuals + SPIKE key moment
        reference_images = build_reference_images(job.key_moment_image, job.approved_visuals)
        print(f"Using {len(reference_images)} reference images (key moment + protagonist + setting)")

        previous_last_frame = None  # dict with image_base64 and mime_type

        # Limit beats for testing if configured
        beats_to_process = job.story.beats
        if MAX_SHOTS_FOR_TESTING is not None:
            beats_to_process = job.story.beats[:MAX_SHOTS_FOR_TESTING]
            print(f"TESTING MODE: Limiting to {MAX_SHOTS_FOR_TESTING} shots")
            job.total_shots = len(beats_to_process)

        for i, beat in enumerate(beats_to_process):
            job.current_shot = i + 1
            print(f"\n--- Shot {job.current_shot}/{job.total_shots}: Beat {beat.number} ---")
            print(f"Description: {beat.description[:100]}...")
            print(f"Scene change: {beat.scene_change}")

            # Determine first frame
            if beat.scene_change or previous_last_frame is None:
                # Generate fresh keyframe using reference images
                job.phase = "keyframe"
                print("Generating keyframe with reference images...")

                keyframe_prompt = build_keyframe_prompt(beat, job.story, job.approved_visuals)
                keyframe_result = await generate_image_with_references(
                    prompt=keyframe_prompt,
                    reference_images=reference_images,
                    aspect_ratio="9:16",
                    resolution="2K",
                )
                first_frame = {
                    "image_base64": keyframe_result["image_base64"],
                    "mime_type": keyframe_result.get("mime_type", "image/png"),
                }
                job.cost_keyframes += COST_IMAGE_GENERATION
                print(f"Keyframe generated successfully (cost: ${COST_IMAGE_GENERATION:.2f})")
            else:
                # Use previous shot's last frame (already a dict with mime_type)
                first_frame = previous_last_frame
                print("Using last frame from previous shot")

            # Generate video shot
            job.phase = "filming"
            shot_prompt = build_shot_prompt(beat, job.story)
            print(f"Generating video shot...")
            print(f"Prompt: {shot_prompt[:200]}...")

            video_result = await generate_shot_with_retry(
                beat=beat,
                prompt=shot_prompt,
                first_frame=first_frame,
            )

            # Track video cost
            job.cost_videos += COST_PER_VIDEO
            print(f"Video generated (cost: ${COST_PER_VIDEO:.2f}, total so far: ${job.cost_total:.2f})")

            # Download video
            print(f"Downloading video from {video_result['video_url'][:50]}...")
            video_path = await download_video(
                video_result["video_url"],
                job.film_id,
                beat.number,
            )
            print(f"Video saved to: {video_path}")

            # Extract last frame for next shot
            print("Extracting last frame for chaining...")
            frame_result = await extract_frame(video_path, position="last")
            previous_last_frame = {
                "image_base64": frame_result["image_base64"],
                "mime_type": frame_result.get("mime_type", "image/png"),
            }
            print("Last frame extracted")

            # Record completed shot
            job.completed_shots.append(CompletedShot(
                number=beat.number,
                video_path=video_path,
            ))
            print(f"Shot {job.current_shot} complete!")

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
            keyframes_usd=round(job.cost_keyframes, 4),
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
    """Background task to regenerate a single shot."""
    try:
        print(f"\n{'='*60}")
        print(f"Regenerating shot {beat.number} for film {job.film_id}")
        if feedback:
            print(f"Feedback: {feedback}")
        print(f"{'='*60}\n")

        # Build reference images
        reference_images = build_reference_images(job.key_moment_image, job.approved_visuals)

        # Generate keyframe with reference images
        print("Generating keyframe with reference images...")
        keyframe_prompt = build_keyframe_prompt(beat, job.story, job.approved_visuals)
        if feedback:
            keyframe_prompt += f"\n\nADJUSTMENT: {feedback}"

        keyframe_result = await generate_image_with_references(
            prompt=keyframe_prompt,
            reference_images=reference_images,
            aspect_ratio="9:16",
            resolution="2K",
        )
        first_frame = {
            "image_base64": keyframe_result["image_base64"],
            "mime_type": keyframe_result.get("mime_type", "image/png"),
        }
        job.cost_keyframes += COST_IMAGE_GENERATION

        # Generate video shot
        shot_prompt = build_shot_prompt(beat, job.story)
        if feedback:
            shot_prompt += f"\n\nADJUSTMENT: {feedback}"

        print(f"Generating video shot...")
        video_result = await generate_shot_with_retry(
            beat=beat,
            prompt=shot_prompt,
            first_frame=first_frame,
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
