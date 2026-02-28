# Final Feedback v3 — Progress Tracker

> **Source**: `Final feedback v3.pdf`
> **Created**: 2026-02-27
> **Purpose**: Independent reference for implementing all feedback items. Survives context resets.

---

## EPISODE CREATION

### EC-1: Modal button text — "Generate" vs "Regenerate with AI"
- [x] **Done**
- **What**: If a character or location already has an image, the modal button should say "Regenerate with AI". Only show "Generate with AI" if there's no image.
- **Files**:
  - `frontend/app/components/creator/CharacterModal.tsx:447` — currently hardcoded `"Generate with AI"`
  - `frontend/app/components/creator/LocationModal.tsx:395` — currently hardcoded `"Generate with AI"`
- **How**: Both modals receive the existing character/location data. Check if `imageUrl` or `imageBase64` is truthy. If so, render "Regenerate with AI"; otherwise "Generate with AI".

---

### EC-2: Library reference images for generation
- [ ] **Done**
- **What**: Add ability to use chars/locs from the library as a reference image while generating. There was a dropdown for choosing from library before.
- **Files**:
  - `frontend/app/components/creator/CharacterModal.tsx` — needs dropdown to select library char as reference
  - `frontend/app/components/creator/LocationModal.tsx` — same for locations
  - `backend/app/routers/asset_gen.py:96-132` — `generate_character` already supports `reference_image` in request body
  - `backend/app/routers/asset_gen.py:135+` — `generate_location` already supports `reference_image` (though currently unused)
- **How**: Add a "Use reference from library" dropdown in modals. When selected, pass the library item's image as `reference_image` to the backend. Backend already handles ref images — `asset_gen.py:100` switches prompt to "Match the visual style of the reference image exactly."

---

### EC-3: Upload reference image for AI generation
- [ ] **Done**
- **What**: Add ability to upload a reference image for AI to use as a style reference (separate from uploading an image directly for that char/loc).
- **Files**:
  - `frontend/app/components/creator/CharacterModal.tsx` — needs file upload UI for reference image
  - `frontend/app/components/creator/LocationModal.tsx` — same
- **How**: Add a file input labeled "Upload reference image" that converts to base64 and sends as `reference_image` in the generation request. This is different from the existing "upload image" which sets the char/loc image directly. The reference image is only used as AI input.

---

### EC-4: Remove image prompt and regen notes from script editing
- [x] **Done**
- **What**: Remove the "Image Prompt" and "Regenerate Notes" collapsible sections from the script scene editing view.
- **Files**:
  - `frontend/app/create-episode/page.tsx:3930-3951` — two `<details>` blocks: "Image Prompt" (lines 3930-3940) and "Regenerate Notes" (lines 3941-3951)
- **How**: Delete those two `<details>` blocks entirely. The `image_prompt` and `regenerate_notes` fields can stay in the data model — just remove them from the edit UI.

---

### EC-5: BIG CHANGE — Remove char/loc selector from left panel; AI uses library
- [ ] **Done**
- **What**: Remove the `CharacterLocationPicker` from the left panel "Idea" section. Instead, AI should automatically have access to the story's library chars/locs and intelligently select/create from them.
- **Current state**:
  - `frontend/app/create-episode/page.tsx:3591-3601` — `<CharacterLocationPicker>` component in left panel
  - `frontend/app/create-episode/components/CharacterLocationPicker.tsx` — the picker component
  - `frontend/app/create-episode/page.tsx:319` — `storyLibraryChars`/`storyLibraryLocs` state
  - Backend story generation receives `selected_characters` and `selected_location` in the request
- **How**:
  1. Remove `<CharacterLocationPicker>` from the left panel UI
  2. Instead, when generating a script, send ALL story library chars/locs to the AI prompt so it can choose/create intelligently
  3. AI-selected chars from the library should appear in both World tab AND Visuals tab
  4. **Critical**: Use unique IDs (DB UUIDs) for matching, not just names. If AI picks a library char, it should reference the library UUID. If AI creates a new char, it gets a new temp ID.
  5. Handle duplicate names gracefully: if AI creates a char with the same name as a library char, don't break the flow — treat them as the same entity and use the library version's image.
