"""
Generation session endpoints.

Each "generation" is one full workflow run: story → moodboard → key moments → film.
State is persisted to SQLite so it survives page reloads and server restarts.
"""
import uuid
from typing import Optional, List
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException

from ..db import (
    create_generation,
    update_generation,
    get_generation,
    list_generations,
    delete_generation,
    load_film_job,
)

router = APIRouter()


# ------------------------------------------------------------------
# Request / Response models
# ------------------------------------------------------------------

class CreateGenerationRequest(BaseModel):
    title: str = "Untitled"
    style: str = "cinematic"
    state: dict = {}


class UpdateGenerationRequest(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    state: Optional[dict] = None
    film_id: Optional[str] = None
    thumbnail_base64: Optional[str] = None
    cost_total: Optional[float] = None


class GenerationSummary(BaseModel):
    id: str
    title: str
    status: str
    style: str
    cost_total: float
    thumbnail_base64: Optional[str] = None
    film_id: Optional[str] = None
    created_at: str
    updated_at: str


class GenerationDetail(BaseModel):
    id: str
    title: str
    status: str
    style: str
    state: dict
    film_id: Optional[str] = None
    film_job: Optional[dict] = None
    cost_total: float
    created_at: str
    updated_at: str


# ------------------------------------------------------------------
# Endpoints
# ------------------------------------------------------------------

@router.post("", response_model=GenerationSummary)
async def create_generation_endpoint(request: CreateGenerationRequest):
    """Create a new generation session."""
    gen_id = uuid.uuid4().hex[:12]
    await create_generation(gen_id, request.title, request.style, request.state)
    gen = await get_generation(gen_id)
    return GenerationSummary(
        id=gen["id"],
        title=gen["title"],
        status=gen["status"],
        style=gen["style"],
        cost_total=gen.get("cost_total", 0),
        thumbnail_base64=gen.get("thumbnail_base64"),
        film_id=gen.get("film_id"),
        created_at=gen["created_at"],
        updated_at=gen["updated_at"],
    )


@router.get("", response_model=List[GenerationSummary])
async def list_generations_endpoint():
    """List all generations (most recent first). No state_json included."""
    rows = await list_generations(limit=50)
    return [
        GenerationSummary(
            id=r["id"],
            title=r["title"],
            status=r["status"],
            style=r["style"],
            cost_total=r.get("cost_total", 0),
            thumbnail_base64=r.get("thumbnail_base64"),
            film_id=r.get("film_id"),
            created_at=r["created_at"],
            updated_at=r["updated_at"],
        )
        for r in rows
    ]


@router.get("/{gen_id}", response_model=GenerationDetail)
async def get_generation_endpoint(gen_id: str):
    """Get full generation state (for restore on page load)."""
    gen = await get_generation(gen_id)
    if not gen:
        raise HTTPException(status_code=404, detail="Generation not found")

    # Merge film job if one exists
    film_job = None
    if gen.get("film_id"):
        film_job = await load_film_job(gen["film_id"])

    return GenerationDetail(
        id=gen["id"],
        title=gen["title"],
        status=gen["status"],
        style=gen["style"],
        state=gen.get("state", {}),
        film_id=gen.get("film_id"),
        film_job=film_job,
        cost_total=gen.get("cost_total", 0),
        created_at=gen["created_at"],
        updated_at=gen["updated_at"],
    )


@router.put("/{gen_id}")
async def update_generation_endpoint(gen_id: str, request: UpdateGenerationRequest):
    """Update generation at a milestone (non-blocking from frontend)."""
    gen = await get_generation(gen_id)
    if not gen:
        raise HTTPException(status_code=404, detail="Generation not found")

    kwargs = {}
    if request.title is not None:
        kwargs["title"] = request.title
    if request.status is not None:
        kwargs["status"] = request.status
    if request.state is not None:
        kwargs["state_json"] = request.state
    if request.film_id is not None:
        kwargs["film_id"] = request.film_id
    if request.thumbnail_base64 is not None:
        kwargs["thumbnail_base64"] = request.thumbnail_base64
    if request.cost_total is not None:
        kwargs["cost_total"] = request.cost_total

    if kwargs:
        await update_generation(gen_id, **kwargs)

    return {"ok": True}


@router.post("/{gen_id}/save")
async def save_generation_endpoint(gen_id: str, request: UpdateGenerationRequest):
    """Same as PUT but via POST — used by sendBeacon on page unload."""
    gen = await get_generation(gen_id)
    if not gen:
        return {"ok": False}  # Don't 404 during unload

    kwargs = {}
    if request.title is not None:
        kwargs["title"] = request.title
    if request.status is not None:
        kwargs["status"] = request.status
    if request.state is not None:
        kwargs["state_json"] = request.state
    if request.film_id is not None:
        kwargs["film_id"] = request.film_id
    if request.thumbnail_base64 is not None:
        kwargs["thumbnail_base64"] = request.thumbnail_base64
    if request.cost_total is not None:
        kwargs["cost_total"] = request.cost_total

    if kwargs:
        await update_generation(gen_id, **kwargs)

    return {"ok": True}


@router.delete("/{gen_id}")
async def delete_generation_endpoint(gen_id: str):
    """Delete a generation and its associated film jobs."""
    gen = await get_generation(gen_id)
    if not gen:
        raise HTTPException(status_code=404, detail="Generation not found")
    await delete_generation(gen_id)
    return {"ok": True}
