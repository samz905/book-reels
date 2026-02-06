# AI Story Generator: Workflow Architecture
## Version 1.1 — MVP

---

## Overview

This document describes the technical workflow for transforming a user's story idea into a 60-second vertical episode optimized for **maximum retention, emotional payoff, and binge compulsion**.

Companion documents:
- **Prompting Guide** — AI prompts using the retention formula
- **MVP Design** — User experience (beat names hidden from users)

---

## The Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  USER INPUT          STORY              VISUALS            VIDEO            │
│  ──────────          ─────              ───────            ─────            │
│                                                                             │
│  ┌─────────┐       ┌─────────┐        ┌─────────┐       ┌─────────┐        │
│  │  Idea   │       │  Story  │        │ Mood-   │       │  Film   │        │
│  │  +      │ ───→  │  Beats  │  ───→  │ board   │ ───→  │  Gen    │        │
│  │ Style   │       │         │        │         │       │         │        │
│  └─────────┘       └─────────┘        └─────────┘       └─────────┘        │
│                                                                             │
│  User inputs:       AI generates       AI generates      AI generates       │
│  • Idea text        retention-         reference         video shots        │
│  • Style            optimized          images for        with frame         │
│                     beats              approval          chaining           │
│                                                                             │
│      ↓                   ↓                  ↓                  ↓            │
│   [Input]           [Approve]          [Approve]          [Complete]        │
│                     or Retry           or Retry                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Stage 1: Input Capture

### What the User Provides

| Input | Description | Options |
|-------|-------------|---------|
| **Idea** | Free-form story description | Any text |
| **Style** | Visual rendering approach | Cinematic / 3D Animated / 2D Animated |

**Duration is fixed at 1 minute (60 seconds).** No user selection needed.

### Style Definitions

| Style | Visual Approach |
|-------|-----------------|
| **Cinematic** | Photorealistic, film-like, "shot on 35mm" |
| **3D Animated** | Pixar/Disney-style 3D rendering |
| **2D Animated** | Illustrated, flat animation, hand-drawn feel |

---

## Stage 2: Story Generation — The Retention Formula

### Core Principle

Stories are engineered around **viewer psychology**, not traditional story structure. Every beat exists to create tension, deliver dopamine, and compel continued watching.

### Step 1: Extract Core Ingredients

From the user's idea, the AI must identify:

| Ingredient | Purpose |
|------------|---------|
| **Protagonist** | Who we follow |
| **Antagonist / Opposing Force** | Source of conflict |
| **Immediate Tension** | What's at stake RIGHT NOW |
| **Hidden Information / Secret / Desire** | What's being concealed |
| **High-Impact Moment** | The emotional spike that could happen |
| **Worse Problem** | What follows the spike (the cliff) |

### Step 2: Map to Beat Structure

60 seconds = 8 shots (8 seconds each, trimmed in assembly to hit exact timings)

| Time | Beat | Duration | Shots | Purpose |
|------|------|----------|-------|---------|
| 0:00–0:05 | **HOOK** | 5s | 1 (trimmed) | Pattern break — start MID-ACTION. No setup. Viewer feels they joined late. |
| 0:05–0:20 | **RISE** | 15s | 2 | Escalating conflict. WHO these people are, WHAT the conflict is, WHY it matters now. No backstory. |
| 0:20–0:35 | **SPIKE** | 15s | 2 | Dopamine moment — Reveal / Betrayal / Kiss / Power move / Humiliation / Discovery / Threat |
| 0:35–0:50 | **DROP** | 15s | 2 | Emotional aftermath. Consequence of the spike. New problem created. Do NOT resolve — deepen tension. |
| 0:50–0:60 | **CLIFF** | 10s | 1 (trimmed) | End on a WORSE unanswered question. Someone overhears. A door opens. A message arrives. Hard cut. |

### Absolute Rules (Enforced in Prompts)

- ❌ NO exposition
- ❌ NO narration  
- ❌ NO backstory
- ❌ NO emotional resolution
- ✅ Only present-moment conflict
- ✅ Dialogue and action only
- ✅ Every line must increase tension
- ✅ End BEFORE emotional release

### Output Structure

```json
{
  "title": "Short provocative title",
  
  "ingredients": {
    "protagonist": "...",
    "antagonist": "...",
    "immediate_tension": "...",
    "secret": "...",
    "spike_moment": "...",
    "cliff_problem": "..."
  },
  
  "characters": [
    {
      "id": "...",
      "name": "...",
      "appearance": "4-5 specific visual details",
      "role": "protagonist|antagonist|supporting"
    }
  ],
  
  "setting": {
    "location": "...",
    "time": "...",
    "atmosphere": "..."
  },
  
  "beats": [
    {
      "beat_number": 1,
      "beat_type": "hook",
      "time_range": "0:00-0:08",
      "description": "Action/dialogue already in progress...",
      "scene_change": false
    },
    // ... 8 total beats
  ]
}
```

