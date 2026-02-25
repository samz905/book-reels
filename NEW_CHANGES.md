# Changes Since Last Deploy

## Backend

### 1. Image Generation — Google-Only, Zero Retries, Honest Queued State

**imagen.py** — Complete rewrite of the generation pipeline:
- **Single provider**: Google Gemini 2.5 Flash Image (`gemini-2.5-flash-image`) is the sole provider. OpenAI helpers kept as dead code for future fallback.
- **Zero retries, zero fallback**: 45s timeout, fail fast, user retries via UI.
- **Rate limiter**: 4 concurrent (`IMAGE_GEN_MAX_CONCURRENT`), 10 IPM (`IMAGE_GEN_IPM`) with 6s spacing.
- **ContextVar `_on_start_ctx`**: Lets the job system inject a callback that fires when the rate-limiter slot is acquired (not when the job is submitted). This enables honest "queued" → "generating" state transitions.
- **`set_on_generation_start(callback)`**: Called by jobs.py before each image gen. The callback fires once after semaphore acquisition, then auto-clears.
- All 3 public functions return `usage` dict: `{input_tokens, output_tokens, total_tokens, provider, model, cost_usd}`.

### 2. Cost Tracking — Updated Pricing

**costs.py**:
- Updated from Claude Haiku 4.5 → Claude Sonnet 4.5 ($3/$15 per 1M tokens)
- Google Gemini 2.5 Flash Image pricing: $0.30/1M input, $30/1M output (~$0.039/img)
- OpenAI GPT Image 1.5 pricing kept for future use
- New `calculate_image_cost(usage)` — computes actual USD from API token counts

### 3. Text Generation — Claude Sonnet 4.5 with Structured Outputs

**claude.py**:
- Model: `claude-sonnet-4-5` (drops date suffix, uses model alias)
- Structured outputs via `output_config` for guaranteed valid JSON

### 4. Video Generation — Seedance Prompt with Character Descriptions

**film.py** — `format_beat_as_script(beat, story)`:
- Now accepts optional `story` parameter
- Prepends character descriptions (name, age, gender, appearance) for characters in the scene
- Helps Seedance disambiguate same-gender characters in dialogue scenes
- Template: `Characters:\n{descriptions}\n\nScript:\n{script_body}`
- All 4 call sites updated: `process_single_shot`, `preview_prompts`, `run_shot_regeneration`, `generate_single_clip`
- Backward compatible — without `story`, returns raw script only

### 5. Job System — Queued State & Duplicate Prevention

**supabase_client.py**:
- `create_gen_job()` now creates jobs with `status: "queued"` (was "generating")
- Duplicate check only blocks on `status: "generating"` — stale "queued" rows are overwritten via upsert
- `mark_stale_jobs_failed()` now catches both "queued" and "generating" stale jobs on startup

**jobs.py**:
- Job timeouts: `JOB_TIMEOUT_DEFAULT=60`, `JOB_TIMEOUT_IMAGE=105`, `JOB_TIMEOUT_FILM=300`
- ContextVar integration: sets `_on_start_ctx` callback before image gen to transition "queued" → "generating"

### 6. Seedance — Minor

**seedance.py**:
- `POLL_TIMEOUT_SECONDS = 180` (3 min, covers P99 for 8s 720p clips)
- Zero retries, fail fast

---

## Frontend

### 7. Storyboard — 9 UX Fixes

**page.tsx** — Major UX overhaul of the storyboard section:

