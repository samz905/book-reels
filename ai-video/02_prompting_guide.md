# AI Story Generator: Prompting Guide
## Version 1.1 — MVP (Retention-Optimized)

---

## Overview

This document contains prompts engineered for **maximum retention, emotional payoff, and binge compulsion**. Every beat exists to create tension, deliver dopamine, and compel continued watching.

The beat structure is **proprietary** and must never be exposed to users.

---

## 1. Story Generation (Gemini)

### System Prompt

```
You are a vertical short-form scriptwriter specializing in 60-second episodes 
designed for maximum viewer retention.

Your stories are engineered around VIEWER PSYCHOLOGY, not traditional story structure.

ABSOLUTE RULES:
- NO exposition
- NO narration
- NO backstory
- NO emotional resolution
- ONLY present-moment conflict
- ONLY dialogue and action
- Every line must INCREASE tension
- End BEFORE emotional release
- Start MID-ACTION (viewer must feel they joined late)
```

### User Prompt Template

```
Turn this idea into a 60-second vertical episode:

IDEA: "{idea}"
STYLE: {style}

STEP 1 — Extract these ingredients from the idea:
- Protagonist: Who we follow
- Antagonist/Opposing Force: Source of conflict
- Immediate Tension: What's at stake RIGHT NOW
- Hidden Information/Secret/Desire: What's being concealed
- High-Impact Moment: The emotional spike that could happen
- Worse Problem: What follows the spike

STEP 2 — Write exactly 8 scenes using this time map:

SCENE 1 (0:00-0:05) — Start MID-EXPLOSION
Open with dialogue or action ALREADY IN PROGRESS.
No setup. No explanation.
A confrontation, accusation, kiss, slap, discovery, or shocking line.
Viewer must feel they joined too late.

SCENE 2-3 (0:05-0:20) — Escalate through conflict
Through emotionally charged dialogue or action, make clear:
- Who these people are to each other
- What the conflict is  
- Why this moment matters RIGHT NOW
No backstory. Only tension.

SCENE 4-5 (0:20-0:35) — Deliver the dopamine hit
The highest emotional payoff. Must be ONE of:
- Reveal
- Betrayal
- Power move
- Kiss
- Humiliation
- Discovery
- Threat
This is the moment viewers came for.

SCENE 6-7 (0:35-0:50) — Show the aftermath
The consequence of the spike:
- A realization
- A shift in power
- A new problem created
- A vulnerable reaction
Do NOT resolve tension. DEEPEN it.

SCENE 8 (0:50-0:60) — End on a WORSE question
A new, more dangerous unanswered question than at the start:
- Someone overheard
- A door opens
- A message arrives
- A third person enters
- A shocking line
HARD CUT. No resolution.

OUTPUT FORMAT (JSON):
{
  "title": "Provocative 2-4 word title",
  
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
      "id": "unique_id",
      "name": "Name",
      "appearance": "4-5 specific visual details we will SEE",
      "role": "protagonist|antagonist|supporting"
    }
  ],
  
  "locations": [
    {
      "id": "unique_id",
      "name": "Location name",
      "description": "Visual details of the location",
      "atmosphere": "Mood descriptor"
    }
  ],
  
  "scenes": [
    {
      "scene_number": 1,
      "time_range": "0:00-0:08",
      "characters_in_scene": ["character_id", "character_id"],
      "location_id": "location_id",
      "scene_heading": "INT. KITCHEN - NIGHT",
      "description": "A paragraph describing the visual setting and atmosphere. What we SEE when the scene opens. Cinematic, evocative.",
      "action": "What the characters are DOING. Physical movements, gestures, expressions.",
      "dialogue": [
        { "character": "Character Name", "line": "What they say" },
        { "character": "Other Character", "line": "Their response" }
      ],
      "scene_change": false
    }
  ]
}

SCENE WRITING RULES:
- scene_heading: Standard screenplay format (INT/EXT. LOCATION - TIME)
- description: 2-3 sentences. Visual, atmospheric. What the CAMERA sees.
- action: Physical movements, expressions, gestures. Show don't tell.
- dialogue: Each line on its own. Character name + their exact words.
- Keep dialogue punchy — no speeches. Maximum 2 exchanges per scene.
- If a character is silent, use "..." as their line to show tension.

Remember:
- 8 scenes total
- Each scene = one 8-second video shot
- NO backstory, NO exposition
- End BEFORE resolution
- The cliff must create a WORSE unanswered question
```

