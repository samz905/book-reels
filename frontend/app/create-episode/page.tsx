"use client";

import { useState, useEffect, useRef } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import {
  createGeneration as supaCreateGeneration,
  updateGeneration as supaUpdateGeneration,
  getGeneration as supaGetGeneration,
  listGenerations as supaListGenerations,
  upsertFilmJob as supaUpsertFilmJob,
  AIGenerationSummary,
} from "@/lib/supabase/ai-generations";

// ============================================================
// Types
// ============================================================

type Style = "cinematic" | "3d_animated" | "2d_animated";
type VisualStep = "characters" | "setting" | "key_moment";
type MoodboardStep = "protagonist" | "full";

interface Character {
  id: string;
  name: string;
  gender: string;
  age: string;
  appearance: string;
  role: "protagonist" | "antagonist" | "supporting";
}

interface Setting {
  location: string;
  time: string;
  atmosphere: string;
}

interface Location {
  id: string;
  name: string;
  description: string;
  atmosphere: string;
}

interface Scene {
  scene_number: number;
  title: string;
  duration: string;
  characters_on_screen: string[];
  setting_id: string;
  action: string;
  dialogue: string | null;
  image_prompt: string;
  regenerate_notes: string;
  scene_change: boolean;
  scene_heading?: string;
}

interface DialogueLine {
  character: string;
  line: string;
}

interface SceneBlock {
  type: "description" | "action" | "dialogue";
  text: string;
  character?: string; // dialogue blocks only
}

const MAX_BLOCKS_PER_SCENE = 5;

function getBlocks(beat: Beat): SceneBlock[] {
  if (beat.blocks && beat.blocks.length > 0) return beat.blocks;
  // Fallback: derive from legacy fields
  const blocks: SceneBlock[] = [];
  if (beat.description) blocks.push({ type: "description", text: beat.description });
  if (beat.action) blocks.push({ type: "action", text: beat.action });
  if (beat.dialogue) {
    beat.dialogue.forEach((d) =>
      blocks.push({ type: "dialogue", text: d.line, character: d.character })
    );
  }
  return blocks;
}

/** Convert legacy beats to scenes if story.scenes is empty */
function beatsToScenes(beats: Beat[], locations: Location[]): Scene[] {
  return beats.map((beat) => {
    const blocks = getBlocks(beat);
    const descParts = blocks.filter(b => b.type === "description").map(b => b.text);
    const actionParts = blocks.filter(b => b.type === "action").map(b => b.text);
    const dialogueParts = blocks
      .filter(b => b.type === "dialogue")
      .map(b => `${b.character || "Unknown"}: ${b.text}`);
    return {
      scene_number: beat.scene_number,
      title: `Scene ${beat.scene_number}`,
      duration: "8 seconds",
      characters_on_screen: beat.characters_in_scene || [],
      setting_id: beat.location_id || (locations[0]?.id || ""),
      action: actionParts.join(" "),
      dialogue: dialogueParts.length > 0 ? dialogueParts.join("\n") : null,
      image_prompt: descParts.join(" "),
      regenerate_notes: "",
      scene_change: beat.scene_change,
      scene_heading: beat.scene_heading,
    };
  });
}

/** Get scenes from story — uses scenes if available, otherwise derives from beats */
function getScenes(story: Story): Scene[] {
  if (story.scenes && story.scenes.length > 0) return story.scenes;
  return beatsToScenes(story.beats, story.locations);
}

function blocksToLegacy(blocks: SceneBlock[]): {
  description?: string;
  action?: string;
  dialogue: DialogueLine[] | null;
} {
  const descBlock = blocks.find((b) => b.type === "description");
  const actionBlock = blocks.find((b) => b.type === "action");
  const dialogueBlocks = blocks.filter((b) => b.type === "dialogue");
  return {
    description: descBlock?.text,
    action: actionBlock?.text,
    dialogue: dialogueBlocks.length > 0
      ? dialogueBlocks.map((b) => ({ character: b.character || "", line: b.text }))
      : null,
  };
}

interface Beat {
  scene_number: number;
  summary?: string;
  scene_heading?: string;
  blocks: SceneBlock[];
  scene_change: boolean;
  characters_in_scene: string[] | null;
  location_id: string | null;
  // Legacy fields (still sent by backend, used as fallback)
  description?: string;
  action?: string;
  dialogue?: DialogueLine[] | null;
}

interface Story {
  id: string;
  title: string;
  characters: Character[];
  setting?: Setting;
  locations: Location[];
  scenes: Scene[];    // Primary (new Playbook format)
  beats: Beat[];      // Legacy (backward compat for pipeline)
  style: string;
}

interface MoodboardImage {
  type: "character" | "setting" | "location" | "key_moment";
  image_base64: string;
  mime_type: string;
  prompt_used: string;
}

interface RefImageUpload {
  base64: string;
  mimeType: string;
  name: string;
}

interface LocationImageState {
  image: MoodboardImage | null;
  images: MoodboardImage[];  // All generated options (when count > 1)
  selectedIndex: number;
  approved: boolean;
  isGenerating: boolean;
  feedback: string;
  promptUsed: string;
  error: string;
  refImages: RefImageUpload[];  // User-uploaded reference images for refinement
}

interface CharacterImageState {
  image: MoodboardImage | null;
  images: MoodboardImage[];  // All generated options (when count > 1)
  selectedIndex: number;
  approved: boolean;
  isGenerating: boolean;
  feedback: string;
  promptUsed: string;
  error: string;
  refImages: RefImageUpload[];  // User-uploaded reference images for refinement
}

interface SettingImageState {
  image: MoodboardImage | null;
  images: MoodboardImage[];
  selectedIndex: number;
  approved: boolean;
  isGenerating: boolean;
  feedback: string;
  promptUsed: string;
  error: string;
  refImages: RefImageUpload[];
}

interface KeyMomentEntry {
  beat_number: number;
  beat_description: string;
  image: MoodboardImage;
  promptUsed: string;
}

interface KeyMomentImageState {
  image: MoodboardImage | null;
  beat_number: number;
  beat_description: string;
  isGenerating: boolean;
  feedback: string;
  promptUsed: string;
  // Multi-scene support (3 distinct key moments)
  entries: KeyMomentEntry[];
  selectedIndex: number;
}

// Phase 4: Film Generation
interface CompletedShot {
  number: number;
  preview_url: string;
  veo_prompt?: string;
}

interface FilmCost {
  scene_refs_usd: number;
  videos_usd: number;
  total_usd: number;
}

interface FilmState {
  filmId: string | null;
  status: "idle" | "generating" | "assembling" | "ready" | "failed";
  currentShot: number;
  totalShots: number;
  phase: "keyframe" | "filming" | "assembling";
  completedShots: CompletedShot[];
  finalVideoUrl: string | null;
  error: string | null;
  cost: FilmCost;
}

// Prompt Preview (Pre-Flight Check)
interface ShotPromptPreview {
  beat_number: number;
  scene_heading: string | null;
  veo_prompt: string;
  characters_in_scene: string[] | null;
  location_id: string | null;
}

interface PromptPreviewState {
  shots: ShotPromptPreview[];
  editedPrompts: Record<number, string>;
  estimatedCostUsd: number;
  isLoading: boolean;
}

// Cost tracking across all phases
interface TotalCost {
  story: number;
  characters: number;
  locations: number;
  keyMoments: number;
  film: number;
}

// Generation persistence (uses AIGenerationSummary from Supabase helper)

// ============================================================
// Constants
// ============================================================

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

// Fixed at 8 shots (8 seconds each = ~64 seconds)
const TOTAL_SHOTS = 8;

const STYLE_OPTIONS: { value: Style; label: string }[] = [
  { value: "cinematic", label: "Cinematic" },
  { value: "3d_animated", label: "3D Animated" },
  { value: "2d_animated", label: "2D Animated" },
];

// ============================================================
// Main Component
// ============================================================