- **Backend changes**: Story generation prompt (`backend/app/prompts/story_system.py`) needs to receive library chars/locs as context. The backend route needs to accept full library data.
- **MEMORY NOTE**: AI char IDs ≠ DB IDs. This is the root cause of past bugs. Always match by UUID when possible, fall back to case-insensitive name match.

---

### EC-6: BIG CHANGE — Enforce visual style at story level
- [ ] **Done**
- **What**: Visual style should be set once at the story level and enforced everywhere — episodes, chars, locs, all images.
- **Current state**:
  - `frontend/app/create-episode/page.tsx:3568-3589` — Visual Style selector in the episode creation left panel (per-episode)
  - `frontend/app/components/creator/CreateStoryModal.tsx` — NO visual style field currently
  - `frontend/app/components/creator/EditStoryModal.tsx` — NO visual style field currently
  - `frontend/app/components/creator/CharacterModal.tsx:61` — has its own `visualStyle` state + `VISUAL_STYLES` dropdown
  - `frontend/types/database.ts:313` — `stories` table already has `visual_style` column
  - `frontend/app/data/mockCreatorData.ts:102` — `VISUAL_STYLES` array defined here
- **How**:
  1. Add visual style picker to `CreateStoryModal.tsx` and `EditStoryModal.tsx` — make it a required field on story creation
  2. Remove the visual style selector from the episode creation left panel (`page.tsx:3568-3589`)
  3. Remove the visual style dropdown from `CharacterModal.tsx` — always use the story's style
  4. Episode creation reads `story.visual_style` and passes it everywhere
  5. All image generation (chars, locs, storyboards) uses the story-level style
  6. Add a note in the story creation modal: "This will dictate the visual style for all episodes under this Story"
  7. When creating new chars from story details page, don't show style option — use story's style
- **DB**: `stories.visual_style` column already exists. Just need to populate it on story creation.

---

### EC-7: Same-name char/loc switching in visuals step
- [ ] **Done**
- **What**: If multiple chars or locs share the same name (e.g., from library), AI picks one. In the visual step, let users switch between same-name alternatives.
- **Files**:
  - `frontend/app/create-episode/page.tsx` — Lookbook section (~line 4110+)
- **How**: In the Lookbook/Visuals tab, for each character/location, check if the story library has other entries with the same name. If so, show a small switcher (dropdown or thumbnail row) allowing the user to swap which image/entry is used. Only show this for names with duplicates.

---

### EC-8: Auto-trigger storyboard generation with images after loc step
- [ ] **Done**
- **What**: After the location step (Lookbook), automatically trigger storyboard generation including images (not just text descriptions). Show loader: "This could take 2-3 minutes."
- **Current state**:
  - `frontend/app/create-episode/page.tsx:4295` — Lookbook footer has an "Approve & Continue" button that goes to Storyboard tab
  - `frontend/app/create-episode/page.tsx:4398-4406` — Storyboard tab shows "No scene descriptions yet" with manual "Generate Storyboard" button
- **How**: When user clicks "Approve & Continue" from Lookbook, immediately trigger `fetchSceneDescriptions()` (which generates storyboard text + images). Show a loader with the message "This could take 2-3 minutes" instead of the empty state with manual button.

---

### EC-9: Remove arrows from episode number input
- [x] **Done**
- **What**: Remove the spinner/stepper arrows from the episode number `<input type="number">` in the episode creation modal.
- **Files**:
  - `frontend/app/components/creator/CreateEpisodeModal.tsx:111-124` — `<input type="number" ... className="w-24 h-14 ...">`
- **How**: Add CSS to hide the number input spinners. Use these classes:
  ```css
  /* Hide number input spinners */
  [type="number"]::-webkit-inner-spin-button,
  [type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  [type="number"] { -moz-appearance: textfield; }
  ```
  Can add via Tailwind `appearance-none` + `[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none` or via global CSS.

---

### EC-10: Clean up script edit dropdowns on Mac
- [x] **Done**
- **What**: The script edit section dropdowns look weird on Mac — need visual cleanup.
- **Files**:
  - `frontend/app/create-episode/page.tsx` — scene editing view, look for any `<select>` or native dropdown elements in the scene edit section
