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
2. Establish the **Protagonist as the style anchor** for all visuals
3. Get user approval on ALL characters and ALL locations

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
Step 2: Generate in PARALLEL (all referencing protagonist):
        ├── All Other Characters
        └── All Locations
              │
              ▼
        [User approves full moodboard]
              │
              ▼
Step 3: Generate KEY MOMENT (preview only)
```

### Why Protagonist First?

This mirrors actual animation production:
- Character designer creates the lead first
- Lead's design sheet becomes the style bible
- All other characters and backgrounds match that style

Example: In anime, the same "cyberpunk street" looks completely different depending on character design language (chibi vs realistic vs angular).

### What Gets Generated

**Characters (all in story):**

| Character | Reference Used |
|-----------|----------------|
| Protagonist | None (defines style) |
| All others | Protagonist |

**Locations (all unique locations in story):**

| Location | Reference Used |
|----------|----------------|
| All locations | Protagonist |

**Key Moment:** Preview of the SPIKE scene (protagonist + relevant location)

All images at **9:16 portrait** format.

### Why All Characters & Locations Upfront?

Different scenes may feature different characters and locations:

```
Scene 1-3: Elena + Marcus → Kitchen
Scene 4-5: Elena + Detective Ray → Police Station  
Scene 6-8: Elena + Marcus + Jessica → Courtroom
```

User approves the full cast and all settings once. The system handles selecting the right combination per scene during video generation.

### Regeneration Rules

| User Action | What Happens |
|-------------|--------------|
| **Regen Protagonist** | ⚠️ Cascade: All characters + locations regenerate |
| Regen any other character | ✓ Safe: Uses Protagonist anchor |
| Regen any location | ✓ Safe: Uses Protagonist anchor |

### Generation Flow

```python
# Step 1: Protagonist (Style Anchor)
protagonist_img = await generate_image(
    model="gemini-3-pro-image",
    prompt=protagonist_prompt,
    style=user_style
)

# [User approves protagonist]

# Step 2: All other characters + all locations in parallel
tasks = []

for char in other_characters:
    tasks.append(generate_image(
        prompt=build_character_prompt(char),
        reference_images=[protagonist_img]
    ))

for location in story.locations:
    tasks.append(generate_image(
        prompt=build_location_prompt(location),
        reference_images=[protagonist_img]
    ))

results = await parallel(tasks)

# [User approves full moodboard]

# Step 3: Key moment (preview only)
key_moment = await generate_image(
    prompt=key_moment_prompt,
    reference_images=[protagonist_img, spike_location_img]
)
```

### Moodboard Output

```
approved_assets/
├── characters/
│   ├── elena.png (protagonist - style anchor)
│   ├── marcus.png
│   ├── detective_ray.png
│   └── jessica.png
├── locations/
│   ├── kitchen.png
│   ├── police_station.png
│   └── courtroom.png
└── key_moment.png (preview only)
```

### User Decision Points

**After protagonist:**
- **Approve** → Generate all other assets
- **Retry** → Regenerate protagonist

**After full moodboard:**
- **Approve** → Proceed to video generation
- **Retry individual** → Regenerate that asset (uses protagonist anchor)
- **Change protagonist** → Cascade regenerates everything

---

## Stage 4: Film Generation

### The Challenge

Veo 3.1 accepts max **3 reference images**. But a scene might have 4 characters + a location = 5 images needed.

### The Solution: Per-Scene Reference Generation

For each shot, Nano Banana generates scene-specific reference images using the approved moodboard assets. These scene refs capture all characters + location in context, then get passed to Veo.

```
APPROVED MOODBOARD (from Stage 3):
├── characters/
│   ├── elena.png
│   ├── marcus.png
│   ├── detective_ray.png
│   └── jessica.png
└── locations/
    ├── kitchen.png
    ├── police_station.png
    └── courtroom.png

SHOT 5 NEEDS: Detective Ray + Elena + Jessica @ Police Station

