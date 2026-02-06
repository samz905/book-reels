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
  
  "setting": {
    "location": "Specific location",
    "time": "Time of day / lighting",
    "atmosphere": "Tense, charged, intimate, etc."
  },
  
  "beats": [
    {
      "beat_number": 1,
      "time_range": "0:00-0:08",
      "description": "1-2 sentences. Action/dialogue already in progress. What we SEE and HEAR.",
      "scene_change": false
    }
  ]
}

Remember:
- 8 scenes total
- Each scene = one 8-second video shot (trimmed in assembly)
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
  
  "setting": {
    "location": "Modern kitchen, granite countertops, wine glass on counter",
    "time": "Night, harsh overhead lighting",
    "atmosphere": "Tense, claustrophobic, nowhere to hide"
  },
  
  "beats": [
    {
      "beat_number": 1,
      "time_range": "0:00-0:05",
      "description": "Elena slams a photograph on the counter. 'Who is she, Marcus?' Her voice shakes with controlled rage. He freezes mid-reach for his wine.",
      "scene_change": false
    },
    {
      "beat_number": 2,
      "time_range": "0:05-0:12",
      "description": "Marcus: 'Where did you get that?' Elena: 'Your gym bag. The one you told me not to touch.' She laughs bitterly. 'Eleven years.'",
      "scene_change": false
    },
    {
      "beat_number": 3,
      "time_range": "0:12-0:20",
      "description": "He reaches for her arm. 'Elena, let me explain—' She jerks away. 'Explain the matching rings? Explain the CHILD?' Her voice breaks.",
      "scene_change": false
    },
    {
      "beat_number": 4,
      "time_range": "0:20-0:27",
      "description": "She flips the photo over. On the back, handwritten: 'To Daddy, love always, Sophie. Age 6.' Marcus's face crumbles. He has no words.",
      "scene_change": false
    },
    {
      "beat_number": 5,
      "time_range": "0:27-0:35",
      "description": "Elena's rage turns cold. 'Six years old. You've been lying to me... for six years.' She slides off her wedding ring. Places it on the counter.",
      "scene_change": false
    },
    {
      "beat_number": 6,
      "time_range": "0:35-0:42",
      "description": "Marcus: 'I was going to tell you. I was trying to find the right—' Elena: 'The right time to destroy my life?' Her hand shakes.",
      "scene_change": false
    },
    {
      "beat_number": 7,
      "time_range": "0:42-0:50",
      "description": "She grabs her keys from the counter. He steps toward her. 'Where are you going?' She doesn't answer. Heads for the door.",
      "scene_change": false
    },
    {
      "beat_number": 8,
      "time_range": "0:50-0:60",
      "description": "His phone buzzes on the counter. They both freeze. The screen lights up: 'JESSICA ❤️ calling.' Elena looks at him. 'Answer it.'",
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

### Frame Chaining Strategy

```
Shot 1: first_frame = opening keyframe
Shot 2: first_frame = last frame of Shot 1
Shot 3: first_frame = last frame of Shot 2
Shot 4: first_frame = last frame of Shot 3
Shot 5: first_frame = last frame of Shot 4
Shot 6: first_frame = last frame of Shot 5
Shot 7: first_frame = last frame of Shot 6
Shot 8: first_frame = last frame of Shot 7
```

### Shot Prompt Template

```
SCENE:
{beat.description}
Location: {setting.location}
Time: {setting.time}

CAMERA:
{shot_type}, {angle}, {movement}

SUBJECT:
{character.name} ({character.appearance_brief})
Action: {single_action}

DIALOGUE: "{exact_dialogue_if_any}"

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

### Full Example: "The Other Wife" — All 8 Shots

**Shot 1 (HOOK):**
```
SCENE:
Elena slams a photograph on the granite counter. 'Who is she, Marcus?' 
Her voice shakes with controlled rage. He freezes mid-reach for his wine.
Location: Modern kitchen, harsh overhead lighting
Time: Night

CAMERA:
Medium close-up on Elena, eye level, slow push in

SUBJECT:
Elena (mid-30s, dark hair pulled back, cream silk blouse, mascara smudged)
Action: Slams photo down, confronts Marcus

DIALOGUE: "Who is she, Marcus?"

SOUND:
Photo slapping counter. Tense silence. Distant hum of refrigerator.

STYLE: Cinematic — tense, claustrophobic, dramatic lighting
```

**Shot 2 (RISE):**
```
SCENE:
Marcus: 'Where did you get that?' Elena: 'Your gym bag. The one you told 
me not to touch.' She laughs bitterly. 'Eleven years.'
Location: Kitchen, same space
Time: Night

CAMERA:
Medium close-up on Marcus, eye level, static

SUBJECT:
Marcus (late 30s, gray suit, loosened tie, composure cracking)
Action: Defensive, caught off guard, reaching for control

DIALOGUE: "Where did you get that?"

SOUND:
His voice tight. Her bitter laugh. Tension building.

STYLE: Cinematic — trapped, exposed
```

**Shot 3 (RISE):**
```
SCENE:
He reaches for her arm. 'Elena, let me explain—' She jerks away. 
'Explain the matching rings? Explain the CHILD?' Her voice breaks.
Location: Kitchen
Time: Night

CAMERA:
Two-shot, medium, static then slight pan as she jerks away

SUBJECT:
Marcus reaching, Elena recoiling
Action: He reaches, she pulls away violently

DIALOGUE: "Elena, let me explain—" / "Explain the matching rings? Explain the CHILD?"

SOUND:
Movement. Her voice cracking. Emotional crescendo.

STYLE: Cinematic — the gap between them widening
```

**Shot 4 (SPIKE):**
```
SCENE:
She flips the photo over. On the back, handwritten: 'To Daddy, love always, 
Sophie. Age 6.' Marcus's face crumbles. He has no words.
Location: Kitchen
Time: Night

CAMERA:
Close-up on photo flipping, then push to extreme close-up on Marcus's face

SUBJECT:
The photo, then Marcus's reaction
Action: Photo reveals the truth. His face breaks.

DIALOGUE: None. The photo speaks.

SOUND:
Paper turning. Silence. His breath catching.

STYLE: Cinematic — the moment of destruction
```

**Shot 5 (SPIKE):**
```
SCENE:
Elena's rage turns cold. 'Six years old. You've been lying to me... 
for six years.' She slides off her wedding ring. Places it on the counter.
Location: Kitchen
Time: Night

CAMERA:
Close-up on Elena's hand removing ring, push to her cold expression

SUBJECT:
Elena (rage crystallizing into something colder)
Action: Removes wedding ring, sets it down deliberately

DIALOGUE: "Six years old. You've been lying to me... for six years."

SOUND:
Ring clicking on granite. Her voice flat, dead.

STYLE: Cinematic — cold fury
```

**Shot 6 (DROP):**
```
SCENE:
Marcus: 'I was going to tell you. I was trying to find the right—' 
Elena: 'The right time to destroy my life?' Her hand trembles.
Location: Kitchen
Time: Night

CAMERA:
Medium close-up, slight pull back as power shifts

SUBJECT:
Marcus crumbling, desperate
Action: He pleads, she dismisses

DIALOGUE: "I was going to tell you—" / "The right time to destroy my life?"

SOUND:
His desperate words. Her cutting response.

STYLE: Cinematic — he's losing her
```

**Shot 7 (DROP):**
```
SCENE:
Elena grabs her keys from the counter. Marcus steps toward her. 
'Where are you going?' She doesn't answer. Moves toward the door.
Location: Kitchen
Time: Night

CAMERA:
Medium shot, tracking her movement toward exit

SUBJECT:
Elena gathering herself, Marcus following
Action: She takes keys, heads for door, ignores him

DIALOGUE: "Where are you going?"

SOUND:
Keys jingling. Footsteps. No answer.

STYLE: Cinematic — she's leaving, he's powerless
```

**Shot 8 (CLIFF):**
```
SCENE:
His phone buzzes on the counter. They both freeze. The screen lights up: 
'JESSICA ❤️ calling.' Elena looks at him. 'Answer it.'
Location: Kitchen
Time: Night

CAMERA:
Close-up on phone screen, then wide shot of both frozen, then CU Elena's face

SUBJECT:
The phone, then both characters, then Elena's expression
Action: Phone rings. They freeze. She challenges him.

DIALOGUE: "Answer it."

SOUND:
Phone vibrating on granite. Ringtone cutting through silence.

STYLE: Cinematic — frozen moment, HARD CUT before he responds
```

**CRITICAL: Shot 8 ends on "Answer it." — HARD CUT TO BLACK. No response. No resolution.**

---

## Style Variations

### 3D Animated — Shot 4 (Spike):

```
SCENE:
She flips the photo. The back reads: 'To Daddy, love always, Sophie. Age 6.' 
His stylized face crumbles, eyes wide with the horror of being caught.
Location: Stylized modern kitchen
Time: Night, dramatic lighting

CAMERA:
Close-up on photo, push to his devastated expression

SUBJECT:
Marcus (3D stylized, expressive features, exaggerated emotional reaction)
Action: Realization hits, face falls

DIALOGUE: None.

SOUND:
Paper rustle. Emotional musical sting.

STYLE: 3D Animated, Pixar-style — maximum emotional impact
```

### 2D Animated — Shot 7 (Cliff):

```
SCENE:
His phone buzzes. Bold graphic lighting as the screen illuminates: 
'JESSICA ❤️.' Elena's illustrated eyes narrow. 'Answer it.'
Location: Graphic kitchen, bold shadows
Time: Night, dramatic flat lighting

CAMERA:
Close-up on phone, wide shot, her expression in bold lines

SUBJECT:
Phone, then both characters frozen in graphic composition
Action: Phone lights up, she challenges

DIALOGUE: "Answer it."

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
```
CHARACTER LOCK:
- Elena: dark hair pulled back, cream silk blouse, smudged mascara
- Marcus: gray suit, loosened tie, wedding band
These details must appear in EVERY shot.
```

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

### Rules Checklist

- [ ] Opens mid-action (no setup)
- [ ] No exposition or backstory
- [ ] Every line increases tension
- [ ] Spike delivers clear emotional payoff
- [ ] Cliff creates WORSE question than start
- [ ] Ends BEFORE resolution
- [ ] Hard cut at the end