**IMPORTANT:** The `beat_type` field is for internal use only. It is NEVER shown to users. Users see only "Scene 1, Scene 2..." etc.

### User Decision Point

- **Approve** → Proceed to Stage 3
- **Retry** → Regenerate with same inputs

---

## Stage 3: Visual Direction (Moodboard)

### Purpose

1. Validate visual direction before expensive video generation
2. Generate reference images for Veo consistency
3. Establish the **Protagonist as the style anchor** for the entire film

### The Protagonist-First Strategy

The lead character defines the visual design language — eye style, proportions, line weight, color treatment. Everything else inherits from this anchor.

```
Step 1: Generate PROTAGONIST
        (This is the Style Anchor)
              │
              ▼
        [User approves protagonist look]
              │
              ▼
Step 2: Generate in PARALLEL:
        ├── Other Characters (using Protagonist as reference)
        └── Environment (using Protagonist as reference)
        
        → Everything inherits protagonist's design language
              │
              ▼
        [User approves or retries individual elements]
              │
              ▼
Step 3: Generate KEY MOMENT
        (using Protagonist + Environment as references)
```

### Why Protagonist First?

This mirrors actual animation production:
- Character designer creates the lead first
- Lead's design sheet becomes the style bible
- All other characters and backgrounds match that style

Example: In anime, the same "cyberpunk street" looks completely different depending on character design language (chibi vs realistic vs angular).

### Regeneration Rules

| User Action | What Happens |
|-------------|--------------|
| **Regen Protagonist** | ⚠️ Cascade: Everything regenerates |
| Regen Other Character | ✓ Safe: Uses Protagonist anchor |
| Regen Environment | ✓ Safe: Uses Protagonist anchor |
| Regen Key Moment | ✓ Safe: Uses existing anchors |

### Generation Flow

```python
# Step 1: Protagonist (Style Anchor)
protagonist_img = generate_image(
    prompt=protagonist_prompt,
    style=user_style  # "cinematic" / "3d" / "2d"
)

# [User approves protagonist]

# Step 2: Everything else in parallel, referencing protagonist
parallel_tasks = [
    generate_image(
        prompt=char_prompt,
        reference_images=[protagonist_img],
        style=user_style
    )
    for char in other_characters
]

parallel_tasks.append(
    generate_image(
        prompt=environment_prompt,
        reference_images=[protagonist_img],
        style=user_style
    )
)

results = await parallel(parallel_tasks)

# Step 3: Key Moment
key_moment_img = generate_image(
    prompt=key_moment_prompt,
    reference_images=[protagonist_img, environment_img],
    style=user_style
)
```

### What Gets Generated

| Image | When | Reference Used |
|-------|------|----------------|
| **Protagonist** | First, alone | None (defines style) |
| Other Characters | After protagonist approved | Protagonist |
| Environment | After protagonist approved | Protagonist |
| Key Moment | After all above approved | Protagonist + Environment |

All images at **9:16 portrait** format.

### User Decision Points

**Step 3a — Protagonist approval:**
- **Approve** → Generate rest in parallel
- **Retry** → Regenerate protagonist only

**Step 3b — Full moodboard:**
- **Retry individual element** → Regenerates that element using protagonist anchor
- **Change protagonist** → Goes back to 3a, cascades everything
- **Approve all** → Proceed to Stage 4

---

## Stage 4: Film Generation

### Frame Chaining for Seamless Flow

Each shot uses the last frame of the previous shot as its first frame:

```
Shot 1 (HOOK): first_frame = opening keyframe
         ↓ extract last frame
Shot 2 (RISE): first_frame = last frame of Shot 1
         ↓ extract last frame  
Shot 3 (RISE): first_frame = last frame of Shot 2
         ↓ extract last frame
Shot 4 (SPIKE): first_frame = last frame of Shot 3
         ↓ extract last frame
Shot 5 (SPIKE): first_frame = last frame of Shot 4
         ↓ extract last frame
Shot 6 (DROP): first_frame = last frame of Shot 5
         ↓ extract last frame
Shot 7 (DROP): first_frame = last frame of Shot 6
         ↓ extract last frame
Shot 8 (CLIFF): first_frame = last frame of Shot 7
```

### Visual Anchors Per Shot

| Anchor | Source | Purpose |
|--------|--------|---------|
| **First frame** | Last frame of previous shot | Continuity |
| **Reference 1** | Character from moodboard | Character consistency |
| **Reference 2** | Environment from moodboard | Style consistency |

### Scene Change Handling

If a beat has `scene_change: true` (e.g., location jump):
- Chain breaks
- Fresh keyframe generated via Nano Banana
- Chain resumes from new anchor