export default function CreateEpisodePage() {
  // Input state
  const [scriptTab, setScriptTab] = useState<"generate" | "insert">("generate");
  const [idea, setIdea] = useState("");
  const [rawScript, setRawScript] = useState("");
  const [style, setStyle] = useState<Style>("cinematic");

  // Story state
  const [story, setStory] = useState<Story | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Right pane tab state
  const [rightTab, setRightTab] = useState<"assets" | "script">("assets");

  // Scene editing state (new format)
  const [editingSceneIndex, setEditingSceneIndex] = useState<number | null>(null);
  const [editSceneDraft, setEditSceneDraft] = useState<Scene | null>(null);

  // Feedback state
  const [selectedBeatIndex, setSelectedBeatIndex] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [globalFeedback, setGlobalFeedback] = useState("");
  const [editingBeatIndex, setEditingBeatIndex] = useState<number | null>(null);
  const [editBeatDraft, setEditBeatDraft] = useState<{
    scene_heading: string;
    blocks: SceneBlock[];
    scene_change: boolean;
    characters_in_scene: string[] | null;
    location_id: string | null;
  } | null>(null);

  // Editable story metadata
  const [editingTitle, setEditingTitle] = useState(false);
  const [expandedCharacters, setExpandedCharacters] = useState(false);
  const [editingCharIndex, setEditingCharIndex] = useState<number | null>(null);
  const [editCharDraft, setEditCharDraft] = useState<Character | null>(null);
  const [expandedLocations, setExpandedLocations] = useState(false);
  const [editingLocIndex, setEditingLocIndex] = useState<number | null>(null);
  const [editLocDraft, setEditLocDraft] = useState<Location | null>(null);

  // Visual Direction state (Phase 3)
  const [visualStep, setVisualStep] = useState<VisualStep | null>(null);
  const [moodboardStep, setMoodboardStep] = useState<MoodboardStep>("protagonist");
  const [characterImages, setCharacterImages] = useState<Record<string, CharacterImageState>>({});
  const [settingImage, setSettingImage] = useState<SettingImageState | null>(null);
  const [locationImages, setLocationImages] = useState<Record<string, LocationImageState>>({});
  const [keyMoment, setKeyMoment] = useState<KeyMomentImageState | null>(null);

  // Protagonist-first state
  const [protagonistImage, setProtagonistImage] = useState<{
    character_id: string;
    character_name: string;
    image: MoodboardImage;
    images: MoodboardImage[];
    selectedIndex: number;
    refImages: RefImageUpload[];
  } | null>(null);
  const [protagonistLocked, setProtagonistLocked] = useState(false);
  const [isGeneratingProtagonist, setIsGeneratingProtagonist] = useState(false);
  const [protagonistFeedback, setProtagonistFeedback] = useState("");
  const [protagonistError, setProtagonistError] = useState("");

  // Phase 4: Film Generation state
  const [film, setFilm] = useState<FilmState>({
    filmId: null,
    status: "idle",
    currentShot: 0,
    totalShots: 0,
    phase: "filming",
    completedShots: [],
    finalVideoUrl: null,
    error: null,
    cost: { scene_refs_usd: 0, videos_usd: 0, total_usd: 0 },
  });
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clip review state
  const [clipsApproved, setClipsApproved] = useState(false);
  const [regeneratingShotNum, setRegeneratingShotNum] = useState<number | null>(null);
  const [shotFeedback, setShotFeedback] = useState<Record<number, string>>({});

  // Prompt preview (pre-flight check)
  const [promptPreview, setPromptPreview] = useState<PromptPreviewState>({
    shots: [],
    editedPrompts: {},
    estimatedCostUsd: 0,
    isLoading: false,
  });

  // Cost tracking across all phases
  const [totalCost, setTotalCost] = useState<TotalCost>({
    story: 0,
    characters: 0,
    locations: 0,
    keyMoments: 0,
    film: 0,
  });

  // Generation persistence
  const [generationId, setGenerationId] = useState<string | null>(null);
  const generationIdRef = useRef<string | null>(null);
  const isRestoringRef = useRef(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pastGenerations, setPastGenerations] = useState<AIGenerationSummary[]>([]);
  const [isRestoringState, setIsRestoringState] = useState(false);
  const [draftSaveStatus, setDraftSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // Keep ref in sync with state
  useEffect(() => {
    generationIdRef.current = generationId;
  }, [generationId]);

  // URL helper — generation ID in URL as ?g=xxx
  const setGenerationUrl = (id: string | null) => {
    const url = new URL(window.location.href);
    if (id) {
      url.searchParams.set("g", id);
    } else {
      url.searchParams.delete("g");
    }
    window.history.replaceState({}, "", url.toString());
  };

  // Save metadata on page unload via sendBeacon (POST — no CORS preflight)
  // NOTE: Only sends lightweight metadata (title, status, cost, film_id) — never `state`.
  // Full state with images is saved by saveNow() and auto-save. sendBeacon must not
  // overwrite state because it would strip base64 images and destroy good data.
  useEffect(() => {
    const handleBeforeUnload = () => {
      const gid = generationIdRef.current;
      if (!gid) return;

      // sendBeacon only saves lightweight metadata — never `state`.
      // Full state (with images) is already persisted by saveNow() (immediate after
      // every API response) and auto-save (500ms debounce). Writing state here would
      // strip base64 images and overwrite the good data already in Supabase.
      const payload = JSON.stringify({
        title: story?.title || "Untitled",
        status: film.status === "ready" ? "ready" : film.status === "failed" ? "failed" : undefined,
        film_id: film.filmId,
        cost_total: totalCost.story + totalCost.characters + totalCost.locations + totalCost.keyMoments + totalCost.film,
      });
      navigator.sendBeacon(
        `/api/ai-generations/${gid}/save`,
        new Blob([payload], { type: "application/json" })
      );
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  });

  // ============================================================
  // API Calls
  // ============================================================

  const generateStory = async () => {
    if (!idea.trim()) {
      alert("Please enter a story idea.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setStory(null);
    resetVisualDirection();
    setSelectedBeatIndex(null);

    // Ensure we have a generation session — MUST complete before proceeding
    let activeGenId = generationIdRef.current;
    if (!activeGenId) {
      activeGenId = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
      generationIdRef.current = activeGenId;
      setGenerationId(activeGenId);
      setGenerationUrl(activeGenId);
      // Await creation so the row exists before any saves or sendBeacon can fire
      await supaCreateGeneration(activeGenId, "Untitled", style, { idea, style, scriptTab: "generate", isGenerating: true });
    }

    try {
      const response = await fetch(`${BACKEND_URL}/story/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, style }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to generate story");
      }

      const data = await response.json();
      setStory(data.story);
      // Track story generation cost
      if (data.cost_usd) {
        setTotalCost((prev) => ({ ...prev, story: prev.story + data.cost_usd }));
      }
      // Save immediately with actual story data
      saveNow({ story: data.story }, "drafting");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate story");
    } finally {
      setIsGenerating(false);
    }
  };

  const regenerateStory = async () => {
    setIsGenerating(true);
    setError(null);
    resetVisualDirection();
    setSelectedBeatIndex(null);

    try {
      const response = await fetch(`${BACKEND_URL}/story/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idea,
          style,
          feedback: globalFeedback || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to regenerate story");
      }

      const data = await response.json();
      setStory(data.story);
      setGlobalFeedback("");
      saveNow({ story: data.story }, "drafting");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate story");
    } finally {
      setIsGenerating(false);
    }
  };

  const parseScript = async () => {
    if (!rawScript.trim()) {
      alert("Please paste your script.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setStory(null);
    resetVisualDirection();
    setSelectedBeatIndex(null);

    // Ensure we have a generation session
    let activeGenId = generationIdRef.current;
    if (!activeGenId) {
      activeGenId = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
      generationIdRef.current = activeGenId;
      setGenerationId(activeGenId);
      setGenerationUrl(activeGenId);
      await supaCreateGeneration(activeGenId, "Untitled", style, { rawScript, style, scriptTab: "insert", isGenerating: true });
    }

    try {
      const response = await fetch(`${BACKEND_URL}/story/parse-script`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script: rawScript, style }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to parse script");
      }

      const data = await response.json();
      setStory(data.story);
      if (data.cost_usd) {
        setTotalCost((prev) => ({ ...prev, story: prev.story + data.cost_usd }));
      }
      saveNow({ story: data.story, rawScript, scriptTab: "insert" }, "drafting");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse script");
    } finally {
      setIsGenerating(false);
    }
  };

  /** Save a scene edit and sync both scenes + beats on the story */
  const saveSceneEdit = (sceneIndex: number, updatedScene: Scene) => {
    if (!story) return;
    const updatedScenes = [...getScenes(story)];
    updatedScenes[sceneIndex] = updatedScene;

    // Also sync the corresponding beat
    const updatedBeats = [...story.beats];
    if (updatedBeats[sceneIndex]) {
      // Parse dialogue string into DialogueLine[]
      const dialogueLines: DialogueLine[] = [];
      if (updatedScene.dialogue) {
        for (const raw of updatedScene.dialogue.split("\n")) {
          const trimmed = raw.trim();
          if (!trimmed) continue;
          if (trimmed.includes(":")) {
            const [char, ...rest] = trimmed.split(":");
            dialogueLines.push({ character: char.trim(), line: rest.join(":").trim() });
          } else {
            dialogueLines.push({ character: "Unknown", line: trimmed });
          }
        }
      }
      // Build blocks from scene fields
      const blocks: SceneBlock[] = [];
      if (updatedScene.image_prompt) blocks.push({ type: "description", text: updatedScene.image_prompt });
      if (updatedScene.action) blocks.push({ type: "action", text: updatedScene.action });
      for (const dl of dialogueLines) {
        blocks.push({ type: "dialogue", text: dl.line, character: dl.character });
      }
      updatedBeats[sceneIndex] = {
        ...updatedBeats[sceneIndex],
        scene_heading: updatedScene.scene_heading,
        scene_change: updatedScene.scene_change,
        characters_in_scene: updatedScene.characters_on_screen,
        location_id: updatedScene.setting_id,
        blocks,
        description: updatedScene.image_prompt,
        action: updatedScene.action,
        dialogue: dialogueLines.length > 0 ? dialogueLines : null,
      };
    }
    setStory({ ...story, scenes: updatedScenes, beats: updatedBeats });
    setEditingSceneIndex(null);
    setEditSceneDraft(null);
  };

  const refineBeat = async () => {
    if (!story || selectedBeatIndex === null || !feedback.trim()) {
      return;
    }

    setIsRefining(true);

    try {
      const response = await fetch(`${BACKEND_URL}/story/refine-beat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          story,
          beat_number: selectedBeatIndex + 1,
          feedback,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to refine beat");
      }

      const data = await response.json();

      const updatedBeats = [...story.beats];
      updatedBeats[selectedBeatIndex] = data.beat;
      // Also sync the scene from the refined beat
      const updatedScenes = [...getScenes(story)];
      const refinedBeat = data.beat;
      updatedScenes[selectedBeatIndex] = {
        scene_number: refinedBeat.scene_number,
        title: updatedScenes[selectedBeatIndex]?.title || `Scene ${refinedBeat.scene_number}`,
        duration: updatedScenes[selectedBeatIndex]?.duration || "8 seconds",
        characters_on_screen: refinedBeat.characters_in_scene || [],
        setting_id: refinedBeat.location_id || "",
        action: refinedBeat.action || "",
        dialogue: refinedBeat.dialogue?.map((d: DialogueLine) => `${d.character}: ${d.line}`).join("\n") || null,
        image_prompt: refinedBeat.description || "",
        regenerate_notes: updatedScenes[selectedBeatIndex]?.regenerate_notes || "",
        scene_change: refinedBeat.scene_change,
        scene_heading: refinedBeat.scene_heading,
      };
      setStory({ ...story, beats: updatedBeats, scenes: updatedScenes });
      setFeedback("");
      setSelectedBeatIndex(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refine beat");
    } finally {
      setIsRefining(false);
    }
  };

  // ============================================================
  // Generation Persistence
  // ============================================================

  const buildSnapshot = () => ({
    scriptTab,
    idea,
    rawScript,
    style,
    story,
    isGenerating,
    visualStep,
    moodboardStep,
    protagonistImage,
    protagonistLocked,
    isGeneratingProtagonist,
    characterImages,
    locationImages,
    keyMoment,
    promptPreview: {
      shots: promptPreview.shots,
      editedPrompts: promptPreview.editedPrompts,
      estimatedCostUsd: promptPreview.estimatedCostUsd,
    },
    filmId: film.filmId,
    filmStatus: film.status,
    film,
    clipsApproved,
    shotFeedback,
    totalCost,
  });

  // Save with current React state (for debounced/beforeunload saves)
  const saveGeneration = async (statusOverride?: string, explicitId?: string) => {
    const gid = explicitId || generationIdRef.current;
    if (!gid) return;
    const snapshot = buildSnapshot();
    const currentStatus = statusOverride || (
      film.status === "generating" || film.status === "assembling" ? "filming" :
      film.status === "ready" ? "ready" :
      film.status === "failed" ? "failed" :
      promptPreview.shots.length > 0 ? "preflight" :
      keyMoment?.entries.length ? "key_moments" :
      protagonistLocked ? "moodboard" :
      story ? "drafting" : "drafting"
    );
    supaUpdateGeneration(gid, {
      title: story?.title || "Untitled",
      status: currentStatus,
      state: snapshot,
      film_id: film.filmId,
      thumbnail_base64: protagonistImage?.image?.image_base64?.slice(0, 2000) || null,
      cost_total: totalCost.story + totalCost.characters + totalCost.locations + totalCost.keyMoments + totalCost.film,
    }).catch(console.error);
  };

  // Save immediately with actual data (bypasses stale closures)
  // Pass overrides for fields that were just set via setState but aren't in closure yet
  const saveNow = (overrides: Record<string, unknown> = {}, statusOverride?: string) => {
    const gid = generationIdRef.current;
    if (!gid) return;
    const snapshot = { ...buildSnapshot(), ...overrides };
    const storyData = (overrides.story as Story | undefined) || story;
    const protImg = (overrides.protagonistImage as typeof protagonistImage) || protagonistImage;
    supaUpdateGeneration(gid, {
      title: storyData?.title || "Untitled",
      status: statusOverride || "drafting",
      state: snapshot,
      film_id: film.filmId,
      thumbnail_base64: protImg?.image?.image_base64?.slice(0, 2000) || null,
      cost_total: totalCost.story + totalCost.characters + totalCost.locations + totalCost.keyMoments + totalCost.film,
    }).catch(console.error);
  };

  const handleSaveDraft = () => {
    if (!generationIdRef.current || !story) return;
    setDraftSaveStatus("saving");
    saveNow({}, "drafting");
    // Show "saved" confirmation briefly
    setTimeout(() => setDraftSaveStatus("saved"), 400);
    setTimeout(() => setDraftSaveStatus("idle"), 2500);
  };

  const fetchGenerationsList = async () => {
    try {
      const gens = await supaListGenerations();
      setPastGenerations(gens);
      return gens;
    } catch { /* supabase may not be configured */ }
    return [];
  };

  const restoreGeneration = async (genId: string) => {
    setIsRestoringState(true);
    isRestoringRef.current = true;
    try {
      const data = await supaGetGeneration(genId);
      if (!data) return;
      const s = (data.state || {}) as Record<string, unknown>;

      // CRITICAL: Reset ALL state first to prevent leakage between generations
      // Without this, switching from Gen A (with moodboard) to Gen B (no moodboard)
      // would leave Gen A's images visible in Gen B
      resetAllState();

      generationIdRef.current = genId;
      setGenerationId(genId);
      setGenerationUrl(genId);
      if (s.scriptTab) setScriptTab(s.scriptTab as "generate" | "insert");
      if (s.idea !== undefined) setIdea(s.idea as string);
      if (s.rawScript !== undefined) setRawScript(s.rawScript as string);
      if (s.style) setStyle(s.style as Style);
      if (s.story !== undefined) setStory(s.story as Story | null);
      if (s.visualStep !== undefined) setVisualStep(s.visualStep as VisualStep | null);
      if (s.moodboardStep) setMoodboardStep(s.moodboardStep as MoodboardStep);
      // Only restore protagonist if it has actual image data (not stripped/mid-generation)
      const protImgRaw = s.protagonistImage as typeof protagonistImage;
      const protHasRealImage = protImgRaw?.image && protImgRaw.image.image_base64 !== "[stripped]";
      if (protHasRealImage) {
        setProtagonistImage(protImgRaw);
      }
      if (s.protagonistLocked !== undefined) setProtagonistLocked(s.protagonistLocked as boolean);

      // Helper: check if an image is real (not stripped by sendBeacon)
      const hasRealImage = (img: MoodboardImage | null) =>
        img && img.image_base64 && img.image_base64 !== "[stripped]";

      // Clean character images: keep entries with real image/error, mark rest for retry
      const cleanedChars: Record<string, CharacterImageState> = {};
      const retryCharIds: string[] = [];
      if (s.characterImages) {
        const raw = s.characterImages as Record<string, CharacterImageState>;
        for (const key in raw) {
          const ci = raw[key];
          if (hasRealImage(ci.image)) {
            cleanedChars[key] = { ...ci, isGenerating: false };
          } else if (ci.error) {
            cleanedChars[key] = { ...ci, isGenerating: false };
          } else {
            // Was mid-generation or image was stripped — retry
            retryCharIds.push(key);
            cleanedChars[key] = { ...ci, image: null, isGenerating: true };
          }
        }
      }
      setCharacterImages(cleanedChars);

      // Same for location images
      const cleanedLocs: Record<string, LocationImageState> = {};
      const retryLocIds: string[] = [];
      if (s.locationImages) {
        const raw = s.locationImages as Record<string, LocationImageState>;
        for (const key in raw) {
          const li = raw[key];
          if (hasRealImage(li.image)) {
            cleanedLocs[key] = { ...li, isGenerating: false };
          } else if (li.error) {
            cleanedLocs[key] = { ...li, isGenerating: false };
          } else {
            // Was mid-generation or image was stripped — retry
            retryLocIds.push(key);
            cleanedLocs[key] = { ...li, image: null, isGenerating: true };
          }
        }
      }
      setLocationImages(cleanedLocs);

      // Key moment: restore if it has actual entries with real images; otherwise retry
      const km = s.keyMoment as KeyMomentImageState | null;
      let retryKeyMoment = false;
      if (km && km.entries && km.entries.length > 0) {
        // Check if any entries have stripped images
        const allEntriesReal = km.entries.every((e) => hasRealImage(e.image));
        if (allEntriesReal) {
          setKeyMoment({ ...km, isGenerating: false });
        } else {
          // Some entries have stripped images — retry key moment generation
          setKeyMoment({ ...km, entries: [], isGenerating: true });
          retryKeyMoment = true;
        }
      } else if (km && km.isGenerating) {
        // Was mid-generation — keep loading state for retry
        setKeyMoment({ ...km, isGenerating: true });
        retryKeyMoment = true;
      }
      if (s.promptPreview) setPromptPreview({ ...(s.promptPreview as PromptPreviewState), isLoading: false });
      if (s.clipsApproved !== undefined) setClipsApproved(s.clipsApproved as boolean);
      if (s.shotFeedback) setShotFeedback(s.shotFeedback as Record<number, string>);
      if (s.totalCost) setTotalCost(s.totalCost as TotalCost);

      // Restore film state — film_job from Supabase is source of truth; fallback to snapshot
      if (data.film_job) {
        const fj = data.film_job;
        setFilm({
          filmId: fj.film_id,
          status: fj.status === "interrupted" ? "failed" : fj.status as FilmState["status"],
          currentShot: fj.current_shot || 0,
          totalShots: fj.total_shots || 0,
          phase: (fj.phase || "filming") as FilmState["phase"],
          completedShots: (fj.completed_shots || []).map((cs) => ({
            number: cs.number,
            preview_url: `${BACKEND_URL}/film/${fj.film_id}/shot/${cs.number}`,
            veo_prompt: cs.veo_prompt || "",
          })),
          finalVideoUrl: fj.final_video_url ? `${BACKEND_URL}/film/${fj.film_id}/final` : null,
          error: fj.status === "interrupted" ? "Generation was interrupted by server restart" : fj.error_message,
          cost: {
            scene_refs_usd: fj.cost_scene_refs || 0,
            videos_usd: fj.cost_videos || 0,
            total_usd: (fj.cost_scene_refs || 0) + (fj.cost_videos || 0),
          },
        });
      } else if (s.film && (s.film as FilmState).status === "ready") {
        setFilm(s.film as FilmState);
      }

      // Resume polling if film is actively generating
      if (data.film_job && ["generating", "assembling"].includes(data.film_job.status)) {
        startPolling(data.film_job.film_id);
      }

      // ---- Auto-retry interrupted operations ----
      // Uses captured snapshot values to avoid stale React closures
      const storyData = s.story as Story | null;
      const protImg = s.protagonistImage as typeof protagonistImage;

      // 1. Interrupted story generation
      if (s.isGenerating && !storyData && s.idea) {
        const retryIdea = s.idea as string;
        const retryStyle = (s.style || "cinematic") as string;
        setIsGenerating(true);
        (async () => {
          try {
            const response = await fetch(`${BACKEND_URL}/story/generate`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ idea: retryIdea, style: retryStyle }),
            });
            if (!response.ok) throw new Error("Failed to generate story");
            const retryData = await response.json();
            setStory(retryData.story);
            if (retryData.cost_usd) {
              setTotalCost((prev) => ({ ...prev, story: prev.story + retryData.cost_usd }));
            }
            saveNow({ story: retryData.story, isGenerating: false }, "drafting");
          } catch (retryErr) {
            setError(retryErr instanceof Error ? retryErr.message : "Failed to generate story");
          } finally {
            setIsGenerating(false);
          }
        })();
      }

      // 2. Protagonist missing real image: either mid-generation OR completed but stripped by sendBeacon
      const protExistsButStripped = protImgRaw && !protHasRealImage;
      if ((s.isGeneratingProtagonist || protExistsButStripped) && !protHasRealImage && storyData) {
        setIsGeneratingProtagonist(true);
        (async () => {
          try {
            const response = await fetch(`${BACKEND_URL}/moodboard/generate-protagonist`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ story: storyData }),
            });
            if (!response.ok) throw new Error("Failed to generate protagonist");
            const pd = await response.json();
            const protagonist = storyData.characters.find((c) => c.id === pd.character_id);
            const newProt = {
              character_id: pd.character_id,
              character_name: protagonist?.name || "Protagonist",
              image: pd.image,
              images: [],
              selectedIndex: 0,
              refImages: [],
            };
            setProtagonistImage(newProt);
            if (pd.cost_usd) setTotalCost((prev) => ({ ...prev, characters: prev.characters + pd.cost_usd }));
            saveNow({ protagonistImage: newProt, isGeneratingProtagonist: false }, "moodboard");
          } catch (err) {
            setProtagonistError(err instanceof Error ? err.message : "Failed to generate protagonist");
          } finally {
            setIsGeneratingProtagonist(false);
          }
        })();
      }

      // 3. Interrupted character/location generation (moodboard parallel gen)
      if (protHasRealImage && protImg?.image && storyData && (retryCharIds.length > 0 || retryLocIds.length > 0)) {
        const protagonistRef = {
          image_base64: protImg.image.image_base64,
          mime_type: protImg.image.mime_type,
        };

        // Retry missing characters
        for (const charId of retryCharIds) {
          (async () => {
            try {
              const response = await fetch(`${BACKEND_URL}/moodboard/generate-character`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ story: storyData, character_id: charId, protagonist_image: protagonistRef }),
              });
              if (!response.ok) throw new Error("Failed to generate character image");
              const cd = await response.json();
              setCharacterImages((prev) => ({
                ...prev,
                [charId]: { ...prev[charId], image: cd.image, promptUsed: cd.prompt_used, isGenerating: false },
              }));
              if (cd.cost_usd) setTotalCost((prev) => ({ ...prev, characters: prev.characters + cd.cost_usd }));
            } catch (err) {
              const msg = err instanceof Error ? err.message : "Failed to generate character image";
              setCharacterImages((prev) => ({
                ...prev,
                [charId]: { ...prev[charId], isGenerating: false, error: msg },
              }));
            }
          })();
        }

        // Retry missing locations
        for (const locId of retryLocIds) {
          (async () => {
            try {
              const response = await fetch(`${BACKEND_URL}/moodboard/generate-location`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ story: storyData, location_id: locId, protagonist_image: protagonistRef }),
              });
              if (!response.ok) throw new Error("Failed to generate location image");
              const ld = await response.json();
              setLocationImages((prev) => ({
                ...prev,
                [locId]: { ...prev[locId], image: ld.image, promptUsed: ld.prompt_used, isGenerating: false },
              }));
              if (ld.cost_usd) setTotalCost((prev) => ({ ...prev, locations: prev.locations + ld.cost_usd }));
            } catch (err) {
              const msg = err instanceof Error ? err.message : "Failed to generate location image";
              setLocationImages((prev) => ({
                ...prev,
                [locId]: { ...prev[locId], isGenerating: false, error: msg },
              }));
            }
          })();
        }
      }

      // 4. Interrupted key moment generation
      if (retryKeyMoment && protHasRealImage && storyData) {
        (async () => {
          try {
            // Build approved visuals from captured snapshot data
            const characterImageMap: Record<string, { image_base64: string; mime_type: string }> = {};
            if (protImg) characterImageMap[protImg.character_id] = { image_base64: protImg.image.image_base64, mime_type: protImg.image.mime_type };
            for (const key in cleanedChars) {
              if (cleanedChars[key].image) {
                characterImageMap[key] = { image_base64: cleanedChars[key].image!.image_base64, mime_type: cleanedChars[key].image!.mime_type };
              }
            }
            const locImgs: Record<string, { image_base64: string; mime_type: string }> = {};
            const locDescs: Record<string, string> = {};
            for (const loc of storyData.locations || []) {
              if (cleanedLocs[loc.id]?.image) {
                locImgs[loc.id] = { image_base64: cleanedLocs[loc.id].image!.image_base64, mime_type: cleanedLocs[loc.id].image!.mime_type };
              }
              locDescs[loc.id] = `${loc.description}. ${loc.atmosphere}`;
            }
            const approvedVisuals = {
              character_images: Object.values(characterImageMap),
              character_image_map: characterImageMap,
              setting_image: Object.values(locImgs)[0] || undefined,
              location_images: locImgs,
              character_descriptions: storyData.characters.map((c) => `${c.name} (${c.age} ${c.gender}): ${c.appearance}`),
              setting_description: Object.values(locDescs)[0] || "",
              location_descriptions: locDescs,
            };
            const response = await fetch(`${BACKEND_URL}/moodboard/generate-key-moment`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ story: storyData, approved_visuals: approvedVisuals }),
            });
            if (!response.ok) throw new Error("Failed to generate key moment");
            const kd = await response.json();
            const entries = (kd.key_moments || [kd.key_moment]).map(
              (kmItem: { beat_number: number; beat_description: string; image: MoodboardImage; prompt_used: string }) => ({
                beat_number: kmItem.beat_number,
                beat_description: kmItem.beat_description,
                image: kmItem.image,
                promptUsed: kmItem.prompt_used,
              })
            );
            const primary = entries[0];
            setKeyMoment({
              image: primary.image,
              beat_number: primary.beat_number,
              beat_description: primary.beat_description,
              isGenerating: false,
              feedback: "",
              promptUsed: primary.promptUsed,
              entries,
              selectedIndex: 0,
            });
            if (kd.cost_usd) setTotalCost((prev) => ({ ...prev, keyMoments: prev.keyMoments + kd.cost_usd }));
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to generate key moment");
            setKeyMoment((prev) => prev ? { ...prev, isGenerating: false } : null);
          }
        })();
      }
    } catch (err) {
      console.error("Failed to restore generation:", err);
    } finally {
      setIsRestoringState(false);
      isRestoringRef.current = false;
    }
  };

  const resetAllState = () => {
    generationIdRef.current = null;
    setGenerationId(null);
    setGenerationUrl(null);
    setScriptTab("generate");
    setIdea("");
    setRawScript("");
    setStyle("cinematic");
    setStory(null);
    setIsGenerating(false);
    setError(null);
    setSelectedBeatIndex(null);
    setFeedback("");
    setIsRefining(false);
    setGlobalFeedback("");
    setEditingBeatIndex(null);
    setEditBeatDraft(null);
    setEditingTitle(false);
    setExpandedCharacters(false);
    setEditingCharIndex(null);
    setEditCharDraft(null);
    setExpandedLocations(false);
    setEditingLocIndex(null);
    setEditLocDraft(null);
    resetVisualDirection();
    setProtagonistFeedback("");
    setProtagonistError("");
    setFilm({
      filmId: null, status: "idle", currentShot: 0, totalShots: 0,
      phase: "filming", completedShots: [], finalVideoUrl: null, error: null,
      cost: { scene_refs_usd: 0, videos_usd: 0, total_usd: 0 },
    });
    setClipsApproved(false);
    setRegeneratingShotNum(null);
    setShotFeedback({});
    setPromptPreview({ shots: [], editedPrompts: {}, estimatedCostUsd: 0, isLoading: false });
    setTotalCost({ story: 0, characters: 0, locations: 0, keyMoments: 0, film: 0 });
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const startNewGeneration = async () => {
    // Save current generation if one exists
    if (generationIdRef.current) await saveGeneration();

    // Just reset to a clean slate — no Supabase row until first real action
    resetAllState();
    fetchGenerationsList();
  };

  // ============================================================
  // Visual Direction (Phase 3) Functions
  // ============================================================

  const resetVisualDirection = () => {
    setVisualStep(null);
    setMoodboardStep("protagonist");
    setCharacterImages({});
    setSettingImage(null);
    setLocationImages({});
    setKeyMoment(null);
    setProtagonistImage(null);
    setProtagonistLocked(false);
    setIsGeneratingProtagonist(false);
  };

  const startVisualDirection = async () => {
    if (!story) return;

    setVisualStep("characters");
    setMoodboardStep("protagonist");
    setProtagonistLocked(false);

    // Generate protagonist first (style anchor)
    await generateProtagonistImage();
  };

  // Generate protagonist without reference images (style anchor)
  const generateProtagonistImage = async () => {
    if (!story) return;

    setIsGeneratingProtagonist(true);
    setProtagonistError("");

    try {
      const response = await fetch(`${BACKEND_URL}/moodboard/generate-protagonist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to generate protagonist image");
      }

      const data = await response.json();

      // Find protagonist name
      const protagonist = story.characters.find((c) => c.id === data.character_id);

      const newProtImg = {
        character_id: data.character_id,
        character_name: protagonist?.name || "Protagonist",
        image: data.image,
        images: [],
        selectedIndex: 0,
        refImages: [],
      };
      setProtagonistImage(newProtImg);

      // Track cost
      if (data.cost_usd) {
        setTotalCost((prev) => ({ ...prev, characters: prev.characters + data.cost_usd }));
      }
      saveNow({ protagonistImage: newProtImg, isGeneratingProtagonist: false }, "moodboard");
    } catch (err) {
      setProtagonistError(err instanceof Error ? err.message : "Failed to generate protagonist image");
    } finally {
      setIsGeneratingProtagonist(false);
    }
  };

  const refineProtagonistImage = async () => {
    if (!story || !protagonistImage || !protagonistFeedback.trim()) return;

    setIsGeneratingProtagonist(true);
    setProtagonistError("");

    try {
      const requestBody: Record<string, unknown> = {
        story,
        character_id: protagonistImage.character_id,
        feedback: protagonistFeedback,
        protagonist_image: {
          image_base64: protagonistImage.image.image_base64,
          mime_type: protagonistImage.image.mime_type,
        },
      };

      // Include user-uploaded reference images if any
      if (protagonistImage.refImages.length > 0) {
        requestBody.reference_images = protagonistImage.refImages.map((r) => ({
          image_base64: r.base64,
          mime_type: r.mimeType,
        }));
      }

      const response = await fetch(`${BACKEND_URL}/moodboard/refine-character`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to refine protagonist image");
      }

      const data = await response.json();

      const refinedProt = {
        ...protagonistImage,
        image: data.image,
        images: [data.image],
        selectedIndex: 0,
      };
      setProtagonistImage(refinedProt);
      setProtagonistFeedback("");

      if (data.cost_usd) {
        setTotalCost((prev) => ({ ...prev, characters: prev.characters + data.cost_usd }));
      }
      saveNow({ protagonistImage: refinedProt, isGeneratingProtagonist: false }, "moodboard");
    } catch (err) {
      setProtagonistError(err instanceof Error ? err.message : "Failed to refine protagonist image");
    } finally {
      setIsGeneratingProtagonist(false);
    }
  };

  // Approve protagonist and generate everything else in parallel
  const approveProtagonist = async () => {
    if (!story || !protagonistImage) return;

    setProtagonistLocked(true);
    setMoodboardStep("full");

    // Initialize other character states
    const initialStates: Record<string, CharacterImageState> = {};
    story.characters
      .filter((char) => char.id !== protagonistImage.character_id)
      .forEach((char) => {
        initialStates[char.id] = {
          image: null,
          images: [],
          selectedIndex: 0,
          approved: false,
          isGenerating: true,
          feedback: "",
          promptUsed: "",
          error: "",
          refImages: [],
        };
      });
    setCharacterImages(initialStates);

    // Initialize location states (replaces single setting)
    const initialLocationStates: Record<string, LocationImageState> = {};
    if (story.locations && story.locations.length > 0) {
      story.locations.forEach((loc) => {
        initialLocationStates[loc.id] = {
          image: null,
          images: [],
          selectedIndex: 0,
          approved: false,
          isGenerating: true,
          feedback: "",
          promptUsed: "",
          error: "",
          refImages: [],
        };
      });
      setLocationImages(initialLocationStates);
    } else {
      // Backward compat: no locations, use single setting
      setSettingImage({
        image: null,
        images: [],
        selectedIndex: 0,
        approved: false,
        isGenerating: true,
        feedback: "",
        promptUsed: "",
        error: "",
        refImages: [],
      });
    }

    // Generate other characters and locations in parallel, using protagonist as reference
    const protagonistRef = {
      image_base64: protagonistImage.image.image_base64,
      mime_type: protagonistImage.image.mime_type,
    };

    const locationTasks = story.locations && story.locations.length > 0
      ? story.locations.map((loc) => generateLocationWithRef(loc.id, protagonistRef))
      : [generateSettingWithRef(protagonistRef)];

    await Promise.all([
      ...story.characters
        .filter((char) => char.id !== protagonistImage.character_id)
        .map((char) => generateCharacterImageWithRef(char.id, protagonistRef)),
      ...locationTasks,
    ]);
  };

  // Change protagonist look (with cascade warning)
  const handleChangeProtagonistLook = () => {
    const confirmed = window.confirm(
      "Changing the main character will regenerate all other images to match the new style. Continue?"
    );
    if (confirmed) {
      setProtagonistLocked(false);
      setMoodboardStep("protagonist");
      setCharacterImages({});
      setSettingImage(null);
      setLocationImages({});
      setKeyMoment(null);
      // Regenerate protagonist
      generateProtagonistImage();
    }
  };

  const generateCharacterImage = async (characterId: string) => {
    if (!story) return;

    setCharacterImages((prev) => ({
      ...prev,
      [characterId]: { ...prev[characterId], isGenerating: true, error: "" },
    }));

    try {
      const response = await fetch(`${BACKEND_URL}/moodboard/generate-character`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story, character_id: characterId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to generate character image");
      }

      const data = await response.json();

      setCharacterImages((prev) => ({
        ...prev,
        [characterId]: {
          ...prev[characterId],
          image: data.image,
          promptUsed: data.prompt_used,
          isGenerating: false,
        },
      }));
      // Track character image cost
      if (data.cost_usd) {
        setTotalCost((prev) => ({ ...prev, characters: prev.characters + data.cost_usd }));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate character image";
      setCharacterImages((prev) => ({
        ...prev,
        [characterId]: { ...prev[characterId], isGenerating: false, error: msg },
      }));
    }
  };

  // Generate character with protagonist as style reference
  const generateCharacterImageWithRef = async (characterId: string, protagonistRef: { image_base64: string; mime_type: string }) => {
    if (!story) return;

    setCharacterImages((prev) => ({
      ...prev,
      [characterId]: { ...prev[characterId], isGenerating: true, error: "" },
    }));

    try {
      const response = await fetch(`${BACKEND_URL}/moodboard/generate-character`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          story,
          character_id: characterId,
          protagonist_image: protagonistRef,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to generate character image");
      }

      const data = await response.json();

      setCharacterImages((prev) => ({
        ...prev,
        [characterId]: {
          ...prev[characterId],
          image: data.image,
          promptUsed: data.prompt_used,
          isGenerating: false,
        },
      }));
      if (data.cost_usd) {
        setTotalCost((prev) => ({ ...prev, characters: prev.characters + data.cost_usd }));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate character image";
      setCharacterImages((prev) => ({
        ...prev,
        [characterId]: { ...prev[characterId], isGenerating: false, error: msg },
      }));
    }
  };

  // Generate setting with protagonist as style reference
  const generateSettingWithRef = async (protagonistRef: { image_base64: string; mime_type: string }) => {
    if (!story) return;

    setSettingImage((prev) => prev ? { ...prev, isGenerating: true, error: "" } : {
      image: null,
      images: [],
      selectedIndex: 0,
      approved: false,
      isGenerating: true,
      feedback: "",
      promptUsed: "",
      error: "",
      refImages: [],
    });

    try {
      const response = await fetch(`${BACKEND_URL}/moodboard/generate-setting`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          story,
          protagonist_image: protagonistRef,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to generate setting image");
      }

      const data = await response.json();

      setSettingImage({
        image: data.image,
        images: [data.image],
        selectedIndex: 0,
        approved: false,
        isGenerating: false,
        feedback: "",
        promptUsed: data.prompt_used,
        error: "",
        refImages: [],
      });
      if (data.cost_usd) {
        setTotalCost((prev) => ({ ...prev, locations: prev.locations + data.cost_usd }));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate setting image";
      setSettingImage((prev) => prev ? { ...prev, isGenerating: false, error: msg } : null);
    }
  };

  // Generate a specific location image with protagonist as style reference
  const generateLocationWithRef = async (
    locationId: string,
    protagonistRef: { image_base64: string; mime_type: string }
  ) => {
    if (!story) return;

    setLocationImages((prev) => ({
      ...prev,
      [locationId]: {
        ...(prev[locationId] || { image: null, images: [], selectedIndex: 0, approved: false, feedback: "", promptUsed: "", error: "", refImages: [] }),
        isGenerating: true,
        error: "",
      },
    }));

    try {
      const response = await fetch(`${BACKEND_URL}/moodboard/generate-location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          story,
          location_id: locationId,
          protagonist_image: protagonistRef,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to generate location image");
      }

      const data = await response.json();
      setLocationImages((prev) => ({
        ...prev,
        [locationId]: {
          ...prev[locationId],
          image: data.image,
          promptUsed: data.prompt_used,
          isGenerating: false,
        },
      }));
      if (data.cost_usd) {
        setTotalCost((prev) => ({ ...prev, locations: prev.locations + data.cost_usd }));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate location image";
      setLocationImages((prev) => ({
        ...prev,
        [locationId]: { ...prev[locationId], isGenerating: false, error: msg },
      }));
    }
  };

  const refineCharacterImage = async (characterId: string) => {
    if (!story) return;
    const charState = characterImages[characterId];
    if (!charState?.feedback.trim()) return;

    setCharacterImages((prev) => ({
      ...prev,
      [characterId]: { ...prev[characterId], isGenerating: true, error: "" },
    }));

    try {
      // Include protagonist reference if available
      const requestBody: Record<string, unknown> = {
        story,
        character_id: characterId,
        feedback: charState.feedback,
      };

      if (protagonistImage) {
        requestBody.protagonist_image = {
          image_base64: protagonistImage.image.image_base64,
          mime_type: protagonistImage.image.mime_type,
        };
      }

      // Include user-uploaded reference images if any
      if (charState.refImages && charState.refImages.length > 0) {
        requestBody.reference_images = charState.refImages.map((r) => ({
          image_base64: r.base64,
          mime_type: r.mimeType,
        }));
      }

      const response = await fetch(`${BACKEND_URL}/moodboard/refine-character`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to refine character image");
      }

      const data = await response.json();

      setCharacterImages((prev) => ({
        ...prev,
        [characterId]: {
          ...prev[characterId],
          image: data.image,
          promptUsed: data.prompt_used,
          isGenerating: false,
          feedback: "",
        },
      }));
      // Track character refinement cost
      if (data.cost_usd) {
        setTotalCost((prev) => ({ ...prev, characters: prev.characters + data.cost_usd }));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to refine character image";
      setCharacterImages((prev) => ({
        ...prev,
        [characterId]: { ...prev[characterId], isGenerating: false, error: msg },
      }));
    }
  };

  // Retry (regenerate) character with protagonist reference
  const retryCharacterImage = async (characterId: string) => {
    if (!story || !protagonistImage) return;

    const protagonistRef = {
      image_base64: protagonistImage.image.image_base64,
      mime_type: protagonistImage.image.mime_type,
    };

    await generateCharacterImageWithRef(characterId, protagonistRef);
  };

  // Retry (regenerate) setting with protagonist reference
  const retrySettingImage = async () => {
    if (!story || !protagonistImage) return;

    const protagonistRef = {
      image_base64: protagonistImage.image.image_base64,
      mime_type: protagonistImage.image.mime_type,
    };

    await generateSettingWithRef(protagonistRef);
  };

  const approveCharacter = (characterId: string) => {
    setCharacterImages((prev) => ({
      ...prev,
      [characterId]: { ...prev[characterId], approved: true },
    }));
  };


  const refineSettingImage = async () => {
    if (!story || !settingImage?.feedback.trim()) return;

    setSettingImage((prev) => prev ? { ...prev, isGenerating: true, error: "" } : null);

    try {
      // Include protagonist reference if available
      const requestBody: Record<string, unknown> = {
        story,
        feedback: settingImage.feedback,
      };

      if (protagonistImage) {
        requestBody.protagonist_image = {
          image_base64: protagonistImage.image.image_base64,
          mime_type: protagonistImage.image.mime_type,
        };
      }

      const response = await fetch(`${BACKEND_URL}/moodboard/refine-setting`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to refine setting image");
      }

      const data = await response.json();

      setSettingImage((prev) => ({
        image: data.image,
        images: [data.image],
        selectedIndex: 0,
        approved: false,
        isGenerating: false,
        feedback: "",
        promptUsed: data.prompt_used,
        error: "",
        refImages: prev?.refImages || [],
      }));
      // Track setting refinement cost
      if (data.cost_usd) {
        setTotalCost((prev) => ({ ...prev, locations: prev.locations + data.cost_usd }));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to refine setting image";
      setSettingImage((prev) => prev ? { ...prev, isGenerating: false, error: msg } : null);
    }
  };

  const refineLocationImage = async (locationId: string) => {
    if (!story) return;
    const locState = locationImages[locationId];
    if (!locState?.feedback.trim()) return;

    setLocationImages((prev) => ({
      ...prev,
      [locationId]: { ...prev[locationId], isGenerating: true, error: "" },
    }));

    try {
      const requestBody: Record<string, unknown> = {
        story,
        location_id: locationId,
        feedback: locState.feedback,
      };

      if (protagonistImage) {
        requestBody.protagonist_image = {
          image_base64: protagonistImage.image.image_base64,
          mime_type: protagonistImage.image.mime_type,
        };
      }

      // Include user-uploaded reference images if any
      if (locState.refImages && locState.refImages.length > 0) {
        requestBody.reference_images = locState.refImages.map((r) => ({
          image_base64: r.base64,
          mime_type: r.mimeType,
        }));
      }

      const response = await fetch(`${BACKEND_URL}/moodboard/refine-location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to refine location image");
      }

      const data = await response.json();

      setLocationImages((prev) => ({
        ...prev,
        [locationId]: {
          ...prev[locationId],
          image: data.image,
          promptUsed: data.prompt_used,
          isGenerating: false,
          feedback: "",
        },
      }));
      if (data.cost_usd) {
        setTotalCost((prev) => ({ ...prev, locations: prev.locations + data.cost_usd }));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to refine location image";
      setLocationImages((prev) => ({
        ...prev,
        [locationId]: { ...prev[locationId], isGenerating: false, error: msg },
      }));
    }
  };

  // Build approved visuals payload from current state
  const buildApprovedVisuals = () => {
    if (!story || !protagonistImage) return null;

    const allCharacterImages = [
      {
        image_base64: protagonistImage.image.image_base64,
        mime_type: protagonistImage.image.mime_type,
      },
      ...story.characters
        .filter((char) => char.id !== protagonistImage.character_id && characterImages[char.id]?.image)
        .map((char) => ({
          image_base64: characterImages[char.id].image!.image_base64,
          mime_type: characterImages[char.id].image!.mime_type,
        })),
    ];

    // Build character_image_map for per-scene selection
    const characterImageMap: Record<string, { image_base64: string; mime_type: string }> = {};
    // Protagonist
    const protagonist = story.characters.find((c) => c.id === protagonistImage.character_id);
    if (protagonist) {
      characterImageMap[protagonist.id] = {
        image_base64: protagonistImage.image.image_base64,
        mime_type: protagonistImage.image.mime_type,
      };
    }
    // Other characters
    story.characters
      .filter((char) => char.id !== protagonistImage.character_id && characterImages[char.id]?.image)
      .forEach((char) => {
        characterImageMap[char.id] = {
          image_base64: characterImages[char.id].image!.image_base64,
          mime_type: characterImages[char.id].image!.mime_type,
        };
      });

    // Build location images and descriptions
    const locImages: Record<string, { image_base64: string; mime_type: string }> = {};
    const locDescs: Record<string, string> = {};
    if (story.locations && story.locations.length > 0) {
      story.locations.forEach((loc) => {
        const locState = locationImages[loc.id];
        if (locState?.image) {
          locImages[loc.id] = {
            image_base64: locState.image.image_base64,
            mime_type: locState.image.mime_type,
          };
        }
        locDescs[loc.id] = `${loc.description}. ${loc.atmosphere}`;
      });
    }

    // Backward compat: setting_image from first location or old setting
    let settingImg = undefined;
    let settingDesc = "";
    if (Object.keys(locImages).length > 0) {
      const firstLocId = Object.keys(locImages)[0];
      settingImg = locImages[firstLocId];
      settingDesc = locDescs[firstLocId] || "";
    } else if (settingImage?.image) {
      settingImg = {
        image_base64: settingImage.image.image_base64,
        mime_type: settingImage.image.mime_type,
      };
      settingDesc = story.setting
        ? `${story.setting.location}, ${story.setting.time}. ${story.setting.atmosphere}`
        : "";
    }

    return {
      character_images: allCharacterImages,
      character_image_map: characterImageMap,
      setting_image: settingImg,
      location_images: locImages,
      character_descriptions: story.characters.map(
        (char) => `${char.name} (${char.age} ${char.gender}): ${char.appearance}`
      ),
      setting_description: settingDesc,
      location_descriptions: locDescs,
    };
  };

  const continueToKeyMoment = async () => {
    if (!story || !protagonistImage) return;

    // Check that all locations are ready (or fallback to setting)
    const hasLocations = story.locations && story.locations.length > 0;
    if (hasLocations) {
      const allLocationsReady = story.locations.every((loc) => locationImages[loc.id]?.image);
      if (!allLocationsReady) return;
    } else if (!settingImage?.image) {
      return;
    }

    setVisualStep("key_moment");
    setKeyMoment({
      image: null,
      beat_number: 0,
      beat_description: "",
      isGenerating: true,
      feedback: "",
      promptUsed: "",
      entries: [],
      selectedIndex: 0,
    });

    const approvedVisuals = buildApprovedVisuals();
    if (!approvedVisuals) return;

    try {
      const response = await fetch(`${BACKEND_URL}/moodboard/generate-key-moment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story, approved_visuals: approvedVisuals }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to generate key moment");
      }

      const data = await response.json();

      // Build entries from the key_moments array (3 distinct scenes)
      const entries: KeyMomentEntry[] = (data.key_moments || [data.key_moment]).map(
        (km: { beat_number: number; beat_description: string; image: MoodboardImage; prompt_used: string }) => ({
          beat_number: km.beat_number,
          beat_description: km.beat_description,
          image: km.image,
          promptUsed: km.prompt_used,
        })
      );

      const primary = entries[0];
      const newKeyMoment = {
        image: primary.image,
        beat_number: primary.beat_number,
        beat_description: primary.beat_description,
        isGenerating: false,
        feedback: "",
        promptUsed: primary.promptUsed,
        entries,
        selectedIndex: 0,
      };
      setKeyMoment(newKeyMoment);
      if (data.cost_usd) {
        setTotalCost((prev) => ({ ...prev, keyMoments: prev.keyMoments + data.cost_usd }));
      }
      saveNow({ keyMoment: newKeyMoment }, "key_moments");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate key moment");
      setKeyMoment((prev) => prev ? { ...prev, isGenerating: false } : null);
    }
  };

  const refineKeyMoment = async () => {
    if (!story || !keyMoment?.feedback.trim() || !protagonistImage) return;

    setKeyMoment((prev) => prev ? { ...prev, isGenerating: true } : null);

    const approvedVisuals = buildApprovedVisuals();
    if (!approvedVisuals) return;

    try {
      const response = await fetch(`${BACKEND_URL}/moodboard/refine-key-moment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          story,
          approved_visuals: approvedVisuals,
          feedback: keyMoment.feedback,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to refine key moment");
      }

      const data = await response.json();

      setKeyMoment((prev) => {
        // Replace the currently selected entry with the refined version
        const newEntry: KeyMomentEntry = {
          beat_number: data.key_moment.beat_number,
          beat_description: data.key_moment.beat_description,
          image: data.key_moment.image,
          promptUsed: data.key_moment.prompt_used,
        };
        const entries = [...(prev?.entries || [])];
        const idx = prev?.selectedIndex || 0;
        if (entries.length > idx) {
          entries[idx] = newEntry;
        } else {
          entries.push(newEntry);
        }
        return {
          image: data.key_moment.image,
          beat_number: data.key_moment.beat_number,
          beat_description: data.key_moment.beat_description,
          isGenerating: false,
          feedback: "",
          promptUsed: data.key_moment.prompt_used,
          entries,
          selectedIndex: idx,
        };
      });
      // Track key moment refinement cost
      if (data.cost_usd) {
        setTotalCost((prev) => ({ ...prev, keyMoments: prev.keyMoments + data.cost_usd }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refine key moment");
      setKeyMoment((prev) => prev ? { ...prev, isGenerating: false } : null);
    }
  };


  // ============================================================
  // Phase 4: Film Generation Functions
  // ============================================================

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Auto-save generation state when key milestones change
  // Debounced to avoid spamming on rapid state changes
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    // Use refs to avoid stale closure issues
    if (!generationIdRef.current || isRestoringRef.current) return;
    // Only save if we have meaningful state
    if (!story && !protagonistImage) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveGeneration();
    }, 500); // 500ms debounce — fast enough to catch before refresh
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    generationId, story, protagonistImage, protagonistLocked, moodboardStep,
    characterImages, locationImages, keyMoment, promptPreview,
    visualStep, film, clipsApproved, totalCost,
  ]);

  // On mount: only restore if URL has ?g= param. Otherwise start fresh.
  // Works like ChatGPT/Claude: bare URL = blank slate, ?g=xxx = restore that generation.
  useEffect(() => {
    const init = async () => {
      fetchGenerationsList();

      const urlParams = new URLSearchParams(window.location.search);
      const urlGenId = urlParams.get("g");
      if (urlGenId) {
        await restoreGeneration(urlGenId);
      }
      // No ?g= param → fresh blank state. User starts generating to create an entry.
    };
    init().catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startFilmGeneration = async () => {
    if (!story || !keyMoment?.image || !protagonistImage) return;

    const approvedVisuals = buildApprovedVisuals();
    if (!approvedVisuals) return;

    // Build key moment image for video reference
    const keyMomentImage = {
      image_base64: keyMoment.image.image_base64,
      mime_type: keyMoment.image.mime_type,
    };

    setFilm({
      filmId: null,
      status: "generating",
      currentShot: 0,
      totalShots: getScenes(story).length || story.beats.length,
      phase: "filming",
      completedShots: [],
      finalVideoUrl: null,
      error: null,
      cost: { scene_refs_usd: 0, videos_usd: 0, total_usd: 0 },
    });

    try {
      const response = await fetch(`${BACKEND_URL}/film/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          story,
          approved_visuals: approvedVisuals,
          key_moment_image: keyMomentImage,
          generation_id: generationIdRef.current,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to start film generation");
      }

      const data = await response.json();

      setFilm((prev) => ({
        ...prev,
        filmId: data.film_id,
        totalShots: data.total_shots,
      }));

      // Save film_id to Supabase generation
      const gid = generationIdRef.current;
      if (gid) {
        supaUpdateGeneration(gid, { film_id: data.film_id, status: "filming" }).catch(console.error);
      }

      // Start polling
      startPolling(data.film_id);
    } catch (err) {
      setFilm((prev) => ({
        ...prev,
        status: "failed",
        error: err instanceof Error ? err.message : "Failed to start film generation",
      }));
    }
  };

  // --- Prompt Preview (Pre-Flight Check) ---

  const fetchPromptPreviews = async () => {
    if (!story || !protagonistImage) return;

    const approvedVisuals = buildApprovedVisuals();
    if (!approvedVisuals) return;

    setPromptPreview((prev) => ({ ...prev, isLoading: true }));

    try {
      const selectedEntry = keyMoment?.entries[keyMoment.selectedIndex];
      const response = await fetch(`${BACKEND_URL}/film/preview-prompts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          story,
          approved_visuals: approvedVisuals,
          key_moment_image: selectedEntry?.image
            ? { image_base64: selectedEntry.image.image_base64, mime_type: selectedEntry.image.mime_type }
            : { image_base64: "", mime_type: "image/png" },
          beat_numbers: keyMoment?.entries.map((e) => e.beat_number) || [],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to preview prompts");
      }

      const data = await response.json();

      const editedPrompts: Record<number, string> = {};
      for (const shot of data.shots) {
        editedPrompts[shot.beat_number] = shot.veo_prompt;
      }

      setPromptPreview({
        shots: data.shots,
        editedPrompts,
        estimatedCostUsd: data.estimated_cost_usd,
        isLoading: false,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to preview prompts");
      setPromptPreview((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const startFilmWithEditedPrompts = async () => {
    if (!story || !keyMoment?.entries.length || !protagonistImage) return;

    const approvedVisuals = buildApprovedVisuals();
    if (!approvedVisuals) return;

    // Build a map from beat_number -> key moment image for per-shot references
    const keyMomentByBeat: Record<number, { image_base64: string; mime_type: string }> = {};
    for (const entry of keyMoment.entries) {
      keyMomentByBeat[entry.beat_number] = {
        image_base64: entry.image.image_base64,
        mime_type: entry.image.mime_type,
      };
    }

    // Use the selected key moment as the overall key_moment_image (backward compat)
    const selectedEntry = keyMoment.entries[keyMoment.selectedIndex];
    const keyMomentImage = {
      image_base64: selectedEntry.image.image_base64,
      mime_type: selectedEntry.image.mime_type,
    };

    const editedShots = promptPreview.shots.map((shot) => ({
      beat_number: shot.beat_number,
      veo_prompt: promptPreview.editedPrompts[shot.beat_number] || shot.veo_prompt,
      // Attach the corresponding key moment image as the sole reference for this shot
      reference_image: keyMomentByBeat[shot.beat_number] || null,
    }));

    setFilm({
      filmId: null,
      status: "generating",
      currentShot: 0,
      totalShots: editedShots.length,
      phase: "filming",
      completedShots: [],
      finalVideoUrl: null,
      error: null,
      cost: { scene_refs_usd: 0, videos_usd: 0, total_usd: 0 },
    });

    try {
      const response = await fetch(`${BACKEND_URL}/film/generate-with-prompts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          story,
          approved_visuals: approvedVisuals,
          key_moment_image: keyMomentImage,
          edited_shots: editedShots,
          generation_id: generationIdRef.current,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to start generation");
      }

      const data = await response.json();

      setFilm((prev) => ({
        ...prev,
        filmId: data.film_id,
        totalShots: data.total_shots,
      }));

      // Save film_id to Supabase generation
      const gid = generationIdRef.current;
      if (gid) {
        supaUpdateGeneration(gid, { film_id: data.film_id, status: "filming" }).catch(console.error);
      }

      startPolling(data.film_id);
    } catch (err) {
      setFilm((prev) => ({
        ...prev,
        status: "failed",
        error: err instanceof Error ? err.message : "Failed to start film generation",
      }));
    }
  };

  const startPolling = (filmId: string) => {
    // Clear any existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Poll every 5 seconds
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/film/${filmId}`);
        if (!response.ok) {
          throw new Error("Failed to get film status");
        }

        const data = await response.json();

        setFilm({
          filmId: data.film_id,
          status: data.status,
          currentShot: data.current_shot,
          totalShots: data.total_shots,
          phase: data.phase,
          completedShots: data.completed_shots,
          finalVideoUrl: data.final_video_url,
          error: data.error_message,
          cost: data.cost || { scene_refs_usd: 0, videos_usd: 0, total_usd: 0 },
        });

        // Update film cost in total
        if (data.cost) {
          setTotalCost((prev) => ({ ...prev, film: data.cost.total_usd }));
        }

        // Persist film job progress to Supabase (fire-and-forget)
        supaUpsertFilmJob({
          film_id: data.film_id,
          generation_id: generationIdRef.current,
          status: data.status,
          total_shots: data.total_shots,
          current_shot: data.current_shot,
          phase: data.phase,
          completed_shots: data.completed_shots || [],
          final_video_url: data.final_video_url,
          error_message: data.error_message,
          cost_scene_refs: data.cost?.scene_refs_usd || 0,
          cost_videos: data.cost?.videos_usd || 0,
        }).catch(console.error);

        // Stop polling when done
        if (data.status === "ready" || data.status === "failed") {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          // Update generation status in Supabase on terminal state
          const gid = generationIdRef.current;
          if (gid) {
            supaUpdateGeneration(gid, {
              status: data.status === "ready" ? "ready" : "failed",
              film_id: filmId,
            }).catch(console.error);
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 5000);
  };

  const resetFilm = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setFilm({
      filmId: null,
      status: "idle",
      currentShot: 0,
      totalShots: 0,
      phase: "filming",
      completedShots: [],
      finalVideoUrl: null,
      error: null,
      cost: { scene_refs_usd: 0, videos_usd: 0, total_usd: 0 },
    });
    setClipsApproved(false);
    setRegeneratingShotNum(null);
    setShotFeedback({});
  };

  const regenerateShot = async (shotNumber: number) => {
    if (!film.filmId) return;
    const feedbackText = shotFeedback[shotNumber] || null;

    setRegeneratingShotNum(shotNumber);

    try {
      const response = await fetch(
        `${BACKEND_URL}/film/${film.filmId}/shot/${shotNumber}/regenerate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ feedback: feedbackText }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to regenerate shot");
      }

      // Clear feedback for this shot
      setShotFeedback((prev) => {
        const next = { ...prev };
        delete next[shotNumber];
        return next;
      });

      // Poll until the shot is regenerated (status returns to "ready")
      const pollRegen = setInterval(async () => {
        try {
          const statusRes = await fetch(`${BACKEND_URL}/film/${film.filmId}`);
          if (!statusRes.ok) return;
          const data = await statusRes.json();

          setFilm({
            filmId: data.film_id,
            status: data.status,
            currentShot: data.current_shot,
            totalShots: data.total_shots,
            phase: data.phase,
            completedShots: data.completed_shots,
            finalVideoUrl: data.final_video_url,
            error: data.error_message,
            cost: data.cost || { scene_refs_usd: 0, videos_usd: 0, total_usd: 0 },
          });

          if (data.cost) {
            setTotalCost((prev) => ({ ...prev, film: data.cost.total_usd }));
          }

          if (data.status === "ready" || data.status === "failed") {
            clearInterval(pollRegen);
            setRegeneratingShotNum(null);
          }
        } catch {
          // Continue polling
        }
      }, 5000);
    } catch (err) {
      setRegeneratingShotNum(null);
      console.error("Regeneration failed:", err);
    }
  };

  const resetAll = () => {
    resetFilm();
    resetVisualDirection();
    setStory(null);
    setIdea("");
    // Reset all costs
    setTotalCost({
      story: 0,
      characters: 0,
      locations: 0,
      keyMoments: 0,
      film: 0,
    });
  };

  // Calculate grand total cost
  const grandTotalCost = totalCost.story + totalCost.characters + totalCost.locations + totalCost.keyMoments + totalCost.film;

  // Helper: convert File to RefImageUpload
  const fileToRefImage = (file: File): Promise<RefImageUpload> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1];
        resolve({ base64, mimeType: file.type || "image/png", name: file.name });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // Helper: handle ref image file input for any entity
  const handleRefImageUpload = async (
    files: FileList | null,
    maxCount: number,
    setter: (imgs: RefImageUpload[]) => void,
    existing: RefImageUpload[]
  ) => {
    if (!files) return;
    const remaining = maxCount - existing.length;
    const toProcess = Array.from(files).slice(0, remaining);
    const newRefs = await Promise.all(toProcess.map(fileToRefImage));
    setter([...existing, ...newRefs]);
  };

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="min-h-screen bg-[#010101]">
      <Header />

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        {/* Step Indicator + Save Draft */}
        <div className="relative flex items-center justify-center gap-2 mb-8">
          {[
            { num: 1, label: "Create Your Script", active: !visualStep && film.status === "idle" },
            { num: 2, label: "Build Your Visuals", active: !!visualStep && film.status === "idle" },
            { num: 3, label: "Create Your Video", active: film.status !== "idle" },
          ].map((step, i) => {
            const isCompleted = step.num === 1 ? (!!visualStep || film.status !== "idle")
              : step.num === 2 ? film.status !== "idle"
              : film.status === "ready";
            return (
              <div key={step.num} className="flex items-center gap-2">
                {i > 0 && <div className={`w-16 sm:w-24 h-[2px] ${isCompleted || step.active ? "bg-[#9C99FF]" : "bg-white/10"}`} />}
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    step.active ? "bg-[#9C99FF] text-black" : isCompleted ? "bg-[#9C99FF] text-black" : "bg-white/10 text-white/50"
                  }`}>
                    {isCompleted ? "\u2713" : step.num}
                  </div>
                  <span className={`text-sm font-medium whitespace-nowrap ${step.active ? "text-white" : isCompleted ? "text-white/70" : "text-white/40"}`}>
                    {step.label}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Save Draft Button — right-aligned */}
          {story && generationId && (
            <button
              onClick={handleSaveDraft}
              disabled={draftSaveStatus === "saving"}
              className={`absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                draftSaveStatus === "saved"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : draftSaveStatus === "saving"
                  ? "bg-white/5 text-white/40 border border-white/10"
                  : "bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20"
              }`}
            >
              {draftSaveStatus === "saved" ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved
                </>
              ) : draftSaveStatus === "saving" ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Save Draft
                </>
              )}
            </button>
          )}
        </div>

        {/* Script Input Tabs (only visible during Step 1) */}
        {!visualStep && film.status === "idle" && (
          <div className="flex gap-6 mb-6">
            <button
              onClick={() => setScriptTab("generate")}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                scriptTab === "generate"
                  ? "text-white border-white"
                  : "text-white/50 border-transparent hover:text-white/70"
              }`}
            >
              Generate with AI
            </button>
            <button
              onClick={() => setScriptTab("insert")}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                scriptTab === "insert"
                  ? "text-white border-white"
                  : "text-white/50 border-transparent hover:text-white/70"
              }`}
            >
              Insert Your Script
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Input Form */}
          <div className="bg-[#0F0E13] rounded-3xl outline outline-1 outline-[#1A1E2F] p-6">
            {scriptTab === "generate" ? (
              <>
                <h2 className="text-xl font-semibold text-white mb-2">
                  Your Episode Idea
                </h2>
                <p className="text-sm text-[#ADADAD] mb-6">
                  Describe your idea for the episode. Include characters, setting, genre, dialogue style, and other details you want to see.
                </p>

                <div className="mb-6">
                  <textarea
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                    placeholder="e.g., A robot learns to dance in an abandoned factory..."
                    className="w-full h-48 bg-[#262626] rounded-2xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#B8B6FC] resize-none"
                  />
                </div>

                <div className="flex items-center gap-3 mb-6">
                  <span className="text-xs text-[#ADADAD] bg-[#262626] px-3 py-1.5 rounded-full">Episode Length: ~60s</span>
                </div>

                <button
                  onClick={generateStory}
                  disabled={isGenerating || !idea.trim()}
                  className="w-full py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-[#9C99FF] to-[#7370FF] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Generating Script...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Generate Script
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-white mb-2">
                  Your Episode Script
                </h2>
                <p className="text-sm text-[#ADADAD] mb-6">
                  Recommended: organize your script into 3 main scenes of no more than 1 min in length
                </p>

                <div className="mb-6">
                  <textarea
                    value={rawScript}
                    onChange={(e) => setRawScript(e.target.value)}
                    placeholder="Paste your script here..."
                    className="w-full h-64 bg-[#262626] rounded-2xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#B8B6FC] resize-none font-mono text-sm leading-relaxed"
                  />
                </div>

                <div className="flex items-center gap-3 mb-6">
                  <span className="text-xs text-[#ADADAD] bg-[#262626] px-3 py-1.5 rounded-full">Episode Length: ~60s</span>
                </div>

                <button
                  onClick={parseScript}
                  disabled={isGenerating || !rawScript.trim()}
                  className="w-full py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-[#9C99FF] to-[#7370FF] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Generating Scenes...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Generate Scenes
                    </>
                  )}
                </button>
              </>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Right Column: Story Structure */}
          <div className="bg-[#0F0E13] rounded-3xl outline outline-1 outline-[#1A1E2F] p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Story Structure</h2>

            {/* Tab switcher */}
            {story && !isGenerating && (
              <div className="flex gap-1 bg-[#1A1E2F] rounded-lg p-1 mb-6">
                <button
                  onClick={() => setRightTab("assets")}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                    rightTab === "assets" ? "bg-[#B8B6FC] text-black" : "text-[#ADADAD] hover:text-white"
                  }`}
                >
                  Assets
                </button>
                <button
                  onClick={() => setRightTab("script")}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                    rightTab === "script" ? "bg-[#B8B6FC] text-black" : "text-[#ADADAD] hover:text-white"
                  }`}
                >
                  Script
                </button>
              </div>
            )}

            {!story && !isGenerating && (
              <div className="text-center py-16 text-[#ADADAD]">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <p>{scriptTab === "generate" ? "Enter your idea and click Generate Script" : "Paste your script and click Generate Scenes"}</p>
              </div>
            )}

            {isGenerating && (
              <div className="text-center py-16">
                <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-[#B8B6FC]" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-[#ADADAD]">Crafting your story...</p>
              </div>
            )}

            {story && !isGenerating && (
              <div className="space-y-4">
                {/* Editable title */}
                <div className="flex items-center gap-2 mb-2">
                  {editingTitle ? (
                    <input
                      autoFocus
                      value={story.title}
                      onChange={(e) => setStory({ ...story, title: e.target.value })}
                      onBlur={() => setEditingTitle(false)}
                      onKeyDown={(e) => { if (e.key === "Enter") setEditingTitle(false); }}
                      className="text-lg font-semibold text-white bg-[#262626] rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-[#B8B6FC]"
                    />
                  ) : (
                    <h3
                      className="text-lg font-semibold text-white cursor-pointer hover:text-[#B8B6FC] transition-colors"
                      onClick={() => setEditingTitle(true)}
                      title="Click to edit title"
                    >
                      {story.title}
                    </h3>
                  )}
                  {/* Style selection will come later */}
                </div>

                {/* ===== ASSETS TAB ===== */}
                {rightTab === "assets" && (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                    {/* Characters */}
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-3">Characters ({story.characters.length})</h4>
                      <div className="space-y-2">
                        {story.characters.map((char, ci) => (
                          <div key={char.id} className="bg-[#1A1E2F] rounded-xl p-4">
                            {editingCharIndex === ci && editCharDraft ? (
                              <div className="space-y-2">
                                <div className="flex gap-2">
                                  <input value={editCharDraft.name} onChange={(e) => setEditCharDraft({ ...editCharDraft, name: e.target.value })} className="flex-1 bg-[#262626] text-white text-sm rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#B8B6FC]" placeholder="Name" />
                                  <input value={editCharDraft.age} onChange={(e) => setEditCharDraft({ ...editCharDraft, age: e.target.value })} className="w-24 bg-[#262626] text-white/70 text-sm rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#B8B6FC]" placeholder="Age" />
                                  <input value={editCharDraft.gender} onChange={(e) => setEditCharDraft({ ...editCharDraft, gender: e.target.value })} className="w-20 bg-[#262626] text-white/70 text-sm rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#B8B6FC]" placeholder="Gender" />
                                </div>
                                <textarea value={editCharDraft.appearance} onChange={(e) => setEditCharDraft({ ...editCharDraft, appearance: e.target.value })} className="w-full bg-[#262626] text-white/70 text-sm rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#B8B6FC] resize-none" rows={2} placeholder="Appearance..." />
                                <div className="flex gap-2">
                                  <button onClick={() => { const updated = [...story.characters]; updated[ci] = editCharDraft; setStory({ ...story, characters: updated }); setEditingCharIndex(null); setEditCharDraft(null); }} className="px-3 py-1 bg-[#B8B6FC] text-black text-xs font-medium rounded hover:opacity-90">Save</button>
                                  <button onClick={() => { setEditingCharIndex(null); setEditCharDraft(null); }} className="px-3 py-1 bg-[#333] text-[#ADADAD] text-xs rounded hover:text-white">Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-white font-medium text-sm">{char.name}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/50 uppercase">{char.role}</span>
                                  </div>
                                  <span className="text-white/40 text-xs">{char.age} {char.gender}</span>
                                  <p className="text-white/60 text-xs mt-1">{char.appearance}</p>
                                </div>
                                <button onClick={() => { setEditingCharIndex(ci); setEditCharDraft({ ...char }); }} className="text-xs text-[#ADADAD] hover:text-white px-2 py-1 rounded hover:bg-white/10 flex-shrink-0">Edit</button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Locations */}
                    {story.locations && story.locations.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-3">Settings ({story.locations.length})</h4>
                        <div className="space-y-2">
                          {story.locations.map((loc, li) => (
                            <div key={loc.id} className="bg-[#1A1E2F] rounded-xl p-4">
                              {editingLocIndex === li && editLocDraft ? (
                                <div className="space-y-2">
                                  <input value={editLocDraft.name} onChange={(e) => setEditLocDraft({ ...editLocDraft, name: e.target.value })} className="w-full bg-[#262626] text-white text-sm font-medium rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#B8B6FC]" placeholder="Location name..." />
                                  <textarea value={editLocDraft.description} onChange={(e) => setEditLocDraft({ ...editLocDraft, description: e.target.value })} className="w-full bg-[#262626] text-white/70 text-sm rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#B8B6FC] resize-none" rows={2} placeholder="Description..." />
                                  <input value={editLocDraft.atmosphere} onChange={(e) => setEditLocDraft({ ...editLocDraft, atmosphere: e.target.value })} className="w-full bg-[#262626] text-white/70 text-sm rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#B8B6FC]" placeholder="Atmosphere..." />
                                  <div className="flex gap-2">
                                    <button onClick={() => { const updated = [...story.locations]; updated[li] = editLocDraft; setStory({ ...story, locations: updated }); setEditingLocIndex(null); setEditLocDraft(null); }} className="px-3 py-1 bg-[#B8B6FC] text-black text-xs font-medium rounded hover:opacity-90">Save</button>
                                    <button onClick={() => { setEditingLocIndex(null); setEditLocDraft(null); }} className="px-3 py-1 bg-[#333] text-[#ADADAD] text-xs rounded hover:text-white">Cancel</button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start justify-between">
                                  <div>
                                    <span className="text-white font-medium text-sm">{loc.name || loc.id}</span>
                                    <p className="text-white/60 text-xs mt-1">{loc.description}</p>
                                    <p className="text-white/40 text-xs mt-0.5">{loc.atmosphere}</p>
                                  </div>
                                  <button onClick={() => { setEditingLocIndex(li); setEditLocDraft({ ...loc }); }} className="text-xs text-[#ADADAD] hover:text-white px-2 py-1 rounded hover:bg-white/10 flex-shrink-0">Edit</button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ===== SCRIPT TAB ===== */}
                {rightTab === "script" && (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                    {getScenes(story).map((scene, index) => {
                      const isEditing = editingSceneIndex === index;
                      const isSelected = selectedBeatIndex === index;
                      const draft = isEditing ? editSceneDraft : null;
                      const locationName = story.locations.find(l => l.id === scene.setting_id)?.name || scene.setting_id;

                      return (
                        <div
                          key={scene.scene_number}
                          className={`bg-[#1A1E2F] rounded-xl p-4 transition-all ${
                            isSelected || isEditing ? "ring-2 ring-[#B8B6FC]" : "hover:bg-[#242836]"
                          }`}
                        >
                          {/* Scene header */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-[#B8B6FC] rounded-full flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
                                {scene.scene_number}
                              </div>
                              <div>
                                <span className="text-white font-semibold text-sm">{scene.title || `Scene ${scene.scene_number}`}</span>
                                <span className="text-white/30 text-xs ml-2">{scene.duration}</span>
                              </div>
                              {/* scene_change badge removed — derived automatically from setting_id */}
                            </div>
                            {!isEditing && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingSceneIndex(index);
                                  setEditSceneDraft({ ...scene });
                                  setSelectedBeatIndex(null);
                                }}
                                className="text-xs text-[#ADADAD] hover:text-white px-2 py-1 rounded hover:bg-white/10"
                              >
                                Edit
                              </button>
                            )}
                          </div>

                          {isEditing && draft ? (
                            /* ---- Edit mode ---- */
                            <div className="space-y-3">
                              {/* Title + Duration */}
                              <div className="flex gap-2">
                                <input
                                  value={draft.title}
                                  onChange={(e) => setEditSceneDraft({ ...draft, title: e.target.value })}
                                  className="flex-1 bg-[#262626] text-white text-sm rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#B8B6FC]"
                                  placeholder="Scene title..."
                                />
                                <select
                                  value={draft.duration}
                                  onChange={(e) => setEditSceneDraft({ ...draft, duration: e.target.value })}
                                  className="w-28 bg-[#262626] text-white/70 text-sm rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#B8B6FC]"
                                >
                                  {[6,7,8,9].map(s => <option key={s} value={`${s} seconds`}>{s}s</option>)}
                                </select>
                              </div>
                              {/* Scene heading */}
                              <input
                                value={draft.scene_heading || ""}
                                onChange={(e) => setEditSceneDraft({ ...draft, scene_heading: e.target.value })}
                                placeholder="INT. KITCHEN - NIGHT"
                                className="w-full bg-[#262626] text-white/50 text-xs font-mono rounded px-2 py-1 placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#B8B6FC]"
                              />
                              {/* Characters on screen (multi-select) */}
                              <div>
                                <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">Characters</label>
                                <div className="flex flex-wrap gap-1">
                                  {story.characters.map(c => {
                                    const isIn = (draft.characters_on_screen || []).includes(c.id);
                                    return (
                                      <button
                                        key={c.id}
                                        onClick={() => {
                                          const updated = isIn
                                            ? draft.characters_on_screen.filter(id => id !== c.id)
                                            : [...(draft.characters_on_screen || []), c.id];
                                          setEditSceneDraft({ ...draft, characters_on_screen: updated });
                                        }}
                                        className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                                          isIn ? "border-[#B8B6FC] text-[#B8B6FC] bg-[#B8B6FC]/10" : "border-white/20 text-white/50 hover:border-white/40"
                                        }`}
                                      >
                                        {c.name}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                              {/* Setting (single select) */}
                              <div>
                                <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">Setting</label>
                                <select
                                  value={draft.setting_id}
                                  onChange={(e) => setEditSceneDraft({ ...draft, setting_id: e.target.value })}
                                  className="w-full bg-[#262626] text-white text-sm rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#B8B6FC]"
                                >
                                  {story.locations.map(loc => (
                                    <option key={loc.id} value={loc.id}>{loc.name || loc.id}</option>
                                  ))}
                                </select>
                              </div>
                              {/* Action */}
                              <div>
                                <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">Action</label>
                                <textarea
                                  value={draft.action}
                                  onChange={(e) => setEditSceneDraft({ ...draft, action: e.target.value })}
                                  className="w-full bg-[#262626] text-white/70 text-sm italic rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#B8B6FC] resize-none"
                                  rows={2}
                                  placeholder="What characters physically do..."
                                />
                              </div>
                              {/* Dialogue */}
                              <div>
                                <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1">Dialogue</label>
                                <textarea
                                  value={draft.dialogue || ""}
                                  onChange={(e) => setEditSceneDraft({ ...draft, dialogue: e.target.value || null })}
                                  className="w-full bg-[#262626] text-white text-sm rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#B8B6FC] resize-none"
                                  rows={2}
                                  placeholder="CHARACTER: What they say..."
                                />
                              </div>
                              {/* Image prompt (collapsible) */}
                              <details className="group">
                                <summary className="text-[10px] text-white/40 uppercase tracking-wider cursor-pointer hover:text-white/60">Image Prompt</summary>
                                <textarea
                                  value={draft.image_prompt}
                                  onChange={(e) => setEditSceneDraft({ ...draft, image_prompt: e.target.value })}
                                  className="w-full mt-1 bg-[#262626] text-white/60 text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#B8B6FC] resize-none"
                                  rows={3}
                                  placeholder="Camera sees: composition, framing, lighting..."
                                />
                              </details>
                              {/* Regenerate notes (collapsible) */}
                              <details className="group">
                                <summary className="text-[10px] text-white/40 uppercase tracking-wider cursor-pointer hover:text-white/60">Regenerate Notes</summary>
                                <textarea
                                  value={draft.regenerate_notes}
                                  onChange={(e) => setEditSceneDraft({ ...draft, regenerate_notes: e.target.value })}
                                  className="w-full mt-1 bg-[#262626] text-white/60 text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#B8B6FC] resize-none"
                                  rows={2}
                                  placeholder="What can vary without breaking continuity..."
                                />
                              </details>
                              {/* Save/Cancel */}
                              <div className="flex gap-2 pt-2 border-t border-white/10">
                                <button
                                  onClick={() => saveSceneEdit(index, draft)}
                                  className="px-4 py-2 bg-[#B8B6FC] text-black text-sm font-medium rounded-lg hover:opacity-90"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => { setEditingSceneIndex(null); setEditSceneDraft(null); }}
                                  className="px-4 py-2 bg-[#262626] text-[#ADADAD] text-sm rounded-lg hover:bg-[#333] hover:text-white"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* ---- Read mode ---- */
                            <>
                              {scene.scene_heading && (
                                <p className="text-white/50 text-xs font-mono mb-2">{scene.scene_heading}</p>
                              )}
                              {/* Location + Characters chips */}
                              <div className="flex flex-wrap gap-1.5 mb-2">
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/50">{locationName}</span>
                                {(scene.characters_on_screen || []).map(charId => {
                                  const c = story.characters.find(ch => ch.id === charId);
                                  return <span key={charId} className="text-[10px] px-2 py-0.5 rounded-full bg-[#B8B6FC]/10 text-[#B8B6FC]">{c?.name || charId}</span>;
                                })}
                              </div>
                              {/* Action */}
                              {scene.action && <p className="text-white/70 text-sm italic mb-1">{scene.action}</p>}
                              {/* Dialogue */}
                              {scene.dialogue && scene.dialogue.split("\n").map((line, li) => (
                                <p key={li} className="text-[#ADADAD] text-sm">
                                  {line.includes(":") ? (
                                    <>
                                      <span className="text-white/70 font-medium">{line.split(":")[0]}:</span>{" "}
                                      &ldquo;{line.split(":").slice(1).join(":").trim()}&rdquo;
                                    </>
                                  ) : (
                                    <>&ldquo;{line}&rdquo;</>
                                  )}
                                </p>
                              ))}
                              {/* Refine section */}
                              <div
                                className="mt-3 pt-3 border-t border-white/10 cursor-pointer"
                                onClick={() => setSelectedBeatIndex(isSelected ? null : index)}
                              >
                                {isSelected ? (
                                  <div onClick={(e) => e.stopPropagation()}>
                                    <label className="block text-xs text-[#ADADAD] mb-2">Feedback for this scene</label>
                                    <textarea
                                      value={feedback}
                                      onChange={(e) => setFeedback(e.target.value)}
                                      placeholder="e.g., Make it more dramatic..."
                                      className="w-full h-20 bg-[#262626] rounded-xl px-3 py-2 text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#B8B6FC] resize-none"
                                    />
                                    <button
                                      onClick={refineBeat}
                                      disabled={isRefining || !feedback.trim()}
                                      className="mt-2 px-4 py-2 bg-[#B8B6FC] text-black text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {isRefining ? "Refining..." : "Refine This Scene"}
                                    </button>
                                  </div>
                                ) : (
                                  <p className="text-xs text-[#555] text-center">Click to refine this scene</p>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}

                    {/* Global feedback */}
                    <div className="pt-4 border-t border-white/10">
                      <label className="block text-xs text-[#ADADAD] mb-2">Overall feedback (optional)</label>
                      <textarea
                        value={globalFeedback}
                        onChange={(e) => setGlobalFeedback(e.target.value)}
                        placeholder="e.g., Make the ending more hopeful..."
                        className="w-full h-16 bg-[#262626] rounded-xl px-3 py-2 text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#B8B6FC] resize-none"
                      />
                      <div className="flex gap-3 mt-3">
                        <button
                          onClick={regenerateStory}
                          disabled={isGenerating}
                          className="flex-1 py-3 bg-[#262626] text-white rounded-xl font-medium hover:bg-[#333] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Regenerate All
                        </button>
                        <button
                          onClick={startVisualDirection}
                          className="flex-1 py-3 bg-gradient-to-r from-[#9C99FF] to-[#7370FF] text-white rounded-xl font-medium hover:opacity-90"
                        >
                          Approve & Continue
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Visual Direction */}
        {visualStep && (
          <div className="mt-8 bg-[#0F0E13] rounded-3xl outline outline-1 outline-[#1A1E2F] p-6">
            <h2 className="text-xl font-semibold text-white mb-6">3. Visual Direction</h2>

            {/* Step Indicator */}
            <div className="flex items-center gap-4 mb-8">
              <div className={`flex items-center gap-2 ${visualStep === "characters" && moodboardStep === "protagonist" ? "text-[#B8B6FC]" : "text-white/50"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  visualStep === "characters" && moodboardStep === "protagonist" ? "bg-[#B8B6FC] text-black" :
                  (moodboardStep === "full" || visualStep === "key_moment") ? "bg-green-500 text-white" : "bg-[#262626]"
                }`}>
                  {(moodboardStep === "full" || visualStep === "key_moment") ? "✓" : "3a"}
                </div>
                <span className="text-sm font-medium">Protagonist</span>
              </div>
              <div className="flex-1 h-px bg-white/10" />
              <div className={`flex items-center gap-2 ${visualStep === "characters" && moodboardStep === "full" ? "text-[#B8B6FC]" : "text-white/50"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  visualStep === "characters" && moodboardStep === "full" ? "bg-[#B8B6FC] text-black" :
                  visualStep === "key_moment" ? "bg-green-500 text-white" : "bg-[#262626]"
                }`}>
                  {visualStep === "key_moment" ? "✓" : "3b"}
                </div>
                <span className="text-sm font-medium">Moodboard</span>
              </div>
              <div className="flex-1 h-px bg-white/10" />
              <div className={`flex items-center gap-2 ${visualStep === "key_moment" ? "text-[#B8B6FC]" : "text-white/50"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  visualStep === "key_moment" ? "bg-[#B8B6FC] text-black" : "bg-[#262626]"
                }`}>
                  3c
                </div>
                <span className="text-sm font-medium">Key Moment</span>
              </div>
            </div>

            {/* Step 3a: Protagonist Look (Style Anchor) */}
            {visualStep === "characters" && moodboardStep === "protagonist" && story && (
              <div>
                <div className="text-center mb-6">
                  <h3 className="text-lg font-medium text-white mb-2">First, let&apos;s nail the look</h3>
                  <p className="text-sm text-[#ADADAD]">Your main character sets the style for the entire film</p>
                </div>

                <div className="max-w-sm mx-auto">
                  <div className="bg-[#1A1E2F] rounded-xl overflow-hidden">
                    <div className="aspect-[9/16] relative bg-[#262626]">
                      {isGeneratingProtagonist ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <svg className="animate-spin h-8 w-8 text-[#B8B6FC] mb-2" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          <span className="text-[#ADADAD] text-sm">Creating your main character...</span>
                        </div>
                      ) : protagonistImage ? (
                        <img
                          src={`data:${protagonistImage.image.mime_type};base64,${protagonistImage.image.image_base64}`}
                          alt={protagonistImage.character_name}
                          className="w-full h-full object-cover"
                        />
                      ) : protagonistError ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                          <span className="text-red-400 text-sm mb-3">{protagonistError}</span>
                          <button
                            onClick={generateProtagonistImage}
                            className="px-4 py-2 bg-[#B8B6FC]/20 text-[#B8B6FC] text-sm rounded-lg hover:bg-[#B8B6FC]/30 transition-colors"
                          >
                            ↻ Retry
                          </button>
                        </div>
                      ) : null}
                    </div>

                    {protagonistImage && !isGeneratingProtagonist && (
                      <div className="p-4">
                        <h4 className="text-white font-medium text-center mb-4">{protagonistImage.character_name}</h4>
                        {protagonistImage.image.prompt_used && (
                          <details className="mb-3">
                            <summary className="text-xs text-[#ADADAD] cursor-pointer hover:text-white">View prompt</summary>
                            <pre className="mt-2 text-xs text-white/70 whitespace-pre-wrap font-mono bg-[#262626] rounded-lg p-2 max-h-32 overflow-y-auto">
                              {protagonistImage.image.prompt_used}
                            </pre>
                          </details>
                        )}
                        <div className="mt-2 mb-3">
                          <input
                            type="text"
                            placeholder="Feedback for refinement..."
                            value={protagonistFeedback}
                            onChange={(e) => setProtagonistFeedback(e.target.value)}
                            className="w-full bg-[#262626] text-white text-xs rounded-lg px-3 py-2 mb-2 placeholder-[#555] focus:outline-none focus:ring-1 focus:ring-[#B8B6FC]"
                          />
                          {protagonistFeedback.trim() && (
                            <button
                              onClick={refineProtagonistImage}
                              className="w-full text-xs py-1.5 rounded-lg bg-[#B8B6FC]/20 text-[#B8B6FC] hover:bg-[#B8B6FC]/30 transition-colors"
                            >
                              Refine with Feedback
                            </button>
                          )}
                          {/* Reference image upload for refinement */}
                          <div className="mt-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              {protagonistImage.refImages.map((ref, idx) => (
                                <div key={idx} className="relative w-8 h-8 rounded overflow-hidden">
                                  <img src={`data:${ref.mimeType};base64,${ref.base64}`} alt={ref.name} className="w-full h-full object-cover" />
                                  <button
                                    onClick={() => setProtagonistImage({ ...protagonistImage, refImages: protagonistImage.refImages.filter((_, i) => i !== idx) })}
                                    className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center text-white text-[8px] leading-none"
                                  >x</button>
                                </div>
                              ))}
                              {protagonistImage.refImages.length < 5 && (
                                <label className="w-8 h-8 rounded border border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-[#B8B6FC]/50 transition-colors">
                                  <span className="text-white/40 text-xs">+</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => handleRefImageUpload(
                                      e.target.files, 5,
                                      (imgs) => setProtagonistImage({ ...protagonistImage, refImages: imgs }),
                                      protagonistImage.refImages
                                    )}
                                  />
                                </label>
                              )}
                              <span className="text-[10px] text-white/30">Refs ({protagonistImage.refImages.length}/5)</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={generateProtagonistImage}
                            className="flex-1 py-2 bg-[#262626] text-white text-sm rounded-lg hover:bg-[#333]"
                          >
                            ↻ Try Different Look
                          </button>
                          <button
                            onClick={approveProtagonist}
                            className="flex-1 py-2 bg-gradient-to-r from-[#9C99FF] to-[#7370FF] text-white text-sm rounded-lg hover:opacity-90"
                          >
                            Looks Good →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3b: Full Moodboard (with locked protagonist) */}
            {visualStep === "characters" && moodboardStep === "full" && story && protagonistImage && (
              <div>
                <div className="text-center mb-6">
                  <h3 className="text-lg font-medium text-white mb-2">Here&apos;s your world</h3>
                  <p className="text-sm text-[#ADADAD]">All visuals match your main character&apos;s style</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Protagonist - LOCKED */}
                  <div className="bg-[#1A1E2F] rounded-xl overflow-hidden">
                    <div className="aspect-[9/16] relative bg-[#262626]">
                      <img
                        src={`data:${protagonistImage.image.mime_type};base64,${protagonistImage.image.image_base64}`}
                        alt={protagonistImage.character_name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 right-3 w-8 h-8 bg-[#B8B6FC] rounded-full flex items-center justify-center">
                        <span className="text-black text-sm">🔒</span>
                      </div>
                      <a
                        href={`data:${protagonistImage.image.mime_type};base64,${protagonistImage.image.image_base64}`}
                        download={`${protagonistImage.character_name.replace(/\s+/g, '_')}_ref.png`}
                        className="absolute bottom-3 right-3 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-black/80 transition-colors"
                        title="Download reference image"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      </a>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-white font-medium">{protagonistImage.character_name}</h4>
                        <span className="text-xs px-2 py-1 rounded-full bg-[#B8B6FC]/20 text-[#B8B6FC]">
                          style anchor
                        </span>
                      </div>
                      <p className="text-[#ADADAD] text-xs text-center">Locked - defines the style</p>
                      {protagonistImage.image.prompt_used && (
                        <details className="mt-2">
                          <summary className="text-xs text-[#ADADAD] cursor-pointer hover:text-white">View prompt</summary>
                          <pre className="mt-2 text-xs text-white/70 whitespace-pre-wrap font-mono bg-[#262626] rounded-lg p-2 max-h-32 overflow-y-auto">
                            {protagonistImage.image.prompt_used}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>

                  {/* Other Characters */}
                  {story.characters
                    .filter((char) => char.id !== protagonistImage.character_id)
                    .map((char) => {
                      const charState = characterImages[char.id];
                      if (!charState) return null;

                      return (
                        <div key={char.id} className="bg-[#1A1E2F] rounded-xl overflow-hidden">
                          <div className="aspect-[9/16] relative bg-[#262626]">
                            {charState.isGenerating ? (
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <svg className="animate-spin h-8 w-8 text-[#B8B6FC] mb-2" viewBox="0 0 24 24" fill="none">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                <span className="text-[#ADADAD] text-sm">Generating...</span>
                              </div>
                            ) : charState.image ? (
                              <>
                                <img
                                  src={`data:${charState.image.mime_type};base64,${charState.image.image_base64}`}
                                  alt={char.name}
                                  className="w-full h-full object-cover"
                                />
                                {charState.approved && (
                                  <div className="absolute top-3 right-3 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                )}
                                <a
                                  href={`data:${charState.image.mime_type};base64,${charState.image.image_base64}`}
                                  download={`${char.name.replace(/\s+/g, '_')}_ref.png`}
                                  className="absolute bottom-3 right-3 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-black/80 transition-colors"
                                  title="Download reference image"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                </a>
                              </>
                            ) : charState.error ? (
                              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                                <span className="text-red-400 text-sm mb-3">{charState.error}</span>
                                <button
                                  onClick={() => retryCharacterImage(char.id)}
                                  className="px-4 py-2 bg-[#B8B6FC]/20 text-[#B8B6FC] text-sm rounded-lg hover:bg-[#B8B6FC]/30 transition-colors"
                                >
                                  ↻ Retry
                                </button>
                              </div>
                            ) : null}
                          </div>

                          <div className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-white font-medium">{char.name}</h4>
                              <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/70">
                                {char.role}
                              </span>
                            </div>

                            {!charState.approved && !charState.isGenerating && charState.image && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => retryCharacterImage(char.id)}
                                  className="flex-1 py-2 bg-[#262626] text-white text-sm rounded-lg hover:bg-[#333]"
                                >
                                  ↻ Retry
                                </button>
                                <button
                                  onClick={() => approveCharacter(char.id)}
                                  className="flex-1 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-500"
                                >
                                  Approve
                                </button>
                              </div>
                            )}

                            {!charState.approved && !charState.isGenerating && charState.image && (
                              <div className="mt-2">
                                <input
                                  type="text"
                                  placeholder="Feedback for refinement..."
                                  value={charState.feedback}
                                  onChange={(e) =>
                                    setCharacterImages((prev) => ({
                                      ...prev,
                                      [char.id]: { ...prev[char.id], feedback: e.target.value },
                                    }))
                                  }
                                  className="w-full bg-[#262626] text-white text-xs rounded-lg px-3 py-2 mb-2 placeholder-[#555] focus:outline-none focus:ring-1 focus:ring-[#B8B6FC]"
                                />
                                {charState.feedback.trim() && (
                                  <button
                                    onClick={() => refineCharacterImage(char.id)}
                                    className="w-full text-xs py-1.5 rounded-lg bg-[#B8B6FC]/20 text-[#B8B6FC] hover:bg-[#B8B6FC]/30 transition-colors"
                                  >
                                    Refine with Feedback
                                  </button>
                                )}
                                {/* Reference image upload for refinement */}
                                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                                  {charState.refImages.map((ref, idx) => (
                                    <div key={idx} className="relative w-8 h-8 rounded overflow-hidden">
                                      <img src={`data:${ref.mimeType};base64,${ref.base64}`} alt={ref.name} className="w-full h-full object-cover" />
                                      <button
                                        onClick={() => setCharacterImages((prev) => ({
                                          ...prev,
                                          [char.id]: { ...prev[char.id], refImages: prev[char.id].refImages.filter((_, i) => i !== idx) },
                                        }))}
                                        className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center text-white text-[8px] leading-none"
                                      >x</button>
                                    </div>
                                  ))}
                                  {charState.refImages.length < 5 && (
                                    <label className="w-8 h-8 rounded border border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-[#B8B6FC]/50 transition-colors">
                                      <span className="text-white/40 text-xs">+</span>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={(e) => handleRefImageUpload(
                                          e.target.files, 5,
                                          (imgs) => setCharacterImages((prev) => ({ ...prev, [char.id]: { ...prev[char.id], refImages: imgs } })),
                                          charState.refImages
                                        )}
                                      />
                                    </label>
                                  )}
                                  <span className="text-[10px] text-white/30">Refs ({charState.refImages.length}/5)</span>
                                </div>
                              </div>
                            )}

                            {charState.approved && (
                              <p className="text-green-400 text-sm text-center">✓ Approved</p>
                            )}

                            {charState.promptUsed && (
                              <details className="mt-2">
                                <summary className="text-xs text-[#ADADAD] cursor-pointer hover:text-white">View prompt</summary>
                                <pre className="mt-2 text-xs text-white/70 whitespace-pre-wrap font-mono bg-[#262626] rounded-lg p-2 max-h-32 overflow-y-auto">
                                  {charState.promptUsed}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      );
                    })}

                  {/* Locations (replaces single Setting) */}
                  {story.locations && story.locations.length > 0 ? (
                    story.locations.map((loc) => {
                      const locState = locationImages[loc.id];
                      if (!locState) return null;
                      return (
                        <div key={loc.id} className="bg-[#1A1E2F] rounded-xl overflow-hidden">
                          <div className="aspect-[9/16] relative bg-[#262626]">
                            {locState.isGenerating ? (
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <svg className="animate-spin h-8 w-8 text-[#B8B6FC] mb-2" viewBox="0 0 24 24" fill="none">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                <span className="text-[#ADADAD] text-sm">Generating...</span>
                              </div>
                            ) : locState.image ? (
                              <>
                                <img
                                  src={`data:${locState.image.mime_type};base64,${locState.image.image_base64}`}
                                  alt={loc.description}
                                  className="w-full h-full object-cover"
                                />
                                {locState.approved && (
                                  <div className="absolute top-3 right-3 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                )}
                                <a
                                  href={`data:${locState.image.mime_type};base64,${locState.image.image_base64}`}
                                  download={`location_${loc.id}_ref.png`}
                                  className="absolute bottom-3 right-3 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-black/80 transition-colors"
                                  title="Download reference image"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                </a>
                              </>
                            ) : locState.error ? (
                              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                                <span className="text-red-400 text-sm mb-3">{locState.error}</span>
                                <button
                                  onClick={async () => {
                                    if (!protagonistImage) return;
                                    await generateLocationWithRef(loc.id, {
                                      image_base64: protagonistImage.image.image_base64,
                                      mime_type: protagonistImage.image.mime_type,
                                    });
                                  }}
                                  className="px-4 py-2 bg-[#B8B6FC]/20 text-[#B8B6FC] text-sm rounded-lg hover:bg-[#B8B6FC]/30 transition-colors"
                                >
                                  ↻ Retry
                                </button>
                              </div>
                            ) : null}
                          </div>

                          <div className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-white font-medium truncate" title={loc.description}>
                                {loc.description.length > 30 ? loc.description.slice(0, 30) + "..." : loc.description}
                              </h4>
                              <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/70 ml-2 whitespace-nowrap">
                                location
                              </span>
                            </div>

                            {!locState.approved && !locState.isGenerating && locState.image && (
                              <div className="flex gap-2">
                                <button
                                  onClick={async () => {
                                    if (!protagonistImage) return;
                                    await generateLocationWithRef(loc.id, {
                                      image_base64: protagonistImage.image.image_base64,
                                      mime_type: protagonistImage.image.mime_type,
                                    });
                                  }}
                                  className="flex-1 py-2 bg-[#262626] text-white text-sm rounded-lg hover:bg-[#333]"
                                >
                                  ↻ Retry
                                </button>
                                <button
                                  onClick={() => setLocationImages((prev) => ({
                                    ...prev,
                                    [loc.id]: { ...prev[loc.id], approved: true },
                                  }))}
                                  className="flex-1 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-500"
                                >
                                  Approve
                                </button>
                              </div>
                            )}

                            {!locState.approved && !locState.isGenerating && locState.image && (
                              <div className="mt-2">
                                <input
                                  type="text"
                                  placeholder="Feedback for refinement..."
                                  value={locState.feedback}
                                  onChange={(e) =>
                                    setLocationImages((prev) => ({
                                      ...prev,
                                      [loc.id]: { ...prev[loc.id], feedback: e.target.value },
                                    }))
                                  }
                                  className="w-full bg-[#262626] text-white text-xs rounded-lg px-3 py-2 mb-2 placeholder-[#555] focus:outline-none focus:ring-1 focus:ring-[#B8B6FC]"
                                />
                                {locState.feedback.trim() && (
                                  <button
                                    onClick={() => refineLocationImage(loc.id)}
                                    className="w-full text-xs py-1.5 rounded-lg bg-[#B8B6FC]/20 text-[#B8B6FC] hover:bg-[#B8B6FC]/30 transition-colors"
                                  >
                                    Refine with Feedback
                                  </button>
                                )}
                                {/* Reference image upload for refinement */}
                                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                                  {locState.refImages.map((ref, idx) => (
                                    <div key={idx} className="relative w-8 h-8 rounded overflow-hidden">
                                      <img src={`data:${ref.mimeType};base64,${ref.base64}`} alt={ref.name} className="w-full h-full object-cover" />
                                      <button
                                        onClick={() => setLocationImages((prev) => ({
                                          ...prev,
                                          [loc.id]: { ...prev[loc.id], refImages: prev[loc.id].refImages.filter((_, i) => i !== idx) },
                                        }))}
                                        className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center text-white text-[8px] leading-none"
                                      >x</button>
                                    </div>
                                  ))}
                                  {locState.refImages.length < 5 && (
                                    <label className="w-8 h-8 rounded border border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-[#B8B6FC]/50 transition-colors">
                                      <span className="text-white/40 text-xs">+</span>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={(e) => handleRefImageUpload(
                                          e.target.files, 5,
                                          (imgs) => setLocationImages((prev) => ({ ...prev, [loc.id]: { ...prev[loc.id], refImages: imgs } })),
                                          locState.refImages
                                        )}
                                      />
                                    </label>
                                  )}
                                  <span className="text-[10px] text-white/30">Refs ({locState.refImages.length}/5)</span>
                                </div>
                              </div>
                            )}

                            {locState.approved && (
                              <p className="text-green-400 text-sm text-center">Approved</p>
                            )}

                            {locState.promptUsed && (
                              <details className="mt-2">
                                <summary className="text-xs text-[#ADADAD] cursor-pointer hover:text-white">View prompt</summary>
                                <pre className="mt-2 text-xs text-white/70 whitespace-pre-wrap font-mono bg-[#262626] rounded-lg p-2 max-h-32 overflow-y-auto">
                                  {locState.promptUsed}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : settingImage ? (
                    /* Backward compat: single Setting card */
                    <div className="bg-[#1A1E2F] rounded-xl overflow-hidden">
                      <div className="aspect-[9/16] relative bg-[#262626]">
                        {settingImage.isGenerating ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <svg className="animate-spin h-8 w-8 text-[#B8B6FC] mb-2" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            <span className="text-[#ADADAD] text-sm">Generating...</span>
                          </div>
                        ) : settingImage.image ? (
                          <>
                            <img
                              src={`data:${settingImage.image.mime_type};base64,${settingImage.image.image_base64}`}
                              alt="Setting"
                              className="w-full h-full object-cover"
                            />
                            {settingImage.approved && (
                              <div className="absolute top-3 right-3 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                          </>
                        ) : settingImage.error ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                            <span className="text-red-400 text-sm mb-3">{settingImage.error}</span>
                            <button
                              onClick={retrySettingImage}
                              className="px-4 py-2 bg-[#B8B6FC]/20 text-[#B8B6FC] text-sm rounded-lg hover:bg-[#B8B6FC]/30 transition-colors"
                            >
                              ↻ Retry
                            </button>
                          </div>
                        ) : null}
                      </div>

                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-white font-medium">Setting</h4>
                          <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/70">
                            environment
                          </span>
                        </div>

                        {!settingImage.approved && !settingImage.isGenerating && settingImage.image && (
                          <div className="flex gap-2">
                            <button
                              onClick={retrySettingImage}
                              className="flex-1 py-2 bg-[#262626] text-white text-sm rounded-lg hover:bg-[#333]"
                            >
                              ↻ Retry
                            </button>
                            <button
                              onClick={() => setSettingImage((prev) => prev ? { ...prev, approved: true } : null)}
                              className="flex-1 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-500"
                            >
                              Approve
                            </button>
                          </div>
                        )}

                        {!settingImage.approved && !settingImage.isGenerating && settingImage.image && (
                          <div className="mt-2">
                            <input
                              type="text"
                              placeholder="Feedback for refinement..."
                              value={settingImage.feedback}
                              onChange={(e) =>
                                setSettingImage((prev) => prev ? { ...prev, feedback: e.target.value } : null)
                              }
                              className="w-full bg-[#262626] text-white text-xs rounded-lg px-3 py-2 mb-2 placeholder-[#555] focus:outline-none focus:ring-1 focus:ring-[#B8B6FC]"
                            />
                            {settingImage.feedback.trim() && (
                              <button
                                onClick={refineSettingImage}
                                className="w-full text-xs py-1.5 rounded-lg bg-[#B8B6FC]/20 text-[#B8B6FC] hover:bg-[#B8B6FC]/30 transition-colors"
                              >
                                Refine with Feedback
                              </button>
                            )}
                          </div>
                        )}

                        {settingImage.approved && (
                          <p className="text-green-400 text-sm text-center">Approved</p>
                        )}

                        {settingImage.promptUsed && (
                          <details className="mt-2">
                            <summary className="text-xs text-[#ADADAD] cursor-pointer hover:text-white">View prompt</summary>
                            <pre className="mt-2 text-xs text-white/70 whitespace-pre-wrap font-mono bg-[#262626] rounded-lg p-2 max-h-32 overflow-y-auto">
                              {settingImage.promptUsed}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Change protagonist link */}
                <div className="mt-6 pt-6 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={handleChangeProtagonistLook}
                      className="text-sm text-[#ADADAD] hover:text-white"
                    >
                      ← Change Main Character Look
                    </button>
                    <button
                      onClick={continueToKeyMoment}
                      disabled={
                        // All locations (or setting) must be approved
                        (story.locations && story.locations.length > 0
                          ? !story.locations.every((loc) => locationImages[loc.id]?.approved)
                          : !settingImage?.approved) ||
                        // All non-protagonist characters must be approved
                        story.characters
                          .filter((c) => c.id !== protagonistImage.character_id)
                          .some((c) => !characterImages[c.id]?.approved)
                      }
                      className="px-6 py-3 bg-gradient-to-r from-[#9C99FF] to-[#7370FF] text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue to Key Moment →
                    </button>
                  </div>
                </div>
              </div>
            )}


            {/* Step 3: Key Moments (3 distinct scenes) */}
            {visualStep === "key_moment" && (
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Key Moments</h3>
                <p className="text-sm text-[#ADADAD] mb-6">
                  3 distinct scenes from your story — each with the relevant characters and setting. Click to select, refine with feedback.
                </p>

                {keyMoment?.isGenerating && keyMoment.entries.length === 0 && (
                  <div className="text-center py-16">
                    <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-[#B8B6FC]" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-[#ADADAD]">Generating 3 key moment images...</p>
                  </div>
                )}

                {keyMoment && keyMoment.entries.length > 0 && (
                  <>
                    {/* 3-image grid */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      {keyMoment.entries.map((entry, idx) => (
                        <button
                          key={idx}
                          onClick={() => setKeyMoment((prev) => prev ? {
                            ...prev,
                            image: entry.image,
                            beat_number: entry.beat_number,
                            beat_description: entry.beat_description,
                            promptUsed: entry.promptUsed,
                            selectedIndex: idx,
                          } : null)}
                          className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                            idx === keyMoment.selectedIndex
                              ? "border-[#B8B6FC] ring-2 ring-[#B8B6FC]/30"
                              : "border-transparent opacity-70 hover:opacity-100"
                          }`}
                        >
                          <div className="aspect-[9/16] relative bg-[#262626]">
                            <img
                              src={`data:${entry.image.mime_type};base64,${entry.image.image_base64}`}
                              alt={`Scene ${entry.beat_number}`}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px]">
                              Scene {entry.beat_number}
                            </div>
                            {idx === keyMoment.selectedIndex && (
                              <div className="absolute top-2 right-2 w-6 h-6 bg-[#B8B6FC] rounded-full flex items-center justify-center">
                                <svg className="w-3.5 h-3.5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                            {/* Download button */}
                            <a
                              href={`data:${entry.image.mime_type};base64,${entry.image.image_base64}`}
                              download={`key_moment_scene_${entry.beat_number}.png`}
                              onClick={(e) => e.stopPropagation()}
                              className="absolute bottom-2 right-2 w-7 h-7 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-colors"
                              title="Download image"
                            >
                              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" />
                              </svg>
                            </a>
                          </div>
                          <div className="p-2 bg-[#1A1E2F]">
                            <p className="text-white text-[11px] line-clamp-2 text-left">{entry.beat_description}</p>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Selected scene details */}
                    <div className="max-w-md mx-auto bg-[#1A1E2F] rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-[#B8B6FC]/20 text-[#B8B6FC]">
                          Selected
                        </span>
                        <span className="text-xs text-[#ADADAD]">Scene {keyMoment.beat_number}</span>
                      </div>
                      <p className="text-white text-sm mb-3">{keyMoment.beat_description}</p>

                      {keyMoment.promptUsed && (
                        <details className="mb-3">
                          <summary className="text-xs text-[#ADADAD] cursor-pointer hover:text-white">
                            View prompt
                          </summary>
                          <pre className="mt-2 text-xs text-white/70 whitespace-pre-wrap font-mono bg-[#262626] rounded-lg p-2 max-h-32 overflow-y-auto">
                            {keyMoment.promptUsed}
                          </pre>
                        </details>
                      )}

                      {!keyMoment.isGenerating && (
                        <>
                          <textarea
                            value={keyMoment.feedback}
                            onChange={(e) => setKeyMoment((prev) => prev ? { ...prev, feedback: e.target.value } : null)}
                            placeholder="Feedback to refine this scene..."
                            className="w-full h-14 bg-[#262626] rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#B8B6FC] resize-none mb-2"
                          />
                          <button
                            onClick={refineKeyMoment}
                            disabled={!keyMoment.feedback.trim()}
                            className="w-full py-2 bg-[#262626] text-white text-sm rounded-lg hover:bg-[#333] disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Refine Selected Scene
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}

                {keyMoment && keyMoment.entries && keyMoment.entries.length > 0 && !keyMoment.isGenerating && film.status === "idle" && (
                  <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between">
                    <button
                      onClick={() => { setVisualStep("characters"); setMoodboardStep("full"); }}
                      className="text-sm text-[#ADADAD] hover:text-white transition-colors"
                    >
                      ← Back to Moodboard
                    </button>
                    <button
                      onClick={fetchPromptPreviews}
                      disabled={promptPreview.isLoading}
                      className="px-6 py-3 bg-gradient-to-r from-[#9C99FF] to-[#7370FF] text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50"
                    >
                      {promptPreview.isLoading ? "Generating Prompts..." : "Preview Prompts →"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Section 3.5: Pre-Flight Check (Prompt Preview) */}
        {promptPreview.shots.length > 0 && film.status === "idle" && (
          <div className="mt-8 bg-[#0F0E13] rounded-3xl outline outline-1 outline-[#1A1E2F] p-6">
            <h2 className="text-xl font-semibold text-white mb-2">Pre-Flight Check</h2>
            <p className="text-[#ADADAD] mb-6 text-sm">
              Review and edit the Veo prompts before generating. Each prompt drives one 8-second clip.
            </p>

            <div className="space-y-4">
              {promptPreview.shots.map((shot) => {
                const editedPrompt = promptPreview.editedPrompts[shot.beat_number] || shot.veo_prompt;
                const isEdited = editedPrompt !== shot.veo_prompt;

                return (
                  <div key={shot.beat_number} className="bg-[#1A1E2F] rounded-xl p-4">
                    {/* Header: beat number + scene heading + copy */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-[#B8B6FC] rounded-full flex items-center justify-center text-black font-bold text-sm">
                          {shot.beat_number}
                        </div>
                        <span className="text-white font-medium text-sm">
                          {shot.scene_heading || `Scene ${shot.beat_number}`}
                        </span>
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(editedPrompt)}
                        className="text-xs text-[#ADADAD] hover:text-white px-2 py-1 rounded hover:bg-white/10 transition-colors"
                      >
                        Copy
                      </button>
                    </div>

                    {/* Key moment reference image for this shot */}
                    <div className="flex items-center gap-2 mb-3">
                      {(() => {
                        const entry = keyMoment?.entries.find((e) => e.beat_number === shot.beat_number);
                        if (!entry) return <span className="text-[10px] text-[#555]">No key moment ref</span>;
                        return (
                          <>
                            <img
                              src={`data:${entry.image.mime_type};base64,${entry.image.image_base64}`}
                              className="w-10 h-14 object-cover rounded border border-[#B8B6FC]/30"
                              title={`Key moment — Scene ${entry.beat_number}`}
                            />
                            <span className="text-[10px] text-[#555] ml-1">
                              Key moment ref (1 image)
                            </span>
                          </>
                        );
                      })()}
                    </div>

                    {/* Editable prompt textarea */}
                    <textarea
                      value={editedPrompt}
                      onChange={(e) =>
                        setPromptPreview((prev) => ({
                          ...prev,
                          editedPrompts: {
                            ...prev.editedPrompts,
                            [shot.beat_number]: e.target.value,
                          },
                        }))
                      }
                      className="w-full h-28 bg-[#262626] text-white text-sm font-mono rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-[#B8B6FC]"
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-[#555]">
                        {editedPrompt.split(/\s+/).filter(Boolean).length} words
                      </span>
                      {isEdited && (
                        <button
                          onClick={() =>
                            setPromptPreview((prev) => ({
                              ...prev,
                              editedPrompts: {
                                ...prev.editedPrompts,
                                [shot.beat_number]: shot.veo_prompt,
                              },
                            }))
                          }
                          className="text-[10px] text-[#ADADAD] hover:text-white transition-colors"
                        >
                          Reset to original
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Cost + action buttons */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-amber-200/80 text-xs mb-4">
                This will generate {promptPreview.shots.length} video clips (~${promptPreview.estimatedCostUsd.toFixed(0)}). Please ensure prompts look good before proceeding.
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#ADADAD] text-sm">
                    Estimated cost: <span className="text-white font-medium">~${promptPreview.estimatedCostUsd.toFixed(2)}</span>
                  </p>
                  <p className="text-[10px] text-[#555]">
                    {promptPreview.shots.length} clips x 8s (key moment refs)
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() =>
                      setPromptPreview({ shots: [], editedPrompts: {}, estimatedCostUsd: 0, isLoading: false })
                    }
                    className="px-4 py-2 bg-[#262626] text-white text-sm rounded-lg hover:bg-[#333] transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={startFilmWithEditedPrompts}
                    className="px-6 py-3 bg-gradient-to-r from-[#9C99FF] to-[#7370FF] text-white rounded-xl font-medium hover:opacity-90"
                  >
                    Try {promptPreview.shots.length} Clips (~${promptPreview.estimatedCostUsd.toFixed(0)})
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 4: Film Generation */}
        {(film.status === "generating" || film.status === "assembling" || film.status === "ready" || film.status === "failed") && (
          <div className="mt-8 bg-[#0F0E13] rounded-3xl outline outline-1 outline-[#1A1E2F] p-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold text-white">4. Creating Your Film</h2>
              {(film.status === "ready" || film.status === "failed") && (
                <button
                  onClick={() => { setVisualStep("characters"); setMoodboardStep("full"); }}
                  className="text-sm text-[#ADADAD] hover:text-white transition-colors"
                >
                  ← Moodboard
                </button>
              )}
            </div>
            {story && <p className="text-[#ADADAD] mb-6">&ldquo;{story.title}&rdquo;</p>}

            {/* Generating State — card grid with lazy-loading clips */}
            {(film.status === "generating" || film.status === "assembling") && (
              <div>
                {/* Progress bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-[#ADADAD] mb-2">
                    <span>
                      {film.status === "assembling"
                        ? "Assembling final video..."
                        : "Filming scenes..."}
                    </span>
                    <span>{film.completedShots.length} of {film.totalShots} shots</span>
                  </div>
                  <div className="h-2 bg-[#262626] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#9C99FF] to-[#7370FF] transition-all duration-500"
                      style={{ width: `${(film.completedShots.length / film.totalShots) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Card grid — all shots as cards, populate as they complete */}
                <div className="flex flex-wrap items-start justify-center gap-2 mb-8">
                  {Array.from({ length: film.totalShots }, (_, i) => {
                    const shotNum = i + 1;
                    const completedShot = film.completedShots.find((s) => s.number === shotNum);

                    return (
                      <div key={shotNum} className="flex items-start gap-2">
                        <div className="w-40 flex-shrink-0">
                          <div className="relative aspect-[9/16] bg-black rounded-xl overflow-hidden mb-2">
                            {completedShot ? (
                              <video
                                key={`gen-${shotNum}-${completedShot.preview_url}`}
                                src={`${BACKEND_URL}${completedShot.preview_url}`}
                                controls
                                playsInline
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center">
                                  <div className="w-8 h-8 border-2 border-[#9C99FF] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                  <p className="text-xs text-[#ADADAD]">Generating...</p>
                                </div>
                              </div>
                            )}
                          </div>
                          <p className="text-white text-sm font-medium text-center mb-1">
                            Scene {shotNum}
                          </p>
                          {completedShot?.veo_prompt && (
                            <details className="mb-1">
                              <summary className="text-[10px] text-[#9C99FF] cursor-pointer hover:text-white text-center">
                                View Veo Prompt
                              </summary>
                              <pre className="mt-1 text-[9px] text-[#888] bg-[#0D0F1A] rounded p-2 whitespace-pre-wrap break-words max-h-40 overflow-y-auto leading-relaxed">
                                {completedShot.veo_prompt}
                              </pre>
                            </details>
                          )}
                        </div>

                        {/* Plus connector between cards */}
                        {i < film.totalShots - 1 && (
                          <div className="flex items-center self-center mt-16">
                            <span className="text-[#555] text-2xl font-light">+</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <p className="text-center text-[#ADADAD] text-sm mt-6">
                  {film.status === "assembling"
                    ? "Almost there! Stitching your scenes together..."
                    : "All scenes generating in parallel. Each takes about 30-60 seconds."}
                </p>

                {/* Live cost during generation */}
                {film.cost.total_usd > 0 && (
                  <p className="text-center text-[#ADADAD] text-xs mt-4">
                    Video cost so far: <span className="text-white">${film.cost.total_usd.toFixed(2)}</span>
                  </p>
                )}
              </div>
            )}

            {/* Ready State: Clip Review */}
            {film.status === "ready" && !clipsApproved && (
              <div>
                <p className="text-[#ADADAD] mb-6">
                  Review each clip. Regenerate any that don&apos;t look right.
                </p>

                {/* Clip timeline: [Clip 1] + [Clip 2] + [Clip 3] */}
                <div className="flex flex-wrap items-start justify-center gap-2 mb-8">
                  {film.completedShots
                    .slice()
                    .sort((a, b) => a.number - b.number)
                    .map((shot, idx) => {
                      const isRegenerating = regeneratingShotNum === shot.number;
                      const hasFeedback = (shotFeedback[shot.number] || "").trim().length > 0;

                      return (
                        <div key={shot.number} className="flex items-start gap-2">
                          {/* The clip card */}
                          <div className="w-40 flex-shrink-0">
                            <div className="relative aspect-[9/16] bg-black rounded-xl overflow-hidden mb-2">
                              {isRegenerating ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                                  <div className="text-center">
                                    <div className="w-8 h-8 border-2 border-[#9C99FF] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                    <p className="text-xs text-[#ADADAD]">Regenerating...</p>
                                  </div>
                                </div>
                              ) : (
                                <video
                                  key={`${shot.number}-${shot.preview_url}`}
                                  src={`${BACKEND_URL}${shot.preview_url}`}
                                  controls
                                  playsInline
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>

                            <p className="text-white text-sm font-medium text-center mb-1">
                              Scene {shot.number}
                            </p>

                            {/* Veo prompt toggle */}
                            {shot.veo_prompt && (
                              <details className="mb-2">
                                <summary className="text-[10px] text-[#9C99FF] cursor-pointer hover:text-white text-center">
                                  View Veo Prompt
                                </summary>
                                <pre className="mt-1 text-[9px] text-[#888] bg-[#0D0F1A] rounded p-2 whitespace-pre-wrap break-words max-h-40 overflow-y-auto leading-relaxed">
                                  {shot.veo_prompt}
                                </pre>
                              </details>
                            )}

                            {/* Feedback input + regenerate */}
                            <input
                              type="text"
                              placeholder="Feedback (optional)"
                              value={shotFeedback[shot.number] || ""}
                              onChange={(e) =>
                                setShotFeedback((prev) => ({
                                  ...prev,
                                  [shot.number]: e.target.value,
                                }))
                              }
                              disabled={isRegenerating || regeneratingShotNum !== null}
                              className="w-full bg-[#1A1E2F] text-white text-xs rounded-lg px-3 py-2 mb-2 placeholder-[#555] disabled:opacity-50"
                            />
                            <button
                              onClick={() => regenerateShot(shot.number)}
                              disabled={isRegenerating || regeneratingShotNum !== null}
                              className="w-full text-xs py-1.5 rounded-lg bg-[#262626] text-[#ADADAD] hover:bg-[#333] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {isRegenerating ? "Regenerating..." : hasFeedback ? "Regenerate with Feedback" : "Regenerate"}
                            </button>
                          </div>

                          {/* Plus connector between clips */}
                          {idx < film.completedShots.length - 1 && (
                            <div className="flex items-center self-center mt-16">
                              <span className="text-[#555] text-2xl font-light">+</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>

                {/* Action buttons */}
                <div className="flex gap-4 justify-center border-t border-white/10 pt-6">
                  <button
                    onClick={() => setClipsApproved(true)}
                    disabled={regeneratingShotNum !== null}
                    className="px-6 py-3 bg-gradient-to-r from-[#9C99FF] to-[#7370FF] text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    Looks Good — Assemble Film
                  </button>
                </div>
              </div>
            )}

            {/* Approved State: Final Video */}
            {film.status === "ready" && clipsApproved && film.finalVideoUrl && (
              <div className="text-center">
                <div className="aspect-[9/16] max-w-sm mx-auto bg-black rounded-xl overflow-hidden mb-6">
                  <video
                    src={`${BACKEND_URL}${film.finalVideoUrl}`}
                    controls
                    className="w-full h-full object-cover"
                  />
                </div>

                <p className="text-green-400 mb-4">Your film is ready!</p>

                {/* Cost Summary */}
                <div className="bg-[#1A1E2F] rounded-xl p-4 mb-6 max-w-md mx-auto text-left">
                  <h4 className="text-white font-medium mb-3 text-center">Generation Cost Summary</h4>
                  <div className="space-y-1 text-sm">
                    {totalCost.story > 0 && (
                      <div className="flex justify-between text-[#ADADAD]">
                        <span>Story generation</span>
                        <span>${totalCost.story.toFixed(4)}</span>
                      </div>
                    )}
                    {totalCost.characters > 0 && (
                      <div className="flex justify-between text-[#ADADAD]">
                        <span>Character images</span>
                        <span>${totalCost.characters.toFixed(2)}</span>
                      </div>
                    )}
                    {totalCost.locations > 0 && (
                      <div className="flex justify-between text-[#ADADAD]">
                        <span>Location images</span>
                        <span>${totalCost.locations.toFixed(2)}</span>
                      </div>
                    )}
                    {totalCost.keyMoments > 0 && (
                      <div className="flex justify-between text-[#ADADAD]">
                        <span>Key moment images</span>
                        <span>${totalCost.keyMoments.toFixed(2)}</span>
                      </div>
                    )}
                    {film.cost.scene_refs_usd > 0 && (
                      <div className="flex justify-between text-[#ADADAD]">
                        <span>Scene references</span>
                        <span>${film.cost.scene_refs_usd.toFixed(2)}</span>
                      </div>
                    )}
                    {film.cost.videos_usd > 0 && (
                      <div className="flex justify-between text-[#ADADAD]">
                        <span>Video clips ({film.totalShots} × 8s)</span>
                        <span>${film.cost.videos_usd.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="border-t border-white/10 pt-2 mt-2 flex justify-between text-white font-medium">
                      <span>Total</span>
                      <span>${grandTotalCost.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 justify-center">
                  <a
                    href={`${BACKEND_URL}${film.finalVideoUrl}`}
                    download
                    className="px-6 py-3 bg-gradient-to-r from-[#9C99FF] to-[#7370FF] text-white rounded-xl font-medium hover:opacity-90"
                  >
                    Download Video
                  </a>
                  <button
                    onClick={() => setClipsApproved(false)}
                    className="px-6 py-3 bg-[#262626] text-white rounded-xl font-medium hover:bg-[#333]"
                  >
                    Back to Clips
                  </button>
                  <button
                    onClick={resetAll}
                    className="px-6 py-3 bg-[#262626] text-white rounded-xl font-medium hover:bg-[#333]"
                  >
                    Make New Film
                  </button>
                </div>
              </div>
            )}

            {/* Failed State */}
            {film.status === "failed" && (
              <div className="text-center">
                <div className="text-red-400 mb-4">
                  <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="font-medium">Film generation failed</p>
                  {film.error && <p className="text-sm mt-2 opacity-80">{film.error}</p>}
                </div>

                {/* Show completed shots if any */}
                {film.completedShots.length > 0 && (
                  <p className="text-[#ADADAD] text-sm mb-4">
                    {film.completedShots.length} of {film.totalShots} shots were completed before the error.
                  </p>
                )}

                <div className="flex gap-4 justify-center">
                  <button
                    onClick={startFilmGeneration}
                    className="px-6 py-3 bg-gradient-to-r from-[#9C99FF] to-[#7370FF] text-white rounded-xl font-medium hover:opacity-90"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={resetFilm}
                    className="px-6 py-3 bg-[#262626] text-white rounded-xl font-medium hover:bg-[#333]"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />

      {/* Sidebar toggle button */}
      <button
        onClick={() => { setSidebarOpen(!sidebarOpen); if (!sidebarOpen) fetchGenerationsList(); }}
        className="fixed bottom-6 left-6 z-50 w-12 h-12 bg-[#1A1E2F] rounded-full border border-white/10 flex items-center justify-center hover:bg-[#262626] shadow-lg transition-colors"
        title="Past Generations"
      >
        <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSidebarOpen(false)} />
          <div className="fixed left-0 top-0 bottom-0 w-80 bg-[#0F0E13] border-r border-white/10 z-50 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white font-semibold text-lg">Generations</h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="text-white/50 hover:text-white text-xl leading-none"
                >
                  &times;
                </button>
              </div>

              <button
                onClick={() => { startNewGeneration(); setSidebarOpen(false); }}
                className="w-full mb-5 py-2.5 bg-gradient-to-r from-[#9C99FF] to-[#7370FF] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                + New Generation
              </button>

              {pastGenerations.length === 0 && (
                <p className="text-[#555] text-sm text-center py-8">No generations yet</p>
              )}

              <div className="space-y-2">
                {pastGenerations.map((gen) => {
                  const isActive = gen.id === generationId;
                  const statusColors: Record<string, string> = {
                    drafting: "bg-white/10 text-white/50",
                    moodboard: "bg-blue-500/20 text-blue-300",
                    key_moments: "bg-blue-500/20 text-blue-300",
                    preflight: "bg-blue-500/20 text-blue-300",
                    filming: "bg-amber-500/20 text-amber-300",
                    ready: "bg-green-500/20 text-green-300",
                    failed: "bg-red-500/20 text-red-300",
                    interrupted: "bg-orange-500/20 text-orange-300",
                  };
                  const statusLabels: Record<string, string> = {
                    drafting: "Draft",
                    moodboard: "Moodboard",
                    key_moments: "Key Moments",
                    preflight: "Pre-Flight",
                    filming: "Generating...",
                    ready: "Complete",
                    failed: "Failed",
                    interrupted: "Interrupted",
                  };
                  return (
                    <button
                      key={gen.id}
                      onClick={() => {
                        if (!isActive) restoreGeneration(gen.id);
                        setSidebarOpen(false);
                      }}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        isActive
                          ? "bg-[#B8B6FC]/15 border border-[#B8B6FC]/30"
                          : "bg-[#1A1E2F] hover:bg-[#262626] border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {gen.thumbnail_base64 ? (
                          <img
                            src={`data:image/png;base64,${gen.thumbnail_base64}`}
                            className="w-9 h-12 rounded object-cover flex-shrink-0"
                            alt=""
                          />
                        ) : (
                          <div className="w-9 h-12 rounded bg-[#262626] flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">
                            {gen.title || "Untitled"}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusColors[gen.status] || statusColors.drafting}`}>
                              {statusLabels[gen.status] || gen.status}
                            </span>
                            {gen.cost_total > 0 && (
                              <span className="text-[10px] text-white/30">${gen.cost_total.toFixed(2)}</span>
                            )}
                          </div>
                          <p className="text-[10px] text-white/25 mt-0.5">
                            {new Date(gen.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Loading overlay during state restore */}
      {isRestoringState && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center">
          <div className="text-center">
            <svg className="animate-spin h-10 w-10 mx-auto mb-3 text-[#B8B6FC]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-white/70 text-sm">Restoring generation...</p>
          </div>
        </div>
      )}
    </div>
  );
}