- **How**: Replace native `<select>` dropdowns with custom styled dropdowns that look consistent cross-platform. Use the same dark panel styling (`bg-[#262626]`, rounded, etc.) as other form elements.

---

### EC-11: Remove cost estimates from script and visuals buttons
- [x] **Done**
- **What**: Don't show cost (`~$0.05`, `~$0.02`) on the script and visuals buttons. Costs should only appear for the video part.
- **Files**:
  - `frontend/app/create-episode/page.tsx:3621` — `Generate Script ~$0.05`
  - `frontend/app/create-episode/page.tsx:4127` — `Generate All ~$${(needsGenCount * 0.02).toFixed(2)}`
  - `frontend/app/create-episode/page.tsx:4173` — `Retry ~$0.02`
  - `frontend/app/create-episode/page.tsx:4180` — `Generate ~$0.02`
  - `frontend/app/create-episode/page.tsx:4249` — `Retry ~$0.02` (locations)
  - `frontend/app/create-episode/page.tsx:4256` — `Generate ~$0.02` (locations)
  - `frontend/app/create-episode/page.tsx:4405` — `Generate Storyboard ~$0.05`
- **How**: Remove the `~$X.XX` suffix from all these button labels. Keep cost display only on video generation (`~$0.18 per clip` at line 5022).

---

### EC-12: Remove "Try these" section; fix empty script panel icon
- [x] **Done**
- **What**: (A) Remove the "Try these:" suggestion section from the script/idea area. (B) The empty script right panel shows a video icon — change to a script/document icon.
- **Files**:
  - `frontend/app/create-episode/page.tsx:3542-3562` — "Try these:" suggestions block
  - `frontend/app/create-episode/page.tsx:3666-3673` — Empty right panel with video camera SVG icon (path: `M15 10l4.553-2.276A1...`)
- **How**: (A) Delete lines 3542-3562. (B) Replace the video camera SVG at line 3668-3669 with a document/script icon SVG (e.g., a page with lines icon).

---

### EC-13: Add suggested word limit under script box
- [x] **Done**
- **What**: Add hint text under the script/idea textarea: "AI works best with 200-300 words"
- **Files**:
  - `frontend/app/create-episode/page.tsx` — find the idea `<textarea>` in the left panel
- **How**: Add a `<p className="text-[#ADADAD] text-xs mt-1.5">AI works best with 200-300 words</p>` below the textarea.

---

### EC-14: Protect saved chars/locs on regeneration; confirm before replacing library
- [ ] **Done**
- **What**: When regenerating chars/locs, don't replace the originally saved ones unless user clicks Save. Show a warning that saving will replace the library entry too. Add "Create New Character" / "Create New Location" CTA as alternative.
- **Files**:
  - `frontend/app/create-episode/page.tsx` — lookbook char/loc generation + save-to-library logic
  - `frontend/app/components/creator/CharacterModal.tsx` — save handler
  - `frontend/app/components/creator/LocationModal.tsx` — save handler
