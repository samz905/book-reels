from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import HOST, PORT
from .routers import test

# Create FastAPI app
app = FastAPI(
    title="Book Reels AI Backend",
    description="Backend services for AI video story generation",
    version="0.1.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js dev server
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(test.router, prefix="/test", tags=["test"])


@app.get("/")
async def root():
    return {"message": "Book Reels AI Backend", "status": "running"}


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "version": "0.1.0",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=True)