1. **No auto-gen on first visit**: Removed auto-gen useEffect. Added "Generate All Images" button in storyboard header. User controls when generation starts.
2. **Grid view full descriptions**: Removed `line-clamp-1` — descriptions no longer truncated.
3. **Simplified header**: Changed from `STORYBOARD — Grid View` to just `Storyboard`.
4. **Filmstrip improvements**: Changed from `flex gap-2` with fixed `w-14` to CSS grid `repeat(N, 1fr)` — thumbnails fill full width evenly. Added `isFilm` option — play icon only shows on film filmstrip, not storyboard.
5. **Character name matching**: Lookup now matches by `c.name` OR `c.id` (case-insensitive) — handles AI-generated IDs like `det_nova`.
6. **Editable descriptions**: Click pencil → textarea. "Regenerate with AI" or "Use this description" buttons. Next image gen uses the edited text.
7. **Generate vs Regenerate button**: Green gradient "Generate Image" when empty, neutral "Regenerate Image" when image exists. Hidden during queued/generating.
8. **Location cards portrait**: Changed from `aspect-[16/10]` to `aspect-[9/16]` in Lookbook.
9. **Timer reset on regen**: Deletes old start time before marking generating, so timer starts from 0s.

### 8. Video Section — Panel Containment & Storyboard Parity

- **Panel wrapper**: Video section wrapped in `bg-panel rounded-3xl outline outline-1 outline-panel-border p-8` — matches storyboard containment.
- **Content constraint**: `max-w-2xl mx-auto` wrapper around navigation + video player + details — prevents full-width stretching.
- **Video player**: Removed ugly `bg-black` full-width bar. Now uses `rounded-2xl bg-[#0A0A0F] shadow-2xl shadow-black/40` — matches storyboard image container.
- **Scene navigator**: Replaced text prev/next with round circle buttons matching storyboard scene view exactly.
- **Scene title**: Added above script (`sceneImages[n].title` with fallback to `currentScene.title`).
- **Characters + Location**: Added labeled text with inline avatar images (below edit dialogue, above generate button) — matches storyboard style.
- **Film timeline moved**: Filmstrip + progress bar now above the main panel, below "Back to Visuals".
- **Bottom actions redesigned**: Left-aligned text links for Preview Film & Save to Drafts. Right-aligned purple gradient Publish button. Clean `border-t` divider.
- **Removed tip text** from video page.

### 9. Stuck-State Protection — Comprehensive Watchdog

- **Unified local watchdog**: Single `useEffect` checks every 15s for ALL stuck items against 150s threshold:
  - Scenes (via `sceneQueuedAt` ref)
  - Characters (via `genStartedAt["char:{id}"]`)
  - Locations (via `genStartedAt["loc:{id}"]`)
  - Story generation (via `genStartedAt["story"]`)
  - Scene descriptions (via `genStartedAt["sceneDescs"]`)
- Auto-fails stuck items with error message. Max stuck time: ~165s.
- **Restore safety**: Scenes restored from DB always get `isQueued: false`, `isGenerating: false` — prevents phantom generating state.
- **`Promise.allSettled` result checking**: After batch storyboard submission, rejected promises are marked failed immediately.
- **Fire-and-forget DB persist**: `upsertEpisodeStoryboards` in `generateAllSceneImages` changed from blocking `await` to `.catch(() => {})` — DB failure no longer aborts job submission.

### 10. Navigation — Back Buttons Moved

- "Back to Create Your Script" and "Back to Lookbook" moved above tab bar (outside panel), styled like "Back to Visuals" on video page.
- Old footer back buttons removed; "Approve & Continue" buttons kept right-aligned.

### 11. Other Frontend

- **useGenJobs.ts**: Minor subscription/cleanup fixes.
- **CharacterModal.tsx / LocationModal.tsx**: Minor updates.
- **ai-generations.ts**: Minor updates.
- **mockCreatorData.ts**: Minor data updates.

---

## Architecture Summary

| Layer | Provider | Strategy |
|-------|----------|----------|
| Text | Claude Sonnet 4.5 | Structured outputs, SDK auto-retry |
| Images | Google Gemini 2.5 Flash Image | Zero retries, 45s timeout, rate-limited (4 concurrent, 10 IPM) |
| Video | Seedance 1.5 Pro Fast (Atlas Cloud) | Zero retries, 180s poll timeout, 4 concurrent |
| Jobs | Supabase gen_jobs | Honest queued→generating via ContextVar, 150s local watchdog |
