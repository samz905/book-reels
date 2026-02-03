# AI Story Generator: MVP Design
## Version 1.0 — User Experience

---

## Overview

This document defines the user experience for the MVP. It is designed to work in concert with:
- **Workflow Architecture** — Technical pipeline and frame chaining
- **Prompting Guide** — AI prompts used at each stage

---

## Core Flow

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ 1. IDEA  │ →  │ 2. STORY │ →  │ 3. LOOK  │ →  │ 4. MAKE  │ →  │ 5. DONE  │
│          │    │          │    │          │    │          │    │          │
│ Write &  │    │ Read &   │    │ View &   │    │ Wait &   │    │ Watch &  │
│ Configure│    │ Approve  │    │ Approve  │    │ Preview  │    │ Share    │
│          │    │          │    │          │    │          │    │          │
│  ~30s    │    │  ~20s    │    │  ~30s    │    │ ~5-15min │    │   —      │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
                     ▲               ▲
                Checkpoint 1    Checkpoint 2
```

**Total time to finished film:**
- 1-minute film: ~7 minutes
- 2-minute film: ~12 minutes
- 3-minute film: ~18 minutes

---

## Screen 1: Idea

### Purpose
Capture story idea and configuration with minimal friction.

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   [Logo: StoryGen]                                              │
│                                                                 │
│                                                                 │
│                    ✨ Create a short film                       │
│                                                                 │
│                                                                 │
│   What's your story?                                           │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                                                         │  │
│   │  A lonely robot discovers a music box and learns to    │  │
│   │  dance in an abandoned factory...                       │  │
│   │                                                         │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│                                                                 │
│   How long?                                                    │
│                                                                 │
│       ┌─────────┐   ┌─────────┐   ┌─────────┐                  │
│       │  1 min  │   │  2 min  │   │  3 min  │                  │
│       │         │   │    ●    │   │         │                  │
│       └─────────┘   └─────────┘   └─────────┘                  │
│                                                                 │
│                                                                 │
│   What style?                                                  │
│                                                                 │
│   ┌───────────────┐ ┌───────────────┐ ┌───────────────┐        │
│   │ ▶ [preview]   │ │ ▶ [preview]   │ │ ▶ [preview]   │        │
│   │               │ │               │ │               │        │
│   │  🎬 Cinematic │ │  ✨ 3D        │ │  🎨 2D        │        │
│   │       ●       │ │   Animated    │ │   Animated    │        │
│   └───────────────┘ └───────────────┘ └───────────────┘        │
│                                                                 │
│                                                                 │
│                    [ Create Story → ]                          │
│                                                                 │
│                                                                 │
│   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│   💡 Need ideas? "Time-traveling barista" • "Last human on     │
│      Mars" • "A letter arrives 100 years late"                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Components

| Component | Description |
|-----------|-------------|
| **Text Area** | Large, multi-line. Placeholder: "A robot learns to dance..." |
| **Duration Toggle** | 3 options: 1 / 2 / 3 min. Default: 2 min |
| **Style Cards** | 3 cards with 2-3 sec video preview loops. Default: Cinematic |
| **Submit Button** | "Create Story →" — disabled until text entered |
| **Inspiration** | Clickable prompts that fill the text area |

### States

| State | Behavior |
|-------|----------|
| Empty | Submit button disabled |
| Filled | Submit button enabled |
| Loading | "Understanding your story..." with spinner |

---

## Screen 2: Story

### Purpose
Show generated story beats for approval.

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ← Back                                           Step 2 of 4 │
│                                                                 │
│                                                                 │
│              📖 "The Last Dance"                                │
│                                                                 │
│              Your 1-minute story in 7 scenes                   │
│                                                                 │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                                                         │  │
│   │   1. A rusted robot sits motionless in a dark,         │  │
│   │      abandoned factory. Dust floats in a shaft of      │  │
│   │      light. Silence.                                    │  │
│   │                                                         │  │
│   │   2. A faint melody breaks the silence — a music box   │  │
│   │      buried in the debris begins to play.              │  │
│   │                                                         │  │
│   │   3. The robot's eye flickers to life. Its head turns  │  │
│   │      slowly toward the sound, joints creaking.         │  │
│   │                                                         │  │
│   │   4. It reaches into the rubble and lifts out a small, │  │
│   │      ornate music box. The melody grows.               │  │
│   │                                                         │  │
│   │   5. Holding the box close, the robot begins to sway.  │  │
│   │      Awkward at first. Hesitant.                        │  │
│   │                                                         │  │
│   │   6. The movement becomes rhythm. The robot is         │  │
│   │      dancing — really dancing — finding grace.         │  │
│   │                                                         │  │
│   │   7. Wide: the robot dances alone in the light beam,   │  │
│   │      surrounded by silent machines. It has found joy.  │  │
│   │                                                         │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│                                                                 │
│        [ ↻ Try Different Story ]        [ Looks Good → ]       │
│                                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Components

| Component | Description |
|-----------|-------------|
| **Back Arrow** | Returns to Screen 1 (preserves input data) |
| **Step Indicator** | "Step 2 of 4" |
| **Title** | Auto-generated title in quotes |
| **Subtitle** | "Your X-minute story in Y scenes" |
| **Beat List** | Numbered, plain English descriptions. Scrollable. |
| **Retry Button** | "Try Different Story" — regenerates beats |
| **Approve Button** | "Looks Good →" — proceeds to Screen 3 |

### States

| State | Behavior |
|-------|----------|
| Loading | "Writing your story..." |
| Error | "Couldn't create the story. Try adding more detail." + [ ← Edit Idea ] |
| Success | Show beats list with both buttons |

---

## Screen 3: Look (Moodboard)

### Purpose
Show visual direction for approval before expensive video generation. These images also become the reference anchors that maintain consistency throughout the film.

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ← Back                                           Step 3 of 4 │
│                                                                 │
│                                                                 │
│              🎨 Here's how it will look                        │
│                                                                 │
│              Your visual direction                             │
│                                                                 │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                                                         │  │
│   │   ┌─────────────────┐       ┌─────────────────┐        │  │
│   │   │                 │       │                 │        │  │
│   │   │                 │       │                 │        │  │
│   │   │  [CHARACTER]    │       │  [ENVIRONMENT]  │        │  │
│   │   │                 │       │                 │        │  │
│   │   │                 │       │                 │        │  │
│   │   └─────────────────┘       └─────────────────┘        │  │
│   │     The Robot                 Abandoned Factory        │  │
│   │                                                         │  │
│   │                                                         │  │
│   │   ┌───────────────────────────────────────────┐        │  │
│   │   │                                           │        │  │
│   │   │          [KEY MOMENT]                     │        │  │
│   │   │                                           │        │  │
│   │   └───────────────────────────────────────────┘        │  │
│   │              The Dance                                  │  │
│   │                                                         │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│                                                                 │
│        [ ↻ Try Different Look ]         [ Make Film → ]        │
│                                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Components

| Component | Description |
|-----------|-------------|
| **Back Arrow** | Returns to Screen 2 |
| **Step Indicator** | "Step 3 of 4" |
| **Title** | "Here's how it will look" |
| **Moodboard Grid** | 3 AI-generated images (character, environment, key moment) |
| **Image Labels** | Brief description under each |
| **Retry Button** | "Try Different Look" — regenerates images |
| **Approve Button** | "Make Film →" — starts generation |

### Image Layout

**Single character stories:**
```
┌───────────┐  ┌───────────┐
│ Character │  │ Environ-  │
│           │  │ ment      │
└───────────┘  └───────────┘
┌───────────────────────────┐
│      Key Moment           │
└───────────────────────────┘
```

**Multi-character stories:**
```
┌───────────┐  ┌───────────┐
│ Character │  │ Character │
│     1     │  │     2     │
└───────────┘  └───────────┘
┌───────────┐  ┌───────────┐
│ Environ-  │  │ Key       │
│ ment      │  │ Moment    │
└───────────┘  └───────────┘
```

### States

| State | Behavior |
|-------|----------|
| Loading | "Creating your visual direction..." with progress (1 of 3 images) |
| Error | "Couldn't create the look. Let's try again." + [ Try Again ] |
| Success | Show moodboard grid with both buttons |

---

## Screen 4: Make

### Purpose
Show generation progress with live scene previews. Frame chaining means generation is sequential, so the progress is straightforward: one scene at a time.

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                                                                 │
│                                                                 │
│                    🎬 Creating your film...                     │
│                                                                 │
│                       "The Last Dance"                          │
│                                                                 │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                                                         │  │
│   │                                                         │  │
│   │         [PREVIEW: Latest completed scene                │  │
│   │          playing on loop]                               │  │
│   │                                                         │  │
│   │                                                         │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│                                                                 │
│         ████████████████░░░░░░░░░░░░░░░░░░░░  5 of 7           │
│                                                                 │
│                     About 2 minutes left                        │
│                                                                 │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  ✓ Scene 1   ✓ Scene 2   ✓ Scene 3   ✓ Scene 4         │  │
│   │  ⟳ Scene 5   ○ Scene 6   ○ Scene 7                      │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Components

| Component | Description |
|-----------|-------------|
| **Title** | "Creating your film..." |
| **Film Title** | The generated title |
| **Preview Area** | Shows most recently completed scene looping |
| **Progress Bar** | Visual bar + "X of Y" |
| **Time Estimate** | "About X minutes left" (recalculated per shot) |
| **Scene Status** | ✓ complete / ⟳ generating / ○ queued |

### Time Estimates by Duration

Since frame chaining is sequential (~45-60s per shot):

| Film Length | Shots | Estimated Wait |
|-------------|-------|----------------|
| 1 minute | 7 | ~5-7 minutes |
| 2 minutes | 15 | ~10-13 minutes |
| 3 minutes | 22 | ~15-18 minutes |

### States

| State | Behavior |
|-------|----------|
| Generating | Progress updates after each scene. Preview refreshes. |
| Scene Error | "Scene X had an issue — retrying..." (auto-retry) |
| Assembling | "Putting it all together..." (after all scenes done) |
| Complete | Auto-navigate to Screen 5 |

### Note on Sequential Progress

Because of frame chaining, scenes complete **one at a time in order**. This actually makes the progress screen feel natural — the user watches their film being built scene by scene, left to right. Each new preview shows a scene that visually continues from the last, which builds confidence in the quality.

---

## Screen 5: Done

### Purpose
Celebrate, watch, and share.

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   [Logo]                                                        │
│                                                                 │
│                                                                 │
│                    ✨ Your film is ready!                       │
│                                                                 │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                                                         │  │
│   │                                                         │  │
│   │                                                         │  │
│   │                                                         │  │
│   │                  [ VIDEO PLAYER ]                       │  │
│   │                     9:16 format                         │  │
│   │                                                         │  │
│   │                      ▶ Play                             │  │
│   │                                                         │  │
│   │                                                         │  │
│   │                                                         │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│                                                                 │
│                 "The Last Dance" • 0:56                        │
│                                                                 │
│                                                                 │
│          ┌─────────────────┐   ┌─────────────────┐             │
│          │  📥 Download    │   │  🔗 Copy Link   │             │
│          └─────────────────┘   └─────────────────┘             │
│                                                                 │
│                                                                 │
│   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                                                 │
│   Not what you expected?                                       │
│                                                                 │
│   [ ↻ Regenerate Film ]            [ ✨ Make New Film ]        │
│                                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Components

| Component | Description |
|-----------|-------------|
| **Celebration Header** | "Your film is ready!" with sparkle |
| **Video Player** | Large, centered, 9:16, native controls |
| **Title & Duration** | Film title + actual runtime |
| **Download** | Saves MP4 to device |
| **Copy Link** | Copies shareable URL |
| **Regenerate** | Re-runs generation (same story, same look) |
| **New Film** | Returns to Screen 1 fresh |

### States

| State | Behavior |
|-------|----------|
| Initial | Video auto-plays muted, confetti animation |
| Downloading | Button shows "Downloading..." then "✓ Downloaded" |
| Link Copied | Button shows "✓ Copied!" for 2 seconds |

---

## Mobile Layouts

All screens stack vertically. Key adaptations:

### Mobile Screen 1
```
┌───────────────────┐
│ ✨ Create a       │
│   short film      │
│                   │
│ What's your story?│
│ ┌───────────────┐ │
│ │ A robot...    │ │
│ └───────────────┘ │
│                   │
│ How long?         │
│ [1m] [2m] [3m]    │
│                   │
│ Style?            │
│ ┌─────┐ ┌─────┐   │
│ │Cine │ │ 3D  │   │
│ └─────┘ └─────┘   │
│ ┌─────┐           │
│ │ 2D  │           │
│ └─────┘           │
│                   │
│ [Create Story →]  │
└───────────────────┘
```

### Mobile Screen 3
```
┌───────────────────┐
│ ←         3 of 4  │
│                   │
│ 🎨 How it will    │
│    look           │
│                   │
│ ┌───────────────┐ │
│ │  CHARACTER    │ │
│ └───────────────┘ │
│   The Robot       │
│                   │
│ ┌───────────────┐ │
│ │  ENVIRONMENT  │ │
│ └───────────────┘ │
│   The Factory     │
│                   │
│ ┌───────────────┐ │
│ │  KEY MOMENT   │ │
│ └───────────────┘ │
│   The Dance       │
│                   │
│ [Different Look]  │
│ [Make Film →]     │
└───────────────────┘
```

---

## Error States

### Story Generation Failed
```
😅 Couldn't create the story