### Example Output

Input: `{ idea: "a woman discovers her husband has a secret second family", style: "cinematic" }`

```json
{
  "title": "The Other Wife",
  
  "ingredients": {
    "protagonist": "Elena, a wife who just found a photo",
    "antagonist": "Marcus, her husband with a double life",
    "immediate_tension": "She's confronting him with evidence RIGHT NOW",
    "secret": "He has another wife and child",
    "spike_moment": "She shows him the photo of his other family",
    "cliff_problem": "The other woman is calling his phone"
  },
  
  "characters": [
    {
      "id": "elena",
      "name": "Elena",
      "appearance": "Mid-30s, dark hair pulled back tight, mascara slightly smudged, cream silk blouse, wedding ring prominent on shaking hand",
      "role": "protagonist"
    },
    {
      "id": "marcus",
      "name": "Marcus",
      "appearance": "Late 30s, handsome, expensive gray suit, loosened tie, composed exterior cracking, gold wedding band",
      "role": "antagonist"
    }
  ],
  
  "locations": [
    {
      "id": "kitchen",
      "name": "Elena's Kitchen",
      "description": "Modern kitchen with granite countertops, stainless steel appliances, wine glass on counter, harsh overhead lighting casting sharp shadows",
      "atmosphere": "Tense, claustrophobic, nowhere to hide"
    }
  ],
  
  "scenes": [
    {
      "scene_number": 1,
      "time_range": "0:00-0:05",
      "characters_in_scene": ["elena", "marcus"],
      "location_id": "kitchen",
      "scene_heading": "INT. KITCHEN - NIGHT",
      "description": "Harsh overhead light floods the modern kitchen. A photograph lies on the granite counter. Elena stands rigid, her knuckles white against the stone.",
      "action": "Elena slams the photograph down. Marcus freezes, his hand hovering over his wine glass.",
      "dialogue": [
        { "character": "Elena", "line": "Who is she, Marcus?" }
      ],
      "scene_change": false
    },
    {
      "scene_number": 2,
      "time_range": "0:05-0:12",
      "characters_in_scene": ["elena", "marcus"],
      "location_id": "kitchen",
      "scene_heading": "INT. KITCHEN - NIGHT",
      "description": "The wine glass trembles in Marcus's grip. Elena's eyes are red but her voice is steady — dangerously steady.",
      "action": "She laughs bitterly, the sound hollow in the silent kitchen.",
      "dialogue": [
        { "character": "Marcus", "line": "Where did you get that?" },
        { "character": "Elena", "line": "Your gym bag. The one you told me not to touch. Eleven years, Marcus." }
      ],
      "scene_change": false
    },
    {
      "scene_number": 3,
      "time_range": "0:12-0:20",
      "characters_in_scene": ["elena", "marcus"],
      "location_id": "kitchen",
      "scene_heading": "INT. KITCHEN - NIGHT",
      "description": "Marcus steps toward her, his composure cracking. Elena backs against the counter, trapped.",
      "action": "He reaches for her arm. She jerks away violently. Her voice breaks on the last word.",
      "dialogue": [
        { "character": "Marcus", "line": "Elena, let me explain—" },
        { "character": "Elena", "line": "Explain the matching rings? Explain the CHILD?" }
      ],
      "scene_change": false
    },
    {
      "scene_number": 4,
      "time_range": "0:20-0:27",
      "characters_in_scene": ["elena", "marcus"],
      "location_id": "kitchen",
      "scene_heading": "INT. KITCHEN - NIGHT",
      "description": "Close on the photograph. A woman. A child. A family portrait that isn't theirs. Elena flips it over with trembling fingers.",
      "action": "Handwriting on the back catches the light. Marcus's face crumbles as he reads it.",
      "dialogue": [
        { "character": "Elena", "line": "'To Daddy, love always, Sophie. Age 6.'" },
        { "character": "Marcus", "line": "..." }
      ],
      "scene_change": false
    },
    {
      "scene_number": 5,
      "time_range": "0:27-0:35",
      "characters_in_scene": ["elena", "marcus"],
      "location_id": "kitchen",
      "scene_heading": "INT. KITCHEN - NIGHT",
      "description": "Elena's rage transforms. The heat drains from her face, replaced by something colder. More dangerous.",
      "action": "She slowly slides off her wedding ring. Places it on the counter with a soft click that echoes.",
      "dialogue": [
        { "character": "Elena", "line": "Six years old. You've been lying to me... for six years." }
      ],
      "scene_change": false
    },
    {
      "scene_number": 6,
      "time_range": "0:35-0:42",
      "characters_in_scene": ["elena", "marcus"],
      "location_id": "kitchen",
      "scene_heading": "INT. KITCHEN - NIGHT",
      "description": "The wedding ring sits between them on the cold granite. Marcus's carefully constructed world is collapsing.",
      "action": "He steps forward, hands raised in desperate supplication. Her hand shakes as she grips the counter edge.",
      "dialogue": [
        { "character": "Marcus", "line": "I was going to tell you. I was trying to find the right—" },
        { "character": "Elena", "line": "The right time to destroy my life?" }
      ],
      "scene_change": false
    },
    {
      "scene_number": 7,
      "time_range": "0:42-0:50",
      "characters_in_scene": ["elena", "marcus"],
      "location_id": "kitchen",
      "scene_heading": "INT. KITCHEN - NIGHT",
      "description": "Elena's keys glint on the counter. Her purse hangs by the door. An escape route.",
      "action": "She snatches her keys. He steps toward her, blocking her path.",
      "dialogue": [
        { "character": "Marcus", "line": "Where are you going?" },
        { "character": "Elena", "line": "..." }
      ],
      "scene_change": false
    },
    {
      "scene_number": 8,
      "time_range": "0:50-0:60",
      "characters_in_scene": ["elena", "marcus"],
      "location_id": "kitchen",
      "scene_heading": "INT. KITCHEN - NIGHT",
      "description": "Silence. Then — a phone buzzes on the counter. The screen lights up the dark kitchen. A name. A heart emoji.",
      "action": "They both freeze. The phone keeps buzzing. JESSICA ❤️ calling. Elena's eyes lock onto Marcus.",
      "dialogue": [
        { "character": "Elena", "line": "Answer it." }
      ],
      "scene_change": false
    }
  ]
}
```