- **How**:
  1. When regenerating a char/loc image, keep the old image in state (don't overwrite until user confirms)
  2. Show the new generated image alongside the old one, let user choose
  3. On "Save to Library", show confirmation dialog: "This will replace the character/location saved in your library. Continue?"
  4. Add a "Create New Character" / "Create New Location" button as an alternative to replacing

---

### EC-15: Storyboard image history for regeneration
- [ ] **Done**
- **What**: When regenerating storyboard images, store the old ones and show them so user can pick any previous version. Show selected state with border + tick.
- **Files**:
  - `frontend/app/create-episode/page.tsx` — storyboard section, `sceneImages` state
  - `frontend/app/create-episode/page.tsx` — scene image regeneration flow
- **How**:
  1. Change `sceneImages` state to store an array of images per scene (history), plus a `selectedIndex`
  2. On regeneration, append new image to array instead of replacing
  3. Show all versions as thumbnails with the selected one having a purple border + checkmark
  4. User clicks a thumbnail to select it as the active storyboard image
  5. The selected image is what gets used for film generation

---

### EC-16: Rename "Lookbook" to "Your chars and loc" everywhere
- [x] **Done**
- **What**: Change all "Lookbook" text to "Your chars and loc" and keep "Storyboard" as-is.
- **Files**:
  - `frontend/app/create-episode/page.tsx:4082` — `{ lookbook: "Lookbook", scenes: "Storyboard" }` label map
  - `frontend/app/create-episode/page.tsx:4109` — comment `{/* ─── Lookbook ─── */}`
  - `frontend/app/create-episode/page.tsx:4295` — `{/* Lookbook footer navigation */}` comment
  - `frontend/app/create-episode/page.tsx:4416` — `"Go back to the Lookbook tab..."`
  - `frontend/app/create-episode/page.tsx:4426` — `"Go to Lookbook"` button text
- **How**: Replace "Lookbook" with "Your Chars & Locations" (or "Your chars and loc" as specified) in all user-facing text. Update comments too for consistency. Keep the internal `visualsTab === "lookbook"` key as-is to avoid breaking state persistence.

---

### EC-17: Green checkmarks for completed steps
- [x] **Done**
- **What**: The progress step checkmarks (tick icon for completed steps) should be green. Only green if completed and not currently active/in-progress.
- **Files**:
  - `frontend/app/create-episode/page.tsx:3469-3471` — step indicator circle styling. Currently uses `bg-[#9C99FF]` (purple) for both active and completed. The check (`✓`) shows for completed but same purple color.
- **How**: When `isCompleted && !step.active`, change the circle background to green (`bg-green-500` or `bg-emerald-500`) and text to white. Keep purple for active and unlocked-but-not-completed states.

---

## MISC

### M-1: Waitlist — show first name only
- [x] **Done**
- **What**: After entering the waitlist, show "You're on the list, [firstname]!" (first name only, not full name).
- **Files**:
  - `frontend/app/waitlist/page.tsx:31-35` — `displayName` uses `full_name` or `name` or email prefix
  - `frontend/app/waitlist/page.tsx:74` — `You're on the list, {displayName}!`
- **How**: Extract first name from `full_name`/`name` by splitting on space and taking `[0]`. E.g.:
  ```ts
  const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name || "";
  const displayName = fullName.split(" ")[0] || user?.email?.split("@")[0] || "there";
  ```

---

### M-2: Remove 5-second autoplay timer between videos
- [x] **Done**
- **What**: When watching episodes, the "Up Next" overlay with 5-second countdown should be removed — transition should be seamless (instant autoplay).
- **Files**:
  - `frontend/app/components/creator/FilmPreviewModal.tsx:25` — `countdown` state initialized to 5
  - `frontend/app/components/creator/FilmPreviewModal.tsx:38,63` — resets countdown to 5
  - `frontend/app/components/creator/FilmPreviewModal.tsx:71-82` — `handleVideoEnded` shows overlay, starts countdown
- **How**: In `handleVideoEnded`, skip the countdown entirely. Instead of showing the "Up Next" overlay and waiting 5 seconds, immediately call `onNextEpisode()` (or call it with a very brief delay like 200ms for smooth transition). Remove the countdown state/interval logic.

---

### M-3: Public creator profile — "Episodes 1-4 Free" instead of "1-2"
- [x] **Done**
- **What**: On the public creator profile, under a story, change "Episodes 1-2 Free" to "Episodes 1-4 Free".
- **Files**:
  - `frontend/app/components/public/PublicStoryCard.tsx:51` — `const freeCount = 2;` hardcoded
  - `frontend/app/components/public/PublicStoryCard.tsx:98` — `Episodes 1-{freeCount} Free`
- **How**: Change `const freeCount = 2;` to `const freeCount = 4;`. Ideally this should come from a config or the story data, but for now a hardcoded update is fine.

---

### M-4: Modal "Generate with AI" spinner overlays existing text
- [x] **Done**
- **What**: Clicking "Generate with AI" in any modal shows a processing spinner on top of existing content — looks bad with text visible behind it.
- **Files**:
  - `frontend/app/components/creator/CharacterModal.tsx` — generating state UI
  - `frontend/app/components/creator/LocationModal.tsx` — generating state UI
- **How**: When `isGenerating` is true, either: (A) replace the form content entirely with the spinner (not overlay), or (B) add a solid background to the spinner overlay (`bg-panel` or `bg-black/90`) so existing text is hidden. Option A (replace) is cleaner.

---

### M-5: Book description — 200 word limit, "read more", save bug
- [x] **Done**
- **What**: Three issues with book descriptions:
  1. Add 200 word limit to the description field
  2. Show description with "read more" if too long in the book display
  3. Fix: description entered in book modal doesn't save (disappears on save)
- **Files**:
  - `frontend/app/components/creator/AddBookModal.tsx` — book modal with description field
  - `frontend/app/components/creator/CreatorStoryCard.tsx:381` — displays `ebook.description`
  - `frontend/app/components/creator/CreatorStoryCard.tsx:439` — save handler sends `description: editingEbook.description`
  - API route for ebooks: check that `description` is included in the save payload and accepted by the API
- **How**:
  1. Add word count validation in `AddBookModal.tsx` (same pattern as story description — 200 word max)
  2. In `CreatorStoryCard.tsx:381`, wrap description in a "read more" component (line-clamp-3 with expand toggle)
  3. Debug the save flow: check if `description` field is being sent in the API call and if the API route includes it in the update. Likely the API route is missing `description` from `allowedFields`.

---

### M-6: Subscribe button — conditional display + dynamic price
- [ ] **Done**
- **What**: On public creator profile, subscribe button should only show if the creator has it activated. Also uses hardcoded `$9.99` — should use actually set price.
- **Files**:
  - `frontend/app/components/public/PublicProfileHeader.tsx:88-96` — subscribe button always shown, uses `subscriptionPrice` prop
  - `frontend/app/creator/[username]/page.tsx:225` — passes `creator.subscription.monthlyPrice`
- **How**:
  1. Add a check: only render subscribe button if creator has subscription enabled (e.g., `creator.subscription.isActive` or similar field)
  2. Ensure `monthlyPrice` comes from actual creator data, not a hardcoded default
  3. Check the data model / API to ensure subscription data is real, not mock

---

### M-7: Story cover image is required
- [x] **Done**
- **What**: Story cover image should be a required field when creating/saving a story.
- **Files**:
  - `frontend/app/components/creator/CreateStoryModal.tsx:74-100` — `handleSubmit` validates name, genres, description but NOT cover image
  - `frontend/app/components/creator/CreateStoryModal.tsx:97` — falls back to `"https://picsum.photos/seed/newstory/300/450"` if no cover
- **How**: Add validation: `if (!cover) { alert("Cover image is required"); return; }`. Remove the picsum fallback. Also add visual indication on the upload area that it's required (e.g., red border if empty on submit attempt).

---

### M-8: Profile edit modal — round profile icon
- [x] **Done**
- **What**: In the profile edit modal, the profile icon has a weird shape — should be round.
- **Files**:
  - `frontend/app/components/creator/ProfileEditModal.tsx:121` — `<div className="w-20 h-20 rounded-full bg-card-bg-2 overflow-hidden ...">` — already `rounded-full`
- **How**: The container div is `rounded-full` but the image inside might not be constrained properly. Check the `<img>` tag — ensure it has `className="w-full h-full object-cover rounded-full"`. Also check if the placeholder SVG icon fits the round container. May need `aspect-square` or explicit equal width/height.

---

### M-9: Creator profile — don't truncate own description
- [x] **Done**
- **What**: The creator's own profile view should NOT truncate the description like the public view does.
- **Files**:
  - `frontend/app/create/[storyId]/page.tsx:638` — `line-clamp-5` on story description
  - `frontend/app/components/public/PublicProfileHeader.tsx` — no truncation on public header (confirmed no `line-clamp` found)
  - Check the creator dashboard profile page for any truncation
- **How**: Find where the creator's own description is truncated (likely on the creator dashboard or story details page) and remove the `line-clamp-*` class or add a "read more" expander.

---

### M-10: Character/Location library text color — white not green
- [x] **Done**
- **What**: On the story details page (creator dashboard), "Character Library" and "Location Library" text should be white, not green.
- **Files**:
  - `frontend/app/create/[storyId]/page.tsx:731` — `title="Character Library"` passed to `LibraryCarousel`
  - `frontend/app/create/[storyId]/page.tsx:754` — `title="Location Library"` passed to `LibraryCarousel`
  - Check `frontend/app/components/creator/LibraryCarousel.tsx` for the title styling
- **How**: In `LibraryCarousel.tsx`, find the title element and change its color from green (`text-green-*` or similar) to white (`text-white`).

---

### M-11: Enforce true portrait mode in AI image generation
- [x] **Done**
- **What**: AI sometimes "cheats" — rotates landscape images to portrait or adds white padding. Must enforce TRUE portrait mode only.
- **Files**:
  - `backend/app/core/imagen.py:320-321` — current prompt: `"The image should be in portrait orientation (taller than wide)."`
  - `backend/app/routers/asset_gen.py` — character/location generation prompts
  - `backend/app/routers/film.py:550` — `"Portrait orientation, 9:16 aspect ratio."`
- **How**: Strengthen the prompt instructions:
  1. Add explicit anti-cheating instructions: "Generate a true portrait-oriented image. Do NOT rotate a landscape image. Do NOT add white padding or letterboxing. The actual content must be composed for portrait (9:16) format from the start."
  2. Add this to ALL image generation prompts (chars, locs, storyboards, scene refs)
  3. Consider adding post-generation validation: check image dimensions and reject if width > height

---

## LOOKS & ANGLES (New Feature)

### LA-1: Create `character_looks` and `location_angles` DB tables
- [ ] **Done**
- **What**: New Supabase tables to store multiple image variants per character/location.
- **Schema — `character_looks`**:
  - `id` UUID PK (default gen_random_uuid())
  - `character_id` FK → story_characters.id ON DELETE CASCADE
  - `story_id` FK → stories.id ON DELETE CASCADE
  - `image_url` text NOT NULL
  - `image_mime_type` text DEFAULT 'image/png'
  - `is_default` boolean DEFAULT false
  - `sort_order` int DEFAULT 0
  - `created_at` timestamptz DEFAULT now()
- **Schema — `location_angles`**: identical structure but `location_id` FK → story_locations.id
- **Constraints**: Max 10 per character/location (enforce in application code, not DB constraint). Only one `is_default = true` per character/location (enforce via application logic or trigger).
- **RLS**: Same pattern as `story_characters` — authenticated INSERT/UPDATE, public SELECT.
- **Migration**: For every `story_characters` row that has a non-null `image_url`, insert a `character_looks` row with `is_default: true`. Same for `story_locations` → `location_angles`. Keep the `image_url` on the parent table for quick default access.

---

### LA-2: Backend API routes for looks/angles CRUD
- [ ] **Done**
- **What**: REST endpoints for managing looks and angles.
- **Frontend API routes** (Next.js `/api/` routes, same pattern as existing `story_characters` routes):
  - `GET /api/stories/[id]/characters/[charId]/looks` — list all looks for a character
  - `POST /api/stories/[id]/characters/[charId]/looks` — create a new look (after image generation)
  - `PUT /api/stories/[id]/characters/[charId]/looks/[lookId]` — update (set as default)
  - `DELETE /api/stories/[id]/characters/[charId]/looks/[lookId]` — delete a look (cannot delete if `is_default` and it's the only one)
  - Same set for `/api/stories/[id]/locations/[locId]/angles/...`
- **When setting a new default**: unset `is_default` on all other looks for that character, then set on the chosen one. Also update the parent `story_characters.image_url` to match the new default.
- **No backend (Python) changes needed** — looks/angles are purely frontend-managed CRUD + existing image generation via `asset_gen.py`.

---

### LA-3: Generate look/angle — backend integration
- [ ] **Done**
- **What**: Generating a new look/angle sends the character's default look image as a reference + a "what's different" description.
- **Files**:
  - `backend/app/routers/asset_gen.py:96-132` — `generate_character` already accepts `reference_image`
  - `backend/app/routers/asset_gen.py:135+` — `generate_location` already accepts `reference_image`
  - `backend/app/routers/jobs.py` — job handlers for `generate_character` / `generate_location`
- **How**: No new backend endpoints needed. The existing generation endpoints already support `reference_image`. The frontend sends:
  1. `reference_image`: the default look's image (base64 or URL)
  2. `description`: base character description + "What's different about this look?" appended
  3. `visual_style`: story-level style (from EC-6)
- **Prompt construction**: Append the "what's different" text to the character description. Example: `"[existing char description]. IN THIS LOOK: wearing a formal black suit at a gala event."`
- After generation completes, frontend creates a new `character_looks` row via LA-2 API.

---

### LA-4: TypeScript types for looks/angles
- [ ] **Done**
- **What**: Add types to `frontend/types/database.ts` and frontend data models.
- **Files**:
  - `frontend/types/database.ts` — add `character_looks` and `location_angles` table types
  - `frontend/app/data/mockCreatorData.ts` — add `CharacterLook` and `LocationAngle` interfaces to `StoryCharacterFE` / `StoryLocationFE`
- **Types**:
  ```ts
  interface CharacterLook {
    id: string;
    characterId: string;
    storyId: string;
    imageUrl: string;
    imageMimeType: string;
    isDefault: boolean;
    sortOrder: number;
    createdAt: string;
  }
  interface LocationAngle { /* same pattern with locationId */ }
  ```
- **FE models**: `StoryCharacterFE` gets `looks: CharacterLook[]` (populated on fetch). `StoryLocationFE` gets `angles: LocationAngle[]`.

---

### LA-5: Story Management — CharacterModal looks carousel
- [ ] **Done**
- **What**: Add a "Looks" section to `CharacterModal` showing a horizontal carousel of all looks with generate/delete/set-default actions.
- **Files**:
  - `frontend/app/components/creator/CharacterModal.tsx` — add section below existing fields
- **UX**:
  - Section header: "Looks" with count badge (e.g., "3/10")
  - Horizontal scrollable row of thumbnail cards (~80x110px, same 9:16 aspect)
  - Default look has a subtle star icon overlay in corner
  - Hover on thumbnail: "Set as Default" (star icon) / "Delete" (trash icon) actions
  - **"+ Generate New Look"** card at end of row:
    - Click expands an inline form below the carousel
    - Shows character description (read-only, greyed out)
    - Editable field: "What's different about this look?" (placeholder: "Describe the outfit, mood, setting...")
    - "Generate" button — submits via existing `generate_character` job with default look as reference
    - On completion: new look appears in carousel, auto-selected
  - Button disabled + "(10/10)" shown when at cap
  - Cannot delete the last remaining look

---

### LA-6: Story Management — LocationModal angles carousel
- [ ] **Done**
- **What**: Same as LA-5 but for locations in `LocationModal`.
- **Files**:
  - `frontend/app/components/creator/LocationModal.tsx` — add "Angles" section
- **UX**: Identical pattern to LA-5. Editable field: "What's different about this angle?" (placeholder: "Describe the viewpoint, time of day, weather...")

---

### LA-7: Story Management — CharacterCard/LocationCard badge
- [ ] **Done**
- **What**: Show a small "N looks" / "N angles" badge on library cards when > 1 variant exists.
- **Files**:
  - `frontend/app/components/creator/CharacterCard.tsx` — add badge overlay
  - `frontend/app/components/creator/LocationCard.tsx` — add badge overlay
- **How**: Pass `lookCount` / `angleCount` as prop. If > 1, render a small pill badge in the top-left corner of the card image: `<span className="absolute top-2 left-2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded-full">{count} looks</span>`.

---

### LA-8: Episode Creation — Lookbook look/angle selector
- [ ] **Done**
- **What**: In the episode creation Lookbook tab ("Your Chars & Locs"), show a thumbnail strip below each character/location card to pick which look/angle to use for this episode.
- **Files**:
  - `frontend/app/create-episode/page.tsx` — Lookbook section (~line 4132+), character and location card grids
- **State**:
  - New state: `selectedLooks: Record<string, string>` — maps `characterId → lookId` (defaults to the `is_default` look)
  - New state: `selectedAngles: Record<string, string>` — maps `locationId → angleId`
  - Persisted in generation snapshot so it survives tab close/restore
- **UX**:
  - Below each character's main image card: if character has > 1 look, show a horizontal row of small thumbnail pills (~32x44px)
  - Active pill: purple border (`border-2 border-[#9C99FF]`)
  - Click a pill → updates `selectedLooks[charId]` → main card image swaps to selected look
  - If only 1 look: no strip shown, identical to today's UI
  - **"+" micro-button** at end of strip (if < 10 looks):
    - Click opens a compact inline form (same as LA-5: read-only description + "What's different?" + Generate)
    - New look saves to library (via LA-2 API) AND gets selected for this episode
  - Same pattern for locations with angles
- **How the selected look feeds into generation**: `buildApprovedVisuals()` uses the selected look's `image_url` (instead of the character's default `image_url`) when constructing reference images for storyboard generation.

---

### LA-9: Fetch looks/angles on story load
- [ ] **Done**
- **What**: When loading a story (both story management page and episode creation), fetch all looks/angles for each character/location.
- **Files**:
  - `frontend/app/create/[storyId]/page.tsx` — story details page, character/location fetch
  - `frontend/app/create-episode/page.tsx` — episode creation, `storyLibraryChars`/`storyLibraryLocs` fetch
- **How**: After fetching `story_characters`, batch-fetch all `character_looks` for the story (`WHERE story_id = X`). Group by `character_id` and attach to each character's FE model as `looks: CharacterLook[]`. Same for locations/angles. Use a single query per table (not N+1).

---

### LA-10: Migration script for existing data
- [ ] **Done**
- **What**: Migrate existing single images to the new looks/angles tables so existing stories don't lose their images.
- **How**: SQL migration:
  ```sql
  -- Migrate existing character images to character_looks
  INSERT INTO character_looks (character_id, story_id, image_url, image_mime_type, is_default, sort_order)
  SELECT id, story_id, image_url, image_mime_type, true, 0
  FROM story_characters
  WHERE image_url IS NOT NULL;

  -- Migrate existing location images to location_angles
  INSERT INTO location_angles (location_id, story_id, image_url, image_mime_type, is_default, sort_order)
  SELECT id, story_id, image_url, image_mime_type, true, 0
  FROM story_locations
  WHERE image_url IS NOT NULL;
  ```
- Run via Supabase SQL editor. The parent table `image_url` columns stay untouched for backward compat.

---

## IMPLEMENTATION ORDER (Suggested)

**Quick wins first** (can be done in parallel, minimal risk):
1. EC-9 (remove episode number arrows)
2. EC-4 (remove image prompt/regen notes from script edit)
3. EC-11 (remove cost estimates from buttons)
4. EC-12 (remove "try these" + fix icon)
5. EC-13 (add word limit hint)
6. EC-16 (rename Lookbook)
7. EC-17 (green checkmarks)
8. M-1 (waitlist first name)
9. M-2 (remove autoplay timer)
10. M-3 (episodes 1-4 free)
11. M-7 (cover image required)
12. M-8 (round profile icon)
13. M-10 (library text white)

**Medium complexity** (need careful testing):
14. EC-1 (generate vs regenerate text)
15. EC-10 (clean dropdowns cross-platform)
16. M-4 (modal spinner overlay fix)
17. M-5 (book description 3 bugs)
18. M-9 (creator description no truncate)
19. M-11 (portrait mode enforcement)

**Large / BIG CHANGES** (need architectural planning):
20. EC-6 (visual style at story level) — do this before EC-5
21. EC-5 (remove char/loc selector, AI uses library) — depends on EC-6
22. EC-2 (library reference images in modals)
23. EC-3 (upload reference image for AI)
24. EC-7 (same-name char/loc switching)
25. EC-8 (auto-trigger storyboard after loc step)
26. EC-14 (protect saved chars/locs on regen)
27. EC-15 (storyboard image history)

**Looks & Angles feature** (do after EC-6 visual style, before EC-2/EC-3 reference images):
28. LA-1 (DB tables + migration SQL)
29. LA-10 (migration script for existing data) — run immediately after LA-1
30. LA-4 (TypeScript types)
31. LA-2 (API routes CRUD)
32. LA-9 (fetch looks/angles on story load)
33. LA-7 (card badges "N looks")
34. LA-5 (CharacterModal looks carousel)
35. LA-6 (LocationModal angles carousel)
36. LA-3 (generation integration — ref image + "what's different" prompt)
37. LA-8 (episode creation lookbook selector + feeds into storyboard generation)

**Needs investigation / possible backend work**:
38. M-6 (subscribe button logic + real pricing)
