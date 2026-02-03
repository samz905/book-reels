# AI Story Generator: Workflow Architecture
## Version 1.0 — MVP

---

## Overview

This document describes the technical workflow for transforming a user's story idea into a generated short film. It is designed to work in concert with:
- **Prompting Guide** — Actual prompts used at each stage
- **MVP Design** — User experience and interface

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
│  │ Config  │       │         │        │         │       │         │        │
│  └─────────┘       └─────────┘        └─────────┘       └─────────┘        │
│                                                                             │
│  User inputs:       AI generates       AI generates      AI generates       │
│  • Idea text        story beats        reference         video shots        │
│  • Duration         for review         images for        using refs +       │
│  • Style                               approval          frame chaining    │
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
| **Idea** | Free-form story description | Any text (5-500 words) |
| **Duration** | Target film length | 1 min / 2 min / 3 min |
| **Style** | Visual rendering approach | Cinematic / 3D Animated / 2D Animated |

### Duration → Shot Count Mapping
| Duration | Shots | Total Video |
|----------|-------|-------------|
| 1 minute | 7-8 | 7-8 × 8 seconds |
| 2 minutes | 15 | 15 × 8 seconds |
| 3 minutes | 22-23 | 22-23 × 8 seconds |

### Style Definitions
| Style | Visual Approach |
|-------|-----------------|
| **Cinematic** | Photorealistic, film-like, "shot on 35mm" |
| **3D Animated** | Pixar/Disney-style 3D rendering |
| **2D Animated** | Illustrated, flat animation, hand-drawn feel |

---

## Stage 2: Story Generation

### Process
1. Take user input (idea + duration + style)
2. Run through Gemini with story enrichment prompt
3. Generate structured story beats
4. Return beats for user approval

### Output from AI
```json
{
  "title": "The Last Dance",
  "characters": [
    {
      "id": "robot",
      "name": "The Robot",
      "appearance": "Industrial service robot with weathered blue-gray metal plating, one flickering eye-light, joints stiff with rust, humanoid but clearly mechanical",
      "role": "protagonist"
    }
  ],
  "setting": {
    "location": "Abandoned factory floor",
    "time": "Late afternoon, golden light through broken windows",
    "atmosphere": "Quiet, dusty, melancholic but with warmth"
  },
  "beats": [
    {
      "beat_number": 1,
      "description": "A rusted robot sits motionless in a dark, abandoned factory. Dust floats in a shaft of light.",
      "story_function": "hook"
    }
    // ... remaining beats
  ]
}
```

### User Decision Point
- **Approve** → Proceed to Stage 3
- **Retry** → Regenerate with same inputs

---

## Stage 3: Visual Direction (Moodboard)

### Purpose
1. Validate visual direction with user before expensive video generation
2. Generate reference images that guide Veo for character/style consistency
3. Establish the visual "anchor" that frame chaining will maintain

### What Gets Generated

| Image | Purpose | Used For |
|-------|---------|----------|
| **Character Reference** | Lock in character appearance | Veo reference_images |
| **Environment Reference** | Establish setting & atmosphere | Veo reference_images |
| **Key Moment** | Preview emotional peak | Style validation + Veo reference |

### Generation (Nano Banana Pro)

All images at **9:16 portrait** to match final video format.

### User Decision Point
- **Approve** → Proceed to Stage 4 (images become Veo references)
- **Retry** → Regenerate moodboard

---

## Stage 4: Film Generation

### The Core Principle: Frame Chaining