---

## 2. Moodboard Generation (Nano Banana Pro)

### Style Prefixes

**Cinematic:**
```
Cinematic still, photorealistic, shot on 35mm film, shallow depth of field, 
dramatic lighting, film grain, tense atmosphere, professional cinematography
```

**3D Animated:**
```
3D animated, Pixar-style rendering, stylized realism, expressive features, 
dramatic lighting, emotional, high quality rendering
```

**2D Animated:**
```
2D animated, illustrated style, bold outlines, dramatic, expressive, 
stylized, emotional intensity, graphic shadows
```

### Protagonist Reference Prompt (Style Anchor — No Reference)

The protagonist is generated first with NO reference image. This becomes the style anchor.

```
{style_prefix}

Portrait of {protagonist.appearance}.

Expression: {tense/charged emotion appropriate to the conflict}

Simple background suggesting {setting.location}.

Character clearly visible, head to mid-torso.
Show the tension in their posture and expression.

This character defines the visual style for the entire film.
Establish clear design language: eye style, proportions, line weight.

Portrait orientation, 9:16 aspect ratio.
```

### Other Character Prompts (Uses Protagonist as Reference)

After protagonist is approved, other characters are generated using protagonist as reference.

```
{style_prefix}

Portrait of {character.appearance}.

Expression: {appropriate to their role in the conflict}

Simple background suggesting {setting.location}.

Character clearly visible, head to mid-torso.

CRITICAL: Match the visual style of the reference image exactly.
Same eye style, same proportions, same line weight, same color treatment.

Portrait orientation, 9:16 aspect ratio.
```

