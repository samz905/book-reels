"use client";

import { useState, useEffect, useRef } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import {
  createGeneration as supaCreateGeneration,
  updateGeneration as supaUpdateGeneration,
  getGeneration as supaGetGeneration,
  getCompletedJobs,
  clearGenJobs,
  type GenJob,
} from "@/lib/supabase/ai-generations";
import { useAuth } from "@/app/context/AuthContext";
import { getMyStories, getStoryCharacters, getStoryLocations, createStoryCharacter, createStoryLocation, createStory, submitJob, getEpisodeStoryboards, upsertEpisodeStoryboards } from "@/lib/api/creator";
import { uploadGenerationAsset } from "@/lib/storage/generation-assets";
import { useGenJobs } from "@/lib/hooks/useGenJobs";
import type { StoryCharacterFE, StoryLocationFE, EpisodeStoryboardFE } from "@/app/data/mockCreatorData";
import StoryPickerModal from "@/app/components/creator/StoryPickerModal";
import CreateEpisodeModal from "@/app/components/creator/CreateEpisodeModal";
import CharacterModal from "@/app/components/creator/CharacterModal";
import LocationModal from "@/app/components/creator/LocationModal";
import CharacterLocationPicker, { type SelectedCharacter } from "./components/CharacterLocationPicker";

// ============================================================
// Types
// ============================================================

type Style = "cinematic" | "anime" | "animated" | "pixar";
type VisualsTab = "characters" | "locations" | "scenes";

interface Character {
  id: string;
  name: string;
  gender: string;
  age: string;
  appearance: string;
  role: "protagonist" | "antagonist" | "supporting";
  origin?: "story" | "ai";
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
  image_url?: string;       // Supabase Storage public URL (persisted)
  image_base64?: string;    // In-memory only; stripped before save
  mime_type: string;
  prompt_used: string;
}

/** Get a displayable src for an <img> tag, preferring URL over data URI */
function getImageSrc(img: MoodboardImage): string {
  if (img.image_url) return img.image_url;
  if (img.image_base64) return `data:${img.mime_type};base64,${img.image_base64}`;
  return "";
}