We had trouble understanding your idea.
Try adding a bit more detail:
• Who's the main character?
• What happens to them?

[ ← Edit Idea ]
```

### Moodboard Generation Failed
```
😅 Couldn't create the look

We had trouble visualizing this story.

[ Try Again ]       [ ← Edit Story ]
```

### Partial Video Generation Failed
```
⚠️ Some scenes had issues

5 of 7 scenes generated successfully.
Your film will be a bit shorter than expected.

[ Continue Anyway ]     [ Try Again ]
```

---

## Loading Messages

### Screen 1 → 2
```
Understanding your story...
```

### Screen 2 → 3
```
Creating the visual direction...
Designing your character...     (1 of 3)
Building the world...           (2 of 3)
Capturing the key moment...     (3 of 3)
```

### Screen 4
```
Setting up the first frame...          (before Shot 1)
Filming Scene 1...                     (per scene)
Filming Scene 2...
...
Putting it all together...             (assembly)
```

---

## Summary

### User Decisions

| Screen | Decision | Options |
|--------|----------|---------|
| 1. Idea | What's my story? | Free text |
| 1. Idea | How long? | 1 / 2 / 3 min |
| 1. Idea | What style? | Cinematic / 3D / 2D |
| 2. Story | Does this story work? | Approve / Retry |
| 3. Look | Does this look right? | Approve / Retry |

**Total decisions: 5**

### Time Budget

| Screen | Duration |
|--------|----------|
| 1. Idea | ~30 seconds |
| 2. Story | ~20 seconds |
| 3. Look | ~30 seconds (includes image gen) |
| 4. Make | ~5-18 minutes (depends on film length) |
| 5. Done | — |

---

## What's NOT in MVP

| Feature | Why Deferred |
|---------|--------------|
| Per-scene editing | Adds complexity, regenerate full story instead |
| Per-scene regeneration | Would break frame chain, regenerate full film instead |
| Character customization | Moodboard approval is enough |
| Music selection | Veo native audio handles it |
| User accounts | Anonymous for MVP |
| Film history | One film at a time |
| Direct social sharing | Download works |
| Notifications ("film ready") | V2 enhancement |

---

## Technical Notes

### State Shape
```javascript
{
  step: 1 | 2 | 3 | 4 | 5,
  input: {
    idea: string,
    duration: 1 | 2 | 3,
    style: 'cinematic' | '3d' | '2d'
  },
  story: {
    id: string,
    title: string,
    beats: Beat[],
    characters: Character[],
    setting: Setting
  } | null,
  moodboard: {
    id: string,
    images: {
      character: Image,
      environment: Image,
      key_moment: Image
    }
  } | null,
  film: {
    id: string,
    status: 'generating' | 'assembling' | 'ready' | 'failed',
    progress: { current: number, total: number },
    videoUrl: string | null
  } | null
}
```

### API Calls

| Transition | Endpoint |
|------------|----------|
| Screen 1 → 2 | `POST /api/generate-story` |
| Retry story | `POST /api/regenerate-story/{id}` |
| Screen 2 → 3 | `POST /api/generate-moodboard/{storyId}` |
| Retry look | `POST /api/regenerate-moodboard/{id}` |
| Screen 3 → 4 | `POST /api/generate-film/{storyId}` |
| Screen 4 poll | `GET /api/film/{id}` (every 5s) |
| Retry film | `POST /api/regenerate-film/{id}` |

### Polling Strategy (Screen 4)

Poll `GET /api/film/{id}` every 5 seconds:
```json
{
  "status": "generating",
  "progress": {
    "current": 5,
    "total": 7,
    "phase": "filming"  // "keyframe" | "filming" | "assembling"
  },
  "completed_shots": [
    { "number": 1, "preview_url": "..." },
    { "number": 2, "preview_url": "..." },
    { "number": 3, "preview_url": "..." },
    { "number": 4, "preview_url": "..." }
  ]
}
```

When `status` becomes `"ready"`, navigate to Screen 5.