The most critical technique for producing a seamless, consistent film is **frame chaining** — using the last frame of each shot as the first frame of the next shot.

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  FRAME CHAINING                                                        │
│                                                                        │
│  Shot 1                    Shot 2                    Shot 3            │
│  ┌────────────────────┐    ┌────────────────────┐    ┌──────────────┐  │
│  │                    │    │                    │    │              │  │
│  │  [8 sec video]  ●──┼──→│● [8 sec video]  ●──┼──→│● [8 sec...   │  │
│  │                    │    │                    │    │              │  │
│  └────────────────────┘    └────────────────────┘    └──────────────┘  │
│                         │                         │                    │
│                   Last frame of            Last frame of               │
│                   Shot 1 becomes           Shot 2 becomes              │
│                   first frame of           first frame of              │
│                   Shot 2                   Shot 3                      │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Why Frame Chaining Matters

Without it:
- Character appearance drifts between shots
- Lighting changes randomly
- Camera position jumps
- Environment details are inconsistent
- Film feels like separate clips stitched together

With it:
- Visual continuity across the entire film
- Character stays consistent
- Lighting and mood flow naturally
- Feels like one continuous film
- Professional quality

### Generation Flow (Sequential)

```python
# Frame chaining makes generation SEQUENTIAL
# Each shot depends on the previous shot's last frame

previous_last_frame = None

for beat in story.beats:
    
    # 1. Build the shot prompt
    shot_prompt = build_shot_prompt(
        beat=beat,
        style=user_style,
        setting=story.setting,
        characters=story.characters
    )
    
    # 2. Generate with Veo 3.1
    video = generate_video(
        model="veo-3.1-generate-preview",
        prompt=shot_prompt,
        config={
            "aspect_ratio": "9:16",
            "resolution": "720p",
            "duration_seconds": 8,
            "person_generation": "allow_adult"
        },
        # FRAME CHAINING: Use last frame from previous shot
        first_frame=previous_last_frame,
        # STYLE CONSISTENCY: Moodboard images as references
        reference_images=[
            character_reference,   # From moodboard
            environment_reference  # From moodboard
        ]
    )
    
    # 3. Extract last frame for next shot
    previous_last_frame = extract_last_frame(video)
    
    # 4. Store the completed shot
    completed_shots.append(video)

# 5. Assemble final film
final_video = concatenate_shots(completed_shots)
```

### Special Case: Scene Transitions

Sometimes the story calls for a hard location/time change (e.g., "exterior → interior" or "day → night"). In these cases, frame chaining would create awkward visual blending.

**Solution: Controlled Transition Points**

During story generation, the LLM flags beats where a scene change occurs:

```json
{
  "beat_number": 8,
  "description": "Meanwhile, in the city...",
  "story_function": "midpoint",
  "scene_change": true  // ← Flags a transition
}
```

At scene change beats:
1. **Don't chain** from the previous shot's last frame
2. Instead, generate a fresh **keyframe image** using Nano Banana Pro
3. Use that keyframe as the first frame
4. Continue chaining from this new anchor

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  SCENE CHANGE HANDLING                                               │
│                                                                      │
│  Shot 4            Shot 5 (scene change)         Shot 6              │
│  ┌──────────┐      ┌──────────────────────┐      ┌──────────┐       │
│  │          │      │                      │      │          │       │
│  │ [video]  │  ✕   │ [Nano Banana keyframe│──→──│ [video]  │       │
│  │          │      │  as first frame]     │      │          │       │
│  └──────────┘      └──────────────────────┘      └──────────┘       │
│                │                                                     │
│          Chain BROKEN                                                │
│          (new location/time)                                         │
│          Fresh keyframe generated                                    │
│          Chain RESUMES from here                                     │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### First Frame Generation

The very first shot also needs a first frame since there's no previous shot:

1. Generate a **keyframe image** with Nano Banana Pro from Beat 1's description
2. Use character reference + environment reference for consistency
3. This keyframe becomes the first frame of Shot 1
4. Chaining continues from there

### Full Generation Pipeline

```
STEP 1: Generate keyframe for Beat 1 (Nano Banana Pro)
                │
                ▼
STEP 2: Generate Shot 1 (Veo 3.1)
        - first_frame = Beat 1 keyframe
        - reference_images = [character, environment]
                │
                ▼
STEP 3: Extract last frame of Shot 1
                │
                ▼
STEP 4: Generate Shot 2 (Veo 3.1)
        - first_frame = last frame of Shot 1
        - reference_images = [character, environment]
                │
                ▼
STEP 5: Extract last frame of Shot 2
                │
                ▼
        ... continue for each beat ...
                │
                ▼
        If scene_change == true:
          → Generate new keyframe (Nano Banana Pro)
          → Use keyframe as first_frame instead of previous last frame
          → Resume chaining
                │
                ▼
FINAL: Concatenate all shots → Output MP4
```

### Reference Image Strategy

Each Veo call uses up to 3 images:

| Slot | Image | Purpose |
|------|-------|---------|
| **first_frame** | Last frame from previous shot (or keyframe) | Visual continuity |
| **reference 1** | Character from moodboard | Character consistency |
| **reference 2** | Environment from moodboard | Style/setting consistency |

Together, these three anchors ensure the film maintains a consistent look throughout.

### Performance Implications

Frame chaining makes generation **sequential** — each shot must wait for the previous one.

| Duration | Shots | Estimated Time |
|----------|-------|----------------|
| 1 minute | 7-8 | 5-7 minutes |
| 2 minutes | 15 | 10-13 minutes |
| 3 minutes | 22-23 | 15-20 minutes |

This is slower than parallel generation but the quality difference is enormous. For MVP, this tradeoff is worth it.

### Assembly

After all shots are generated:

1. **Concatenate** clips sequentially (already in order)
2. **Trim overlap** — Since consecutive shots share a frame, there may be a brief visual stutter at transitions. Trim the first 2-3 frames (~0.1s) of each subsequent clip to avoid the freeze-frame effect
3. **Crossfade** (optional) — Apply 0.25-0.5s crossfade at scene change boundaries only (where frame chaining was broken)
4. **Export** as single MP4

```
ffmpeg assembly pseudocode:

For each shot pair (N, N+1):
  If scene_change at N+1:
    Apply 0.5s crossfade transition
  Else:
    Hard cut with first 3 frames trimmed from N+1
    
Export: MP4, H.264, 720p, 9:16
```

---

## Error Handling

### Story Generation Fails
- Retry up to 2 times
- If still fails, return error to user with "Try adding more detail"

### Moodboard Generation Fails
- Retry individual images up to 2 times
- If character fails, try simplified description
- If still fails, offer to proceed without that reference

### Shot Generation Fails
- Retry the specific shot up to 2 times
- If fails, try with simplified prompt
- **If a mid-chain shot fails:** Generate a fresh keyframe for the next shot to resume the chain
- At end, offer user to accept as-is or retry

### Keyframe Extraction Fails
- If last frame can't be extracted, generate a Nano Banana keyframe from the next beat's description
- This preserves the chain with minimal visual disruption

### Safety Filter Triggered
- Simplify prompt, retry
- If still blocked, notify user

---

## Data Flow Summary

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  INPUT                                                                 │
│  { idea, duration, style }                                             │
│           │                                                            │
│           ▼                                                            │
│  ┌─────────────────┐                                                   │
│  │ STORY GENERATOR │ → { title, beats[], characters[], setting }       │
│  │ (Gemini)        │                                                   │
│  └─────────────────┘                                                   │
│           │                                                            │
│           ▼ (user approves)                                            │
│  ┌─────────────────┐                                                   │
│  │ MOODBOARD GEN   │ → { character_img, environment_img, moment_img }  │
│  │ (Nano Banana)   │                                                   │
│  └─────────────────┘                                                   │
│           │                                                            │
│           ▼ (user approves)                                            │
│  ┌─────────────────┐                                                   │
│  │ KEYFRAME GEN    │ → first_frame for Shot 1                         │
│  │ (Nano Banana)   │   (+ keyframes for any scene changes)            │
│  └─────────────────┘                                                   │
│           │                                                            │
│           ▼                                                            │
│  ┌─────────────────┐                                                   │
│  │ SHOT GENERATOR  │ → Sequential, frame-chained:                     │
│  │ (Veo 3.1)       │   Shot 1 → extract last frame →                  │
│  │                 │   Shot 2 → extract last frame →                  │
│  │                 │   Shot 3 → ...                                    │
│  │                 │   Each with character + env references            │
│  └─────────────────┘                                                   │
│           │                                                            │
│           ▼                                                            │
│  ┌─────────────────┐                                                   │
│  │ ASSEMBLER       │ → Trim overlaps, crossfade at scene changes      │
│  │ (FFmpeg)        │ → final_video.mp4                                │
│  └─────────────────┘                                                   │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints (MVP)

```
POST /api/generate-story
  Input: { idea, duration, style }
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
    progress?: { current_shot, total_shots, phase },
    videoUrl?: string
  }

POST /api/regenerate-film/{filmId}
  Output: { filmId, status: "processing" }
```

---

## What's Deferred to V2

| Feature | V2 Approach |
|---------|-------------|
| Per-scene regeneration | Regenerate single shot, re-chain from there |
| Parallel generation | Batch scenes by location for partial parallelism |
| Character customization | Edit character prompt, regenerate reference |
| Music selection | Separate Lyria integration |
| Video extension | Chain 8s clips into 16s+ for slow scenes |
| Advanced transitions | Match cuts, whip pans between scenes |

---

*This workflow produces a seamless, visually consistent film through frame chaining — each shot flows naturally into the next.*