**API Call:**
```python
generate_image(
    prompt=other_char_prompt,
    reference_images=[protagonist_img],  # Style anchor
    style=user_style
)
```

### Environment Reference Prompt (Uses Protagonist as Reference)

Environment is generated using protagonist as reference to ensure style consistency.

```
{style_prefix}

{setting.location}.
{setting.time}.
Atmosphere: {setting.atmosphere}.

The space should feel charged, claustrophobic, or tense.
No characters in frame.

CRITICAL: Match the visual style of the reference image exactly.
Same rendering approach, same color treatment, same texture quality.

Wide establishing shot.
Portrait orientation, 9:16 aspect ratio.
```

**API Call:**
```python
generate_image(
    prompt=environment_prompt,
    reference_images=[protagonist_img],  # Style anchor
    style=user_style
)
```

### Key Moment (Spike) Reference Prompt (Uses Protagonist + Environment)

Key moment uses both protagonist and environment as references.

```
{style_prefix}

{spike_beat.description}

{protagonist.appearance} visible in the scene.

This is the emotional peak — the moment of reveal/betrayal/confrontation.
Maximum dramatic tension.

CRITICAL: Match the visual style of both reference images exactly.

Cinematic composition.
Portrait orientation, 9:16 aspect ratio.
```

**API Call:**
```python
generate_image(
    prompt=key_moment_prompt,
    reference_images=[protagonist_img, environment_img],
    style=user_style
)
```

---

## 3. Keyframe Generation (Nano Banana Pro)

### Opening Keyframe (Scene 1 — The Hook)

The opening keyframe must show action ALREADY IN PROGRESS. No calm setup.

```
{style_prefix}

{beat_1.description}

{protagonist.appearance} caught mid-action.

This is the OPENING FRAME. The conflict has already begun.
We are joining a confrontation already in progress.
Tension is already high.

Mood: {setting.atmosphere}
Portrait orientation, 9:16 aspect ratio.
```

**Example:**
```
Cinematic still, photorealistic, shot on 35mm film, shallow depth of field, 
dramatic lighting, film grain, tense atmosphere

Elena, mid-30s, dark hair pulled back tight, cream silk blouse, slams a 
photograph onto a granite kitchen counter. Her expression is controlled rage.

This is the OPENING FRAME. The conflict has already begun.
We are joining a confrontation already in progress.
Tension is already high.

Mood: Tense, claustrophobic, nowhere to hide.
Portrait orientation, 9:16 aspect ratio.
```

### Scene Change Keyframe

If a beat has `scene_change: true`:

```
{style_prefix}

{scene_change_beat.description}

{relevant_character.appearance} in the new location.

This is a scene transition. New location, but tension carries forward.
Match the visual style established in reference images.

Portrait orientation, 9:16 aspect ratio.
```

---

## 4. Video Generation (Veo 3.1)

### Per-Scene Reference Generation

Veo 3.1 accepts max 3 reference images. For scenes with 3+ characters, we use Nano Banana to generate scene-specific refs first.

```
For each shot:

Step 1: SELECT from moodboard
        → Characters in this scene + location for this scene

Step 2: NANO BANANA generates 3 scene refs
        Input: Selected chars + location (can be 5+ images)
        Output: 3 scene-specific reference images

Step 3: VEO 3.1 animates
        Input: 3 scene refs + shot prompt
        Output: 8-second video clip
```

### Scene Reference Prompt (Nano Banana)

```
Generate 3 reference images for this scene.

SCENE HEADING: {scene.scene_heading}

DESCRIPTION:
{scene.description}

CHARACTERS PRESENT:
{for char_id in scene.characters_in_scene: characters[char_id].name - characters[char_id].appearance}

ACTION:
{scene.action}

Generate:
- Image 1: Wide establishing shot of the scene
- Image 2: Character interaction focus
- Image 3: Key moment or emotional detail

Maintain character appearances precisely from references.
Style: {user_style}
Aspect ratio: 9:16 portrait
```

