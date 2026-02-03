# AI Story Generator: Prompting Guide
## Version 1.0 — MVP

---

## Overview

This document contains the exact prompts used at each stage of the workflow:
1. Story generation (Gemini)
2. Moodboard generation (Nano Banana Pro)
3. Keyframe generation (Nano Banana Pro)
4. Video generation (Veo 3.1) — with frame chaining

All prompts are designed for consistency with the MVP Design and Workflow Architecture.

---

## 1. Story Generation (Gemini)

### System Prompt

```
You are a short film writer. Your job is to turn a story idea into a 
structured beat sheet that can be directly visualized as video.

RULES:
1. Every beat = one 8-second video shot
2. Each beat must show ONE clear action (no "and then")
3. Write what we SEE and HEAR, not internal thoughts
4. Dialogue (if any) must be under 15 words per beat
5. The story must have a clear emotional arc
6. Everything must be visually achievable
7. Flag any beat where the scene changes location or jumps in time
```

### User Prompt Template

```
Create a {duration}-minute short film from this idea:

IDEA: "{idea}"

STYLE: {style}

This will be {num_shots} shots (each 8 seconds long).

IMPORTANT: For any beat where the location changes or time jumps 
significantly from the previous beat, set "scene_change": true.
This helps us handle visual transitions correctly.

OUTPUT FORMAT (JSON):
{
  "title": "Short evocative title (2-4 words)",
  
  "characters": [
    {
      "id": "unique_id",
      "name": "Character Name or Description",
      "appearance": "Physical description we will see on screen 
                     (4-5 specific visual details: build, coloring, 
                      clothing, distinguishing features)",
      "role": "protagonist|supporting"
    }
  ],
  
  "setting": {
    "location": "Primary location, be specific",
    "time": "Time of day / lighting quality",
    "atmosphere": "Mood and feeling of the world"
  },
  
  "beats": [
    {
      "beat_number": 1,
      "description": "1-2 sentences of what we SEE. Include what we 
                       HEAR if dialogue or important sound.",
      "story_function": "hook|inciting_incident|rising_action|
                         midpoint|climax|resolution",
      "scene_change": false
    }
  ]
}

STRUCTURE FOR {duration} MINUTE FILM:

{beat_structure}
```

### Beat Structure Templates

**1-minute (7-8 beats):**
```
Beats 1-2: Hook and setup
Beat 3: Inciting incident  
Beats 4-5: Rising action
Beat 6: Climax
Beats 7-8: Resolution
```

**2-minute (15 beats):**
```
Beats 1-3: Setup (world, character, status quo)
Beat 4: Inciting incident
Beats 5-7: Rising action
Beats 8-9: Midpoint shift
Beats 10-12: Escalating conflict
Beat 13: Crisis / dark moment
Beat 14: Climax
Beat 15: Resolution
```

**3-minute (22-23 beats):**
```
Beats 1-4: Setup and world establishment
Beat 5: Inciting incident
Beats 6-10: Rising action (first half)
Beats 11-12: Midpoint
Beats 13-17: Rising action (second half)
Beats 18-19: Crisis
Beats 20-21: Climax
Beats 22-23: Resolution
```

### Example Output

Input: `{ idea: "a robot learns to dance", duration: 1, style: "cinematic" }`

```json
{
  "title": "The Last Dance",
  
  "characters": [
    {
      "id": "robot",
      "name": "The Robot",
      "appearance": "Industrial service robot with weathered blue-gray metal plating, one flickering amber eye-light, stiff rusted joints, humanoid frame with rounded shoulders, faded serial number on chest plate",
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
      "description": "A rusted robot sits motionless in a dark factory. Dust floats in a shaft of golden light. Complete stillness.",
      "story_function": "hook",
      "scene_change": false
    },
    {
      "beat_number": 2,
      "description": "A faint melody breaks the silence. Somewhere in the debris, a music box begins to play on its own.",
      "story_function": "hook",
      "scene_change": false
    },
    {
      "beat_number": 3,
      "description": "The robot's eye flickers to life. Its head turns slowly toward the sound, joints creaking.",
      "story_function": "inciting_incident",
      "scene_change": false
    },
    {
      "beat_number": 4,
      "description": "The robot reaches into the rubble and lifts out a small, ornate music box. The melody fills the space.",
      "story_function": "rising_action",
      "scene_change": false
    },
    {
      "beat_number": 5,
      "description": "Holding the box close to its chest, the robot's body begins to sway. Awkward at first. Hesitant.",
      "story_function": "rising_action",
      "scene_change": false
    },
    {
      "beat_number": 6,
      "description": "The movement becomes rhythm. The robot is dancing — really dancing — finding grace in its worn joints.",
      "story_function": "climax",
      "scene_change": false
    },
    {
      "beat_number": 7,
      "description": "Wide shot: The robot dances alone in the beam of light, surrounded by silent machines. It has found joy.",
      "story_function": "resolution",
      "scene_change": false
    }
  ]
}
```

