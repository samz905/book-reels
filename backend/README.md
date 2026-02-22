# Oddega AI Backend

Python FastAPI backend for AI video story generation.

## Setup

1. Create a virtual environment:
```bash
cd backend
python -m venv venv
```

2. Activate the virtual environment:
```bash
# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Make sure ffmpeg is installed and in your PATH:
```bash
# Windows (with chocolatey)
choco install ffmpeg

# macOS
brew install ffmpeg

# Linux
sudo apt install ffmpeg
```

5. Copy your API keys to `.env` (already done if you cloned the repo)

## Running the Server

```bash
# From the backend directory with venv activated
uvicorn app.main:app --reload --port 8000
```

Or:
```bash
python -m app.main
```

## API Endpoints

### Health Check
- `GET /` - Root endpoint
- `GET /health` - Health check

### Test Endpoints (for development)

#### Text Generation
```bash
POST /test/text
Content-Type: application/json

{
  "prompt": "Write a haiku about robots",
  "system_prompt": "You are a poet"  // optional
}
```

#### Image Generation
```bash
POST /test/image
Content-Type: application/json

{
  "prompt": "A robot in a garden, cinematic",
  "aspect_ratio": "9:16"
}
```

#### Video Generation
```bash
POST /test/video
Content-Type: application/json

{
  "prompt": "A robot dancing in a factory",
  "first_frame": null,  // optional base64 image
  "aspect_ratio": "9:16"
}
```

#### Frame Extraction
```bash
POST /test/extract-frame
Content-Type: multipart/form-data

video: <video file>
position: "last"  // "first", "last", or timestamp like "00:00:05"
```

#### Video Assembly
```bash
POST /test/assemble
Content-Type: multipart/form-data

videos: <video file 1>
videos: <video file 2>
crossfade: 0.5  // optional, seconds
```

#### Video Proxy
```bash
GET /test/video/proxy?url=<google video url>
```

## Core Utilities

The core utilities are in `app/core/`:

- `gemini.py` - `generate_text()` - Text generation with Gemini
- `imagen.py` - `generate_image()` - Image generation with Imagen
- `veo.py` - `generate_video()` - Video generation with Veo 3.1
- `ffmpeg.py` - `extract_frame()`, `assemble_videos()` - Video processing

## Deployment

### Environment Variables

For production deployment (e.g., Render), configure these environment variables:

#### Required Variables
- `GOOGLE_GENAI_API_KEY` - Google AI API key for image generation
- `ANTHROPIC_API_KEY` - Anthropic Claude API key for text generation
- `ATLASCLOUD_API_KEY` - Atlas Cloud API key for Seedance video generation
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

#### CORS Configuration
- `CORS_ORIGINS` - **Required for production**: Comma-separated list of allowed frontend origins
  - Example: `https://oddega.com,https://www.oddega.com`
  - Include all production frontend domains
  - Local development defaults: `http://localhost:3000,http://127.0.0.1:3000`

**Important**: After updating environment variables on Render, trigger a manual deploy or wait for auto-deploy to apply changes.

### Render Configuration

The backend is configured for Render deployment via `Procfile`:
```
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1 --loop uvloop --timeout-keep-alive 120
```

- Single worker process for production stability
- uvloop event loop for improved async performance
- 120-second keep-alive timeout for long-running operations
- Port automatically assigned via `$PORT` environment variable