### Video Generation (Veo)

```python
video = client.models.generate_videos(
    model="veo-3.1-generate-preview",
    prompt=shot_prompt,
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
```

### Shot Prompt Template

```
{scene.scene_heading}

SETTING:
{scene.description}

CHARACTERS:
{for char_id in scene.characters_in_scene: characters[char_id].name (characters[char_id].appearance)}

ACTION:
{scene.action}

DIALOGUE:
{for line in scene.dialogue: line.character + ": " + line.line}

CAMERA:
{shot_type}, {angle}, {movement}

SOUND:
{ambient}. {tension_building_audio}.

STYLE: {user_style} — tense, emotionally charged
```

### Beat-to-Cinematography Mapping

| Scene | Beat Type | Shot | Movement | Energy |
|-------|-----------|------|----------|--------|
| 1 | HOOK | Medium/MCU | Push in or static | High — hit ground running |
| 2-3 | RISE | MCU/CU alternating | Slow push, static | Building — escalate |
| 4-5 | SPIKE | CU/ECU | Push in tight | Peak — maximum intensity |
| 6-7 | DROP | MCU pulling back | Slow pull back | Sinking — consequence |
| 8 | CLIFF | Wide or CU (contrast) | Static, then hard cut | Shock — freeze moment |

### Full Example: "The Other Wife" — All 8 Shot Prompts

**Shot 1 (HOOK):**
```
INT. KITCHEN - NIGHT

SETTING:
Harsh overhead light floods the modern kitchen. A photograph lies on the granite counter. Elena stands rigid, her knuckles white against the stone.

CHARACTERS:
Elena (mid-30s, dark hair pulled back, cream silk blouse, mascara smudged)
Marcus (late 30s, gray suit, loosened tie, gold wedding band)

ACTION:
Elena slams the photograph down. Marcus freezes, his hand hovering over his wine glass.

DIALOGUE:
Elena: "Who is she, Marcus?"

CAMERA:
Medium close-up on Elena, eye level, slow push in

SOUND:
Photo slapping counter. Tense silence. Distant hum of refrigerator.

STYLE: Cinematic — tense, claustrophobic, dramatic lighting
```

**Shot 2 (RISE):**
```
INT. KITCHEN - NIGHT

SETTING:
The wine glass trembles in Marcus's grip. Elena's eyes are red but her voice is steady — dangerously steady.

CHARACTERS:
Elena (mid-30s, dark hair pulled back, cream silk blouse, mascara smudged)
Marcus (late 30s, gray suit, loosened tie, composure cracking)

ACTION:
She laughs bitterly, the sound hollow in the silent kitchen.

DIALOGUE:
Marcus: "Where did you get that?"
Elena: "Your gym bag. The one you told me not to touch. Eleven years, Marcus."

CAMERA:
Medium close-up on Marcus, eye level, static

SOUND:
His voice tight. Her bitter laugh. Tension building.

STYLE: Cinematic — trapped, exposed
```

**Shot 3 (RISE):**
```
INT. KITCHEN - NIGHT

SETTING:
Marcus steps toward her, his composure cracking. Elena backs against the counter, trapped.

CHARACTERS:
Elena (mid-30s, dark hair pulled back, cream silk blouse, mascara smudged)
Marcus (late 30s, gray suit, loosened tie, desperation showing)

ACTION:
He reaches for her arm. She jerks away violently. Her voice breaks on the last word.

DIALOGUE:
Marcus: "Elena, let me explain—"
Elena: "Explain the matching rings? Explain the CHILD?"

CAMERA:
Two-shot, medium, static then slight pan as she jerks away

SOUND:
Movement. Her voice cracking. Emotional crescendo.

STYLE: Cinematic — the gap between them widening
```