interface RefImageUpload {
  url?: string;       // Supabase Storage URL (persisted)
  base64?: string;    // In-memory only; stripped before save
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

interface SceneImageState {
  sceneNumber: number;
  title: string;
  visualDescription: string;
  image: MoodboardImage | null;
  isGenerating: boolean;
  error: string;
  feedback: string;
}

// Phase 4: Film Generation
interface CompletedShot {
  number: number;
  preview_url?: string;
  storage_url?: string;
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

// ============================================================
// Constants
// ============================================================

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

/** Resolve video URL — handles both absolute Storage URLs and legacy relative paths */
function resolveVideoUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${BACKEND_URL}${url}`;
}

// Fixed at 8 shots (8 seconds each = ~64 seconds)
const TOTAL_SHOTS = 8;

const STYLE_OPTIONS: { value: Style; label: string }[] = [
  { value: "cinematic", label: "Cinematic" },
  { value: "anime", label: "Anime" },
  { value: "animated", label: "Animated" },
  { value: "pixar", label: "Pixar" },
];

const STYLE_DISPLAY_MAP: Record<string, string> = {
  cinematic: "Cinematic",
  anime: "Anime",
  animated: "Animated",
  pixar: "Pixar",
  // Legacy values for existing generations
  "3d_animated": "Pixar",
  "2d_animated": "Animated",
  "2d_anime": "Anime",
};

// ============================================================
// Main Component
// ============================================================

export default function CreateEpisodePage() {
  const { user } = useAuth();

  // Story picker + episode modal (mandatory association)
  const [showStoryPicker, setShowStoryPicker] = useState(false);
  const [showCreateEpisodeModal, setShowCreateEpisodeModal] = useState(false);
  const [pendingStoryId, setPendingStoryId] = useState<string | null>(null);
  const [availableStories, setAvailableStories] = useState<{ id: string; title: string; cover: string; episodeCount: number }[]>([]);

  // Story library chars/locs (for CharacterLocationPicker)
  const [storyLibraryChars, setStoryLibraryChars] = useState<StoryCharacterFE[]>([]);
  const [storyLibraryLocs, setStoryLibraryLocs] = useState<StoryLocationFE[]>([]);

  // Pre-selected characters & location for script generation
  const [selectedChars, setSelectedChars] = useState<SelectedCharacter[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<StoryLocationFE | null>(null);

  // Input state
  const [idea, setIdea] = useState("");
  const [style, setStyle] = useState<Style>("cinematic");

  // Story state
  const [story, setStory] = useState<Story | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Right pane tab state
  const [rightTab, setRightTab] = useState<"world" | "script">("script");

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

  // Build Your Visuals state (Phase 2)
  const [visualsActive, setVisualsActive] = useState(false);
  const [visualsTab, setVisualsTab] = useState<VisualsTab>("characters");
  const [characterImages, setCharacterImages] = useState<Record<string, CharacterImageState>>({});
  const [locationImages, setLocationImages] = useState<Record<string, LocationImageState>>({});
  const [sceneImages, setSceneImages] = useState<Record<number, SceneImageState>>({});
  const [isGeneratingSceneDescs, setIsGeneratingSceneDescs] = useState(false);
  const [sceneDescError, setSceneDescError] = useState("");
  const [expandedSceneDescs, setExpandedSceneDescs] = useState<Set<number>>(new Set());

  // Modal state for visuals stage
  const [editingVisualCharId, setEditingVisualCharId] = useState<string | null>(null);
  const [editingVisualLocId, setEditingVisualLocId] = useState<string | null>(null);
  const [isSavingVisualChar, setIsSavingVisualChar] = useState(false);
  const [isSavingVisualLoc, setIsSavingVisualLoc] = useState(false);

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

  // Story association (when created from a story management page)
  const [associatedStoryId, setAssociatedStoryId] = useState<string | null>(null);
  const associatedStoryIdRef = useRef<string | null>(null);
  const [associatedStoryName, setAssociatedStoryName] = useState<string | null>(null);
  const [episodeName, setEpisodeName] = useState<string | null>(null);
  const episodeNameRef = useRef<string | null>(null);
  const [episodeNumber, setEpisodeNumber] = useState<number | null>(null);
  const [episodeIsFree, setEpisodeIsFree] = useState(false);
  const [isEditingEpName, setIsEditingEpName] = useState(false);
  const [editingEpNameValue, setEditingEpNameValue] = useState("");
  // Keep refs in sync
  useEffect(() => { associatedStoryIdRef.current = associatedStoryId; }, [associatedStoryId]);
  useEffect(() => { episodeNameRef.current = episodeName; }, [episodeName]);

  // Generation persistence
  const [generationId, setGenerationId] = useState<string | null>(null);
  const generationIdRef = useRef<string | null>(null);
  const isRestoringRef = useRef(false);
  const [isRestoringState, setIsRestoringState] = useState(false);
  const [draftSaveStatus, setDraftSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // Keep ref in sync with state
  useEffect(() => {
    generationIdRef.current = generationId;
  }, [generationId]);

  // Supabase Realtime: subscribe to gen_jobs changes for this generation
  const realtimeJobs = useGenJobs(generationId);
  const processedJobsRef = useRef<Set<string>>(new Set());
  const snapshotRef = useRef<Record<string, unknown>>({});

  /** Remove a previously-processed job so re-submission is handled by Realtime */
  const clearProcessedJob = (jobType: string, targetId: string = "") => {
    for (const job of realtimeJobs) {
      if (job.job_type === jobType && (job.target_id || "") === targetId) {
        processedJobsRef.current.delete(job.id);
      }
    }
  };

  const CHAR_IMG_DEFAULTS = { images: [] as MoodboardImage[], selectedIndex: 0, approved: false, isGenerating: false, feedback: "", promptUsed: "", error: "", refImages: [] as RefImageUpload[] };
  const LOC_IMG_DEFAULTS = { ...CHAR_IMG_DEFAULTS };

  // ---- Shared job processing: single source of truth for both Realtime & restore ----

  const applyFailedJob = (job: GenJob) => {
    const errMsg = job.error_message || "Generation failed";
    switch (job.job_type) {
      case "script":
        setError(errMsg);
        setIsGenerating(false);
        break;
      case "refine_beat":
        setError(errMsg);
        setIsRefining(false);
        break;
      case "scene_descriptions":
        setIsGeneratingSceneDescs(false);
        setSceneDescError(errMsg);
        break;
      case "scene_images":
      case "key_moment": {
        // Capture generating scene numbers before state update
        const failedSceneNums = Object.keys(sceneImages).map(Number).filter((n) => sceneImages[n]?.isGenerating);
        setSceneImages((prev) => {
          const updated = { ...prev };
          for (const key of Object.keys(updated)) {
            const num = parseInt(key);
            if (updated[num]?.isGenerating) {
              updated[num] = { ...updated[num], isGenerating: false, error: errMsg };
            }
          }
          return updated;
        });
        // Update DB status to failed
        const genId1 = generationIdRef.current;
        if (genId1 && failedSceneNums.length > 0) {
          upsertEpisodeStoryboards(genId1, failedSceneNums.map((n) => ({
            scene_number: n, status: "failed", error_message: errMsg,
          }))).catch(() => {});
        }
        break;
      }
      case "scene_image": {
        const failedNum = parseInt(job.target_id);
        setSceneImages((prev) => ({
          ...prev,
          [failedNum]: { ...prev[failedNum], isGenerating: false, error: errMsg },
        }));
        // Update DB status to failed
        const genId2 = generationIdRef.current;
        if (genId2 && !isNaN(failedNum)) {
          upsertEpisodeStoryboards(genId2, [{
            scene_number: failedNum, status: "failed", error_message: errMsg,
          }]).catch(() => {});
        }
        break;
      }
      case "protagonist":
      case "character_image":
      case "refine_character":
        if (job.target_id) {
          setCharacterImages((prev) => {
            if (!prev[job.target_id]) return prev;
            return { ...prev, [job.target_id]: { ...prev[job.target_id], isGenerating: false, error: errMsg } };
          });
        }
        break;
      case "location_image":
      case "refine_location":
        if (job.target_id) {
          setLocationImages((prev) => {
            if (!prev[job.target_id]) return prev;
            return { ...prev, [job.target_id]: { ...prev[job.target_id], isGenerating: false, error: errMsg } };
          });
        }
        break;
      case "prompt_preview":
        setPromptPreview((prev) => ({ ...prev, isLoading: false }));
        break;
      case "film":
      case "film_with_prompts":
        setFilm((prev) => ({ ...prev, status: "failed", error: errMsg }));
        break;
      case "shot_regenerate":
        setRegeneratingShotNum(null);
        break;
    }
  };

  const applyCompletedJob = (job: GenJob) => {
    const result = job.result as Record<string, unknown>;
    if (!result) return;

    switch (job.job_type) {
      case "script": {
        const storyResult = result.story as Story;
        if (storyResult) {
          setStory(storyResult);
          if (result.cost_usd) setTotalCost((prev) => ({ ...prev, story: prev.story + (result.cost_usd as number) }));
          saveNow({ story: storyResult });
        }
        setIsGenerating(false);
        setGlobalFeedback("");
        break;
      }
      case "refine_beat": {
        const beatResult = (result.beat as Beat) || null;
        if (beatResult && story) {
          const sceneNum = parseInt(job.target_id) || beatResult.scene_number;
          const idx = story.beats.findIndex((b: Beat) => b.scene_number === sceneNum);
          if (idx >= 0) {
            const updatedBeats = [...story.beats];
            updatedBeats[idx] = beatResult;
            const updatedScenes = [...getScenes(story)];
            updatedScenes[idx] = {
              scene_number: beatResult.scene_number || sceneNum,
              title: updatedScenes[idx]?.title || `Scene ${sceneNum}`,
              duration: updatedScenes[idx]?.duration || "8 seconds",
              characters_on_screen: beatResult.characters_in_scene || [],
              setting_id: beatResult.location_id || "",
              action: beatResult.action || "",
              dialogue: beatResult.dialogue?.map((d: DialogueLine) => `${d.character}: ${d.line}`).join("\n") || null,
              image_prompt: beatResult.description || "",
              regenerate_notes: updatedScenes[idx]?.regenerate_notes || "",
              scene_change: beatResult.scene_change,
              scene_heading: beatResult.scene_heading,
            };
            setStory({ ...story, beats: updatedBeats, scenes: updatedScenes });
          }
        }
        setIsRefining(false);
        setFeedback("");
        setSelectedBeatIndex(null);
        break;
      }
      case "protagonist":
      case "character_image": {
        const charId = (result.character_id as string) || job.target_id;
        const img = result.image as MoodboardImage | undefined;
        const imgs = result.images as MoodboardImage[] | undefined;
        if (charId && (img || imgs)) {
          setCharacterImages((prev) => ({
            ...prev,
            [charId]: {
              ...(prev[charId] || CHAR_IMG_DEFAULTS),
              image: img || (imgs && imgs[0]) || null,
              images: imgs || (img ? [img] : []),
              isGenerating: false, error: "",
              promptUsed: (result.prompt_used as string) || "",
            },
          }));
        }
        if (result.cost_usd) setTotalCost((prev) => ({ ...prev, characters: prev.characters + (result.cost_usd as number) }));
        break;
      }
      case "refine_character": {
        const charId = (result.character_id as string) || job.target_id;
        const img = result.image as MoodboardImage | undefined;
        if (charId && img) {
          setCharacterImages((prev) => ({
            ...prev,
            [charId]: {
              ...(prev[charId] || CHAR_IMG_DEFAULTS),
              image: img, isGenerating: false, error: "", feedback: "",
              promptUsed: (result.prompt_used as string) || "",
            },
          }));
        }
        if (result.cost_usd) setTotalCost((prev) => ({ ...prev, characters: prev.characters + (result.cost_usd as number) }));
        break;
      }
      case "location_image": {
        const locId = (result.location_id as string) || job.target_id;
        const img = result.image as MoodboardImage | undefined;
        const imgs = result.images as MoodboardImage[] | undefined;
        if (locId && (img || imgs)) {
          setLocationImages((prev) => ({
            ...prev,
            [locId]: {
              ...(prev[locId] || LOC_IMG_DEFAULTS),
              image: img || (imgs && imgs[0]) || null,
              images: imgs || (img ? [img] : []),
              isGenerating: false, error: "",
              promptUsed: (result.prompt_used as string) || "",
            },
          }));
        }
        if (result.cost_usd) setTotalCost((prev) => ({ ...prev, locations: prev.locations + (result.cost_usd as number) }));
        break;
      }
      case "refine_location": {
        const locId = (result.location_id as string) || job.target_id;
        const img = result.image as MoodboardImage | undefined;
        if (locId && img) {
          setLocationImages((prev) => ({
            ...prev,
            [locId]: {
              ...(prev[locId] || LOC_IMG_DEFAULTS),
              image: img, isGenerating: false, error: "", feedback: "",
              promptUsed: (result.prompt_used as string) || "",
            },
          }));
        }
        if (result.cost_usd) setTotalCost((prev) => ({ ...prev, locations: prev.locations + (result.cost_usd as number) }));
        break;
      }
      case "key_moment": {
        const km = result.key_moment as { beat_number: number; beat_description: string; image: MoodboardImage; prompt_used: string } | undefined;
        const kms = result.key_moments as Array<{ beat_number: number; beat_description: string; image: MoodboardImage; prompt_used: string }> | undefined;
        if (kms && kms.length > 0) {
          setSceneImages((prev) => {
            const updated = { ...prev };
            for (const m of kms) {
              updated[m.beat_number] = { sceneNumber: m.beat_number, title: m.beat_description.slice(0, 50), visualDescription: m.beat_description, image: m.image, isGenerating: false, error: "", feedback: "" };
            }
            return updated;
          });
        } else if (km) {
          setSceneImages((prev) => ({
            ...prev,
            [km.beat_number]: { sceneNumber: km.beat_number, title: km.beat_description.slice(0, 50), visualDescription: km.beat_description, image: km.image, isGenerating: false, error: "", feedback: "" },
          }));
        }
        if (result.cost_usd) setTotalCost((prev) => ({ ...prev, keyMoments: prev.keyMoments + (result.cost_usd as number) }));
        break;
      }
      case "scene_descriptions": {
        const descs = result.descriptions as Array<{ scene_number: number; title: string; visual_description: string }>;
        if (descs) {
          const newSceneImages: Record<number, SceneImageState> = {};
          for (const desc of descs) {
            newSceneImages[desc.scene_number] = { sceneNumber: desc.scene_number, title: desc.title, visualDescription: desc.visual_description, image: null, isGenerating: false, error: "", feedback: "" };
          }
          setSceneImages(newSceneImages);
          // Persist scene descriptions to episode_storyboards DB table
          const genId = generationIdRef.current;
          if (genId) {
            upsertEpisodeStoryboards(genId, descs.map((d) => ({
              scene_number: d.scene_number, title: d.title,
              visual_description: d.visual_description, status: "pending",
            }))).catch((e) => console.warn("DB storyboard upsert failed:", e));
          }
        }
        setIsGeneratingSceneDescs(false);
        break;
      }
      case "scene_images": {
        const sceneImgs = result.scene_images as Array<{ scene_number: number; image: MoodboardImage; prompt_used?: string }>;
        if (sceneImgs) {
          const successNums = new Set(sceneImgs.map(si => si.scene_number));
          setSceneImages((prev) => {
            const updated = { ...prev };
            for (const si of sceneImgs) {
              if (updated[si.scene_number]) updated[si.scene_number] = { ...updated[si.scene_number], image: si.image, isGenerating: false, error: "" };
            }
            // Mark scenes that were generating but NOT in results as failed
            for (const [key, scene] of Object.entries(updated)) {
              const num = parseInt(key);
              if (scene.isGenerating && !successNums.has(num)) {
                updated[num] = { ...scene, isGenerating: false, error: "Generation failed — click Regenerate to retry" };
              }
            }
            return updated;
          });
          // Persist completed images to episode_storyboards DB table
          const genId = generationIdRef.current;
          if (genId) {
            upsertEpisodeStoryboards(genId, sceneImgs.map((si) => ({
              scene_number: si.scene_number, status: "completed",
              image_url: si.image.image_url || null,
              image_base64: si.image.image_base64 || null,
              image_mime_type: si.image.mime_type,
              prompt_used: si.prompt_used || null,
            }))).catch((e) => console.warn("DB storyboard image save failed:", e));
            // Mark failed scenes in DB too
            const failedNums = Object.keys(sceneImages).map(Number).filter(n => sceneImages[n]?.isGenerating && !successNums.has(n));
            if (failedNums.length > 0) {
              upsertEpisodeStoryboards(genId, failedNums.map(n => ({
                scene_number: n, status: "failed", error_message: "Generation failed",
              }))).catch(() => {});
            }
          }
        }
        if (result.cost_usd) setTotalCost((prev) => ({ ...prev, keyMoments: prev.keyMoments + (result.cost_usd as number) }));
        saveNow();
        break;
      }
      case "scene_image": {
        const sceneNum = parseInt(job.target_id);
        const img = result.image as MoodboardImage | undefined;
        if (!isNaN(sceneNum) && img) {
          setSceneImages((prev) => ({ ...prev, [sceneNum]: { ...prev[sceneNum], image: img, isGenerating: false, feedback: "" } }));
          // Persist refined image to episode_storyboards DB table
          const genId = generationIdRef.current;
          if (genId) {
            upsertEpisodeStoryboards(genId, [{
              scene_number: sceneNum, status: "completed",
              image_url: img.image_url || null,
              image_base64: img.image_base64 || null,
              image_mime_type: img.mime_type,
              prompt_used: (result.prompt_used as string) || null,
            }]).catch((e) => console.warn("DB storyboard refine save failed:", e));
          }
        }
        if (result.cost_usd) setTotalCost((prev) => ({ ...prev, keyMoments: prev.keyMoments + (result.cost_usd as number) }));
        saveNow();
        break;
      }
      case "prompt_preview": {
        const shots = result.shots as Array<{ beat_number: number; veo_prompt: string }>;
        if (shots) {
          const editedPrompts: Record<number, string> = {};
          for (const shot of shots) editedPrompts[shot.beat_number] = shot.veo_prompt;
          setPromptPreview({ shots: shots as PromptPreviewState["shots"], editedPrompts, estimatedCostUsd: (result.estimated_cost_usd as number) || 0, isLoading: false });
        }
        break;
      }
      case "film":
      case "film_with_prompts": {
        const r = result;
        setFilm({
          filmId: r.film_id as string,
          status: (r.status as string) === "ready" ? "ready" : "failed",
          currentShot: (r.total_shots as number) || 0,
          totalShots: (r.total_shots as number) || 0,
          phase: "filming",
          completedShots: (r.completed_shots as Array<{ number: number; storage_url?: string; veo_prompt?: string }>) || [],
          finalVideoUrl: (r.final_video_url as string) || null,
          error: (r.error_message as string) || null,
          cost: (r.cost as { scene_refs_usd: number; videos_usd: number; total_usd: number }) || { scene_refs_usd: 0, videos_usd: 0, total_usd: 0 },
        });
        if (r.cost) setTotalCost((prev) => ({ ...prev, film: (r.cost as { total_usd: number }).total_usd }));
        if ((r.status as string) === "ready" && associatedStoryIdRef.current) {
          fetch(`/api/stories/${associatedStoryIdRef.current}/episodes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: episodeNameRef.current || "Untitled Episode", media_url: (r.final_video_url as string) || null, status: "draft" }),
          }).catch((err) => console.error("Failed to save episode:", err));
        }
        break;
      }
      case "shot_regenerate": {
        const shotNum = parseInt(job.target_id);
        if (!isNaN(shotNum) && result.preview_url) {
          setFilm((prev) => {
            const updatedShots = prev.completedShots.map((s) =>
              s.number === shotNum ? { ...s, preview_url: result.preview_url as string, storage_url: result.preview_url as string, veo_prompt: (result.veo_prompt as string) || s.veo_prompt } : s
            );
            return { ...prev, completedShots: updatedShots, status: "ready" };
          });
        }
        if (result.cost) setTotalCost((prev) => ({ ...prev, film: (result.cost as { total_usd: number }).total_usd }));
        setRegeneratingShotNum(null);
        break;
      }
    }
  };

  // Process completed/failed jobs from Realtime
  useEffect(() => {
    for (const job of realtimeJobs) {
      // Skip already-processed or still-generating jobs
      if (processedJobsRef.current.has(job.id)) continue;
      if (job.status === "generating") {
        // For film jobs, update progress from the incremental result
        if ((job.job_type === "film" || job.job_type === "film_with_prompts") && job.result) {
          const r = job.result as Record<string, unknown>;
          setFilm((prev) => ({
            ...prev,
            filmId: (r.film_id as string) || prev.filmId,
            phase: (r.phase as "filming" | "assembling") || prev.phase,
            currentShot: (r.current_shot as number) ?? prev.currentShot,
            totalShots: (r.total_shots as number) ?? prev.totalShots,
            completedShots: (r.completed_shots as Array<{ number: number; preview_url?: string; storage_url?: string; veo_prompt?: string }>) || prev.completedShots,
            finalVideoUrl: (r.final_video_url as string) || prev.finalVideoUrl,
            cost: (r.cost as { scene_refs_usd: number; videos_usd: number; total_usd: number }) || prev.cost,
          }));
          if (r.cost) {
            setTotalCost((prev) => ({ ...prev, film: (r.cost as { total_usd: number }).total_usd }));
          }
        }

        // Set loading indicators for in-flight jobs (e.g. after page refresh)
        switch (job.job_type) {
          case "script":
            setIsGenerating(true);
            break;
          case "refine_beat":
            setIsRefining(true);
            break;
          case "scene_descriptions":
            setIsGeneratingSceneDescs(true);
            break;
          case "scene_images":
            setSceneImages((prev) => {
              const updated = { ...prev };
              for (const key of Object.keys(updated)) {
                const num = parseInt(key);
                if (!updated[num].image) {
                  updated[num] = { ...updated[num], isGenerating: true, error: "" };
                }
              }
              return updated;
            });
            break;
          case "scene_image":
            setSceneImages((prev) => {
              const num = parseInt(job.target_id);
              if (prev[num]) return { ...prev, [num]: { ...prev[num], isGenerating: true, error: "" } };
              return prev;
            });
            break;
          case "protagonist":
          case "character_image":
          case "refine_character":
            if (job.target_id) {
              setCharacterImages((prev) => {
                if (!prev[job.target_id]) return prev;
                return { ...prev, [job.target_id]: { ...prev[job.target_id], isGenerating: true, error: "" } };
              });
            }
            break;
          case "location_image":
          case "refine_location":
            if (job.target_id) {
              setLocationImages((prev) => {
                if (!prev[job.target_id]) return prev;
                return { ...prev, [job.target_id]: { ...prev[job.target_id], isGenerating: true, error: "" } };
              });
            }
            break;
          case "key_moment":
            setSceneImages((prev) => {
              const updated = { ...prev };
              for (const key of Object.keys(updated)) {
                const num = parseInt(key);
                if (!updated[num].image) {
                  updated[num] = { ...updated[num], isGenerating: true, error: "" };
                }
              }
              return updated;
            });
            break;
          case "prompt_preview":
            setPromptPreview((prev) => ({ ...prev, isLoading: true }));
            break;
          case "film":
          case "film_with_prompts":
            setFilm((prev) => prev.status === "idle" ? { ...prev, status: "generating" } : prev);
            break;
          case "shot_regenerate":
            setRegeneratingShotNum(parseInt(job.target_id));
            break;
        }

        continue;
      }

      // Mark as processed, apply result via shared functions
      processedJobsRef.current.add(job.id);
      if (job.status === "failed") {
        applyFailedJob(job);
        continue;
      }
      applyCompletedJob(job);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realtimeJobs]);

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
      // Flush any pending debounced save immediately — this ensures the full state
      // (with images) is written to Supabase before the page unloads.
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
        saveGeneration(); // fires async Supabase update with full state
      }

      const gid = generationIdRef.current;
      if (!gid) return;

      // sendBeacon as lightweight metadata backup — never sends `state`.
      // Full state is already persisted by saveNow() (after every API response)
      // and the flush above. sendBeacon has a ~64KB limit so it can't carry base64 images.
      const payload = JSON.stringify({
        title: episodeNameRef.current || "Untitled",
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
      await supaCreateGeneration(activeGenId, episodeNameRef.current || "Untitled", style, { idea, style }, associatedStoryIdRef.current);
    }

    try {
      const payload = {
        idea,
        style,
        characters: selectedChars.length > 0 ? selectedChars.map(c => ({
          id: c.id,
          name: c.name,
          gender: c.gender,
          age: c.age,
          appearance: c.description,
          role: c.episodeRole,
        })) : undefined,
        location: selectedLocation ? {
          id: selectedLocation.id,
          name: selectedLocation.name,
          description: selectedLocation.description,
          atmosphere: selectedLocation.atmosphere,
        } : undefined,
      };

      clearProcessedJob("script");
      await submitJob("script", "/story/generate", payload, { generationId: activeGenId });
      // Result handled by Realtime useEffect — isGenerating set false there
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate story");
      setIsGenerating(false);
    }
  };

  const regenerateStory = async () => {
    setIsGenerating(true);
    setError(null);
    resetVisualDirection();
    setSelectedBeatIndex(null);

    try {
      const payload = {
        idea,
        style,
        feedback: globalFeedback || null,
        characters: selectedChars.length > 0 ? selectedChars.map(c => ({
          id: c.id,
          name: c.name,
          gender: c.gender,
          age: c.age,
          appearance: c.description,
          role: c.episodeRole,
        })) : undefined,
        location: selectedLocation ? {
          id: selectedLocation.id,
          name: selectedLocation.name,
          description: selectedLocation.description,
          atmosphere: selectedLocation.atmosphere,
        } : undefined,
      };

      clearProcessedJob("script");
      await submitJob("script", "/story/regenerate", payload, { generationId: generationIdRef.current! });
      // Result handled by Realtime useEffect
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate story");
      setIsGenerating(false);
    }
  };

  // parseScript removed — backend /story/parse-script endpoint kept for future use

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

  // Save character edit with name-change propagation to dialogue
  const saveCharacterEdit = (charIndex: number, updatedChar: Character) => {
    if (!story) return;
    const oldName = story.characters[charIndex].name;
    const newName = updatedChar.name;

    // Update character list
    const updatedChars = [...story.characters];
    updatedChars[charIndex] = updatedChar;

    // If name changed, propagate to dialogue in scenes and beats
    let updatedScenes = [...getScenes(story)];
    let updatedBeats = [...story.beats];

    if (oldName !== newName && oldName.trim() && newName.trim()) {
      const escaped = oldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const nameRegex = new RegExp(`\\b${escaped}\\b`, "g");

      updatedScenes = updatedScenes.map((scene) => ({
        ...scene,
        dialogue: scene.dialogue ? scene.dialogue.replace(nameRegex, newName) : scene.dialogue,
        characters_on_screen: scene.characters_on_screen.map((id) =>
          id === story.characters[charIndex].id ? updatedChar.id : id
        ),
      }));

      updatedBeats = updatedBeats.map((beat) => ({
        ...beat,
        blocks: beat.blocks.map((block) => ({
          ...block,
          text: block.text.replace(nameRegex, newName),
          character: block.character?.replace(nameRegex, newName) ?? block.character,
        })),
        dialogue: beat.dialogue?.map((dl) => ({
          ...dl,
          character: dl.character.replace(nameRegex, newName),
          line: dl.line.replace(nameRegex, newName),
        })) ?? beat.dialogue,
      }));
    }

    setStory({ ...story, characters: updatedChars, scenes: updatedScenes, beats: updatedBeats });
    setEditingCharIndex(null);
    setEditCharDraft(null);
  };

  const refineBeat = async () => {
    if (!story || selectedBeatIndex === null || !feedback.trim()) {
      return;
    }

    setIsRefining(true);

    try {
      clearProcessedJob("refine_beat", String(selectedBeatIndex + 1));
      await submitJob(
        "refine_beat",
        "/story/refine-beat",
        { story, beat_number: selectedBeatIndex + 1, feedback },
        { generationId: generationIdRef.current!, targetId: String(selectedBeatIndex + 1) }
      );
      // Result handled by Realtime useEffect
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refine beat");
      setIsRefining(false);
    }
  };

  // ============================================================
  // Generation Persistence
  // ============================================================

  const buildSnapshot = () => ({
    idea,
    style,
    story,
    episodeName,
    episodeNumber,
    episodeIsFree,
    selectedChars,
    selectedLocation,
    // isGenerating intentionally omitted — transient state, always false on restore
    visualsActive,
    visualsTab,
    // Images are DB-authoritative (story_characters/story_locations tables).
    // JSONB only stores supplementary state — no image data.
    characterImages: Object.fromEntries(
      Object.entries(characterImages).map(([k, v]) => [k, {
        selectedIndex: v.selectedIndex,
        approved: v.approved,
        feedback: v.feedback,
        promptUsed: v.promptUsed,
        refImages: v.refImages.map((r) => ({ url: r.url, mimeType: r.mimeType, name: r.name })),
      }])
    ),
    locationImages: Object.fromEntries(
      Object.entries(locationImages).map(([k, v]) => [k, {
        selectedIndex: v.selectedIndex,
        approved: v.approved,
        feedback: v.feedback,
        promptUsed: v.promptUsed,
        refImages: v.refImages.map((r) => ({ url: r.url, mimeType: r.mimeType, name: r.name })),
      }])
    ),
    // Scene images are DB-authoritative (episode_storyboards table).
    // JSONB keeps scene metadata (needed by backward compat restore) but no image data.
    sceneImages: Object.fromEntries(
      Object.entries(sceneImages).map(([k, v]) => [k, {
        sceneNumber: v.sceneNumber,
        title: v.title,
        visualDescription: v.visualDescription,
        feedback: v.feedback,
      }])
    ),
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

  /** Derive generation status from current state — single source of truth */
  const inferStatus = (): string => {
    if (film.status === "generating" || film.status === "assembling") return "filming";
    if (film.status === "ready") return "ready";
    if (film.status === "failed") return "failed";
    if (promptPreview.shots.length > 0) return "preflight";
    if (visualsActive) return "visuals";
    return "drafting";
  };

  // Save with snapshotRef (always-current post-render state) for debounced/beforeunload saves
  const saveGeneration = async (statusOverride?: string, explicitId?: string) => {
    const gid = explicitId || generationIdRef.current;
    if (!gid) return;
    const snapshot = snapshotRef.current;
    supaUpdateGeneration(gid, {
      title: episodeNameRef.current || "Untitled",
      status: statusOverride || inferStatus(),
      state: snapshot,
      film_id: film.filmId,
      cost_total: totalCost.story + totalCost.characters + totalCost.locations + totalCost.keyMoments + totalCost.film,
    }).catch(console.error);
  };

  // Save immediately — reads from snapshotRef (post-last-render state), merges optional overrides
  // for fields that were just set via setState but haven't rendered yet
  const saveNow = (overrides: Record<string, unknown> = {}, statusOverride?: string) => {
    // Cancel pending debounced auto-save — this explicit save supersedes it
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    const gid = generationIdRef.current;
    if (!gid) return;
    const snapshot = { ...snapshotRef.current, ...overrides };
    supaUpdateGeneration(gid, {
      title: episodeNameRef.current || "Untitled",
      status: statusOverride || inferStatus(),
      state: snapshot,
      film_id: film.filmId,
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

  // Fetch story library chars & locations for the picker
  const fetchStoryLibrary = async (storyId: string) => {
    try {
      const [chars, locs] = await Promise.all([
        getStoryCharacters(storyId),
        getStoryLocations(storyId),
      ]);
      console.log(`[FETCH-LIB] storyId=${storyId}, chars=${chars.length}, locs=${locs.length}`, chars.map(c => ({
        id: c.id, name: c.name, hasImg: !!(c.imageBase64?.length || c.imageUrl),
      })));
      setStoryLibraryChars(chars);
      setStoryLibraryLocs(locs);
    } catch (e) { console.error("[FETCH-LIB] error:", e); }
  };

  // Handle story selection from picker → show episode modal next
  const handleStorySelected = (storyId: string) => {
    setShowStoryPicker(false);
    setPendingStoryId(storyId);
    setShowCreateEpisodeModal(true);
  };

  // Handle episode creation from modal → navigate with full URL params
  const handleEpisodeCreated = (episode: { name: string; number: number; isFree: boolean }) => {
    setShowCreateEpisodeModal(false);
    const storyId = pendingStoryId;
    if (!storyId) return;
    const params = new URLSearchParams({
      storyId,
      name: episode.name,
      number: String(episode.number),
      isFree: String(episode.isFree),
    });
    // Navigate — triggers full page re-init with proper params
    window.location.href = `/create-episode?${params.toString()}`;
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
      // Restore story association from DB column + fetch library chars/locs (DB-authoritative for images)
      let dbChars: StoryCharacterFE[] = [];
      let dbLocs: StoryLocationFE[] = [];
      if (data.story_id) {
        setAssociatedStoryId(data.story_id);
        associatedStoryIdRef.current = data.story_id;
        fetch(`/api/stories/${data.story_id}`)
          .then(res => res.ok ? res.json() : null)
          .then(d => { if (d?.title) setAssociatedStoryName(d.title); })
          .catch(() => {});
        // Await DB fetch — these are the source of truth for images
        try {
          [dbChars, dbLocs] = await Promise.all([
            getStoryCharacters(data.story_id),
            getStoryLocations(data.story_id),
          ]);
          console.log(`[RESTORE] DB chars (${dbChars.length}):`, dbChars.map(c => ({
            id: c.id, name: c.name, hasBase64: !!(c.imageBase64?.length), hasUrl: !!c.imageUrl,
          })));
          console.log(`[RESTORE] DB locs (${dbLocs.length}):`, dbLocs.map(l => ({
            id: l.id, name: l.name, hasBase64: !!(l.imageBase64?.length), hasUrl: !!l.imageUrl,
          })));
          setStoryLibraryChars(dbChars);
          setStoryLibraryLocs(dbLocs);
        } catch (e) { console.error("[RESTORE] DB fetch failed:", e); }
      }
      // Fetch storyboards from DB (linked to generation, not story)
      let dbStoryboards: EpisodeStoryboardFE[] = [];
      try { dbStoryboards = await getEpisodeStoryboards(genId); } catch { /* non-fatal */ }

      const restoredName = (s.episodeName as string | null) || data.title || null;
      setEpisodeName(restoredName);
      episodeNameRef.current = restoredName;
      if (s.episodeNumber !== undefined) setEpisodeNumber(s.episodeNumber as number | null);
      if (s.episodeIsFree !== undefined) setEpisodeIsFree(s.episodeIsFree as boolean);
      if (s.idea !== undefined) setIdea(s.idea as string);
      if (s.style) setStyle(s.style as Style);
      if (s.selectedChars) setSelectedChars(s.selectedChars as SelectedCharacter[]);
      if (s.selectedLocation !== undefined) setSelectedLocation(s.selectedLocation as StoryLocationFE | null);

      // Restore story from JSONB (AI chars keep their original IDs — no remapping needed)
      const restoredStory = s.story as Story | null;
      if (restoredStory !== undefined) setStory(restoredStory);
      // Restore new visuals state
      if (s.visualsActive !== undefined) setVisualsActive(s.visualsActive as boolean);
      if (s.visualsTab) setVisualsTab(s.visualsTab as VisualsTab);
      // Backward compat: old snapshots with visualStep → map to visualsActive
      if (s.visualStep && !s.visualsActive) setVisualsActive(true);

      // Helper: check if an image has real content (URL or base64)
      const hasRealImage = (img: MoodboardImage | null) => {
        if (!img) return false;
        if (img.image_url) return true;
        if (img.image_base64 && img.image_base64 !== "[stripped]") return true;
        return false;
      };

      // ── JSONB-primary image restoration with library name-matching fallback ──
      const jsonbChars = (s.characterImages || {}) as Record<string, Partial<CharacterImageState>>;
      const jsonbLocs = (s.locationImages || {}) as Record<string, Partial<LocationImageState>>;
      const cleanedChars: Record<string, CharacterImageState> = {};

      // Build name→image maps from library DB entries (for fallback when JSONB image is missing)
      const libCharByName = new Map<string, StoryCharacterFE>();
      for (const dbChar of dbChars) libCharByName.set(dbChar.name.toLowerCase(), dbChar);
      const libLocByName = new Map<string, StoryLocationFE>();
      for (const dbLoc of dbLocs) libLocByName.set((dbLoc.name || "").toLowerCase(), dbLoc);

      for (const [cid, ci] of Object.entries(jsonbChars)) {
        const rawCi = ci as CharacterImageState;
        if (rawCi.image && hasRealImage(rawCi.image)) {
          cleanedChars[cid] = { ...rawCi, isGenerating: false };
        } else {
          // Try library name match for image fallback (survives refresh)
          const storyChar = restoredStory?.characters.find(c => c.id === cid);
          const libMatch = storyChar ? libCharByName.get(storyChar.name.toLowerCase()) : null;
          if (libMatch && (libMatch.imageUrl || libMatch.imageBase64)) {
            cleanedChars[cid] = {
              ...rawCi,
              image: {
                type: "character" as const,
                image_url: libMatch.imageUrl || undefined,
                image_base64: libMatch.imageBase64 || undefined,
                mime_type: libMatch.imageMimeType || "image/png",
                prompt_used: rawCi.promptUsed || "",
              },
              approved: true, isGenerating: false,
            };
          } else {
            cleanedChars[cid] = { ...rawCi, image: null, isGenerating: false };
          }
        }
      }
      setCharacterImages(cleanedChars);

      // ── Location image restoration ──
      const cleanedLocs: Record<string, LocationImageState> = {};
      for (const [lid, li] of Object.entries(jsonbLocs)) {
        const rawLi = li as LocationImageState;
        if (rawLi.image && hasRealImage(rawLi.image)) {
          cleanedLocs[lid] = { ...rawLi, isGenerating: false };
        } else {
          const storyLoc = restoredStory?.locations.find(l => l.id === lid);
          const libMatch = storyLoc ? libLocByName.get((storyLoc.name || "").toLowerCase()) : null;
          if (libMatch && (libMatch.imageUrl || libMatch.imageBase64)) {
            cleanedLocs[lid] = {
              ...rawLi,
              image: {
                type: "location" as const,
                image_url: libMatch.imageUrl || undefined,
                image_base64: libMatch.imageBase64 || undefined,
                mime_type: libMatch.imageMimeType || "image/png",
                prompt_used: rawLi.promptUsed || "",
              },
              approved: true, isGenerating: false,
            };
          } else {
            cleanedLocs[lid] = { ...rawLi, image: null, isGenerating: false };
          }
        }
      }
      setLocationImages(cleanedLocs);

      // ── DB-authoritative: build scene image states from episode_storyboards table ──
      const jsonbScenes = (s.sceneImages || {}) as Record<number, Partial<SceneImageState>>;
      const cleanedScenes: Record<number, SceneImageState> = {};

      for (const dbSb of dbStoryboards) {
        const js = jsonbScenes[dbSb.sceneNumber] || {};
        const hasImg = dbSb.imageUrl || dbSb.imageBase64;
        cleanedScenes[dbSb.sceneNumber] = {
          sceneNumber: dbSb.sceneNumber,
          title: dbSb.title,
          visualDescription: dbSb.visualDescription,
          image: hasImg ? {
            type: "key_moment" as const,
            image_url: dbSb.imageUrl || undefined,
            image_base64: dbSb.imageBase64 || undefined,
            mime_type: dbSb.imageMimeType || "image/png",
            prompt_used: dbSb.promptUsed || "",
          } : null,
          isGenerating: dbSb.status === "generating",
          error: dbSb.status === "failed" ? (dbSb.errorMessage || "Generation failed") : "",
          feedback: (js.feedback as string) || "",
        };
      }
      // Backward compat: JSONB-only entries for old generations without DB rows
      for (const [key, si] of Object.entries(jsonbScenes)) {
        const num = parseInt(key);
        if (!cleanedScenes[num]) {
          const rawSi = si as SceneImageState;
          if (rawSi.image && hasRealImage(rawSi.image)) {
            cleanedScenes[num] = { ...rawSi, isGenerating: false };
          } else {
            cleanedScenes[num] = { ...rawSi, image: null, isGenerating: false };
          }
        }
      }
      setSceneImages(cleanedScenes);

      // Prefetch base64 for URL-only images (needed by buildApprovedVisuals)
      const prefetchBase64 = async () => {
        const tasks: Promise<void>[] = [];
        const prefetchImg = (img: MoodboardImage) => {
          if (img.image_url && !img.image_base64) {
            tasks.push((async () => {
              try {
                const resp = await fetch(img.image_url!);
                const blob = await resp.blob();
                const b64 = await new Promise<string>((resolve) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve((reader.result as string).split(",")[1]);
                  reader.readAsDataURL(blob);
                });
                img.image_base64 = b64;
              } catch {}
            })());
          }
        };
        for (const ci of Object.values(cleanedChars)) {
          if (ci.image) prefetchImg(ci.image);
        }
        for (const li of Object.values(cleanedLocs)) {
          if (li.image) prefetchImg(li.image);
        }
        if (tasks.length > 0) {
          await Promise.all(tasks);
          setCharacterImages({ ...cleanedChars });
          setLocationImages({ ...cleanedLocs });
        }
      };
      prefetchBase64().catch(console.error);

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
          completedShots: (fj.completed_shots || []).map((cs: { number: number; storage_url?: string; preview_url?: string; veo_prompt?: string }) => ({
            number: cs.number,
            preview_url: cs.storage_url || cs.preview_url || "",
            storage_url: cs.storage_url || cs.preview_url || "",
            veo_prompt: cs.veo_prompt || "",
          })),
          finalVideoUrl: fj.final_video_url || null,
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
      // Film progress for in-flight jobs is delivered via Realtime subscription (no polling needed)

      // ---- Check gen_jobs for completed results (handles tab-close recovery) ----
      const restoredGenId = data.id;
      (async () => {
        try {
          const completedJobs = await getCompletedJobs(restoredGenId);
          if (completedJobs.length === 0) {
            // No completed jobs — if script was generating, reset to idle
            if (s.isGenerating && !(s.story as Story | null)) {
              setIsGenerating(false);
            }
            return;
          }

          // Apply completed/failed jobs via shared functions (same logic as Realtime handler)
          for (const job of completedJobs) {
            processedJobsRef.current.add(job.id);
            if (job.status === "failed") {
              applyFailedJob(job);
            } else {
              applyCompletedJob(job);
            }
          }

          // Clean up processed jobs
          await clearGenJobs(restoredGenId);
          // Save updated state
          saveNow();
        } catch (err) {
          console.error("Failed to check completed gen jobs:", err);
        }
      })();
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
    setEpisodeName(null);
    episodeNameRef.current = null;
    setIdea("");
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
    setFilm({
      filmId: null, status: "idle", currentShot: 0, totalShots: 0,
      phase: "filming", completedShots: [], finalVideoUrl: null, error: null,
      cost: { scene_refs_usd: 0, videos_usd: 0, total_usd: 0 },
    });
    setClipsApproved(false);
    setRegeneratingShotNum(null);
    setShotFeedback({});
    setPromptPreview({ shots: [], editedPrompts: {}, estimatedCostUsd: 0, isLoading: false });
    setSelectedChars([]);
    setSelectedLocation(null);
    setStoryLibraryChars([]);
    setStoryLibraryLocs([]);
    setAssociatedStoryId(null);
    associatedStoryIdRef.current = null;
    processedJobsRef.current.clear();
    setTotalCost({ story: 0, characters: 0, locations: 0, keyMoments: 0, film: 0 });
  };

  // ============================================================
  // Build Your Visuals (Phase 2) Functions
  // ============================================================

  const startBuildVisuals = async () => {
    if (!story) return;
    setVisualsActive(true);
    setVisualsTab("characters");
    const gid = generationIdRef.current;

    // ── Step 1: Ensure a story exists in DB (auto-create if needed) ──
    let storyId = associatedStoryIdRef.current;
    if (!storyId) {
      try {
        const newStory = await createStory({
          title: episodeNameRef.current || "Untitled",
          type: "video",
          status: "draft",
        });
        storyId = newStory.id;
        setAssociatedStoryId(storyId);
        associatedStoryIdRef.current = storyId;
        if (gid) supaUpdateGeneration(gid, { story_id: storyId } as Record<string, unknown>).catch(console.error);
      } catch (e) {
        console.error("Failed to auto-create story:", e);
      }
    }

    // AI chars keep their original IDs — no DB sync or ID remapping needed.
    // Only library chars (created from story editor or "Save to Library") live in DB.

    // ── Step 2: Build character image states ──
    const findCharImgSource = (char: Character) => {
      const nameLower = char.name.toLowerCase();
      const byId = storyLibraryChars.find((c) => c.id === char.id)
        || selectedChars.find((c) => c.id === char.id);
      if (byId && (byId.imageBase64 || byId.imageUrl)) return byId;
      const byName = storyLibraryChars.find((c) => c.name.toLowerCase() === nameLower)
        || selectedChars.find((c) => c.name.toLowerCase() === nameLower);
      if (byName && (byName.imageBase64 || byName.imageUrl)) return byName;
      return null;
    };

    const charStates: Record<string, CharacterImageState> = {};
    story.characters.forEach((char) => {
      const imgSource = findCharImgSource(char);
      if (imgSource) {
        charStates[char.id] = {
          image: {
            type: "character",
            image_base64: imgSource.imageBase64 || undefined,
            image_url: imgSource.imageUrl || undefined,
            mime_type: imgSource.imageMimeType,
            prompt_used: "",
          },
          images: [], selectedIndex: 0, approved: true,
          isGenerating: false, feedback: "", promptUsed: "", error: "", refImages: [],
        };
      } else {
        charStates[char.id] = {
          image: null, images: [], selectedIndex: 0, approved: false,
          isGenerating: false, feedback: "", promptUsed: "", error: "", refImages: [],
        };
      }
    });

    // ── Step 4: Build location image states ──
    const findLocImgSource = (loc: Location) => {
      const nameLower = (loc.name || "").toLowerCase();
      const byId = storyLibraryLocs.find((l) => l.id === loc.id)
        || (selectedLocation?.id === loc.id ? selectedLocation : null);
      if (byId && (byId.imageBase64 || byId.imageUrl)) return byId;
      const byName = storyLibraryLocs.find((l) => (l.name || "").toLowerCase() === nameLower)
        || (selectedLocation && (selectedLocation.name || "").toLowerCase() === nameLower ? selectedLocation : null);
      if (byName && (byName.imageBase64 || byName.imageUrl)) return byName;
      return null;
    };

    const locStates: Record<string, LocationImageState> = {};
    story.locations.forEach((loc) => {
      const imgSource = findLocImgSource(loc);
      if (imgSource) {
        locStates[loc.id] = {
          image: {
            type: "location",
            image_base64: imgSource.imageBase64 || undefined,
            image_url: imgSource.imageUrl || undefined,
            mime_type: imgSource.imageMimeType,
            prompt_used: "",
          },
          images: [], selectedIndex: 0, approved: true,
          isGenerating: false, feedback: "", promptUsed: "", error: "", refImages: [],
        };
      } else {
        locStates[loc.id] = {
          image: null, images: [], selectedIndex: 0, approved: false,
          isGenerating: false, feedback: "", promptUsed: "", error: "", refImages: [],
        };
      }
    });

    // ── Step 5: Upload library images to Storage for URL access ──
    if (gid && storyId) {
      const uploadTasks: Promise<void>[] = [];
      for (const [charId, state] of Object.entries(charStates)) {
        if (state.image?.image_base64) {
          uploadTasks.push((async () => {
            const url = await uploadGenerationAsset(gid, `characters/${charId}/${Date.now()}_0`, state.image!.image_base64!, state.image!.mime_type);
            if (url) state.image!.image_url = url;
          })());
        }
      }
      for (const [locId, state] of Object.entries(locStates)) {
        if (state.image?.image_base64) {
          uploadTasks.push((async () => {
            const url = await uploadGenerationAsset(gid, `locations/${locId}/${Date.now()}_0`, state.image!.image_base64!, state.image!.mime_type);
            if (url) state.image!.image_url = url;
          })());
        }
      }
      await Promise.all(uploadTasks);
    }

    setCharacterImages(charStates);
    setLocationImages(locStates);
    saveNow({ characterImages: charStates, locationImages: locStates, story: story, visualsActive: true, visualsTab: "characters" }, "visuals");
  };

  // Character visuals modal save handler
  const handleVisualCharSave = async (charId: string, data: {
    name: string; age: string; gender: string; description: string;
    role: string; visualStyle: string | null; imageBase64: string | null; imageMimeType: string;
  }) => {
    if (!story) return;
    setIsSavingVisualChar(true);

    // Compute updated character images so we can pass fresh data to saveNow
    let updatedCharacterImages = characterImages;
    if (data.imageBase64) {
      const imgUrl = generationIdRef.current
        ? await uploadGenerationAsset(generationIdRef.current, `characters/${charId}/${Date.now()}_0`, data.imageBase64, data.imageMimeType)
        : null;
      updatedCharacterImages = {
        ...characterImages,
        [charId]: {
          ...(characterImages[charId] || { images: [], selectedIndex: 0, approved: false, isGenerating: false, feedback: "", promptUsed: "", error: "", refImages: [] }),
          image: { type: "character" as const, image_url: imgUrl || undefined, image_base64: data.imageBase64!, mime_type: data.imageMimeType, prompt_used: "" },
          approved: true,
          isGenerating: false,
          error: "",
        },
      };
      setCharacterImages(updatedCharacterImages);
    }

    setIsSavingVisualChar(false);
    setEditingVisualCharId(null);
    saveNow({ characterImages: updatedCharacterImages });
  };

  // Location visuals modal save handler
  const handleVisualLocSave = async (locId: string, data: {
    name: string; description: string; atmosphere: string;
    visualStyle: string | null; imageBase64: string | null; imageMimeType: string;
  }) => {
    if (!story) return;
    setIsSavingVisualLoc(true);

    // Compute updated location images so we can pass fresh data to saveNow
    let updatedLocationImages = locationImages;
    if (data.imageBase64) {
      const imgUrl = generationIdRef.current
        ? await uploadGenerationAsset(generationIdRef.current, `locations/${locId}/${Date.now()}_0`, data.imageBase64, data.imageMimeType)
        : null;
      updatedLocationImages = {
        ...locationImages,
        [locId]: {
          ...(locationImages[locId] || { images: [], selectedIndex: 0, approved: false, isGenerating: false, feedback: "", promptUsed: "", error: "", refImages: [] }),
          image: { type: "location" as const, image_url: imgUrl || undefined, image_base64: data.imageBase64!, mime_type: data.imageMimeType, prompt_used: "" },
          approved: true,
          isGenerating: false,
          error: "",
        },
      };
      setLocationImages(updatedLocationImages);
    }

    setIsSavingVisualLoc(false);
    setEditingVisualLocId(null);
    saveNow({ locationImages: updatedLocationImages });
  };

  // Save an AI-generated char or loc to the story library (creates a NEW DB entry)
  const handleSaveToLibrary = async (type: "character" | "location", id: string) => {
    const sid = associatedStoryIdRef.current;
    if (!sid) {
      console.error(`[SAVE-TO-LIB] ABORTED: no associated story`);
      return;
    }
    try {
      if (type === "character") {
        const char = story?.characters.find(c => c.id === id);
        if (!char) return;
        const img = characterImages[id]?.image;
        const newDbChar = await createStoryCharacter(sid, {
          name: char.name, age: char.age, gender: char.gender,
          description: char.appearance || "", role: char.role, visual_style: style,
          image_base64: img?.image_base64 || null,
          image_url: img?.image_url || null,
          image_mime_type: img?.mime_type || "image/png",
        });
        setStoryLibraryChars(prev => [...prev, newDbChar]);
      } else {
        const loc = story?.locations.find(l => l.id === id);
        if (!loc) return;
        const img = locationImages[id]?.image;
        const newDbLoc = await createStoryLocation(sid, {
          name: loc.name, description: loc.description || "",
          atmosphere: loc.atmosphere || "", visual_style: style,
          image_base64: img?.image_base64 || null,
          image_url: img?.image_url || null,
          image_mime_type: img?.mime_type || "image/png",
        });
        setStoryLibraryLocs(prev => [...prev, newDbLoc]);
      }
    } catch (e) {
      console.error("[SAVE-TO-LIB] FAILED:", e);
    }
  };

  // Fetch scene visual descriptions from AI
  const fetchSceneDescriptions = async () => {
    if (!story || !generationIdRef.current) return;
    setIsGeneratingSceneDescs(true);
    setSceneDescError("");

    try {
      clearProcessedJob("scene_descriptions");
      await submitJob(
        "scene_descriptions",
        "/story/generate-scene-descriptions",
        { story },
        { generationId: generationIdRef.current! }
      );
      // Result handled by Realtime useEffect
    } catch (err) {
      console.error("Failed to submit scene descriptions job:", err);
      setIsGeneratingSceneDescs(false);
      setSceneDescError("Failed to submit job. Please try again.");
    }
  };

  // Generate all scene images — each scene submitted as its own job for real-time loading
  const generateAllSceneImages = async () => {
    if (!story) return;
    const approvedVisuals = buildApprovedVisuals();
    if (!approvedVisuals) return;

    const scenes = Object.values(sceneImages);

    // Mark all scenes as generating
    setSceneImages((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((key) => {
        const num = parseInt(key);
        updated[num] = { ...updated[num], isGenerating: true, error: "" };
      });
      return updated;
    });

    // Persist generating status to DB
    const genId = generationIdRef.current;
    if (genId) {
      await upsertEpisodeStoryboards(genId, scenes.map((si) => ({
        scene_number: si.sceneNumber, status: "generating",
      })));
    }

    // Submit all scenes in parallel — results arrive via Realtime individually
    for (const scene of scenes) {
      clearProcessedJob("scene_image", String(scene.sceneNumber));
    }
    await Promise.allSettled(
      scenes.map((scene) =>
        submitJob(
          "scene_image",
          "/moodboard/refine-scene-image",
          {
            story,
            approved_visuals: approvedVisuals,
            scene_number: scene.sceneNumber,
            visual_description: scene.visualDescription,
          },
          { generationId: generationIdRef.current!, targetId: String(scene.sceneNumber) }
        ).catch(() => {
          setSceneImages((prev) => ({
            ...prev,
            [scene.sceneNumber]: { ...prev[scene.sceneNumber], isGenerating: false, error: "Failed to submit" },
          }));
        })
      )
    );
  };

  // Refine a single scene image with feedback
  const refineSceneImage = async (sceneNumber: number) => {
    if (!story) return;
    const scene = sceneImages[sceneNumber];
    if (!scene || !scene.feedback.trim()) return;

    const approvedVisuals = buildApprovedVisuals();
    if (!approvedVisuals) return;

    setSceneImages((prev) => ({
      ...prev,
      [sceneNumber]: { ...prev[sceneNumber], isGenerating: true, error: "" },
    }));

    // Persist generating status to DB
    const genId = generationIdRef.current;
    if (genId) {
      upsertEpisodeStoryboards(genId, [{
        scene_number: sceneNumber, status: "generating",
      }]).catch(() => {});
    }

    try {
      clearProcessedJob("scene_image", String(sceneNumber));
      await submitJob(
        "scene_image",
        "/moodboard/refine-scene-image",
        {
          story,
          approved_visuals: approvedVisuals,
          scene_number: sceneNumber,
          visual_description: scene.visualDescription,
          feedback: scene.feedback,
        },
        { generationId: generationIdRef.current!, targetId: String(sceneNumber) }
      );
      // Result handled by Realtime useEffect — image uploaded by backend
    } catch (err) {
      setSceneImages((prev) => ({
        ...prev,
        [sceneNumber]: { ...prev[sceneNumber], isGenerating: false, error: "Refinement failed" },
      }));
    }
  };

  // Regenerate a failed scene image (no feedback required)
  const regenerateSceneImage = async (sceneNumber: number) => {
    if (!story) return;
    const scene = sceneImages[sceneNumber];
    if (!scene) return;

    const approvedVisuals = buildApprovedVisuals();
    if (!approvedVisuals) return;

    setSceneImages((prev) => ({
      ...prev,
      [sceneNumber]: { ...prev[sceneNumber], isGenerating: true, error: "" },
    }));

    const genId = generationIdRef.current;
    if (genId) {
      upsertEpisodeStoryboards(genId, [{
        scene_number: sceneNumber, status: "generating",
      }]).catch(() => {});
    }

    try {
      clearProcessedJob("scene_image", String(sceneNumber));
      await submitJob(
        "scene_image",
        "/moodboard/refine-scene-image",
        {
          story,
          approved_visuals: approvedVisuals,
          scene_number: sceneNumber,
          visual_description: scene.visualDescription,
        },
        { generationId: generationIdRef.current!, targetId: String(sceneNumber) }
      );
    } catch (err) {
      setSceneImages((prev) => ({
        ...prev,
        [sceneNumber]: { ...prev[sceneNumber], isGenerating: false, error: "Regeneration failed" },
      }));
    }
  };

  // Updated buildApprovedVisuals — sends both image_base64 and image_url
  // Backend will use base64 if available, or fetch from URL as fallback
  const buildApprovedVisuals = () => {
    if (!story) return null;

    type ImgRef = { image_base64: string | null; image_url: string | null; mime_type: string };
    const allCharacterImages: ImgRef[] = [];
    const characterImageMap: Record<string, ImgRef> = {};
    story.characters.forEach((char) => {
      const charState = characterImages[char.id];
      const img = charState?.image;
      if (img && (img.image_base64 || img.image_url)) {
        const ref: ImgRef = { image_base64: img.image_base64 || null, image_url: img.image_url || null, mime_type: img.mime_type };
        allCharacterImages.push(ref);
        characterImageMap[char.id] = ref;
      }
    });

    const locImages: Record<string, ImgRef> = {};
    const locDescs: Record<string, string> = {};
    story.locations.forEach((loc) => {
      const locState = locationImages[loc.id];
      const img = locState?.image;
      if (img && (img.image_base64 || img.image_url)) {
        locImages[loc.id] = { image_base64: img.image_base64 || null, image_url: img.image_url || null, mime_type: img.mime_type };
      }
      locDescs[loc.id] = `${loc.description}. ${loc.atmosphere}`;
    });

    // Backward compat: setting_image from first location
    let settingImg: ImgRef | undefined = undefined;
    let settingDesc = "";
    if (Object.keys(locImages).length > 0) {
      const firstLocId = Object.keys(locImages)[0];
      settingImg = locImages[firstLocId];
      settingDesc = locDescs[firstLocId] || "";
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

  const resetVisualDirection = () => {
    setVisualsActive(false);
    setVisualsTab("characters");
    setCharacterImages({});
    setLocationImages({});
    setSceneImages({});
  };

  // (old startVisualDirection removed — replaced by startBuildVisuals above)


  // ============================================================
  // Phase 4: Film Generation Functions
  // ============================================================


  // Story library fallback: fill missing char/loc images from library after restore
  useEffect(() => {
    if (!visualsActive || isRestoringRef.current) return;
    if (storyLibraryChars.length > 0) {
      setCharacterImages((prev) => {
        let changed = false;
        const updated = { ...prev };
        for (const [charId, state] of Object.entries(updated)) {
          if (!state.image && !state.isGenerating) {
            const libChar = storyLibraryChars.find(c => c.id === charId);
            if (libChar?.imageBase64) {
              updated[charId] = { ...state, image: { type: "character", image_base64: libChar.imageBase64, mime_type: libChar.imageMimeType, prompt_used: "" }, approved: true };
              changed = true;
            }
          }
        }
        return changed ? updated : prev;
      });
    }
    if (storyLibraryLocs.length > 0) {
      setLocationImages((prev) => {
        let changed = false;
        const updated = { ...prev };
        for (const [locId, state] of Object.entries(updated)) {
          if (!state.image && !state.isGenerating) {
            const libLoc = storyLibraryLocs.find(l => l.id === locId);
            if (libLoc?.imageBase64) {
              updated[locId] = { ...state, image: { type: "location", image_base64: libLoc.imageBase64, mime_type: libLoc.imageMimeType, prompt_used: "" }, approved: true };
              changed = true;
            }
          }
        }
        return changed ? updated : prev;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyLibraryChars, storyLibraryLocs, visualsActive]);

  // Keep snapshotRef in sync with latest state — runs after every relevant render
  // so saveNow()/saveGeneration() always read current values instead of stale closures
  useEffect(() => {
    snapshotRef.current = buildSnapshot();
  });

  // Auto-save generation state when key milestones change
  // Debounced to avoid spamming on rapid state changes
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    // Use refs to avoid stale closure issues
    if (!generationIdRef.current || isRestoringRef.current) return;
    // Only save if we have meaningful state
    if (!story && !visualsActive) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveGeneration();
    }, 500); // 500ms debounce — fast enough to catch before refresh
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    generationId, story, visualsActive, visualsTab,
    characterImages, locationImages, sceneImages, promptPreview,
    film, clipsApproved, totalCost,
    episodeName, episodeNumber, episodeIsFree,
  ]);

  // On mount: only restore if URL has ?g= param. Otherwise start fresh.
  // Works like ChatGPT/Claude: bare URL = blank slate, ?g=xxx = restore that generation.
  useEffect(() => {
    const init = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const urlGenId = urlParams.get("g");
      const urlStoryId = urlParams.get("storyId");
      const urlEpName = urlParams.get("name");
      const urlEpNumber = urlParams.get("number");
      const urlEpIsFree = urlParams.get("isFree");
      if (urlStoryId) {
        setAssociatedStoryId(urlStoryId);
        associatedStoryIdRef.current = urlStoryId;
        // Fetch story name for banner
        fetch(`/api/stories/${urlStoryId}`)
          .then(res => res.ok ? res.json() : null)
          .then(data => { if (data?.title) setAssociatedStoryName(data.title); })
          .catch(() => {});
        // Fetch story library chars & locations
        fetchStoryLibrary(urlStoryId);
      }
      if (urlEpName) { setEpisodeName(urlEpName); episodeNameRef.current = urlEpName; }
      if (urlEpNumber) setEpisodeNumber(parseInt(urlEpNumber, 10));
      if (urlEpIsFree === "true") setEpisodeIsFree(true);
      if (urlGenId) {
        await restoreGeneration(urlGenId);
      }

      // No storyId and no restore → show story picker (all episodes must be linked to a story)
      if (!urlStoryId && !urlGenId) {
        if (user?.id) {
          try {
            const stories = await getMyStories(user.id);
            setAvailableStories(stories.map(s => ({ id: s.id, title: s.title, cover: s.cover, episodeCount: s.episodeCount })));
          } catch { /* ignore */ }
        }
        setShowStoryPicker(true);
      }
    };
    init().catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startFilmGeneration = async () => {
    if (!story) return;

    const approvedVisuals = buildApprovedVisuals();
    if (!approvedVisuals) return;

    // Use spike scene image (scene 4) as key_moment_image for backward compat with film pipeline
    const spikeScene = sceneImages[4] || sceneImages[Object.keys(sceneImages)[0] as unknown as number];
    const keyMomentImage = spikeScene?.image?.image_base64
      ? { image_base64: spikeScene.image.image_base64, mime_type: spikeScene.image.mime_type }
      : undefined;

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
      clearProcessedJob("film");
      await submitJob(
        "film",
        "/film/generate",
        {
          story,
          approved_visuals: approvedVisuals,
          key_moment_image: keyMomentImage,
          generation_id: generationIdRef.current,
        },
        { generationId: generationIdRef.current! }
      );
      // Progress + completion handled by Realtime useEffect — no polling needed
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
    if (!story) return;

    const approvedVisuals = buildApprovedVisuals();
    if (!approvedVisuals) return;

    setPromptPreview((prev) => ({ ...prev, isLoading: true }));

    try {
      clearProcessedJob("prompt_preview");
      const spikeScene = sceneImages[4] || sceneImages[Object.keys(sceneImages)[0] as unknown as number];
      await submitJob(
        "prompt_preview",
        "/film/preview-prompts",
        {
          story,
          approved_visuals: approvedVisuals,
          key_moment_image: spikeScene?.image?.image_base64
            ? { image_base64: spikeScene.image.image_base64, mime_type: spikeScene.image.mime_type }
            : { image_base64: "", mime_type: "image/png" },
          beat_numbers: [],
        },
        { generationId: generationIdRef.current! }
      );
      // Result handled by Realtime useEffect
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to preview prompts");
      setPromptPreview((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const startFilmWithEditedPrompts = async () => {
    if (!story) return;

    const approvedVisuals = buildApprovedVisuals();
    if (!approvedVisuals) return;

    // Use spike scene image as overall key_moment_image for backward compat
    const spikeScene = sceneImages[4] || sceneImages[Object.keys(sceneImages)[0] as unknown as number];
    const keyMomentImage = spikeScene?.image?.image_base64
      ? { image_base64: spikeScene.image.image_base64, mime_type: spikeScene.image.mime_type }
      : undefined;

    // Build per-shot scene image references
    const sceneImageByBeat: Record<number, { image_base64: string; mime_type: string }> = {};
    for (const key in sceneImages) {
      const si = sceneImages[key as unknown as number];
      if (si?.image?.image_base64) {
        sceneImageByBeat[si.sceneNumber] = {
          image_base64: si.image.image_base64,
          mime_type: si.image.mime_type,
        };
      }
    }

    const editedShots = promptPreview.shots.map((shot) => ({
      beat_number: shot.beat_number,
      veo_prompt: promptPreview.editedPrompts[shot.beat_number] || shot.veo_prompt,
      reference_image: sceneImageByBeat[shot.beat_number] || null,
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
      clearProcessedJob("film_with_prompts");
      await submitJob(
        "film_with_prompts",
        "/film/generate-with-prompts",
        {
          story,
          approved_visuals: approvedVisuals,
          key_moment_image: keyMomentImage,
          edited_shots: editedShots,
          generation_id: generationIdRef.current,
        },
        { generationId: generationIdRef.current! }
      );
      // Progress + completion handled by Realtime useEffect — no polling needed
    } catch (err) {
      setFilm((prev) => ({
        ...prev,
        status: "failed",
        error: err instanceof Error ? err.message : "Failed to start film generation",
      }));
    }
  };

  const resetFilm = () => {
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
      clearProcessedJob("shot_regenerate", String(shotNumber));
      await submitJob(
        "shot_regenerate",
        "/film/shot/regenerate",
        { film_id: film.filmId, shot_number: shotNumber, feedback: feedbackText },
        { generationId: generationIdRef.current!, targetId: String(shotNumber) }
      );

      // Clear feedback for this shot
      setShotFeedback((prev) => {
        const next = { ...prev };
        delete next[shotNumber];
        return next;
      });
      // Result handled by Realtime useEffect — no polling needed
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
        {/* Episode Name Banner */}
        {episodeName && (
          <div className="flex items-center gap-3 mb-6 pb-5 border-b border-white/5">
            <a
              href={associatedStoryId ? `/create/${associatedStoryId}` : "/create"}
              className="text-white/30 hover:text-white/60 transition-colors flex-shrink-0"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
              </svg>
            </a>
            {isEditingEpName ? (
              <input
                autoFocus
                value={editingEpNameValue}
                onChange={(e) => setEditingEpNameValue(e.target.value)}
                onBlur={() => {
                  const trimmed = editingEpNameValue.trim();
                  if (trimmed) {
                    setEpisodeName(trimmed);
                    episodeNameRef.current = trimmed;
                    const gid = generationIdRef.current;
                    if (gid) supaUpdateGeneration(gid, { title: trimmed }).catch(console.error);
                  }
                  setIsEditingEpName(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const trimmed = editingEpNameValue.trim();
                    if (trimmed) {
                      setEpisodeName(trimmed);
                      episodeNameRef.current = trimmed;
                      const gid = generationIdRef.current;
                      if (gid) supaUpdateGeneration(gid, { title: trimmed }).catch(console.error);
                    }
                    setIsEditingEpName(false);
                  } else if (e.key === "Escape") {
                    setIsEditingEpName(false);
                  }
                }}
                className="bg-transparent text-white font-semibold text-lg border-b border-[#B8B6FC] outline-none px-1 min-w-0 flex-1"
              />
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-white font-semibold text-lg truncate">{episodeName}</span>
                <button
                  onClick={() => {
                    setEditingEpNameValue(episodeName || "");
                    setIsEditingEpName(true);
                  }}
                  className="w-8 h-8 rounded-full bg-[#3A3A3A] flex items-center justify-center hover:bg-[#4A4A4A] transition-colors flex-shrink-0"
                  title="Edit episode name"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step Indicator + Save Draft */}
        <div className="relative flex items-center justify-center gap-2 mb-8">
          {[
            { num: 1, label: "Create Your Script", active: !visualsActive && film.status === "idle" },
            { num: 2, label: "Build Your Visuals", active: visualsActive && film.status === "idle" },
            { num: 3, label: "Create Your Video", active: film.status !== "idle" },
          ].map((step, i) => {
            const isCompleted = step.num === 1 ? (visualsActive || film.status !== "idle")
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

        {!visualsActive && film.status === "idle" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Input Form */}
          <div className="bg-[#0F0E13] rounded-3xl outline outline-1 outline-[#1A1E2F] p-6">
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

                {/* Visual Style selector */}
                <div className="mb-6">
                  <label className="block text-white text-sm font-medium mb-2">Visual Style</label>
                  <div className="flex flex-wrap gap-2">
                    {STYLE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => { if (!story) { setStyle(opt.value); setSelectedChars([]); setSelectedLocation(null); } }}
                        disabled={!!story}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          style === opt.value
                            ? "bg-[#262550] border border-[#B8B6FC] text-[#B8B6FC]"
                            : "bg-[#262626] border border-[#262626] text-[#ADADAD] hover:border-[#444]"
                        } ${story ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {story && (
                    <p className="text-[#ADADAD] text-xs mt-1.5">Style locked after script generation</p>
                  )}
                </div>

                {/* Character & Location picker (from story library) */}
                <CharacterLocationPicker
                  storyCharacters={storyLibraryChars}
                  storyLocations={storyLibraryLocs}
                  selectedStyle={style}
                  selectedCharacters={selectedChars}
                  selectedLocation={selectedLocation}
                  onCharactersChange={setSelectedChars}
                  onLocationChange={setSelectedLocation}
                  disabled={!!story}
                />

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

            {error && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="bg-[#0F0E13] rounded-3xl outline outline-1 outline-[#1A1E2F] p-6 flex flex-col min-h-0">
            {/* Tab switcher */}
            {story && !isGenerating && (
              <>
                <div className="flex border-b border-[#1A1E2F] mb-5">
                  <button
                    onClick={() => setRightTab("script")}
                    className={`flex-1 text-center text-lg font-bold pb-3 transition-colors ${
                      rightTab === "script" ? "text-white border-b-2 border-white" : "text-[#ADADAD] hover:text-white"
                    }`}
                  >
                    Script
                  </button>
                  <button
                    onClick={() => setRightTab("world")}
                    className={`flex-1 text-center text-lg font-bold pb-3 transition-colors ${
                      rightTab === "world" ? "text-white border-b-2 border-white" : "text-[#ADADAD] hover:text-white"
                    }`}
                  >
                    World
                  </button>
                </div>
                {rightTab === "script" && (
                  <p className="text-white font-semibold text-sm mb-1">
                    Episode Scenes{" "}
                    <span className="text-[#ADADAD] font-normal text-xs">
                      ({getScenes(story).length} scenes, total of up to 1 min in length)
                    </span>
                  </p>
                )}
              </>
            )}

            {!story && !isGenerating && (
              <div className="text-center py-16 text-[#ADADAD]">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <p>Enter your idea and click Generate Script</p>
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
              <div className="flex-1 min-h-0 flex flex-col">
                {/* ===== WORLD TAB ===== */}
                {rightTab === "world" && (
                  <div className="space-y-4 flex-1 overflow-y-auto pr-2">
                    {/* Characters */}
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-3">Characters ({story.characters.length})</h4>
                      <div className="divide-y divide-[#262626]">
                        {story.characters.map((char, ci) => (
                          <div key={char.id} className="py-3 first:pt-0">
                            {editingCharIndex === ci && editCharDraft ? (
                              <div className="space-y-2">
                                <div className="flex gap-2">
                                  <input value={editCharDraft.name} onChange={(e) => setEditCharDraft({ ...editCharDraft, name: e.target.value })} className="flex-1 bg-[#262626] text-white text-sm rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#B8B6FC]" placeholder="Name" />
                                  <input value={editCharDraft.age} onChange={(e) => setEditCharDraft({ ...editCharDraft, age: e.target.value })} className="w-24 bg-[#262626] text-white/70 text-sm rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#B8B6FC]" placeholder="Age" />
                                  <input value={editCharDraft.gender} onChange={(e) => setEditCharDraft({ ...editCharDraft, gender: e.target.value })} className="w-20 bg-[#262626] text-white/70 text-sm rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#B8B6FC]" placeholder="Gender" />
                                </div>
                                <textarea value={editCharDraft.appearance} onChange={(e) => setEditCharDraft({ ...editCharDraft, appearance: e.target.value })} className="w-full bg-[#262626] text-white/70 text-sm rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#B8B6FC] resize-none" rows={2} placeholder="Appearance..." />
                                <div className="flex gap-2">
                                  <button onClick={() => saveCharacterEdit(ci, editCharDraft)} className="px-3 py-1 bg-[#B8B6FC] text-black text-xs font-medium rounded hover:opacity-90">Save</button>
                                  <button onClick={() => { setEditingCharIndex(null); setEditCharDraft(null); }} className="px-3 py-1 bg-[#333] text-[#ADADAD] text-xs rounded hover:text-white">Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start gap-3">
                                {(() => {
                                  const src = storyLibraryChars.find(c => c.id === char.id) || selectedChars.find(c => c.id === char.id) || storyLibraryChars.find(c => c.name.toLowerCase() === char.name.toLowerCase()) || selectedChars.find(c => c.name.toLowerCase() === char.name.toLowerCase());
                                  return src?.imageBase64 ? (
                                    <img src={`data:${src.imageMimeType};base64,${src.imageBase64}`} alt={char.name} className="w-10 h-14 rounded-lg object-cover flex-shrink-0" />
                                  ) : null;
                                })()}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-white font-medium text-sm">{char.name}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/50 uppercase">{char.role}</span>
                                  </div>
                                  <span className="text-white/40 text-xs">{char.age} {char.gender}</span>
                                  <p className="text-white/60 text-xs mt-1">{char.appearance}</p>
                                </div>
                                {char.origin !== "story" && (
                                  <button onClick={() => { setEditingCharIndex(ci); setEditCharDraft({ ...char }); }} className="text-xs text-[#ADADAD] hover:text-white px-2 py-1 rounded hover:bg-white/10 flex-shrink-0">Edit</button>
                                )}
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
                        <div className="divide-y divide-[#262626]">
                          {story.locations.map((loc, li) => (
                            <div key={loc.id} className="py-3 first:pt-0">
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
                  <div className="divide-y divide-[#262626] flex-1 overflow-y-auto pr-2">
                    {getScenes(story).map((scene, index) => {
                      const isEditing = editingSceneIndex === index;
                      const isSelected = selectedBeatIndex === index;
                      const draft = isEditing ? editSceneDraft : null;
                      const locationName = story.locations.find(l => l.id === scene.setting_id)?.name || scene.setting_id;

                      return (
                        <div
                          key={scene.scene_number}
                          className="py-4 first:pt-0"
                        >
                          {/* Scene header */}
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <span className="text-white font-semibold text-sm">Scene {scene.scene_number}{scene.title ? `: ${scene.title}` : ""}</span>
                              <span className="text-white/30 text-xs ml-2">{scene.duration}</span>
                            </div>
                            {!isEditing && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingSceneIndex(index);
                                  setEditSceneDraft({ ...scene });
                                  setSelectedBeatIndex(null);
                                }}
                                className="text-xs text-[#B8B6FC] hover:text-[#9C99FF] font-semibold uppercase tracking-wide"
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
                          onClick={startBuildVisuals}
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
        )}

        {/* Section 2: Build Your Visuals */}
        {visualsActive && story && (
          <>
            {/* Sub-tab breadcrumb navigation */}
            <div className="flex items-center gap-2 mb-6">
              {(["characters", "locations", "scenes"] as VisualsTab[]).map((tab, idx) => {
                const labels = { characters: "Your Characters", locations: "Your Locations", scenes: "Your Scenes" };
                const isActive = visualsTab === tab;
                return (
                  <div key={tab} className="flex items-center gap-2">
                    {idx > 0 && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-white/30">
                        <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    <button
                      onClick={() => {
                        setVisualsTab(tab);
                        saveNow({ visualsTab: tab });
                      }}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-[#1A1E2F] text-white"
                          : "text-white/40 hover:text-white/70"
                      }`}
                    >
                      {labels[tab]}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="bg-[#0F0E13] rounded-3xl outline outline-1 outline-[#1A1E2F] p-8">
              {/* ─── Characters Tab ─── */}
              {visualsTab === "characters" && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-6">Characters In This Episode</h2>

                  {/* Horizontal scrollable card row with nav arrows */}
                  <div className="relative group/carousel">
                    {/* Left arrow */}
                    <button
                      onClick={() => {
                        const el = document.getElementById("char-scroll");
                        if (el) el.scrollBy({ left: -280, behavior: "smooth" });
                      }}
                      className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 rounded-full bg-[#1A1E2F] border border-white/10 flex items-center justify-center text-white hover:bg-[#262550] transition-colors opacity-0 group-hover/carousel:opacity-100"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                    </button>
                    {/* Right arrow */}
                    <button
                      onClick={() => {
                        const el = document.getElementById("char-scroll");
                        if (el) el.scrollBy({ left: 280, behavior: "smooth" });
                      }}
                      className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 rounded-full bg-[#1A1E2F] border border-white/10 flex items-center justify-center text-white hover:bg-[#262550] transition-colors opacity-0 group-hover/carousel:opacity-100"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                    </button>

                    <div id="char-scroll" className="flex gap-5 overflow-x-auto scrollbar-hide pb-2" style={{ scrollbarWidth: "none" }}>
                      {story.characters.map((char) => {
                        const imgState = characterImages[char.id];
                        const hasImage = !!imgState?.image;
                        return (
                          <div key={char.id} className="flex-shrink-0 w-[220px]">
                            <div className="group relative aspect-[9/16] bg-[#1A1E2F] rounded-2xl overflow-hidden">
                              {hasImage && imgState?.image ? (
                                <>
                                  <img
                                    src={getImageSrc(imgState.image)}
                                    alt={char.name}
                                    className="w-full h-full object-cover"
                                  />
                                  <div
                                    className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                    onClick={() => setEditingVisualCharId(char.id)}
                                  >
                                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                                      <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                                      </svg>
                                    </div>
                                  </div>
                                </>
                              ) : imgState?.isGenerating ? (
                                <div className="w-full h-full flex flex-col items-center justify-center">
                                  <svg className="animate-spin h-8 w-8 text-[#B8B6FC] mb-2" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                  <span className="text-[#ADADAD] text-xs">Generating...</span>
                                </div>
                              ) : (
                                <div
                                  className="w-full h-full flex items-end justify-start p-4 cursor-pointer hover:bg-[#262550]/30 transition-colors"
                                  onClick={() => setEditingVisualCharId(char.id)}
                                >
                                  <button className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-full transition-colors">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z" /></svg>
                                    Generate Character
                                  </button>
                                </div>
                              )}
                              {imgState?.error && (
                                <div className="absolute bottom-0 left-0 right-0 bg-red-500/80 px-2 py-1">
                                  <span className="text-white text-[10px]">{imgState.error}</span>
                                </div>
                              )}
                            </div>
                            <div className="mt-3">
                              <p className="text-white text-sm font-medium truncate">{char.name}</p>
                              <p className="text-[#ADADAD] text-xs">Role: {char.role === "protagonist" ? "Main Character" : char.role === "antagonist" ? "Antagonist" : "Supporting"}</p>
                              {hasImage && (() => {
                                const isSaved = char.origin === "story" || storyLibraryChars.some(c => c.name.toLowerCase() === char.name.toLowerCase());
                                return isSaved ? (
                                  <span className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" /></svg>
                                    In Library
                                  </span>
                                ) : (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleSaveToLibrary("character", char.id); }}
                                    className="mt-1 text-[10px] text-[#B8B6FC] hover:text-white flex items-center gap-1 transition-colors"
                                  >
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" /></svg>
                                    Save to Library
                                  </button>
                                );
                              })()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Footer navigation */}
                  <div className="mt-10 flex items-center justify-between">
                    <button
                      onClick={() => {
                        setVisualsActive(false);
                        saveNow({ visualsActive: false }, "drafting");
                      }}
                      className="text-sm text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                    >
                      &larr; Back to Create Your Script
                    </button>
                    <button
                      onClick={() => {
                        setVisualsTab("locations");
                        saveNow({ visualsTab: "locations" });
                      }}
                      disabled={!story?.characters.every(c => characterImages[c.id]?.image)}
                      className="px-6 py-3 bg-gradient-to-r from-[#9C99FF] to-[#7370FF] text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Approve &amp; Continue
                    </button>
                  </div>
                </div>
              )}

              {/* ─── Locations Tab ─── */}
              {visualsTab === "locations" && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-6">Locations In This Episode</h2>

                  <div className="relative group/carousel">
                    <button
                      onClick={() => {
                        const el = document.getElementById("loc-scroll");
                        if (el) el.scrollBy({ left: -320, behavior: "smooth" });
                      }}
                      className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 rounded-full bg-[#1A1E2F] border border-white/10 flex items-center justify-center text-white hover:bg-[#262550] transition-colors opacity-0 group-hover/carousel:opacity-100"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                    </button>
                    <button
                      onClick={() => {
                        const el = document.getElementById("loc-scroll");
                        if (el) el.scrollBy({ left: 320, behavior: "smooth" });
                      }}
                      className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 rounded-full bg-[#1A1E2F] border border-white/10 flex items-center justify-center text-white hover:bg-[#262550] transition-colors opacity-0 group-hover/carousel:opacity-100"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                    </button>

                    <div id="loc-scroll" className="flex gap-5 overflow-x-auto scrollbar-hide pb-2" style={{ scrollbarWidth: "none" }}>
                      {story.locations.map((loc) => {
                        const imgState = locationImages[loc.id];
                        const hasImage = !!imgState?.image;
                        return (
                          <div key={loc.id} className="flex-shrink-0 w-[220px]">
                            <div className="group relative aspect-[9/16] bg-[#1A1E2F] rounded-2xl overflow-hidden">
                              {hasImage && imgState?.image ? (
                                <>
                                  <img
                                    src={getImageSrc(imgState.image)}
                                    alt={loc.name || loc.description}
                                    className="w-full h-full object-cover"
                                  />
                                  <div
                                    className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                    onClick={() => setEditingVisualLocId(loc.id)}
                                  >
                                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                                      <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                                      </svg>
                                    </div>
                                  </div>
                                </>
                              ) : imgState?.isGenerating ? (
                                <div className="w-full h-full flex flex-col items-center justify-center">
                                  <svg className="animate-spin h-8 w-8 text-[#B8B6FC] mb-2" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                  <span className="text-[#ADADAD] text-xs">Generating...</span>
                                </div>
                              ) : (
                                <div
                                  className="w-full h-full flex items-end justify-start p-4 cursor-pointer hover:bg-[#262550]/30 transition-colors"
                                  onClick={() => setEditingVisualLocId(loc.id)}
                                >
                                  <button className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-full transition-colors">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z" /></svg>
                                    Generate Location
                                  </button>
                                </div>
                              )}
                              {imgState?.error && (
                                <div className="absolute bottom-0 left-0 right-0 bg-red-500/80 px-2 py-1">
                                  <span className="text-white text-[10px]">{imgState.error}</span>
                                </div>
                              )}
                            </div>
                            <div className="mt-3">
                              <p className="text-white text-sm font-medium truncate">{loc.name || "Location"}</p>
                              <p className="text-[#ADADAD] text-xs truncate">{loc.atmosphere}</p>
                              {hasImage && (() => {
                                const isSaved = storyLibraryLocs.some(l => (l.name || "").toLowerCase() === (loc.name || "").toLowerCase());
                                return isSaved ? (
                                  <span className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" /></svg>
                                    In Library
                                  </span>
                                ) : (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleSaveToLibrary("location", loc.id); }}
                                    className="mt-1 text-[10px] text-[#B8B6FC] hover:text-white flex items-center gap-1 transition-colors"
                                  >
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" /></svg>
                                    Save to Library
                                  </button>
                                );
                              })()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-10 flex items-center justify-between">
                    <button
                      onClick={() => {
                        setVisualsTab("characters");
                        saveNow({ visualsTab: "characters" });
                      }}
                      className="text-sm text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                    >
                      &larr; Back to Your Characters
                    </button>
                    <button
                      onClick={() => {
                        setVisualsTab("scenes");
                        saveNow({ visualsTab: "scenes" });
                        if (Object.keys(sceneImages).length === 0) {
                          fetchSceneDescriptions();
                        }
                      }}
                      disabled={!story?.locations.every(l => locationImages[l.id]?.image)}
                      className="px-6 py-3 bg-gradient-to-r from-[#9C99FF] to-[#7370FF] text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Approve &amp; Continue
                    </button>
                  </div>
                </div>
              )}

              {/* ─── Scenes Tab ─── */}
              {visualsTab === "scenes" && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-6">Your Episode Storyboard</h2>

                  {/* Loading scene descriptions */}
                  {isGeneratingSceneDescs && Object.keys(sceneImages).length === 0 && (
                    <div className="flex items-center justify-center py-16">
                      <svg className="animate-spin h-8 w-8 text-[#B8B6FC] mr-3" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span className="text-[#ADADAD]">Generating scene descriptions...</span>
                    </div>
                  )}

                  {/* Error generating scene descriptions */}
                  {sceneDescError && !isGeneratingSceneDescs && Object.keys(sceneImages).length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 gap-4">
                      <div className="text-red-400 text-sm text-center max-w-md">{sceneDescError}</div>
                      <button
                        onClick={fetchSceneDescriptions}
                        className="px-5 py-2.5 bg-gradient-to-r from-[#9C99FF] to-[#7370FF] text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
                      >
                        Try Again
                      </button>
                    </div>
                  )}

                  {/* Generate All button */}
                  {Object.keys(sceneImages).length > 0 && !Object.values(sceneImages).some(s => s.image) && !Object.values(sceneImages).some(s => s.isGenerating) && (
                    <div className="text-center mb-6">
                      <button
                        onClick={generateAllSceneImages}
                        className="px-8 py-3 bg-gradient-to-r from-[#9C99FF] to-[#7370FF] text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
                      >
                        Generate All Scene Images
                      </button>
                    </div>
                  )}

                  {/* Scene grid (4x2) */}
                  {Object.keys(sceneImages).length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                      {Object.values(sceneImages)
                        .sort((a, b) => a.sceneNumber - b.sceneNumber)
                        .map((scene) => (
                          <div key={scene.sceneNumber} className="bg-[#1A1E2F] rounded-2xl overflow-hidden">
                            <div className="aspect-[9/16] bg-[#0A0A0F] relative">
                              {scene.isGenerating ? (
                                <div className="w-full h-full flex flex-col items-center justify-center">
                                  <svg className="animate-spin h-6 w-6 text-[#B8B6FC] mb-2" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                  <span className="text-[#ADADAD] text-[10px]">Generating...</span>
                                </div>
                              ) : scene.image ? (
                                <img
                                  src={getImageSrc(scene.image)}
                                  alt={`Scene ${scene.sceneNumber}`}
                                  className="w-full h-full object-cover"
                                />
                              ) : scene.error ? (
                                <div className="w-full h-full flex flex-col items-center justify-center p-3 gap-2">
                                  <span className="text-red-400 text-[10px] text-center">{scene.error}</span>
                                  <button
                                    onClick={() => regenerateSceneImage(scene.sceneNumber)}
                                    className="px-3 py-1.5 bg-[#B8B6FC]/20 text-[#B8B6FC] text-[10px] font-medium rounded-lg border border-[#B8B6FC]/30 hover:bg-[#B8B6FC]/30 transition-colors"
                                  >
                                    Regenerate
                                  </button>
                                </div>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <span className="text-white/20 text-xs">No image</span>
                                </div>
                              )}
                            </div>
                            <div className="p-3">
                              <h4 className="text-white text-xs font-semibold mb-1">
                                Scene {scene.sceneNumber} Shot &mdash; {scene.title}
                              </h4>
                              <p className={`text-[#ADADAD] text-[10px] ${expandedSceneDescs.has(scene.sceneNumber) ? "" : "line-clamp-3"}`}>{scene.visualDescription}</p>
                              {scene.visualDescription && scene.visualDescription.length > 120 && (
                                <button
                                  onClick={() => setExpandedSceneDescs(prev => {
                                    const next = new Set(prev);
                                    if (next.has(scene.sceneNumber)) next.delete(scene.sceneNumber);
                                    else next.add(scene.sceneNumber);
                                    return next;
                                  })}
                                  className="text-[#B8B6FC] text-[10px] mb-2 hover:underline"
                                >
                                  {expandedSceneDescs.has(scene.sceneNumber) ? "Show less" : "Read more"}
                                </button>
                              )}
                              {(!scene.visualDescription || scene.visualDescription.length <= 120) && <div className="mb-2" />}
                              {scene.image && !scene.isGenerating && (
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    value={scene.feedback}
                                    onChange={(e) => setSceneImages(prev => ({
                                      ...prev,
                                      [scene.sceneNumber]: { ...prev[scene.sceneNumber], feedback: e.target.value },
                                    }))}
                                    placeholder="Your feedback to refine this scene shot"
                                    className="w-full bg-[#0A0A0F] text-white text-[10px] rounded-lg px-2 py-1.5 placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#B8B6FC]"
                                  />
                                  <button
                                    onClick={() => refineSceneImage(scene.sceneNumber)}
                                    disabled={!scene.feedback.trim()}
                                    className="w-full py-1.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-medium rounded-lg border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                  >
                                    Refine This Shot
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  <div className="mt-10 flex items-center justify-between">
                    <button
                      onClick={() => {
                        setVisualsTab("locations");
                        saveNow({ visualsTab: "locations" });
                      }}
                      className="text-sm text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                    >
                      &larr; Back to Your Locations
                    </button>
                    <button
                      onClick={fetchPromptPreviews}
                      disabled={promptPreview.isLoading || !Object.values(sceneImages).every(s => s.image)}
                      className="px-6 py-3 bg-gradient-to-r from-[#9C99FF] to-[#7370FF] text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {promptPreview.isLoading ? "Generating Prompts..." : "Approve & Continue"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Character Modal for Visuals stage */}
        {editingVisualCharId && story && (
          <CharacterModal
            isOpen={!!editingVisualCharId}
            onClose={() => setEditingVisualCharId(null)}
            onSave={async (data) => {
              await handleVisualCharSave(editingVisualCharId, data);
              setEditingVisualCharId(null);
            }}
            character={(() => {
              const char = story.characters.find(c => c.id === editingVisualCharId);
              const imgState = characterImages[editingVisualCharId];
              if (!char) return undefined;
              return {
                id: char.id,
                name: char.name,
                age: char.age,
                gender: char.gender,
                description: char.appearance,
                role: char.role,
                visualStyle: story.style,
                imageBase64: imgState?.image?.image_base64 || null,
                imageMimeType: imgState?.image?.mime_type || "image/png",
              } as StoryCharacterFE;
            })()}
            existingCharacters={storyLibraryChars}
            isSaving={isSavingVisualChar}
            hideRole={false}
            lockedStyle={story.style}
            readOnlyFields={["name", "age", "gender"]}
          />
        )}

        {/* Location Modal for Visuals stage */}
        {editingVisualLocId && story && (
          <LocationModal
            isOpen={!!editingVisualLocId}
            onClose={() => setEditingVisualLocId(null)}
            onSave={async (data) => {
              await handleVisualLocSave(editingVisualLocId, data);
              setEditingVisualLocId(null);
            }}
            location={(() => {
              const loc = story.locations.find(l => l.id === editingVisualLocId);
              const imgState = locationImages[editingVisualLocId];
              if (!loc) return undefined;
              return {
                id: loc.id,
                name: loc.name,
                description: loc.description,
                atmosphere: loc.atmosphere,
                visualStyle: story.style,
                imageBase64: imgState?.image?.image_base64 || null,
                imageMimeType: imgState?.image?.mime_type || "image/png",
              } as StoryLocationFE;
            })()}
            isSaving={isSavingVisualLoc}
            lockedStyle={story.style}
            readOnlyFields={["name"]}
          />
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

                    {/* Scene storyboard image for this shot */}
                    <div className="flex items-center gap-2 mb-3">
                      {(() => {
                        const si = sceneImages[shot.beat_number];
                        if (!si?.image) return <span className="text-[10px] text-[#555]">No scene ref</span>;
                        return (
                          <>
                            <img
                              src={getImageSrc(si.image)}
                              className="w-10 h-14 object-cover rounded border border-[#B8B6FC]/30"
                              title={`Scene ${shot.beat_number} storyboard`}
                            />
                            <span className="text-[10px] text-[#555] ml-1">
                              Scene ref (1 image)
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
                  onClick={() => { setVisualsActive(true); setVisualsTab("scenes"); saveNow({ visualsActive: true, visualsTab: "scenes" }, "visuals"); }}
                  className="text-sm text-[#ADADAD] hover:text-white transition-colors"
                >
                  ← Visuals
                </button>
              )}
            </div>
            {/* Story title removed — episode name shown in header */}

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
                                src={resolveVideoUrl(completedShot.storage_url || completedShot.preview_url || "")}
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
                                  src={resolveVideoUrl(shot.storage_url || shot.preview_url || "")}
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
                    src={resolveVideoUrl(film.finalVideoUrl)}
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
                    href={resolveVideoUrl(film.finalVideoUrl)}
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

      {/* Story picker — non-dismissible when no story is associated */}
      <StoryPickerModal
        isOpen={showStoryPicker}
        onClose={() => {
          if (associatedStoryId) setShowStoryPicker(false);
        }}
        onSelect={handleStorySelected}
        stories={availableStories}
        title="Choose a Story"
        description="Every episode must belong to a story. Pick one to get started."
      />

      {/* Episode creation modal — shown after story is picked */}
      <CreateEpisodeModal
        isOpen={showCreateEpisodeModal}
        onClose={() => {
          setShowCreateEpisodeModal(false);
          // If no story associated yet, go back to story picker
          if (!associatedStoryId) setShowStoryPicker(true);
        }}
        onSave={handleEpisodeCreated}
        nextEpisodeNumber={
          (availableStories.find(s => s.id === pendingStoryId)?.episodeCount || 0) + 1
        }
      />
    </div>
  );
}