### Generation Pipeline

```python
previous_last_frame = generate_opening_keyframe(beat_1, moodboard)

for beat in story.beats:
    
    shot_prompt = build_shot_prompt(
        beat=beat,
        style=user_style,
        setting=story.setting,
        characters=story.characters
    )
    
    video = generate_video(
        model="veo-3.1-generate-preview",
        prompt=shot_prompt,
        first_frame=previous_last_frame,
        reference_images=[character_ref, environment_ref],
        config={
            "aspect_ratio": "9:16",
            "resolution": "720p", 
            "duration_seconds": 8
        }
    )
    
    previous_last_frame = extract_last_frame(video)
    completed_shots.append(video)

final_video = assemble_with_hard_cuts(completed_shots)
```

### Assembly Notes

- **Hard cuts** between shots (no crossfades) — matches the punchy, tension-driven style
- **Trim first 2-3 frames** of each subsequent shot to avoid freeze-frame effect
- **CLIFF shot ends abruptly** — hard cut to black, no fade

### Performance Targets

| Stage | Target Time |
|-------|-------------|
| Story Generation | < 10 seconds |
| Moodboard (3 images) | < 30 seconds |
| Per-shot video | 45-60 seconds |
| Full film (8 shots) | ~6-8 minutes |

---

## Error Handling

### Story Generation Fails
- Retry up to 2 times
- If still fails: "Try adding more detail about the conflict"

### Moodboard Generation Fails
- Retry individual images up to 2 times
- Fallback: proceed without that reference

### Shot Generation Fails
- Retry the specific shot up to 2 times
- If mid-chain shot fails: generate fresh keyframe, resume chain
- Notify user if final result is incomplete

---

## Data Flow Summary

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  INPUT                                                                 │
│  { idea, style }                                                       │
│           │                                                            │
│           ▼                                                            │
│  ┌─────────────────┐                                                   │
│  │ STORY GENERATOR │ → Extract ingredients → Map to retention beats   │
│  │ (Gemini)        │ → { title, ingredients, characters, beats[8] }   │
│  └─────────────────┘                                                   │
│           │                                                            │
│           ▼ (user approves)                                            │
│  ┌─────────────────┐                                                   │
│  │ MOODBOARD GEN   │ → { character_img, environment_img, spike_img }  │
│  │ (Nano Banana)   │                                                   │
│  └─────────────────┘                                                   │
│           │                                                            │
│           ▼ (user approves)                                            │
│  ┌─────────────────┐                                                   │
│  │ KEYFRAME GEN    │ → Opening frame for Shot 1                       │
│  │ (Nano Banana)   │                                                   │
│  └─────────────────┘                                                   │
│           │                                                            │
│           ▼                                                            │
│  ┌─────────────────┐                                                   │
│  │ SHOT GENERATOR  │ → Sequential, frame-chained, 8 shots             │
│  │ (Veo 3.1)       │                                                   │
│  └─────────────────┘                                                   │
│           │                                                            │
│           ▼                                                            │
│  ┌─────────────────┐                                                   │
│  │ ASSEMBLER       │ → Hard cuts, abrupt cliff ending                 │
│  │ (FFmpeg)        │ → final_video.mp4 (~60 sec)                      │
│  └─────────────────┘                                                   │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints (MVP)

```
POST /api/generate-story
  Input: { idea, style }
  Output: { storyId, title, beats, characters, setting }

POST /api/regenerate-story/{storyId}
  Output: { storyId, title, beats, characters, setting }

POST /api/generate-moodboard/{storyId}
  Output: { moodboardId, images[] }

POST /api/regenerate-moodboard/{storyId}
  Output: { moodboardId, images[] }

POST /api/generate-film/{storyId}
  Output: { filmId, status: "processing" }

GET /api/film/{filmId}
  Output: { 
    status: "processing" | "ready" | "failed",
    progress?: { current_shot, total_shots },
    videoUrl?: string
  }

POST /api/regenerate-film/{filmId}
  Output: { filmId, status: "processing" }
```

---

## Confidential: Beat Formula

**The beat structure (HOOK → RISE → SPIKE → DROP → CLIFF) is proprietary.**

- Never expose beat names in UI
- Never include beat type in API responses to client
- Users see only "Scene 1", "Scene 2", etc.
- This formula is our storytelling moat

---

## What's Deferred to V2

| Feature | V2 Approach |
|---------|-------------|
| Multi-episode series | Generate episode 2, 3, etc. with continuity |
| Per-scene regeneration | Regenerate single shot, re-chain from there |
| Character customization | Edit character prompt, regenerate reference |
| Music/sound control | Separate audio layer |
| Longer formats | 2-3 minute "expanded" episodes |
