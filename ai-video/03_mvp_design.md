# AI Story Generator: MVP Design
## Version 1.1 — User Experience

---

## Overview

This document defines the user experience for the MVP.

**Critical UX requirement:** The beat structure (Hook/Rise/Spike/Drop/Cliff) is proprietary and must **never** be exposed to users. Users see only "Scene 1, Scene 2..." etc.

Companion documents:
- **Workflow Architecture** — Technical pipeline
- **Prompting Guide** — Retention-optimized prompts

---

## Core Flow

```
┌──────────┐    ┌──────────┐    ┌────────────────┐    ┌──────────┐    ┌──────────┐
│ 1. IDEA  │ →  │ 2. STORY │ →  │   3. LOOK      │ →  │ 4. MAKE  │ →  │ 5. DONE  │
│          │    │          │    │                │    │          │    │          │
│ Write &  │    │ Read &   │    │ 3a: Protagonist│    │ Wait &   │    │ Watch &  │
│ Pick     │    │ Approve  │    │     (style)    │    │ Preview  │    │ Share    │
│ Style    │    │          │    │ 3b: Full       │    │          │    │          │
│          │    │          │    │     moodboard  │    │          │    │          │
│  ~30s    │    │  ~20s    │    │  ~40s          │    │ ~6-8min  │    │   —      │
└──────────┘    └──────────┘    └────────────────┘    └──────────┘    └──────────┘
                     ▲               ▲
                Checkpoint 1    Checkpoint 2
                                (two steps)
```

**Total time: ~9-10 minutes to finished 60-second film**

---

## Screen 1: Idea

### Purpose
Capture story idea and style. **Duration is fixed at 1 minute — no selector needed.**

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   [Logo: StoryGen]                                              │
│                                                                 │
│                                                                 │
│                    ✨ Create a 60-second film                   │
│                                                                 │
│                                                                 │
│   What's your story?                                           │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                                                         │  │
│   │  A wife discovers her husband has been hiding a        │  │
│   │  second family for six years...                         │  │
│   │                                                         │  │
│   └─────────────────────────────────────────────────────────┘  │
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
│   💡 Need ideas? "Caught cheating at the altar" •              │
│      "The inheritance has conditions" • "She's not really dead"│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Components

| Component | Description |
|-----------|-------------|
| **Text Area** | Large, multi-line. Placeholder: "A woman discovers a secret..." |
| **Style Cards** | 3 cards with 2-3 sec video preview loops. Default: Cinematic |
| **Submit Button** | "Create Story →" — disabled until text entered |
| **Inspiration** | Clickable dramatic prompts |

**Note:** No duration selector. All films are 60 seconds.

### States

| State | Behavior |
|-------|----------|
| Empty | Submit button disabled |
| Filled | Submit button enabled |
| Loading | "Understanding your story..." |

---

## Screen 2: Story

### Purpose
Show generated story for approval. **Beat names (Hook/Rise/etc.) are NEVER shown.**

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ← Back                                           Step 2 of 4 │
│                                                                 │
│                                                                 │
│              📖 "The Other Wife"                                │
│                                                                 │
│              Your story in 8 scenes                            │
│                                                                 │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                                                         │  │
│   │   1. Elena slams a photograph on the counter. "Who is  │  │
│   │      she, Marcus?" He freezes mid-reach for his wine.  │  │
│   │                                                         │  │
│   │   2. Marcus: "Where did you get that?" Elena: "Your    │  │
│   │      gym bag. The one you told me not to touch."       │  │
│   │                                                         │  │
│   │   3. He reaches for her arm. "Let me explain—" She     │  │
│   │      jerks away. "Explain the CHILD?"                   │  │
│   │                                                         │  │
│   │   4. She flips the photo. The back reads: "To Daddy,   │  │
│   │      love always, Sophie. Age 6." His face crumbles.   │  │
│   │                                                         │  │
│   │   5. Elena slides off her wedding ring. "Six years.    │  │
│   │      You've been lying to me for six years."           │  │
│   │                                                         │  │
│   │   6. "I was going to tell you—" She grabs her keys.    │  │
│   │      "The right time to destroy my life?"              │  │
│   │                                                         │  │
│   │   7. She heads for the door. He follows. "Where are    │  │
│   │      you going?" She doesn't answer.                    │  │
│   │                                                         │  │
│   │   8. His phone lights up: "JESSICA ❤️ calling."         │  │
│   │      Elena looks at him. "Answer it."                   │  │
│   │                                                         │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│                                                                 │
│        [ ↻ Try Different Story ]        [ Looks Good → ]       │
│                                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Critical: Hidden Beat Names

