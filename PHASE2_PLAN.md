# Phase 2: Visuals Redesign Plan

> Saved from plan mode to survive context compaction. Phase 1 (Script Stage Overhaul) is COMPLETE.

---

## Phase 1 Completed Summary

All done:
- Removed "Insert Your Script" tab from left pane
- Renamed Assets → World in right pane tab
- Added Visual Style chip selector to left pane (locks after script gen)
- Removed role from story dashboard (CharacterCard + CharacterModal `hideRole` prop)
- Enforced story association (non-dismissible StoryPickerModal on mount)
- Built CharacterLocationPicker component (style-filtered, role dropdowns, legacy style normalization)
- Backend: PreSelectedCharacter/Location models, prompt engineering with pre-selected chars/loc injection, origin field, 1-location enforcement
- World tab: Library badge on story-origin chars, Edit hidden for them, name-change propagation to dialogue
- Frontend sends `characters` and `location` arrays in generate/regenerate requests

---

## Phase 2: Visuals Redesign

### 2.1 Sub-tab Navigation

**File**: `frontend/app/create-episode/page.tsx`

Replace `VisualStep = "characters" | "setting" | "key_moment"` and `MoodboardStep = "protagonist" | "full"` with:
```typescript
type VisualsSubTab = "characters" | "locations" | "scenes";
```

Remove: `protagonistImage`, `protagonistLocked`, `isGeneratingProtagonist`, `protagonistFeedback`, `protagonistError`, `moodboardStep` state and all associated handlers (`generateProtagonistImage`, `refineProtagonistImage`, `approveProtagonist`).

**New component**: `frontend/app/create-episode/components/VisualsStage.tsx` — container component for the 3 sub-tabs. Receives story, characterImages, locationImages, sceneImages state + callbacks.

**Breadcrumb navigation UI** (per visuals.png design):
- "Your Characters" > "Your Locations" > "Your Scenes"
- Active tab: `bg-[#B8B6FC] text-black` circle + white text
- Completed tab: green checkmark circle
- Inactive: `bg-[#262626]` circle + dim text
- "< Back to Create Your Script" link at bottom-left

### 2.2 Characters Sub-tab

**New file**: `frontend/app/create-episode/components/VisualsCharactersTab.tsx`

**Layout**: Grid of character cards (responsive 2-4 columns)

**Story-origin chars** (`origin === "story"`):
- Show existing image (from story library) or placeholder
- On hover: grey overlay with `backdrop-blur-sm`, edit icon button
- Click edit → opens `CharacterModal` with `readOnlyFields: ["name", "age"]`, `lockedStyle: style`
- Changes propagate to story via `updateStoryCharacter(storyId, charId, data)` from `frontend/lib/api/creator.ts`
- Name/age disabled because they're baked into the approved script

**AI-origin chars** (`origin === "ai"`):
- Show green "Generate Character" button if no image yet
- Click → opens `CharacterModal` with all fields editable, `lockedStyle: style`
- "Save to Story" button: calls `createStoryCharacter(storyId, data)` to persist to library

**CharacterModal updates** (`frontend/app/components/creator/CharacterModal.tsx`):
- Add props: `readOnlyFields?: string[]`, `lockedStyle?: string`
- When `readOnlyFields` includes "name"/"age", render those inputs as disabled
- When `lockedStyle` provided, hide style selector and force that style

**Protagonist-first flow change**: Instead of a separate protagonist step, the Characters sub-tab generates the protagonist image first (as style anchor), then generates remaining chars in parallel — same underlying API calls (`/moodboard/generate-protagonist`, `/moodboard/generate-character`) but triggered sequentially within one UI.

### 2.3 Locations Sub-tab

**New file**: `frontend/app/create-episode/components/VisualsLocationsTab.tsx`

Same pattern as characters. Since 1 location per episode (R5), typically shows 1 card. Story-origin locations get edit overlay, AI locations get generate button. Uses existing `/moodboard/generate-location` endpoint.

### 2.4 Scenes Sub-tab (Replaces Key Moments)

**New backend endpoint**: `POST /story/generate-scene-descriptions`

**File**: `backend/app/routers/story.py`

```python
class SceneDescription(BaseModel):
    scene_number: int
    title: str
    visual_description: str  # 1-2 line visual description for imagen

# Takes approved story, returns 8 scene descriptions
```