*(Note: This example has no scene changes since it all takes place in one location. A multi-location story would have `"scene_change": true` at location transitions.)*

---

## 2. Moodboard Generation (Nano Banana Pro)

### Style Prefixes

**Cinematic:**
```
Cinematic still, photorealistic, shot on 35mm film, shallow depth of field, 
natural lighting, film grain, professional cinematography
```

**3D Animated:**
```
3D animated, Pixar-style rendering, stylized realism, 
expressive features, vibrant colors, clean lighting, appealing design
```

**2D Animated:**
```
2D animated, illustrated style, hand-drawn aesthetic, bold outlines, 
stylized, expressive, graphic shapes, flat lighting with soft shadows
```

---

### Character Reference Prompt

```
{style_prefix}

Portrait of {character.appearance}.

Expression: {derived_from_story_mood}.

Simple background that suggests {setting.location} without distracting.

Character fills most of the frame, clearly visible from head to mid-torso.
Show enough detail to establish their complete look.

Portrait orientation, 9:16 aspect ratio.
```

**Example (Cinematic):**
```
Cinematic still, photorealistic, shot on 35mm film, shallow depth of field, 
natural lighting, film grain, professional cinematography

Portrait of an industrial service robot with weathered blue-gray metal plating, 
one flickering amber eye-light, stiff rusted joints, humanoid frame with 
rounded shoulders, faded serial number on chest plate.

Expression: Still, dormant, waiting.

Simple background that suggests abandoned factory without distracting.

Character fills most of the frame, clearly visible from head to mid-torso.
Show enough detail to establish their complete look.

Portrait orientation, 9:16 aspect ratio.
```

---

### Environment Reference Prompt

```
{style_prefix}

{setting.location}.

{setting.time}.

Atmosphere: {setting.atmosphere}.

Wide establishing shot showing the world.

No characters in frame.

Portrait orientation, 9:16 aspect ratio.
```

---

### Key Moment Reference Prompt

```
{style_prefix}

{climax_beat.description}

{character.appearance} visible in the scene.

Mood: {setting.atmosphere}

Cinematic composition.

Portrait orientation, 9:16 aspect ratio.
```

---

## 3. Keyframe Generation (Nano Banana Pro)

### Purpose

Keyframes serve as **first frames** for video generation. They're needed at:
1. **Shot 1** — The opening frame of the film
2. **Any beat with `scene_change: true`** — Where visual continuity breaks

For all other shots, the last frame of the previous shot serves as the first frame (frame chaining).

### Opening Keyframe Prompt

```
{style_prefix}

{beat_1.description}

{character.appearance} clearly visible in their starting position.

This is the opening frame of the film. Establish the world and character.

The composition should leave room for the action described to unfold.

Mood: {setting.atmosphere}

Portrait orientation, 9:16 aspect ratio.
```

**Example:**
```
Cinematic still, photorealistic, shot on 35mm film, shallow depth of field, 
natural lighting, film grain, professional cinematography

A rusted robot sits motionless on the floor of an abandoned factory. 
Dust floats in a shaft of golden afternoon light. Complete stillness.

Industrial service robot with weathered blue-gray metal plating, one 
flickering amber eye-light, stiff rusted joints, humanoid frame with 
rounded shoulders. Sitting on factory floor, dormant.

This is the opening frame of the film. Establish the world and character.

The composition should leave room for the action described to unfold.

Mood: Quiet, dusty, melancholic but with warmth.

Portrait orientation, 9:16 aspect ratio.
```

### Scene Change Keyframe Prompt

```
{style_prefix}

{scene_change_beat.description}

{character.appearance} in the new location/moment.

This is a scene transition. Establish the new visual context clearly.

Mood: {appropriate_mood_for_this_beat}

Must match the overall visual style of the film established 
in the reference images.

Portrait orientation, 9:16 aspect ratio.
```

---

## 4. Video Generation (Veo 3.1)

### Frame Chaining Strategy

Every shot is generated with three visual anchors:

| Anchor | Source | Purpose |
|--------|--------|---------|
| **First frame** | Last frame of previous shot (or keyframe) | Continuity |
| **Reference 1** | Character image from moodboard | Character consistency |
| **Reference 2** | Environment image from moodboard | Style consistency |

```
Shot 1: first_frame = opening keyframe
Shot 2: first_frame = last frame of Shot 1
Shot 3: first_frame = last frame of Shot 2
...
Shot N (scene_change): first_frame = new keyframe
Shot N+1: first_frame = last frame of Shot N
...
```

### Prompt Design for Chained Shots