Step 1: NANO BANANA generates 3 scene-specific refs
┌──────────────────────────────────────────────────────┐
│ Input: detective_ray.png, elena.png, jessica.png,   │
│        police_station.png (4 images)                │
│                                                      │
│ Output: 3 refs showing these characters in this     │
│         location from different angles/moments      │
└──────────────────────────────────────────────────────┘
        │
        ▼
Step 2: VEO 3.1 animates from those 3 refs
┌──────────────────────────────────────────────────────┐
│ reference_images: [scene_ref_1, scene_ref_2, scene_ref_3]
│ prompt: "Detective slides folder across table..."    │
│                                                      │
│ Output: shot5.mp4 (8 seconds)                        │
└──────────────────────────────────────────────────────┘
```

### Story Structure Requirement

Gemini must tag each beat with characters present and location:

```json
{
  "beats": [
    {
      "beat_number": 1,
      "characters_in_scene": ["elena", "marcus"],
      "location_id": "kitchen",
      "description": "Elena slams photo on counter..."
    },
    {
      "beat_number": 5,
      "characters_in_scene": ["detective_ray", "elena", "jessica"],
      "location_id": "police_station",
      "description": "Detective slides folder across table..."
    }
  ]
}
```

### Generation Pipeline

```python
# Approved moodboard assets from Stage 3
character_images = {
    "elena": load("elena.png"),
    "marcus": load("marcus.png"),
    "detective_ray": load("detective_ray.png"),
    # ...
}
location_images = {
    "kitchen": load("kitchen.png"),
    "police_station": load("police_station.png"),
    # ...
}

completed_shots = []

for beat in story.beats:
    
    # Step 1: Gather approved refs for THIS scene
    char_refs = [character_images[c] for c in beat.characters_in_scene]
    location_ref = location_images[beat.location_id]
    all_refs = char_refs + [location_ref]
    
    # Step 2: Nano Banana generates 3 scene-specific refs
    scene_refs = await generate_scene_references(
        model="gemini-3-pro-image",
        prompt=f"""
        Generate 3 reference images for this scene.
        
        Scene: {beat.description}
        Characters: {', '.join(beat.characters_in_scene)}
        Location: {beat.location_id}
        
        Show these exact characters in this exact location.
        Maintain character appearances precisely from references.
        
        Style: {user_style}
        Aspect ratio: 9:16 portrait
        """,
        reference_images=all_refs  # Nano Banana handles 5+ refs easily
    )
    
    # Step 3: Veo animates from the 3 scene refs
    video = client.models.generate_videos(
        model="veo-3.1-generate-preview",
        prompt=build_shot_prompt(beat, user_style),
        config=types.GenerateVideosConfig(
            aspect_ratio="9:16",
            resolution="720p",
            duration_seconds=8,
            reference_images=[
                {"image": scene_refs[0], "reference_type": "asset"},
                {"image": scene_refs[1], "reference_type": "asset"},
                {"image": scene_refs[2], "reference_type": "asset"}
            ]
        )
    )
    
    # Poll until complete
    while not video.done:
        time.sleep(10)
        video = client.operations.get(video)
    
    completed_shots.append(video)

final_video = assemble_with_hard_cuts(completed_shots)
```

### Per-Shot Summary

| Step | Tool | Input | Output |
|------|------|-------|--------|
| 1 | Select | Moodboard | Chars + location for this beat |
| 2 | Nano Banana | All scene refs (can be 5+) | 3 scene-specific images |
| 3 | Veo 3.1 | 3 scene refs + prompt | 8-second video clip |

### Assembly Notes

- **Hard cuts** between shots (no crossfades) — matches punchy, tension-driven style
- **Trim first 2-3 frames** of each shot to avoid freeze-frame effect
- **CLIFF shot ends abruptly** — hard cut to black, no fade

### Performance Targets

| Stage | Target Time |
|-------|-------------|
| Story Generation | < 10 seconds |
| Moodboard (all chars + locations) | < 60 seconds |
| Per-shot scene refs (Nano Banana) | < 15 seconds |
| Per-shot video (Veo) | 45-60 seconds |
| Full film (8 shots) | ~8-10 minutes |

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