The UI shows:
- ✅ "Scene 1", "Scene 2", "Scene 3"...
- ✅ Just numbers (1, 2, 3...)

The UI **never** shows:
- ❌ "Hook", "Rise", "Spike", "Drop", "Cliff"
- ❌ "Pattern Break", "Dopamine Hit", "Cliffhanger"
- ❌ Any terminology revealing our formula

### Components

| Component | Description |
|-----------|-------------|
| **Back Arrow** | Returns to Screen 1 |
| **Step Indicator** | "Step 2 of 4" |
| **Title** | Auto-generated title |
| **Subtitle** | "Your story in 7 scenes" |
| **Scene List** | Numbered 1-7, plain descriptions only |
| **Retry Button** | "Try Different Story" |
| **Approve Button** | "Looks Good →" |

### States

| State | Behavior |
|-------|----------|
| Loading | "Writing your story..." |
| Error | "Couldn't create the story. Try adding more conflict." |
| Success | Show numbered scene list |

---

## Screen 3: Look (Protagonist-First)

### Purpose
Establish visual style with protagonist as the anchor. This is a **two-step flow**:
1. Approve the protagonist look (defines style)
2. Approve the rest (generated using protagonist as reference)

### Screen 3a: Protagonist Look

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ← Back                                          Step 3a of 4 │
│                                                                 │
│                                                                 │
│              🎨 First, let's nail the look                     │
│                                                                 │
│              Your main character sets the style                │
│                                                                 │
│                                                                 │
│   ┌───────────────────────────────────────────────────────┐    │
│   │                                                       │    │
│   │                                                       │    │
│   │                                                       │    │
│   │                  [ELENA IMAGE]                        │    │
│   │                                                       │    │
│   │                                                       │    │
│   │                                                       │    │
│   └───────────────────────────────────────────────────────┘    │
│                         Elena                                   │
│                                                                 │
│                                                                 │
│        [ ↻ Try Different Look ]         [ Looks Good → ]       │
│                                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**On "Looks Good →":** Generate other characters + environment + key moment in parallel, all using protagonist as reference.

### Screen 3b: Full Moodboard

Shows all characters and all locations for user approval.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ← Back                                          Step 3b of 4 │
│                                                                 │
│                                                                 │
│              🎨 Here's your world                              │
│                                                                 │
│                                                                 │
│   CHARACTERS                                                   │
│   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐             │
│   │             │ │             │ │             │             │
│   │   ELENA     │ │   MARCUS    │ │ DET. RAY    │ ...        │
│   │     🔒      │ │             │ │             │             │
│   └─────────────┘ └─────────────┘ └─────────────┘             │
│     Style anchor    [↻ Retry]      [↻ Retry]                  │
│                                                                 │
│   LOCATIONS                                                    │
│   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐             │
│   │             │ │             │ │             │             │
│   │   KITCHEN   │ │ POLICE STN  │ │ COURTROOM   │ ...        │
│   │             │ │             │ │             │             │
│   └─────────────┘ └─────────────┘ └─────────────┘             │
│      [↻ Retry]      [↻ Retry]       [↻ Retry]                 │
│                                                                 │
│   KEY MOMENT PREVIEW                                           │
│   ┌───────────────────────────────────────────┐               │
│   │                                           │               │
│   │            [KEY MOMENT IMAGE]             │               │
│   │                                           │               │
│   └───────────────────────────────────────────┘               │
│                    [↻ Retry]                                  │
│                                                                 │
│   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│   Want a completely different style?                           │
│   [ ← Change Main Character Look ]                             │
│                                                                 │
│                              [ Make Film → ]                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

Note: The grid scrolls horizontally if there are many characters or locations.

### Key Behaviors

**Protagonist is locked** after approval:
- Shown with 🔒 icon
- No individual retry button
- To change: use "Change Main Character Look" which goes back to 3a

**Other elements have individual retry:**
- Each can be regenerated independently
- All regenerations use protagonist as style reference
- Style stays consistent