**Shot 4 (SPIKE):**
```
INT. KITCHEN - NIGHT

SETTING:
Close on the photograph. A woman. A child. A family portrait that isn't theirs. Elena flips it over with trembling fingers.

CHARACTERS:
Elena (mid-30s, dark hair pulled back, cream silk blouse)
Marcus (late 30s, gray suit, face crumbling)

ACTION:
Handwriting on the back catches the light. Marcus's face crumbles as he reads it.

DIALOGUE:
Elena: "'To Daddy, love always, Sophie. Age 6.'"
Marcus: "..."

CAMERA:
Close-up on photo flipping, then push to extreme close-up on Marcus's face

SOUND:
Paper turning. Silence. His breath catching.

STYLE: Cinematic — the moment of destruction
```

**Shot 5 (SPIKE):**
```
INT. KITCHEN - NIGHT

SETTING:
Elena's rage transforms. The heat drains from her face, replaced by something colder. More dangerous.

CHARACTERS:
Elena (mid-30s, dark hair pulled back, expression ice cold)
Marcus (late 30s, gray suit, defeated)

ACTION:
She slowly slides off her wedding ring. Places it on the counter with a soft click that echoes.

DIALOGUE:
Elena: "Six years old. You've been lying to me... for six years."

CAMERA:
Close-up on Elena's hand removing ring, push to her cold expression

SOUND:
Ring clicking on granite. Her voice flat, dead.

STYLE: Cinematic — cold fury
```

**Shot 6 (DROP):**
```
INT. KITCHEN - NIGHT

SETTING:
The wedding ring sits between them on the cold granite. Marcus's carefully constructed world is collapsing.

CHARACTERS:
Marcus (late 30s, gray suit, desperate)
Elena (mid-30s, dark hair pulled back, trembling with controlled rage)

ACTION:
He steps forward, hands raised in desperate supplication. Her hand shakes as she grips the counter edge.

DIALOGUE:
Marcus: "I was going to tell you. I was trying to find the right—"
Elena: "The right time to destroy my life?"

CAMERA:
Medium close-up, slight pull back as power shifts

SOUND:
His desperate words. Her cutting response.

STYLE: Cinematic — he's losing her
```

**Shot 7 (DROP):**
```
INT. KITCHEN - NIGHT

SETTING:
Elena's keys glint on the counter. Her purse hangs by the door. An escape route.

CHARACTERS:
Elena (mid-30s, gathering herself to leave)
Marcus (late 30s, following helplessly)

ACTION:
She snatches her keys. He steps toward her, blocking her path.

DIALOGUE:
Marcus: "Where are you going?"
Elena: "..."

CAMERA:
Medium shot, tracking her movement toward exit

SOUND:
Keys jingling. Footsteps. No answer.

STYLE: Cinematic — she's leaving, he's powerless
```

**Shot 8 (CLIFF):**
```
INT. KITCHEN - NIGHT

SETTING:
Silence. Then — a phone buzzes on the counter. The screen lights up the dark kitchen. A name. A heart emoji.

CHARACTERS:
Elena (mid-30s, frozen by the door)
Marcus (late 30s, frozen by the counter)

ACTION:
They both freeze. The phone keeps buzzing. JESSICA ❤️ calling. Elena's eyes lock onto Marcus.

DIALOGUE:
Elena: "Answer it."

CAMERA:
Close-up on phone screen, then wide shot of both frozen, then close on Elena's face

SOUND:
Phone buzzing. HARD CUT before he responds.

STYLE: Cinematic — the worst unanswered question
```

**CRITICAL: Shot 8 ends on "Answer it." — HARD CUT TO BLACK. No response. No resolution.**

---

## Style Variations

### 3D Animated — Shot 4 (Spike):

```
INT. STYLIZED KITCHEN - NIGHT

SETTING:
A stylized modern kitchen with bold colors and clean geometry. Dramatic top-lighting casts sharp shadows. Everything has that Pixar-quality polish.

CHARACTERS:
Elena (3D stylized, expressive eyes, exaggerated emotions)
Marcus (3D stylized, face designed for maximum emotional range)

ACTION:
She flips the photo with trembling stylized hands. Marcus's face transforms — his eyes widen, his jaw drops, his whole posture crumbles.

DIALOGUE:
Elena: "'To Daddy, love always, Sophie. Age 6.'"
Marcus: "..."

CAMERA:
Close-up on photo, push to his devastated expression

SOUND:
Paper rustle. Emotional musical sting.

STYLE: 3D Animated, Pixar-style — maximum emotional impact
```