Prompt: Take the finalized 8 scenes from the approved script and generate a concise 1-2 line cinematic visual description for each, suitable for image generation.

**New file**: `frontend/app/create-episode/components/VisualsScenesTab.tsx`

**Layout**: 4x2 grid of scene cards (per scenes.png design)

Each card:
- Scene image (9:16 aspect ratio)
- "Scene X: [Title]" heading
- 1-2 line visual description text
- Feedback text input
- "Refine This Shot" button (shown when feedback is entered)

**Flow**:
1. On entering "Your Scenes" tab → auto-call `/story/generate-scene-descriptions`
2. Once descriptions arrive → generate images for all 8 scenes in parallel using existing imagen pipeline
3. Each scene image uses: scene description + character references + location reference
4. User reviews, provides feedback, refines individual shots
5. "Approve & Continue" → proceeds to pre-flight/film stage

**State**:
```typescript
interface SceneImageState {
  image: MoodboardImage | null;
  description: string;
  isGenerating: boolean;
  feedback: string;
  error: string;
}
const [sceneImages, setSceneImages] = useState<Record<number, SceneImageState>>({});
```

**Remove**: All `keyMoment` state + handlers + UI. The key moment step is fully replaced by the 8-scene storyboard.

### 2.5 Style Enforcement in Visuals

- Style is locked from Phase 1 (set during idea input)
- `CharacterModal` receives `lockedStyle` prop — hides style selector, forces selected style
- New AI chars inherit the episode style
- `LocationModal` same treatment

### 2.6 Film Stage Integration

- Update `buildApprovedVisuals()`: build from `characterImages` + `locationImages` (no more separate `protagonistImage`)
- Update `startFilmGeneration()` guard: require scene images instead of key moment
- The approved scene images serve as visual storyboard; film generation still uses its own Nano Banana scene refs per shot
- Remove key_moment references from `buildSnapshot()`, `restoreGeneration()`, cost tracking

---

## Files Summary

### To Modify
| File | Changes |
|------|---------|
| `frontend/app/create-episode/page.tsx` | Visuals state overhaul: replace VisualStep/MoodboardStep with VisualsSubTab, remove protagonist-first flow, remove keyMoment state, add sceneImages state, update buildApprovedVisuals, update startFilmGeneration guard |
| `frontend/app/components/creator/CharacterModal.tsx` | Add `readOnlyFields`, `lockedStyle` props |
| `frontend/app/components/creator/LocationModal.tsx` | Add `readOnlyFields`, `lockedStyle` props |
| `backend/app/routers/story.py` | Add scene descriptions endpoint |

### To Create
| File | Purpose |
|------|---------|
| `frontend/app/create-episode/components/VisualsStage.tsx` | Container for visuals sub-tabs |
| `frontend/app/create-episode/components/VisualsCharactersTab.tsx` | Characters sub-tab in visuals |
| `frontend/app/create-episode/components/VisualsLocationsTab.tsx` | Locations sub-tab in visuals |
| `frontend/app/create-episode/components/VisualsScenesTab.tsx` | Scenes sub-tab replacing key moments |

---

## Verification (Phase 2)

1. Approve script → "Build Your Visuals" shows sub-tabs: Your Characters > Your Locations > Your Scenes
2. Characters tab: story chars have grey edit overlay, AI chars have green Generate button
3. Generate char images → protagonist first (style anchor), then rest in parallel
4. Save AI char to story → verify appears in story dashboard
5. Locations tab: generate location image
6. Scenes tab: auto-generates 8 descriptions + 8 images
7. Refine individual scene shots with feedback
8. Approve → proceeds to film generation (no key moment step)
9. Verify old generations (with key moments) still load correctly

---

## Design References

- `ai-video/designs/Main page.png` — Three-pane layout with Script/World tabs
- `ai-video/designs/world_tab.png` — Characters with role labels, locations, visual style
- `ai-video/designs/visuals.png` — Character grid with "Generate Character" button, sub-tab nav
- `ai-video/designs/scenes.png` — 4x2 grid of scene cards with images, descriptions, "Refine This Shot"
- `ai-video/Founders' Playbook (1).pdf` — 8-scene structural blueprint, Vibe Application Rules