**Cascade warning** (when changing protagonist):
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ⚠️ Changing the main character will regenerate               │
│      all other images to match the new style.                  │
│                                                                 │
│              [ Cancel ]        [ Continue ]                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Components

**Screen 3a:**
| Component | Description |
|-----------|-------------|
| **Protagonist Image** | Large, centered, defines the style |
| **Retry Button** | "Try Different Look" — regenerates protagonist |
| **Approve Button** | "Looks Good →" — triggers parallel generation |

**Screen 3b:**
| Component | Description |
|-----------|-------------|
| **Protagonist Image** | Locked with 🔒, no retry |
| **Other Images** | Each has individual [↻ Retry] button |
| **Change Style Link** | "Change Main Character Look" — goes back to 3a with warning |
| **Approve Button** | "Make Film →" — proceeds to generation |

### States

**Screen 3a:**
| State | Behavior |
|-------|----------|
| Loading | "Creating your main character..." |
| Error | "Couldn't create the look. Let's try again." |
| Success | Show protagonist image |

**Screen 3b:**
| State | Behavior |
|-------|----------|
| Loading | "Building your world..." (shows progress) |
| Retrying | Individual image shows spinner, others remain |
| Success | Show full moodboard |

---

## Screen 4: Make

### Purpose
Show generation progress. Each scene generates independently (scene refs + video).

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                                                                 │
│                                                                 │
│                    🎬 Creating your film...                     │
│                                                                 │
│                       "The Other Wife"                          │
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
│         ████████████████████░░░░░░░░░░░░░░░░  5 of 8           │
│                                                                 │
│                     About 3 minutes left                        │
│                                                                 │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  ✓ Scene 1   ✓ Scene 2   ✓ Scene 3   ✓ Scene 4         │  │
│   │  ⟳ Scene 5   ○ Scene 6   ○ Scene 7   ○ Scene 8         │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Components

| Component | Description |
|-----------|-------------|
| **Title** | "Creating your film..." |
| **Preview** | Most recently completed scene on loop |
| **Progress Bar** | "X of 7" |
| **Time Estimate** | "About X minutes left" |
| **Scene Status** | ✓/⟳/○ for each scene (numbered, NOT named) |

**Critical:** Scene status shows "Scene 1, Scene 2..." — never "Hook, Rise, Spike..."

### Timing

8 shots × ~45-60 seconds each = **6-8 minutes total**

### States

| State | Behavior |
|-------|----------|
| Generating | Progress updates per scene |
| Scene Error | "Scene X had an issue — retrying..." |
| Assembling | "Putting it all together..." |
| Complete | Auto-navigate to Screen 5 |

---

## Screen 5: Done

### Purpose
Celebrate, watch, share. The film ends with a hard cut (no fade) — this is intentional.

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
│                 "The Other Wife" • 0:58                        │
│                                                                 │
│                                                                 │
│          ┌─────────────────┐   ┌─────────────────┐             │
│          │  📥 Download    │   │  🔗 Copy Link   │             │
│          └─────────────────┘   └─────────────────┘             │
│                                                                 │
│                                                                 │
│   ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                                                 │
│   Want a different take?                                       │
│                                                                 │
│   [ ↻ Regenerate Film ]            [ ✨ Make New Film ]        │
│                                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Components

| Component | Description |
|-----------|-------------|
| **Video Player** | Large, 9:16, native controls |
| **Title & Duration** | Film title + runtime (~58-60 sec) |
| **Download** | Saves MP4 |
| **Copy Link** | Shareable URL |
| **Regenerate** | Same story/look, new generation |
| **New Film** | Back to Screen 1 |

---

## Mobile Layouts

### Mobile Screen 1
```
┌───────────────────┐
│ ✨ Create a       │
│   60-second film  │
│                   │
│ What's your story?│
│ ┌───────────────┐ │
│ │ A wife        │ │
│ │ discovers...  │ │
│ └───────────────┘ │
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
│                   │
│ 💡 Ideas...       │
└───────────────────┘
```

### Mobile Screen 2
```
┌───────────────────┐
│ ←         2 of 4  │
│                   │
│ 📖 "The Other     │
│     Wife"         │
│                   │
│ 1. Elena slams a  │
│    photo down...  │
│                   │
│ 2. "Where did you │
│    get that?"...  │
│                   │
│ 3. He reaches for │
│    her arm...     │
│                   │
│ ...               │
│                   │
│ 7. His phone      │
│    lights up...   │
│                   │
│ [Different Story] │
│ [Looks Good →]    │
└───────────────────┘
```

