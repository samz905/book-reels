from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import HOST, PORT, CORS_ORIGINS
from .routers import test, story, moodboard, film, asset_gen, jobs
from .supabase_client import mark_stale_jobs_failed


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: mark very old stale jobs as failed (>5min without heartbeat)
    try:
        mark_stale_jobs_failed()
    except Exception as e:
        print(f"[startup] Warning: could not mark stale jobs: {e}")

    # Startup: resume interrupted video generations (restart recovery)
    try:
        from .routers.film_resume import resume_interrupted_videos
        asyncio.create_task(resume_interrupted_videos())
    except Exception as e:
        print(f"[startup] Warning: could not resume videos: {e}")

    yield


# Create FastAPI app
app = FastAPI(
    title="Oddega AI Backend",
    description="Backend services for AI video story generation",
    version="0.1.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(test.router, prefix="/test", tags=["test"])
app.include_router(story.router, prefix="/story", tags=["story"])
app.include_router(moodboard.router, prefix="/moodboard", tags=["moodboard"])
app.include_router(film.router, prefix="/film", tags=["film"])
app.include_router(asset_gen.router, prefix="/assets", tags=["assets"])
app.include_router(jobs.router, prefix="/jobs", tags=["jobs"])


@app.get("/")
async def root():
    return {"message": "Oddega AI Backend", "status": "running"}


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "version": "0.1.0",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=True)
