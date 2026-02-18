"""
FFmpeg utilities for video processing.
"""
import os
import shutil
import subprocess
import asyncio
import base64
import uuid
from typing import Literal, List, Optional
from ..config import TEMP_DIR

# Find ffmpeg/ffprobe on PATH (works on both Windows and Linux/Render)
FFMPEG = shutil.which("ffmpeg") or "ffmpeg"
FFPROBE = shutil.which("ffprobe") or "ffprobe"


def _run_command(cmd: list) -> tuple[int, bytes, bytes]:
    """Run a command synchronously and return (returncode, stdout, stderr)."""
    result = subprocess.run(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    return result.returncode, result.stdout, result.stderr


async def extract_frame(
    video_path: str,
    position: Literal["first", "last"] | str = "last",
    output_format: str = "png",
) -> dict:
    """
    Extract a frame from a video file.

    Args:
        video_path: Path to the video file
        position: "first", "last", or a timestamp like "00:00:05"
        output_format: Output image format (default: png)

    Returns:
        dict with:
          - image_path: Path to the extracted frame
          - image_base64: Base64 encoded image data
    """
    # Generate output path
    output_filename = f"frame_{uuid.uuid4().hex}.{output_format}"
    output_path = os.path.join(TEMP_DIR, output_filename)

    if position == "first":
        # Extract first frame
        cmd = [
            FFMPEG, "-y",
            "-i", video_path,
            "-vframes", "1",
            "-f", "image2",
            output_path
        ]
    elif position == "last":
        # Get video duration first
        duration_cmd = [
            FFPROBE,
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            video_path
        ]
        returncode, stdout, stderr = await asyncio.to_thread(_run_command, duration_cmd)
        if returncode != 0:
            raise RuntimeError(f"FFprobe error: {stderr.decode()}")
        duration = float(stdout.decode().strip())

        # Extract frame near the end (0.1s before end to be safe)
        seek_time = max(0, duration - 0.1)
        cmd = [
            FFMPEG, "-y",
            "-ss", str(seek_time),
            "-i", video_path,
            "-vframes", "1",
            "-f", "image2",
            output_path
        ]
    else:
        # Position is a timestamp
        cmd = [
            FFMPEG, "-y",
            "-ss", position,
            "-i", video_path,
            "-vframes", "1",
            "-f", "image2",
            output_path
        ]

    # Run ffmpeg
    returncode, stdout, stderr = await asyncio.to_thread(_run_command, cmd)

    if returncode != 0:
        raise RuntimeError(f"FFmpeg error: {stderr.decode()}")

    # Read and encode the image
    with open(output_path, "rb") as f:
        image_bytes = f.read()
    image_base64 = base64.b64encode(image_bytes).decode("utf-8")

    return {
        "image_path": output_path,
        "image_base64": image_base64,
        "mime_type": f"image/{output_format}",
    }


async def assemble_videos(
    video_paths: List[str],
    output_path: Optional[str] = None,
    crossfade_duration: float = 0.0,
) -> dict:
    """
    Concatenate multiple videos into one.

    Args:
        video_paths: List of paths to video files (in order)
        output_path: Optional output path (auto-generated if not provided)
        crossfade_duration: Duration of crossfade between clips (0 for hard cut)

    Returns:
        dict with:
          - output_path: Path to the assembled video
          - duration: Total duration in seconds
    """
    if not video_paths:
        raise ValueError("At least one video path is required")

    if len(video_paths) == 1:
        # Nothing to assemble, just return the input
        return {
            "output_path": video_paths[0],
            "duration": await _get_video_duration(video_paths[0]),
        }

    # Generate output path if not provided
    if output_path is None:
        output_filename = f"assembled_{uuid.uuid4().hex}.mp4"
        output_path = os.path.join(TEMP_DIR, output_filename)

    if crossfade_duration > 0:
        # Use xfade filter for crossfades
        output_path = await _assemble_with_crossfade(video_paths, output_path, crossfade_duration)
    else:
        # Use concat demuxer for hard cuts
        output_path = await _assemble_concat(video_paths, output_path)

    # Get final duration
    duration = await _get_video_duration(output_path)

    return {
        "output_path": output_path,
        "duration": duration,
    }


async def _get_video_duration(video_path: str) -> float:
    """Get video duration in seconds."""
    cmd = [
        FFPROBE,
        "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        video_path
    ]
    returncode, stdout, stderr = await asyncio.to_thread(_run_command, cmd)
    if returncode != 0:
        raise RuntimeError(f"FFprobe error: {stderr.decode()}")
    return float(stdout.decode().strip())


async def _assemble_concat(video_paths: List[str], output_path: str) -> str:
    """Concatenate videos using concat demuxer (hard cuts)."""
    # Create concat file
    concat_file = os.path.join(TEMP_DIR, f"concat_{uuid.uuid4().hex}.txt")
    with open(concat_file, "w") as f:
        for path in video_paths:
            # Escape single quotes in path
            escaped_path = path.replace("'", "'\\''")
            f.write(f"file '{escaped_path}'\n")

    cmd = [
        FFMPEG, "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", concat_file,
        "-c", "copy",
        output_path
    ]

    returncode, stdout, stderr = await asyncio.to_thread(_run_command, cmd)

    # Clean up concat file
    os.remove(concat_file)

    if returncode != 0:
        raise RuntimeError(f"FFmpeg concat error: {stderr.decode()}")

    return output_path


async def _assemble_with_crossfade(
    video_paths: List[str],
    output_path: str,
    crossfade_duration: float
) -> str:
    """Concatenate videos with crossfade transitions."""
    # For crossfades, we need to use the xfade filter
    # This is more complex - we chain xfade filters

    if len(video_paths) == 2:
        # Simple case: two videos
        cmd = [
            FFMPEG, "-y",
            "-i", video_paths[0],
            "-i", video_paths[1],
            "-filter_complex",
            f"[0:v][1:v]xfade=transition=fade:duration={crossfade_duration}:offset=7.5[v];[0:a][1:a]acrossfade=d={crossfade_duration}[a]",
            "-map", "[v]",
            "-map", "[a]",
            output_path
        ]
    else:
        # Multiple videos - chain xfade filters
        # Build complex filter graph
        inputs = " ".join([f"-i {path}" for path in video_paths])

        # Calculate offsets (assuming 8s per clip minus crossfade overlap)
        clip_duration = 8.0
        filter_parts = []
        current_offset = clip_duration - crossfade_duration

        # First xfade
        filter_parts.append(f"[0:v][1:v]xfade=transition=fade:duration={crossfade_duration}:offset={current_offset}[v1]")

        # Chain additional xfades
        for i in range(2, len(video_paths)):
            current_offset += clip_duration - crossfade_duration
            prev_label = f"v{i-1}"
            next_label = f"v{i}" if i < len(video_paths) - 1 else "v"
            filter_parts.append(f"[{prev_label}][{i}:v]xfade=transition=fade:duration={crossfade_duration}:offset={current_offset}[{next_label}]")

        filter_complex = ";".join(filter_parts)

        cmd = [FFMPEG, "-y"]
        for path in video_paths:
            cmd.extend(["-i", path])
        cmd.extend([
            "-filter_complex", filter_complex,
            "-map", "[v]",
            "-an",  # Skip audio for now with complex chains
            output_path
        ])

    returncode, stdout, stderr = await asyncio.to_thread(_run_command, cmd)

    if returncode != 0:
        raise RuntimeError(f"FFmpeg xfade error: {stderr.decode()}")

    return output_path
