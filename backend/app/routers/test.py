"""
Test endpoints for all core utilities.
"""
import os
import base64
import uuid
import httpx
from typing import Optional, List
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import Response
from pydantic import BaseModel

from ..config import TEMP_DIR, GOOGLE_GENAI_API_KEY
from ..core import generate_text, generate_image, generate_video, extract_frame, assemble_videos

router = APIRouter()


# ============================================================
# Request/Response Models
# ============================================================

class TextRequest(BaseModel):
    prompt: str
    system_prompt: Optional[str] = None


class TextResponse(BaseModel):
    text: str


class ImageRequest(BaseModel):
    prompt: str
    aspect_ratio: str = "9:16"


class ImageResponse(BaseModel):
    image_base64: str
    mime_type: str


class VideoRequest(BaseModel):
    prompt: str
    first_frame: Optional[str] = None  # Base64 encoded
    aspect_ratio: str = "9:16"


class VideoResponse(BaseModel):
    video_url: str
    duration: int
    mime_type: str


class FrameResponse(BaseModel):
    image_base64: str
    mime_type: str


class AssembleResponse(BaseModel):
    output_path: str
    duration: float


# ============================================================
# Text Generation Endpoint
# ============================================================

@router.post("/text", response_model=TextResponse)
async def test_text_generation(request: TextRequest):
    """
    Test text generation with Gemini.

    Input: { "prompt": "...", "system_prompt": "..." }
    Output: { "text": "..." }
    """
    try:
        text = await generate_text(
            prompt=request.prompt,
            system_prompt=request.system_prompt,
        )
        return TextResponse(text=text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Image Generation Endpoint
# ============================================================

@router.post("/image", response_model=ImageResponse)
async def test_image_generation(request: ImageRequest):
    """
    Test image generation with Imagen.

    Input: { "prompt": "...", "aspect_ratio": "9:16" }
    Output: { "image_base64": "...", "mime_type": "image/png" }
    """
    try:
        result = await generate_image(
            prompt=request.prompt,
            aspect_ratio=request.aspect_ratio,
        )
        return ImageResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Video Generation Endpoint
# ============================================================

@router.post("/video", response_model=VideoResponse)
async def test_video_generation(request: VideoRequest):
    """
    Test video generation with Veo 3.1.

    Input: { "prompt": "...", "first_frame": null, "aspect_ratio": "9:16" }
    Output: { "video_url": "...", "duration": 8, "mime_type": "video/mp4" }

    Note: This endpoint may take 30-60 seconds to complete.
    """
    try:
        result = await generate_video(
            prompt=request.prompt,
            first_frame=request.first_frame,
            aspect_ratio=request.aspect_ratio,
        )
        return VideoResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Video Proxy Endpoint (to handle Google's authenticated URLs)
# ============================================================

@router.get("/video/proxy")
async def proxy_video(url: str):
    """
    Proxy video download from Google's authenticated URL.

    Query param: url - The video URL to proxy
    Returns: Video file stream
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                headers={"x-goog-api-key": GOOGLE_GENAI_API_KEY},
                follow_redirects=True,
            )
            response.raise_for_status()

            return Response(
                content=response.content,
                media_type=response.headers.get("content-type", "video/mp4"),
                headers={
                    "Content-Disposition": "inline",
                    "Cache-Control": "public, max-age=3600",
                }
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Frame Extraction Endpoint
# ============================================================

@router.post("/extract-frame", response_model=FrameResponse)
async def test_extract_frame(
    video: UploadFile = File(...),
    position: str = Form(default="last"),
):
    """
    Extract a frame from an uploaded video.

    Input: multipart form with video file + position ("first", "last", or timestamp)
    Output: { "image_base64": "...", "mime_type": "image/png" }
    """
    try:
        # Save uploaded video to temp file
        video_filename = f"upload_{uuid.uuid4().hex}.mp4"
        video_path = os.path.join(TEMP_DIR, video_filename)

        print(f"Saving uploaded video to: {video_path}")
        with open(video_path, "wb") as f:
            content = await video.read()
            f.write(content)
        print(f"Video saved, size: {len(content)} bytes")

        # Extract frame
        print(f"Extracting frame at position: {position}")
        result = await extract_frame(video_path, position=position)
        print(f"Frame extracted successfully")

        # Clean up uploaded video
        os.remove(video_path)

        return FrameResponse(
            image_base64=result["image_base64"],
            mime_type=result["mime_type"],
        )
    except Exception as e:
        import traceback
        error_msg = f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()}"
        print(f"Error in extract-frame: {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)


# ============================================================
# Video Assembly Endpoint
# ============================================================

@router.post("/assemble")
async def test_assemble_videos(
    videos: List[UploadFile] = File(...),
    crossfade: float = Form(default=0.0),
):
    """
    Assemble multiple videos into one.

    Input: multipart form with multiple video files + crossfade duration
    Output: Video file download
    """
    if len(videos) < 2:
        raise HTTPException(status_code=400, detail="At least 2 videos required for assembly")

    try:
        # Save all uploaded videos to temp files
        video_paths = []
        for i, video in enumerate(videos):
            video_filename = f"upload_{uuid.uuid4().hex}_{i}.mp4"
            video_path = os.path.join(TEMP_DIR, video_filename)
            print(f"Saving video {i} to: {video_path}")
            with open(video_path, "wb") as f:
                content = await video.read()
                f.write(content)
            print(f"Video {i} saved, size: {len(content)} bytes")
            video_paths.append(video_path)

        # Assemble videos
        print(f"Assembling {len(video_paths)} videos with crossfade={crossfade}")
        result = await assemble_videos(
            video_paths=video_paths,
            crossfade_duration=crossfade,
        )
        print(f"Videos assembled: {result['output_path']}")

        # Read the assembled video
        with open(result["output_path"], "rb") as f:
            video_content = f.read()

        # Clean up temp files
        for path in video_paths:
            if os.path.exists(path):
                os.remove(path)
        if result["output_path"] not in video_paths and os.path.exists(result["output_path"]):
            os.remove(result["output_path"])

        return Response(
            content=video_content,
            media_type="video/mp4",
            headers={
                "Content-Disposition": f'attachment; filename="assembled_{uuid.uuid4().hex}.mp4"',
            }
        )
    except Exception as e:
        import traceback
        error_msg = f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()}"
        print(f"Error in assemble: {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)


# ============================================================
# Image Proxy Endpoint (for displaying base64 images directly)
# ============================================================

@router.get("/image/proxy")
async def proxy_image_base64(data: str, mime_type: str = "image/png"):
    """
    Convert base64 image data to actual image response.

    Query params:
      - data: Base64 encoded image data
      - mime_type: Image MIME type
    Returns: Image file
    """
    try:
        image_bytes = base64.b64decode(data)
        return Response(
            content=image_bytes,
            media_type=mime_type,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