When a shot continues from the previous frame, the prompt must describe **progression from what's already visible**. This avoids contradicting the first frame.

**Key principle:** Describe WHERE THE ACTION GOES, not where it starts. The first frame already shows the starting position.

### Base Shot Prompt Template

```
SCENE:
{beat.description}
Location: {setting.location}
Time: {setting.time}

CAMERA:
{shot_type}, {angle}, {movement}

SUBJECT:
{character.name} ({character.appearance_brief})
Action: {single_action_verb}

SOUND:
{ambient}. {dialogue_if_any}. {music_mood}.

STYLE: {user_style} — {mood_for_this_beat}
```

### Shot Type Reference

| Type | Use For |
|------|---------|
| **Extreme Close-up** | Emotional peaks, reveals |
| **Close-up** | Dialogue, reaction |
| **Medium Close** | Conversation |
| **Medium** | Standard action |
| **Medium Wide** | Character in context |
| **Wide** | Establishing, isolation |
| **Extreme Wide** | Scale, loneliness, endings |

### Camera Movement Reference

| Movement | Emotional Effect |
|----------|------------------|
| **Static** | Observation, stillness, tension |
| **Slow push in** | Increasing intimacy, revelation |
| **Slow pull back** | Growing distance, endings |
| **Pan** | Following, surveying |
| **Tilt up** | Awe, hope, aspiration |
| **Tilt down** | Diminishing, discovery |

### Story Function → Cinematography Mapping

| Function | Typical Shot | Typical Movement |
|----------|-------------|------------------|
| **hook** | Wide / Medium Wide | Slow push in |
| **inciting_incident** | Medium | Static or slow pan |
| **rising_action** | Medium / Medium Close | Varies |
| **midpoint** | Varies | Dynamic |
| **climax** | Close-up / Medium | Push in |
| **resolution** | Wide | Pull back or static |

---

### Full Example: "The Last Dance" — All 7 Shots

**Shot 1 (Hook) — Uses opening keyframe as first frame:**
```
SCENE:
A rusted robot sits motionless on the floor of an abandoned factory. 
Dust particles drift through a shaft of golden afternoon light. 
Nothing moves. Absolute stillness.
Location: Abandoned factory floor
Time: Late afternoon, golden hour through broken windows

CAMERA:
Medium wide shot, eye level, very slow push in

SUBJECT:
The Robot (weathered blue-gray metal, one amber eye, rusted joints)
Action: Remains completely motionless, dormant

SOUND:
Deep silence. Distant wind. Dust settling.

STYLE: Cinematic — melancholic, still, contemplative
```

**Shot 2 (Hook) — First frame = last frame of Shot 1:**
```
SCENE:
A faint melody emerges. On the factory floor, partially buried in 
debris, a small ornate music box begins to play. Its lid opens slowly.
Location: Factory floor, among debris
Time: Late afternoon, warm light

CAMERA:
Close-up on music box, eye level, static

SUBJECT:
Antique music box, ornate metalwork, dusty but intact
Action: Lid opens, mechanism turns, melody plays

SOUND:
Gentle music box melody emerging from silence. Factory ambience.

STYLE: Cinematic — mysterious, magical, intimate
```

**Shot 3 (Inciting Incident) — First frame = last frame of Shot 2:**
```
SCENE:
The robot's amber eye flickers to life, glowing softly. Its head 
turns slowly toward the source of the music. Rusty joints creak.
Location: Factory floor
Time: Late afternoon, golden light

CAMERA:
Medium close-up on robot's face, eye level, static

SUBJECT:
The Robot (one eye now glowing amber, head beginning to turn)
Action: Eye activates, head turns slowly toward the sound

SOUND:
Music box melody continuing. Mechanical creak of rusty joints.

STYLE: Cinematic — awakening, curiosity, gentle
```

**Shot 4 (Rising Action) — First frame = last frame of Shot 3:**
```
SCENE:
The robot reaches into the rubble with stiff, deliberate movements.
It carefully lifts out the small music box. The melody grows clearer 
and warmer as it rises.
Location: Factory floor, debris pile
Time: Late afternoon light

CAMERA:
Medium shot, slightly low angle, static

SUBJECT:
The Robot (upper body visible, arms extending)
Action: Reaches down and lifts music box with both hands

SOUND:
Music box melody now clear. Mechanical movement sounds. Debris shifting.

STYLE: Cinematic — discovery, tenderness
```

**Shot 5 (Rising Action) — First frame = last frame of Shot 4:**
```
SCENE:
The robot holds the music box against its chest. Its body begins 
to sway side to side — awkward, hesitant, testing what 
movement feels like after years of stillness.
Location: Factory floor, standing in the light shaft
Time: Late afternoon, golden light falling on the robot

CAMERA:
Medium shot, eye level, very slow push in

SUBJECT:
The Robot (clutching music box to chest)
Action: Sways gently side to side, uncertain rhythm

SOUND:
Music box melody. Subtle mechanical sounds of joints moving.

STYLE: Cinematic — tentative, hopeful, emerging joy
```