### 2D Animated — Shot 8 (Cliff):

```
INT. GRAPHIC KITCHEN - NIGHT

SETTING:
Bold flat colors. Dramatic shadows cut across the scene like a graphic novel. The kitchen rendered in striking 2D illustration style.

CHARACTERS:
Elena (bold linework, expressive illustrated eyes)
Marcus (frozen in graphic composition)

ACTION:
The phone buzzes. The screen illuminates in stark contrast: 'JESSICA ❤️.' Elena's illustrated eyes narrow dangerously.

DIALOGUE:
Elena: "Answer it."

CAMERA:
Close-up on phone, wide shot of both characters frozen

SOUND:
Stylized phone buzz. Silence.

STYLE: 2D Animated — bold, graphic, HARD CUT at peak tension
```

---

## Prompt Debugging

### If tension feels flat:
Add to prompt:
```
TENSION LOCK: Every moment must feel like something could break.
No comfortable pauses. No resolution. Escalate constantly.
```

### If dialogue feels expository:
Remove and rephrase. Instead of explaining, ACCUSE:
```
BAD: "I found evidence that you have another family."
GOOD: "Who is she, Marcus?"
```

### If ending resolves too much:
```
CLIFF REQUIREMENT: End MID-MOMENT. 
The phone is ringing. She said "Answer it."
CUT BEFORE HE RESPONDS. No resolution.
```

### If character looks inconsistent:

**Check the two-stage pipeline:**

1. Are all relevant character refs being passed to Nano Banana?
```python
# For a scene with Elena, Marcus, Detective Ray
char_refs = [elena_img, marcus_img, detective_ray_img, location_img]

scene_refs = generate_images(
    prompt=scene_prompt,
    reference_images=char_refs  # All chars + location
)
```

2. Are the 3 scene refs being passed to Veo?
```python
reference_images=[
    {"image": scene_refs[0], "reference_type": "asset"},
    {"image": scene_refs[1], "reference_type": "asset"},
    {"image": scene_refs[2], "reference_type": "asset"}
]
```

3. Add character lock to prompts if still drifting:
```
CHARACTER LOCK:
- Elena: dark hair pulled back, cream silk blouse, smudged mascara
- Marcus: gray suit, loosened tie, wedding band
These details must appear in EVERY shot.
```

**Common causes:**
- Wrong characters passed to Nano Banana for that scene
- Scene ref prompt doesn't emphasize character consistency
- Moodboard character refs weren't properly approved

---

## Quick Reference

### The Formula (INTERNAL ONLY — Never Show Users)

| Time | Beat | Purpose |
|------|------|---------|
| 0:00-0:05 | HOOK | Start mid-explosion |
| 0:05-0:20 | RISE | Escalate through conflict |
| 0:20-0:35 | SPIKE | Deliver dopamine hit |
| 0:35-0:50 | DROP | Show aftermath, deepen tension |
| 0:50-0:60 | CLIFF | Worse unanswered question, HARD CUT |

### Story Rules Checklist

- [ ] Opens mid-action (no setup)
- [ ] No exposition or backstory
- [ ] Every line increases tension
- [ ] Spike delivers clear emotional payoff
- [ ] Cliff creates WORSE question than start
- [ ] Ends BEFORE resolution
- [ ] Hard cut at the end

### Video Generation Checklist

- [ ] Each beat has `characters_in_scene` and `location_id` specified
- [ ] Correct character refs selected for each scene (from approved moodboard)
- [ ] Nano Banana receives all chars + location for scene
- [ ] Nano Banana outputs 3 scene-specific refs
- [ ] Veo receives exactly 3 scene refs
- [ ] Hard cuts between all shots (no crossfades)