---

## Error States

### Story Generation Failed
```
😅 Couldn't create the story

We need a bit more to work with.
Try adding:
• Who's in conflict?
• What's at stake?

[ ← Edit Idea ]
```

### Moodboard Generation Failed
```
😅 Couldn't create the look

Let's try again with a different approach.

[ Try Again ]       [ ← Edit Story ]
```

### Video Generation Failed
```
⚠️ Some scenes had issues

5 of 7 scenes generated successfully.

[ Continue Anyway ]     [ Try Again ]
```

---

## Loading Messages

### Screen 1 → 2
```
Understanding your story...
Finding the conflict...
```

### Screen 2 → 3
```
Creating your visual direction...
Designing the characters...     (1 of 3)
Building the world...           (2 of 3)
Capturing the key moment...     (3 of 3)
```

### Screen 4
```
Setting up the opening shot...
Filming Scene 1...
Filming Scene 2...
...
Putting it all together...
```

---

## Summary

### User Decisions

| Screen | Decision |
|--------|----------|
| 1. Idea | What's my story? (free text) |
| 1. Idea | What style? (Cinematic / 3D / 2D) |
| 2. Story | Does this story work? (Approve / Retry) |
| 3. Look | Does this look right? (Approve / Retry) |

**Total decisions: 4**

### What Users See vs. What's Hidden

| Users See | Hidden (Internal Only) |
|-----------|------------------------|
| "Scene 1, Scene 2..." | "Hook, Rise, Spike, Drop, Cliff" |
| "7 scenes" | Beat timing structure |
| Story descriptions | Retention formula mechanics |
| "Your story" | Psychological engineering |

---

## Technical Notes

### State Shape
```javascript
{
  step: 1 | 2 | 3 | 4 | 5,
  input: {
    idea: string,
    style: 'cinematic' | '3d' | '2d'
  },
  story: {
    id: string,
    title: string,
    beats: Beat[],       // beat_type is internal, never sent to client display
    characters: Character[],  // All characters in the story
    locations: Location[]     // All unique locations in the story
  } | null,
  moodboard: {
    id: string,
    protagonist: ImageRef,           // Style anchor
    characters: { [id]: ImageRef },  // All other characters
    locations: { [id]: ImageRef }    // All locations
  } | null,
  film: {
    id: string,
    status: 'generating' | 'assembling' | 'ready' | 'failed',
    progress: { current: number, total: 8 },
    videoUrl: string | null
  } | null
}

// Beat structure (internal)
{
  beat_number: 1,
  beat_type: "hook",              // NEVER send to client
  time_range: "0:00-0:08",        // NEVER send to client
  characters_in_scene: ["elena", "marcus"],  // For ref selection
  location_id: "kitchen",         // For ref selection
  description: "Elena slams...",
  scene_change: false
}
```

### API Response Sanitization

The `/api/generate-story` endpoint returns beats to the client, but **must strip internal fields**:

```javascript
// Internal beat (stored in database, used for video generation)
{
  beat_number: 1,
  beat_type: "hook",                         // NEVER send to client
  time_range: "0:00-0:08",                   // NEVER send to client
  characters_in_scene: ["elena", "marcus"],  // For ref selection
  location_id: "kitchen",                    // For ref selection
  description: "Elena slams...",
  scene_change: false
}

// Client-facing beat (API response)
{
  scene_number: 1,
  description: "Elena slams..."
}
```

### Polling (Screen 4)

```json
{
  "status": "generating",
  "progress": {
    "current": 5,
    "total": 8
  },
  "completed_scenes": [
    { "scene_number": 1, "preview_url": "..." },
    { "scene_number": 2, "preview_url": "..." },
    { "scene_number": 3, "preview_url": "..." },
    { "scene_number": 4, "preview_url": "..." }
  ]
}
```

---

## What's NOT in MVP

| Feature | Why Deferred |
|---------|--------------|
| Duration options | 1 minute is optimal for retention |
| Per-scene editing | Regenerate full story instead |
| Per-scene regeneration | Maintains narrative coherence; regenerate full film instead |
| User accounts | Anonymous for MVP |
| Episode series | V2 feature |
| Direct social sharing | Download works |