**Shot 6 (Climax) — First frame = last frame of Shot 5:**
```
SCENE:
The robot finds the rhythm. It is dancing now — really dancing. 
Arms extend outward, body turns, movements flowing with unexpected 
grace. Rust and stiffness forgotten.
Location: Factory floor, light shaft
Time: Late afternoon, warm golden light

CAMERA:
Medium shot, low angle looking up, slow orbit around robot

SUBJECT:
The Robot (fully animated, music box held close)
Action: Dances with flowing, graceful movements

SOUND:
Music box melody at full volume. Dancing footsteps on concrete. Joy.

STYLE: Cinematic — transcendent, joyful, beautiful
```

**Shot 7 (Resolution) — First frame = last frame of Shot 6:**
```
SCENE:
Wide view of the factory. The robot dances alone in the beam of 
light, a small figure surrounded by dormant machines and decades 
of dust. It has found something worth moving for.
Location: Full factory interior, wide view
Time: Late afternoon, single golden light beam, rest in shadow

CAMERA:
Wide shot, eye level, very slow pull back

SUBJECT:
The Robot (small in frame, still dancing)
Action: Continues dancing gracefully, alone but alive

SOUND:
Music box melody softening. Ambient factory sounds. Peace.

STYLE: Cinematic — bittersweet, beautiful, complete
```

---

## Style Variations

### 3D Animated — Shot 6 (Climax):

```
SCENE:
The robot finds its rhythm. It spins and sways with bouncy, 
joyful energy, eyes bright with happiness, holding the glowing 
music box close.
Location: Stylized factory, warm lighting
Time: Magical golden hour

CAMERA:
Medium shot, dynamic angle, smooth arc around robot

SUBJECT:
The Robot (rounded friendly design, bright glowing eyes)
Action: Dances with bouncy, expressive Pixar-style movement

SOUND:
Cheerful music box melody. Playful mechanical sounds.

STYLE: 3D Animated, Pixar-style — joyful, heartwarming
```

### 2D Animated — Shot 6 (Climax):

```
SCENE:
The robot dances with fluid, stretchy movements. Bold graphic 
shapes define its joyful motion as it clutches the illustrated 
music box to its chest.
Location: Graphic factory with bold shapes and flat colors
Time: Warm palette, flat lighting

CAMERA:
Medium shot, straight-on, gentle drift

SUBJECT:
The Robot (bold outlines, simplified expressive shapes)
Action: Dances with fluid, stretchy 2D animation

SOUND:
Warm music box melody. Stylized sound effects.

STYLE: 2D Animated, illustrated — expressive, whimsical
```

---

## Prompt Debugging

### Character looks different between shots
Add to prompt:
```
CRITICAL CHARACTER MATCH:
The character visible must exactly match:
- Weathered blue-gray metal plating
- Single amber eye-light
- Rounded shoulders, humanoid frame
- Faded serial number on chest
Match the character reference image exactly.
```

### Camera does wrong movement
Be explicit and restrictive:
```
CAMERA:
Static shot. No camera movement at all. Completely locked off.
```

### Action is too complex
Reduce to ONE verb:
```
Action: Sways.
```
Not: "Sways and then turns and reaches out and looks up"

### First frame doesn't match the prompt well
Add explicit continuation language:
```
CONTINUITY: This shot continues directly from the provided first frame.
The character is already in the position shown. Animate FORWARD from 
this starting point. Do not reset or reposition anything.
```

### Mood drifts between shots
Add a mood lock:
```
MOOD LOCK: Maintain warm, hopeful, gentle feeling throughout.
Lighting stays golden. No dark or cold tones.
```

---

## Quick Reference Card

### Prompt Checklist
- [ ] SCENE: 2-3 sentences, what we see
- [ ] Location specified
- [ ] Time/lighting specified  
- [ ] CAMERA: shot type + ONE movement
- [ ] SUBJECT: who + ONE action
- [ ] SOUND: ambient + music mood
- [ ] STYLE: matches user selection

### Frame Chaining Checklist
- [ ] Shot 1 uses opening keyframe as first frame
- [ ] Each subsequent shot uses previous shot's last frame
- [ ] Scene change beats get fresh keyframe
- [ ] Character + environment references on every shot
- [ ] Prompt describes progression, not starting position

### Don't Include
- ❌ Multiple actions per shot
- ❌ Internal thoughts ("feeling sad")
- ❌ Multiple camera movements
- ❌ Dialogue over 15 words
- ❌ References to other shots ("like in shot 3")
- ❌ Starting positions that contradict the first frame
