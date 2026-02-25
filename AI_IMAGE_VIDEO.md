# End-to-End Episode Creation: Architecture & Infrastructure

This document covers the complete episode creation pipeline — from a user's idea to a published 1-minute video episode. Every AI call, every retry layer, every persistence mechanism.

---

## Table of Contents

1. [High-Level Flow](#high-level-flow)
2. [Stage 1: Script Generation](#stage-1-script-generation)
3. [Stage 2: Visuals — Characters & Locations](#stage-2a-characters--locations)
4. [Stage 2: Visuals — Storyboard](#stage-2b-storyboard-scenes)
5. [Stage 2: Scene Refinement](#stage-2c-scene-refinement)
6. [Stage 3: Film — Video Clips](#stage-3-film--video-clips)
7. [Stage 3: Film — Assembly & Publish](#stage-3b-assembly--publish)
8. [Universal Background Jobs](#universal-background-jobs)
9. [Retry & Error Recovery](#retry--error-recovery)
10. [Persistence & State Management](#persistence--state-management)
11. [Rate Limiting & Concurrency](#rate-limiting--concurrency)
12. [Cost Summary](#cost-summary)
13. [File Map](#file-map)

---

## High-Level Flow

```
User types idea + picks style
        │
        ▼
┌─────────────────┐     Claude Haiku 4.5
│  STAGE 1: SCRIPT │ ──────────────────── → 8-scene story (structured JSON)
└────────┬────────┘
         │  User approves story
         ▼
┌─────────────────────────┐     Atlas Cloud Image API
│  STAGE 2: VISUALS        │
│  A) Characters & Locs    │ ── T2I model (no refs) ──────── → Portrait images
│  B) Storyboard scenes    │ ── Edit model (with refs) ───── → Scene images
│  C) Refinement (optional)│ ── Edit model (feedback) ────── → Revised images
└────────┬────────────────┘
         │  User approves all visuals
         ▼
┌─────────────────────────┐     Atlas Cloud Video API
│  STAGE 3: FILM           │
│  A) Per-scene clips      │ ── Seedance 1.5 Pro Fast ────── → 8s video clips
│  B) Assembly             │ ── ffmpeg ──────────────────── → Final 64s video
│  C) Publish              │ ── Supabase DB ─────────────── → Public episode
└─────────────────────────┘
```

**All AI operations run as background jobs.** The user can close their tab at any point and come back — nothing is lost.

---

## Stage 1: Script Generation

### What the User Does

Provides an episode idea (free text), selects a visual style (cinematic / anime / animated / pixar), and optionally pre-selects characters and a location from their story library.

### Backend: Text Generation

**Router**: `backend/app/routers/story.py`
**AI Model**: Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) — set in `prompts/story_system.py`
**SDK**: Anthropic Python SDK with structured outputs

**Flow**:
```
User idea + style + optional chars/location
  → build_story_prompt()          # Assembles user + system prompt
  → generate_text_claude()        # Claude Haiku 4.5 w/ STORY_SCHEMA
  → parse_story_response()        # JSON → Story model
  → sanitize_story_for_client()   # Strip internal fields
  → return Story
```

**`generate_text_claude()`** (`core/claude.py`):
```python
async def generate_text_claude(
    prompt: str,
    system_prompt: Optional[str] = None,
    model: str = "claude-sonnet-4-5-20250929",  # overridden by STORY_MODEL
    few_shot_examples: Optional[List[dict]] = None,
    output_schema: Optional[dict] = None,       # → constrained decoding
    max_tokens: int = 16384,
    temperature: float = 0.9,
) -> str
```

When `output_schema` is provided, uses `output_config={"format": {"type": "json_schema", "schema": ...}}` for **constrained decoding** — the model physically cannot output invalid JSON. No parsing failures, no markdown fences.

SDK auto-retries 429/500+ errors 2x with exponential backoff (built into `anthropic` SDK, no custom retry logic).

### Story Structure (8 scenes, 64 seconds)

The system prompt (1100+ lines in `prompts/story_system.py`) enforces a strict 8-scene structure:

| Scene | Type | Duration | Purpose |
|-------|------|----------|---------|
| 1 | Hook | 6-9s | Immediate disruption — drop viewer mid-action |
| 2 | Rise | 6-9s | Clarified conflict — stakes visible through behavior |
| 3 | Rise | 6-9s | Pressure intensifies — threat/secret hinted |
| 4 | Spike | 6-9s | Peak emotional moment (reveal/betrayal/kiss/discovery) |
| 5 | Drop | 6-9s | Impact reaction — power dynamic shifts |
| 6 | Drop | 6-9s | External consequence — new element enters |
| 7 | Drop | 6-9s | Escalation to edge — forced choice |
| 8 | Cliff | 6-9s | Cliffhanger — hard cut, NO resolution |

**Single-location constraint**: All 8 scenes must use the same location (enforced in prompt). Only emotional intensity changes between scenes — lighting, color palette, environment, camera style stay consistent.

### Structured Output Schema (`STORY_SCHEMA`)

```json
{
  "ingredients": {
    "protagonist": "string",
    "conflict_source": "string",
    "immediate_tension": "string",
    "secret": "string",
    "spike_moment": "string",
    "cliff_problem": "string"
  },
  "characters": [{
    "id": "string", "name": "string", "gender": "string",
    "age": "string", "appearance": "string",
    "role": "protagonist | antagonist | supporting"
  }],
  "locations": [{
    "id": "string", "name": "string",
    "description": "string", "atmosphere": "string"
  }],
  "scenes": [{
    "scene_number": "integer", "title": "string",
    "duration": "string", "characters_on_screen": ["string"],
    "setting_id": "string",
    "action": ["string"],          // ARRAY of micro-action fragments
    "dialogue": "string | null",   // null for silent scenes
    "image_prompt": "string",      // cinematographer-style prompt
    "scene_heading": "string", "scene_change": "boolean"
  }]
```

Key constraint: `action` is always an **array of fragment strings** (4-8 elements like `["He steps closer.", "Blocks her path.", "Beat."]`). Joined to `\n`-delimited string in post-processing.

### Pre-Selected Library Characters

When a user pre-selects characters from their library, the LLM receives their exact details. But the LLM may change IDs. Post-processing in `parse_story_response()`:

1. Match pre-selected characters by **name** (case-insensitive) — never by ID
2. Overwrite LLM's character fields with the DB entity's exact fields (id, gender, age, appearance, role)
3. Mark `origin="story"` for library chars, `origin="ai"` for AI-generated ones

### Other Story Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /story/regenerate` | Regenerate with optional user feedback |
| `POST /story/parse-script` | Parse user-written script into 8-scene structure |
| `POST /story/refine-beat` | Refine single scene with user feedback (`REFINED_SCENE_SCHEMA`) |
| `POST /story/generate-scene-descriptions` | Generate 1-2 line first-frame visual prompts per scene (`SCENE_DESCRIPTIONS_SCHEMA`) |

---

## Stage 2A: Characters & Locations

### What the User Does

After approving the story, the system auto-generates portrait images for every character and location. The user can regenerate, refine, or upload references for any asset.

### Backend: Image Generation (T2I — No References)

**Router**: `backend/app/routers/asset_gen.py` (for auto-gen via jobs)
**AI Model**: Nano Banana Pro T2I Ultra via Atlas Cloud
**Cost**: $0.15 per image

Characters and locations are **always generated with T2I** (text-to-image, no reference images). Each is its own independent style anchor.

**Character prompt construction**:
```
{STYLE_PREFIX}

Full body portrait of {name}, a {age} {gender}. {description}.

Plain white background. No scenery, no props, no distractions.
Full body visible head to toe, centered in frame.
Portrait orientation, 9:16 aspect ratio.
```

**Location prompt construction**:
```
{STYLE_PREFIX}

{name}. {description}.
Atmosphere: {atmosphere}.

The space should feel charged and atmospheric.
Wide establishing shot showing the environment.
No characters in frame.
Portrait orientation, 9:16 aspect ratio.
```

**Style prefixes** (prepended to every prompt):

| Style | Prefix |
|-------|--------|
| cinematic | Cinematic still, photorealistic, shot on 35mm film, shallow depth of field... |
| anime | Studio Ghibli anime style, warm watercolor aesthetic, Miyazaki-inspired... |
| animated | 2D animated, illustrated style, hand-drawn aesthetic, bold outlines... |
| pixar | 3D animated, Pixar-style rendering, stylized realism, expressive features... |

### Frontend Batching

**No batching limit.** All missing characters and locations fire in parallel immediately. The backend rate limiter (8 concurrent) handles throttling.

Typical load: 3-5 characters + 2-3 locations = 5-8 parallel image gen jobs.

---

## Stage 2B: Storyboard (Scenes)

### What the User Does

After character/location images are approved, the system auto-generates a storyboard image for each of the 8 scenes. Uses the Edit model with character + location reference images for visual consistency.

### Backend: Image Generation (Edit Model — With References)

**Router**: `backend/app/routers/moodboard.py` → `generate_scene_image` handler
**AI Model**: Nano Banana Pro Edit Ultra via Atlas Cloud
**Cost**: $0.15 per image

```
Scene prompt + character refs + location ref
  → generate_image_with_references(prompt, [char_refs, loc_refs], "9:16")
  → Atlas Cloud Edit endpoint with 1-10 public image URLs
  → Returns base64 image
```

Reference images from `approved_visuals`:
- `character_image_map[char_id]` → character portrait for each character in scene
- `location_images[location_id]` → location image for scene's location

**Reference URL resolution** (`_ensure_ref_url()`): Atlas Cloud Edit model requires **public URLs**, not base64. If a reference only has base64, it's uploaded to Supabase Storage `temp/{uuid}.png` first.

### Frontend Batching

`STORYBOARD_PARALLEL = 2` — generates 2 storyboard images at a time. When both complete, fires the next batch.

```
Queue: [scene1, scene2, scene3, scene4, scene5, scene6, scene7, scene8]
       └── Batch 1 ──┘  └── Batch 2 (after 1 done) ──┘  └── Batch 3 ──┘  ...
```

More conservative than chars/locs because the Edit model with references is slower (~60-120s per image).

---

## Stage 2C: Scene Refinement

### What the User Does

Optionally provides text feedback on any storyboard image ("make the lighting warmer", "move the character to the left").

### Backend: Image Editing

**Router**: `backend/app/routers/moodboard.py` → `refine_scene_image`
**AI Model**: Nano Banana Pro Edit Ultra via Atlas Cloud
**Cost**: $0.15 per edit

```python
edit_image(current_image_url, feedback)
# Sends existing image + feedback text to Edit model
# Returns new image incorporating the feedback
```

---

## Stage 3: Film — Video Clips

### What the User Does

After approving all storyboard images, generates video clips for each scene. Each approved storyboard image becomes the first frame of its video clip.

### Backend: Video Generation

**Router**: `backend/app/routers/film.py`
**AI Model**: Seedance 1.5 Pro Fast via Atlas Cloud
**Cost**: $0.022/sec ($0.176 per 8-second clip)

**Per-scene clip pipeline**:
```
Beat → format_beat_as_script(beat)    → raw script text
     + get_first_frame_url(beat)      → storyboard image URL (from Storage)
     → generate_video(script, url)    → Seedance (Atlas Cloud)
     → download video from Atlas temp URL
     → upload to Supabase Storage (permanent URL)
```

`format_beat_as_script()` produces raw, readable text for Seedance:
```
Sparks fly from katanas.

KENSHIN: "You hesitate."
ZORO: "You taught me better."
```

**Seedance API** (`core/seedance.py`):
```python
async def generate_video(
    prompt: str,              # Raw script text
    image_url: str,           # First frame (storyboard image URL)
    duration: int = 8,        # Seconds
    generate_audio: bool = True,
    heartbeat_callback = None, # Called every 30s during polling
    job_id = None,            # For restart recovery metadata
) -> {"video_url": str}
```

Flow:
1. POST to `api.atlascloud.ai/api/v1/model/generateVideo` → returns `prediction_id`
2. Poll `prediction/{id}` every 3 seconds
3. Heartbeat callback every 30 seconds (prevents stale-job detection)
4. On `"completed"` → return video URL from `outputs[0]`
5. Timeout: 600 seconds (10 minutes)

**Full film pipeline** (`run_film_generation`):
1. Launch all shots in parallel (throttled by `SEEDANCE_MAX_CONCURRENT = 4` semaphore)
2. Each shot: script → Seedance → download → upload to Storage
3. Incremental progress pushed to gen_jobs (Realtime delivery to frontend)
4. After all shots complete: assemble via ffmpeg
5. Upload assembled video to Storage

### Frontend Batching

**No frontend batching limit** for clips. All scenes fire in parallel. The backend semaphore (`SEEDANCE_MAX_CONCURRENT = 4`) throttles actual API calls.

---

## Stage 3B: Assembly & Publish

### Assembly

After all clips complete, `assemble_clips()`:
1. Downloads all clip videos from Storage
2. Assembles via ffmpeg (concatenation)
3. Uploads final assembled video to Supabase Storage
4. Returns `assembled_video_url`

### Publish

Frontend creates an episode record in Supabase with the assembled video URL, story metadata, and episode details.

---

## Universal Background Jobs

**Every** generation (text, image, video) runs as a background job. The user can close their tab — results are never lost.

### Architecture

```
Frontend                          Backend                           Supabase
────────                          ───────                           ────────
submitJob(type, path, payload)
  → POST /jobs/submit ──────────→ create gen_job row (status: "generating")
  ← {job_id} immediately          spawn BackgroundTask(run_job)
                                     │
                                     ├─ call route handler
                                     ├─ upload result images to Storage
                                     └─ update gen_job (status: "completed")
                                                                        │
useGenJobs(generationId) ◄──── Supabase Realtime ◄─────────────────────┘
  → updates React state             (postgres_changes on gen_jobs)
```

### Job Dispatcher: `backend/app/routers/jobs.py`

`POST /jobs/submit` accepts:
```json
{
  "generation_id": "uuid",
  "job_type": "scene_image",
  "target_id": "3",
  "backend_path": "/moodboard/generate-scene-image",
  "payload": { ... }
}
```

The `ROUTE_HANDLERS` dict maps 20+ `backend_path` values to handler functions. Covers:
- **Story**: `/story/generate`, `/story/regenerate`, `/story/parse-script`, `/story/refine-beat`, `/story/generate-scene-descriptions`
- **Moodboard**: `/moodboard/generate-*`, `/moodboard/refine-*`
- **Film**: `/film/generate`, `/film/generate-clip`, `/film/assemble-clips`
- **Assets**: `/assets/generate-character-image`, `/assets/generate-location-image`

**Job timeouts**:
- Text/misc: 180s (3 min)
- Image gen: 300s (5 min)
- Film/clip: no timeout (Seedance has its own 600s)

### Result Post-Processing

After every handler returns, `upload_result_images()` automatically:
1. Finds any `image_base64` fields in the result (top-level, nested in lists)
2. Uploads each to Supabase Storage
3. Replaces `image_base64` with `image_url` in the result

**gen_jobs.result never contains base64** — only Storage URLs.

### Frontend: `useGenJobs(generationId)` Hook

```typescript
const jobs = useGenJobs(generationId);
// Subscribes to Supabase Realtime (postgres_changes on gen_jobs)
// + 30s polling fallback for WebSocket drops
```

A single `useEffect` processes incoming jobs via `applyCompletedJob()` / `applyFailedJob()` — shared functions that handle all 14+ job types consistently.

---

## Retry & Error Recovery

Three layers ensure nothing gets permanently stuck.

### Layer 1: `submitJob()` (Frontend — Job Submission)

If `POST /jobs/submit` fails with HTTP 500+:
- **3 retries** with exponential backoff: 1.5s → 3s → 6s
- Network errors (fetch throws) also retried
- Non-5xx errors (400, 404) fail immediately

### Layer 2: `create_gen_job()` (Backend — DB Write)

If the Supabase upsert fails (connection reset, timeout):
- **3 retries** with exponential backoff: 1s → 2s → 4s

### Layer 3: `scheduleAutoRetry()` (Frontend — Auto-Gen Failures)

If a completed job has status "failed" (delivered via Realtime), and auto-gen is active:
- Stores original payload in `autoGenPayloadsRef`
- Resubmits after exponential delay: 3s → 6s → 12s → ...
- **Give-up after 10 retries**: marks item as failed with error message, calls `_autoGenItemCompleted()` so the progress overlay always dismisses

### Image API Retry (Backend — Atlas Cloud)

Inside `_atlas_image_request()`:
- **5 total attempts** (4 retries) with exponential backoff + jitter
- Retries on: `429`, `500`, `502`, `503`, `504` and timeouts
- Backoff: ~5s → ~12s → ~22s → ~46s

### Video API Retry (Backend — Seedance)

Inside `generate_shot_with_retry()`:
- **3 total attempts** (2 retries)
- 429: full exponential backoff (5s × 2^attempt)
- Other errors: short delay (3s)

### Video Restart Recovery

Seedance videos take 2-10 minutes. If the server crashes mid-generation:

**On startup**:
1. `mark_stale_jobs_failed()` — marks jobs >5min without heartbeat update as failed
   - **Smart clip handling**: For clip jobs with `prediction_id` in result, checks Atlas Cloud first
   - If Atlas says "completed" → leaves as "generating" for resume
   - If Atlas says "failed" → marks failed
2. `resume_interrupted_videos()` — finds all "generating" clip jobs with prediction_ids
   - Spawns async polling tasks for each
   - On completion: downloads video → uploads to Storage → marks job completed
   - Full flow identical to normal generation

**Heartbeat**: During Seedance polling, `async_touch_gen_job()` runs every 30 seconds, updating the job's `updated_at` timestamp. Prevents the stale-job detector from killing active jobs.

**Result**: Video generation survives server restarts, deploys, and cache clears.

### Frontend Refresh Recovery

If the user refreshes or returns to a generation in progress, `restoreGeneration()`:

1. Fetches gen_jobs for the generation_id
2. **In-flight jobs** (status: "generating"): Counts toward inflight tracking, awaits Realtime delivery
3. **Never-started jobs** (no gen_job row): Re-queues them for submission
4. **Retry payloads rebuilt**: So if an in-flight job fails after restore, `scheduleAutoRetry` can resubmit with the correct payload

---

## Persistence & State Management

### Auto-Save (Debounced)

Whenever React state changes, a 5-second debounce timer starts. On fire, `saveGeneration()` writes to Supabase:

```json
{
  "title": "Episode name",
  "status": "drafting | generating | ready",
  "state": { /* JSONB snapshot — metadata only, NO images */ },
  "film_id": "...",
  "cost_total": 3.86
}
```

### Explicit Save (`saveNow()`)

Called on every tab/stage transition and manual save. Cancels any pending debounce and writes immediately.

Both `saveNow()` and `saveGeneration()` guard with `if (isRestoringRef.current) return` — prevents saving empty state during restore.

### Image Persistence (URL-only, No Base64 in DB)

Images are stored in **three DB tables** (not in the JSONB snapshot):

| Table | Stores | Key |
|-------|--------|-----|
| `story_characters` | Character portrait URLs | (story_id, character name) |
| `story_locations` | Location image URLs | (story_id, location name) |
| `episode_storyboards` | Storyboard scene image URLs | (generation_id, scene_number) |

All three tables have `image_base64`, `image_url`, `image_mime_type` columns — but **`image_base64` is never written** (always null). API routes force `image_base64: null` on INSERT/UPDATE and use explicit column SELECTs excluding it.

The JSONB `state` stores only supplementary metadata per image: `feedback`, `approved`, `promptUsed`, `selectedIndex`.

**Restore flow**: DB tables are authoritative for images → populate React state. JSONB provides metadata overlay.

### Session Recovery (beforeunload)

On tab close, `navigator.sendBeacon()` sends a lightweight timestamp update — never the full state. Ensures `updated_at` is fresh for stale-job detection.

---

## Rate Limiting & Concurrency

### Image Generation

```python
IMAGE_GEN_MAX_CONCURRENT = 8   # env: IMAGE_GEN_MAX_CONCURRENT
IMAGE_GEN_IPM = 60             # env: IMAGE_GEN_IPM
```

The `_ImageRateLimiter` in `imagen.py` enforces:
- **Semaphore**: Max 8 in-flight image API calls at any time (global across all users)
- **IPM pacing**: Calls spaced at least 1 second apart (prevents bursts)

Both are self-imposed. Atlas Cloud has no published rate limits.

### Video Generation

```python
SEEDANCE_MAX_CONCURRENT = 4   # env: SEEDANCE_MAX_CONCURRENT
```

Semaphore in `film.py`'s `generate_shot_with_retry()`. No IPM pacing — Seedance is long-running (2-10 min per clip).

### Frontend Batching vs Backend Rate Limiting

These are **two independent throttles** at different levels:

| Layer | Scope | Purpose |
|-------|-------|---------|
| Frontend batching | Per-user, per-phase | Controls how many `submitJob()` calls fire at once |
| Backend rate limiter | Global, all users | Controls how many Atlas Cloud API calls run simultaneously |

Example: With `STORYBOARD_PARALLEL = 2` (frontend) and `IMAGE_GEN_MAX_CONCURRENT = 8` (backend):
- User A submits 2 storyboard jobs → backend fires both immediately (2/8 slots used)
- User B submits 5 character jobs → backend fires all 5 (7/8 slots used)
- User A's next batch waits for the first 2 to complete (frontend gating)
- If a 9th job arrives, it waits for a backend semaphore slot

---

## Cost Summary

### Per-Operation Costs

| Operation | Model | Provider | Cost |
|-----------|-------|----------|------|
| Story generation | Claude Haiku 4.5 | Anthropic | ~$0.002-0.01 |
| Scene refinement (text) | Claude Haiku 4.5 | Anthropic | ~$0.002 |
| Character image | Nano Banana Pro T2I Ultra | Atlas Cloud | $0.15 |
| Location image | Nano Banana Pro T2I Ultra | Atlas Cloud | $0.15 |
| Storyboard scene | Nano Banana Pro Edit Ultra | Atlas Cloud | $0.15 |
| Scene image edit | Nano Banana Pro Edit Ultra | Atlas Cloud | $0.15 |
| 8s video clip | Seedance 1.5 Pro Fast | Atlas Cloud | $0.176 |

### Typical Episode Cost

| Phase | Count | Unit Cost | Total |
|-------|-------|-----------|-------|
| Story generation | 1 | ~$0.01 | $0.01 |
| Character images | 5 | $0.15 | $0.75 |
| Location images | 3 | $0.15 | $0.45 |
| Storyboard scenes | 8 | $0.15 | $1.20 |
| Video clips | 8 | $0.176 | $1.41 |
| **Total** | | | **~$3.82** |

---

## File Map

```
backend/app/
├── config.py                         # Env vars: ANTHROPIC_API_KEY, ATLASCLOUD_API_KEY, SUPABASE_*
├── supabase_client.py                # Storage uploads, gen_jobs CRUD, stale detection, retry logic
├── main.py                           # Startup: mark_stale_jobs_failed + resume_interrupted_videos
│
├── core/
│   ├── __init__.py                   # Re-exports: generate_text, generate_image, edit_image, generate_video
│   ├── claude.py                     # Claude Haiku 4.5 text generation (structured outputs)
│   ├── imagen.py                     # Atlas Cloud Image API (T2I + Edit + rate limiter + polling)
│   ├── seedance.py                   # Atlas Cloud Video API (Seedance + polling + heartbeat)
│   ├── costs.py                      # Cost constants ($0.15/image, $0.022/sec video)
│   └── ffmpeg.py                     # Video frame extraction + assembly
│
├── models/
│   └── story.py                      # Story, Beat, Scene, Character, Location Pydantic models
│
├── prompts/
│   ├── story_system.py               # 1100-line system prompt + STORY_MODEL constant
│   ├── response_schemas.py           # STORY_SCHEMA, REFINED_SCENE_SCHEMA, SCENE_DESCRIPTIONS_SCHEMA
│   └── story_examples.py             # Few-shot examples (3 genres)
│
├── routers/
│   ├── jobs.py                       # Universal job dispatcher (POST /jobs/submit, 20+ handlers)
│   ├── story.py                      # Story gen/regen/refine/parse/scene-descriptions
│   ├── moodboard.py                  # Character/location/scene image gen + refinement
│   ├── film.py                       # Video clip gen + shot retry + assembly + film pipeline
│   ├── film_resume.py                # Restart recovery for interrupted Seedance videos
│   └── asset_gen.py                  # Standalone char/loc image gen (modal use + auto-gen)

frontend/
├── app/create-episode/page.tsx       # Main creator page (~5000 lines)
│                                     #   - 3 stages, state management, auto-gen orchestration
│                                     #   - Restore/refresh recovery, save/persistence
│                                     #   - STORYBOARD_PARALLEL = 2, scheduleAutoRetry
│
├── lib/
│   ├── api/creator.ts                # submitJob() w/ 3x retry, CRUD helpers, type mappers
│   └── hooks/useGenJobs.ts           # Supabase Realtime subscription + 30s polling fallback
```

### External Services

| Service | Used For | Auth |
|---------|----------|------|
| **Atlas Cloud** (`api.atlascloud.ai`) | Image gen (Nano Banana Pro) + Video gen (Seedance) | `ATLASCLOUD_API_KEY` |
| **Anthropic** (Claude API) | Text generation (story, scenes, descriptions) | `ANTHROPIC_API_KEY` |
| **Supabase** | Database (gen_jobs, stories), Storage (images, videos), Realtime | `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` |
