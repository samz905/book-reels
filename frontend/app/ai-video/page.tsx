"use client";

import { useState, useEffect, useRef } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";

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
  description: string;
  atmosphere: string;
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
  beats: Beat[];
  style: string;
}

interface MoodboardImage {
  type: "character" | "setting" | "location" | "key_moment";
  image_base64: string;
  mime_type: string;
  prompt_used: string;
}

interface LocationImageState {
  image: MoodboardImage | null;
  approved: boolean;
  isGenerating: boolean;
  feedback: string;
  promptUsed: string;
}

interface CharacterImageState {
  image: MoodboardImage | null;
  approved: boolean;
  isGenerating: boolean;
  feedback: string;
  promptUsed: string;
}

interface SettingImageState {
  image: MoodboardImage | null;
  approved: boolean;
  isGenerating: boolean;
  feedback: string;
  promptUsed: string;
}

interface KeyMomentImageState {
  image: MoodboardImage | null;
  beat_number: number;
  beat_description: string;
  isGenerating: boolean;
  feedback: string;
  promptUsed: string;
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

const BACKEND_URL = "http://localhost:8000";

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

export default function AIVideoPage() {
  // Input state
  const [idea, setIdea] = useState("");
  const [style, setStyle] = useState<Style>("cinematic");

  // Story state
  const [story, setStory] = useState<Story | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  } | null>(null);
  const [protagonistLocked, setProtagonistLocked] = useState(false);
  const [isGeneratingProtagonist, setIsGeneratingProtagonist] = useState(false);

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

  // Cost tracking across all phases
  const [totalCost, setTotalCost] = useState<TotalCost>({
    story: 0,
    characters: 0,
    locations: 0,
    keyMoments: 0,
    film: 0,
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate story");
    } finally {
      setIsGenerating(false);
    }
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
      setStory({ ...story, beats: updatedBeats });
      setFeedback("");
      setSelectedBeatIndex(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refine beat");
    } finally {
      setIsRefining(false);
    }
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

      setProtagonistImage({
        character_id: data.character_id,
        character_name: protagonist?.name || "Protagonist",
        image: data.image,
      });

      // Track cost
      if (data.cost_usd) {
        setTotalCost((prev) => ({ ...prev, characters: prev.characters + data.cost_usd }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate protagonist image");
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
          approved: false,
          isGenerating: true,
          feedback: "",
          promptUsed: "",
        };
      });
    setCharacterImages(initialStates);

    // Initialize location states (replaces single setting)
    const initialLocationStates: Record<string, LocationImageState> = {};
    if (story.locations && story.locations.length > 0) {
      story.locations.forEach((loc) => {
        initialLocationStates[loc.id] = {
          image: null,
          approved: false,
          isGenerating: true,
          feedback: "",
          promptUsed: "",
        };
      });
      setLocationImages(initialLocationStates);
    } else {
      // Backward compat: no locations, use single setting
      setSettingImage({
        image: null,
        approved: false,
        isGenerating: true,
        feedback: "",
        promptUsed: "",
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
      [characterId]: { ...prev[characterId], isGenerating: true },
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
      setError(err instanceof Error ? err.message : "Failed to generate character image");
      setCharacterImages((prev) => ({
        ...prev,
        [characterId]: { ...prev[characterId], isGenerating: false },
      }));
    }
  };

  // Generate character with protagonist as style reference
  const generateCharacterImageWithRef = async (characterId: string, protagonistRef: { image_base64: string; mime_type: string }) => {
    if (!story) return;

    setCharacterImages((prev) => ({
      ...prev,
      [characterId]: { ...prev[characterId], isGenerating: true },
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
      setError(err instanceof Error ? err.message : "Failed to generate character image");
      setCharacterImages((prev) => ({
        ...prev,
        [characterId]: { ...prev[characterId], isGenerating: false },
      }));
    }
  };

  // Generate setting with protagonist as style reference
  const generateSettingWithRef = async (protagonistRef: { image_base64: string; mime_type: string }) => {
    if (!story) return;

    setSettingImage((prev) => prev ? { ...prev, isGenerating: true } : {
      image: null,
      approved: false,
      isGenerating: true,
      feedback: "",
      promptUsed: "",
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
        approved: false,
        isGenerating: false,
        feedback: "",
        promptUsed: data.prompt_used,
      });
      if (data.cost_usd) {
        setTotalCost((prev) => ({ ...prev, locations: prev.locations + data.cost_usd }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate setting image");
      setSettingImage((prev) => prev ? { ...prev, isGenerating: false } : null);
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
        ...(prev[locationId] || { image: null, approved: false, feedback: "", promptUsed: "" }),
        isGenerating: true,
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
      setError(err instanceof Error ? err.message : "Failed to generate location image");
      setLocationImages((prev) => ({
        ...prev,
        [locationId]: { ...prev[locationId], isGenerating: false },
      }));
    }
  };

  const refineCharacterImage = async (characterId: string) => {
    if (!story) return;
    const charState = characterImages[characterId];
    if (!charState?.feedback.trim()) return;

    setCharacterImages((prev) => ({
      ...prev,
      [characterId]: { ...prev[characterId], isGenerating: true },
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
      setError(err instanceof Error ? err.message : "Failed to refine character image");
      setCharacterImages((prev) => ({
        ...prev,
        [characterId]: { ...prev[characterId], isGenerating: false },
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

    setSettingImage((prev) => prev ? { ...prev, isGenerating: true } : null);

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

      setSettingImage({
        image: data.image,
        approved: false,
        isGenerating: false,
        feedback: "",
        promptUsed: data.prompt_used,
      });
      // Track setting refinement cost
      if (data.cost_usd) {
        setTotalCost((prev) => ({ ...prev, locations: prev.locations + data.cost_usd }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refine setting image");
      setSettingImage((prev) => prev ? { ...prev, isGenerating: false } : null);
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

      setKeyMoment({
        image: data.key_moment.image,
        beat_number: data.key_moment.beat_number,
        beat_description: data.key_moment.beat_description,
        isGenerating: false,
        feedback: "",
        promptUsed: data.key_moment.prompt_used,
      });
      // Track key moment cost (1 image)
      if (data.cost_usd) {
        setTotalCost((prev) => ({ ...prev, keyMoments: prev.keyMoments + data.cost_usd }));
      }
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

      setKeyMoment({
        image: data.key_moment.image,
        beat_number: data.key_moment.beat_number,
        beat_description: data.key_moment.beat_description,
        isGenerating: false,
        feedback: "",
        promptUsed: data.key_moment.prompt_used,
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
      totalShots: story.beats.length,
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

        // Stop polling when done
        if (data.status === "ready" || data.status === "failed") {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
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

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="min-h-screen bg-[#010101]">
      <Header />

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-white mb-2">AI Video Story</h1>
        <p className="text-[#ADADAD] mb-8">
          Transform your idea into a structured story with visual beats
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Input Form */}
          <div className="bg-[#0F0E13] rounded-3xl outline outline-1 outline-[#1A1E2F] p-6">
            <h2 className="text-xl font-semibold text-white mb-6">
              1. Your Story Idea
            </h2>

            <div className="mb-6">
              <label className="block text-sm text-[#ADADAD] mb-2">
                Describe your story idea
              </label>
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="e.g., A robot learns to dance in an abandoned factory..."
                className="w-full h-32 bg-[#262626] rounded-2xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#B8B6FC] resize-none"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm text-[#ADADAD] mb-2">Visual Style</label>
              <div className="flex gap-3">
                {STYLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setStyle(opt.value)}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                      style === opt.value
                        ? "bg-[#B8B6FC] text-black"
                        : "bg-[#262626] text-white hover:bg-[#333]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
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
                  Generating Story...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generate Story Beats
                </>
              )}
            </button>

            {error && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Right Column: Story Display */}
          <div className="bg-[#0F0E13] rounded-3xl outline outline-1 outline-[#1A1E2F] p-6">
            <h2 className="text-xl font-semibold text-white mb-6">2. Story Beats</h2>

            {!story && !isGenerating && (
              <div className="text-center py-16 text-[#ADADAD]">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <p>Enter your idea and click Generate</p>
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
                <div className="bg-[#1A1E2F] rounded-xl p-4 mb-6">
                  {/* Editable title */}
                  {editingTitle ? (
                    <input
                      autoFocus
                      value={story.title}
                      onChange={(e) => setStory({ ...story, title: e.target.value })}
                      onBlur={() => setEditingTitle(false)}
                      onKeyDown={(e) => { if (e.key === "Enter") setEditingTitle(false); }}
                      className="text-lg font-semibold text-white bg-[#262626] rounded px-2 py-1 mb-2 w-full focus:outline-none focus:ring-1 focus:ring-[#B8B6FC]"
                    />
                  ) : (
                    <h3
                      className="text-lg font-semibold text-white mb-2 cursor-pointer hover:text-[#B8B6FC] transition-colors"
                      onClick={() => setEditingTitle(true)}
                      title="Click to edit title"
                    >
                      {story.title}
                    </h3>
                  )}

                  <div className="text-sm text-[#ADADAD] space-y-2">
                    {/* Expandable Characters */}
                    <div>
                      <button
                        onClick={() => setExpandedCharacters(!expandedCharacters)}
                        className="flex items-center gap-1 text-white/70 hover:text-white transition-colors"
                      >
                        <span className="text-xs">{expandedCharacters ? "\u25BE" : "\u25B8"}</span>
                        <span>Characters ({story.characters.length})</span>
                      </button>
                      {expandedCharacters && (
                        <div className="mt-2 space-y-2 pl-4">
                          {story.characters.map((char, ci) => (
                            <div key={char.id} className="bg-[#262626] rounded-lg p-3">
                              {editingCharIndex === ci && editCharDraft ? (
                                <div className="space-y-2">
                                  <div className="flex gap-2">
                                    <input value={editCharDraft.name} onChange={(e) => setEditCharDraft({ ...editCharDraft, name: e.target.value })} className="flex-1 bg-[#1A1E2F] text-white text-sm rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#B8B6FC]" placeholder="Name" />
                                    <input value={editCharDraft.age} onChange={(e) => setEditCharDraft({ ...editCharDraft, age: e.target.value })} className="w-24 bg-[#1A1E2F] text-white/70 text-sm rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#B8B6FC]" placeholder="Age" />
                                    <input value={editCharDraft.gender} onChange={(e) => setEditCharDraft({ ...editCharDraft, gender: e.target.value })} className="w-20 bg-[#1A1E2F] text-white/70 text-sm rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#B8B6FC]" placeholder="Gender" />
                                  </div>
                                  <textarea value={editCharDraft.appearance} onChange={(e) => setEditCharDraft({ ...editCharDraft, appearance: e.target.value })} className="w-full bg-[#1A1E2F] text-white/70 text-sm rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#B8B6FC] resize-none" rows={2} placeholder="Appearance..." />
                                  <div className="flex gap-2">
                                    <button onClick={() => { const updated = [...story.characters]; updated[ci] = editCharDraft; setStory({ ...story, characters: updated }); setEditingCharIndex(null); setEditCharDraft(null); }} className="px-3 py-1 bg-[#B8B6FC] text-black text-xs font-medium rounded hover:opacity-90">Save</button>
                                    <button onClick={() => { setEditingCharIndex(null); setEditCharDraft(null); }} className="px-3 py-1 bg-[#333] text-[#ADADAD] text-xs rounded hover:text-white">Cancel</button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start justify-between">
                                  <div>
                                    <span className="text-white font-medium text-sm">{char.name}</span>
                                    <span className="text-white/50 text-xs ml-2">{char.age} {char.gender}</span>
                                    <p className="text-white/60 text-xs mt-1">{char.appearance}</p>
                                  </div>
                                  <button onClick={() => { setEditingCharIndex(ci); setEditCharDraft({ ...char }); }} className="text-xs text-[#ADADAD] hover:text-white px-2 py-1 rounded hover:bg-white/10 flex-shrink-0">Edit</button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Expandable Locations */}
                    {story.locations && story.locations.length > 0 && (
                      <div>
                        <button
                          onClick={() => setExpandedLocations(!expandedLocations)}
                          className="flex items-center gap-1 text-white/70 hover:text-white transition-colors"
                        >
                          <span className="text-xs">{expandedLocations ? "\u25BE" : "\u25B8"}</span>
                          <span>Locations ({story.locations.length})</span>
                        </button>
                        {expandedLocations && (
                          <div className="mt-2 space-y-2 pl-4">
                            {story.locations.map((loc, li) => (
                              <div key={loc.id} className="bg-[#262626] rounded-lg p-3">
                                {editingLocIndex === li && editLocDraft ? (
                                  <div className="space-y-2">
                                    <textarea value={editLocDraft.description} onChange={(e) => setEditLocDraft({ ...editLocDraft, description: e.target.value })} className="w-full bg-[#1A1E2F] text-white/70 text-sm rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#B8B6FC] resize-none" rows={2} placeholder="Description..." />
                                    <input value={editLocDraft.atmosphere} onChange={(e) => setEditLocDraft({ ...editLocDraft, atmosphere: e.target.value })} className="w-full bg-[#1A1E2F] text-white/70 text-sm rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#B8B6FC]" placeholder="Atmosphere..." />
                                    <div className="flex gap-2">
                                      <button onClick={() => { const updated = [...story.locations]; updated[li] = editLocDraft; setStory({ ...story, locations: updated }); setEditingLocIndex(null); setEditLocDraft(null); }} className="px-3 py-1 bg-[#B8B6FC] text-black text-xs font-medium rounded hover:opacity-90">Save</button>
                                      <button onClick={() => { setEditingLocIndex(null); setEditLocDraft(null); }} className="px-3 py-1 bg-[#333] text-[#ADADAD] text-xs rounded hover:text-white">Cancel</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <p className="text-white/70 text-sm">{loc.description}</p>
                                      <p className="text-white/40 text-xs mt-1">{loc.atmosphere}</p>
                                    </div>
                                    <button onClick={() => { setEditingLocIndex(li); setEditLocDraft({ ...loc }); }} className="text-xs text-[#ADADAD] hover:text-white px-2 py-1 rounded hover:bg-white/10 flex-shrink-0">Edit</button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <p className="text-xs text-white/40">Style: {story.style}</p>
                  </div>
                </div>

                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {story.beats.map((beat, index) => {
                    const isEditing = editingBeatIndex === index;
                    const isSelected = selectedBeatIndex === index;
                    const draft = isEditing ? editBeatDraft : null;

                    return (
                      <div
                        key={beat.scene_number}
                        className={`bg-[#1A1E2F] rounded-xl p-4 transition-all ${
                          isSelected || isEditing ? "ring-2 ring-[#B8B6FC]" : "hover:bg-[#242836]"
                        }`}
                      >
                        {/* Scene header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-[#B8B6FC] rounded-full flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
                              {beat.scene_number}
                            </div>
                            <span className="text-white font-semibold text-sm">Scene {beat.scene_number}</span>
                            {beat.scene_change && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70">scene change</span>
                            )}
                          </div>
                          {!isEditing && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingBeatIndex(index);
                                setEditBeatDraft({
                                  scene_heading: beat.scene_heading || "",
                                  blocks: getBlocks(beat).map(b => ({ ...b })),
                                  scene_change: beat.scene_change,
                                  characters_in_scene: beat.characters_in_scene,
                                  location_id: beat.location_id,
                                });
                                setSelectedBeatIndex(null);
                              }}
                              className="text-xs text-[#ADADAD] hover:text-white px-2 py-1 rounded hover:bg-white/10"
                            >
                              Edit
                            </button>
                          )}
                        </div>

                        {/* Scene heading */}
                        {isEditing ? (
                          <input
                            value={draft?.scene_heading || ""}
                            onChange={(e) => setEditBeatDraft(prev => prev ? { ...prev, scene_heading: e.target.value } : prev)}
                            placeholder="INT. KITCHEN - NIGHT"
                            className="w-full bg-[#262626] text-white/50 text-xs font-mono rounded px-2 py-1 mb-2 placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#B8B6FC]"
                          />
                        ) : beat.scene_heading ? (
                          <p className="text-white/50 text-xs font-mono mb-2">{beat.scene_heading}</p>
                        ) : null}

                        {/* Scene content — blocks */}
                        {isEditing && draft ? (
                          /* ── Edit mode: labeled block cards with reorder ── */
                          <div className="space-y-2">
                            {draft.blocks.map((block, bi) => (
                              <div key={bi} className="bg-[#262626] rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-[10px] font-semibold tracking-wider text-white/40 uppercase">
                                    {block.type}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    {bi > 0 && (
                                      <button
                                        onClick={() => {
                                          const newBlocks = [...draft.blocks];
                                          [newBlocks[bi - 1], newBlocks[bi]] = [newBlocks[bi], newBlocks[bi - 1]];
                                          setEditBeatDraft({ ...draft, blocks: newBlocks });
                                        }}
                                        className="text-white/40 hover:text-white text-xs px-1"
                                        title="Move up"
                                      >
                                        ↑
                                      </button>
                                    )}
                                    {bi < draft.blocks.length - 1 && (
                                      <button
                                        onClick={() => {
                                          const newBlocks = [...draft.blocks];
                                          [newBlocks[bi], newBlocks[bi + 1]] = [newBlocks[bi + 1], newBlocks[bi]];
                                          setEditBeatDraft({ ...draft, blocks: newBlocks });
                                        }}
                                        className="text-white/40 hover:text-white text-xs px-1"
                                        title="Move down"
                                      >
                                        ↓
                                      </button>
                                    )}
                                    {draft.blocks.length > 1 && (
                                      <button
                                        onClick={() => {
                                          const newBlocks = draft.blocks.filter((_, i) => i !== bi);
                                          setEditBeatDraft({ ...draft, blocks: newBlocks });
                                        }}
                                        className="text-red-400/60 hover:text-red-400 text-xs px-1 ml-1"
                                        title="Remove block"
                                      >
                                        ×
                                      </button>
                                    )}
                                  </div>
                                </div>
                                {block.type === "dialogue" && (
                                  <select
                                    value={block.character || ""}
                                    onChange={(e) => {
                                      const newBlocks = [...draft.blocks];
                                      newBlocks[bi] = { ...newBlocks[bi], character: e.target.value };
                                      setEditBeatDraft({ ...draft, blocks: newBlocks });
                                    }}
                                    className="w-full bg-[#1A1E2F] text-white/70 text-sm rounded px-2 py-1 mb-2 focus:outline-none focus:ring-1 focus:ring-[#B8B6FC] appearance-none"
                                  >
                                    <option value="">Select character...</option>
                                    {(beat.characters_in_scene || []).map((charId) => {
                                      const char = story?.characters.find(c => c.id === charId || c.name === charId);
                                      return (
                                        <option key={charId} value={char?.name || charId}>
                                          {char?.name || charId}
                                        </option>
                                      );
                                    })}
                                    {/* Allow free-type via "Other" */}
                                    {block.character && !(beat.characters_in_scene || []).some(cid => {
                                      const char = story?.characters.find(c => c.id === cid || c.name === cid);
                                      return (char?.name || cid) === block.character;
                                    }) && (
                                      <option value={block.character}>{block.character}</option>
                                    )}
                                  </select>
                                )}
                                <textarea
                                  value={block.text}
                                  onChange={(e) => {
                                    const newBlocks = [...draft.blocks];
                                    newBlocks[bi] = { ...newBlocks[bi], text: e.target.value };
                                    setEditBeatDraft({ ...draft, blocks: newBlocks });
                                  }}
                                  className={`w-full bg-[#1A1E2F] text-sm rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#B8B6FC] resize-none ${
                                    block.type === "action" ? "text-white/70 italic" : "text-white"
                                  }`}
                                  rows={block.type === "dialogue" ? 2 : 3}
                                  placeholder={
                                    block.type === "description" ? "Scene description..." :
                                    block.type === "action" ? "Physical action, gestures..." :
                                    "Dialogue line..."
                                  }
                                />
                              </div>
                            ))}
                            {/* Add block buttons + counter */}
                            <div className="flex items-center justify-between pt-1">
                              <div className="flex gap-2">
                                {draft.blocks.length < MAX_BLOCKS_PER_SCENE && (
                                  <>
                                    <button
                                      onClick={() => setEditBeatDraft({ ...draft, blocks: [...draft.blocks, { type: "description", text: "" }] })}
                                      className="text-xs text-[#B8B6FC] hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10"
                                    >
                                      + Description
                                    </button>
                                    <button
                                      onClick={() => setEditBeatDraft({ ...draft, blocks: [...draft.blocks, { type: "action", text: "" }] })}
                                      className="text-xs text-[#B8B6FC] hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10"
                                    >
                                      + Action
                                    </button>
                                    <button
                                      onClick={() => setEditBeatDraft({ ...draft, blocks: [...draft.blocks, { type: "dialogue", text: "", character: "" }] })}
                                      className="text-xs text-[#B8B6FC] hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10"
                                    >
                                      + Dialogue
                                    </button>
                                  </>
                                )}
                              </div>
                              <span className={`text-xs ${draft.blocks.length >= MAX_BLOCKS_PER_SCENE ? "text-amber-400" : "text-white/30"}`}>
                                {draft.blocks.length}/{MAX_BLOCKS_PER_SCENE} blocks
                              </span>
                            </div>
                          </div>
                        ) : (
                          /* ── Read mode: clean script text, no labels ── */
                          <div className="space-y-2">
                            {getBlocks(beat).map((block, bi) => (
                              block.type === "dialogue" ? (
                                <p key={bi} className="text-[#ADADAD] text-sm">
                                  <span className="text-white/70 font-medium">{block.character}:</span>{" "}
                                  &ldquo;{block.text}&rdquo;
                                </p>
                              ) : block.type === "action" ? (
                                <p key={bi} className="text-white/70 text-sm italic">{block.text}</p>
                              ) : (
                                <p key={bi} className="text-white text-sm">{block.text}</p>
                              )
                            ))}
                          </div>
                        )}

                        {/* Edit mode: save/cancel buttons */}
                        {isEditing && draft && (
                          <div className="flex gap-2 mt-4 pt-3 border-t border-white/10">
                            <button
                              onClick={() => {
                                if (story) {
                                  const legacy = blocksToLegacy(draft.blocks);
                                  const updatedBeats = [...story.beats];
                                  updatedBeats[index] = {
                                    ...story.beats[index],
                                    scene_heading: draft.scene_heading,
                                    blocks: draft.blocks,
                                    scene_change: draft.scene_change,
                                    characters_in_scene: draft.characters_in_scene,
                                    location_id: draft.location_id,
                                    description: legacy.description,
                                    action: legacy.action,
                                    dialogue: legacy.dialogue,
                                  };
                                  setStory({ ...story, beats: updatedBeats });
                                }
                                setEditingBeatIndex(null);
                                setEditBeatDraft(null);
                              }}
                              className="px-4 py-2 bg-[#B8B6FC] text-black text-sm font-medium rounded-lg hover:opacity-90"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingBeatIndex(null);
                                setEditBeatDraft(null);
                              }}
                              className="px-4 py-2 bg-[#262626] text-[#ADADAD] text-sm rounded-lg hover:bg-[#333] hover:text-white"
                            >
                              Cancel
                            </button>
                          </div>
                        )}

                        {/* Feedback + refine (when selected, not editing) */}
                        {!isEditing && (
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
                        )}
                      </div>
                    );
                  })}
                </div>

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
                      disabled={isGenerating || visualStep !== null}
                      className="flex-1 py-3 bg-gradient-to-r from-[#9C99FF] to-[#7370FF] text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Approve & Continue
                    </button>
                  </div>
                </div>
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
                      ) : null}
                    </div>

                    {protagonistImage && !isGeneratingProtagonist && (
                      <div className="p-4">
                        <h4 className="text-white font-medium text-center mb-4">{protagonistImage.character_name}</h4>
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
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-white font-medium">{protagonistImage.character_name}</h4>
                        <span className="text-xs px-2 py-1 rounded-full bg-[#B8B6FC]/20 text-[#B8B6FC]">
                          style anchor
                        </span>
                      </div>
                      <p className="text-[#ADADAD] text-xs text-center">Locked - defines the style</p>
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
                              </>
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

                            {charState.approved && (
                              <p className="text-green-400 text-sm text-center">✓ Approved</p>
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
                              </>
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

                            {locState.approved && (
                              <p className="text-green-400 text-sm text-center">Approved</p>
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

                        {settingImage.approved && (
                          <p className="text-green-400 text-sm text-center">Approved</p>
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


            {/* Step 3: Key Moment (SPIKE - emotional peak) */}
            {visualStep === "key_moment" && (
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Key Moment (Emotional Peak)</h3>
                <p className="text-sm text-[#ADADAD] mb-6">
                  This reference image captures the emotional peak of your story using your approved characters and setting.
                </p>

                {keyMoment?.isGenerating && !keyMoment?.image && (
                  <div className="text-center py-16">
                    <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-[#B8B6FC]" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-[#ADADAD]">Generating key moment image...</p>
                  </div>
                )}

                {keyMoment && (keyMoment.image || keyMoment.isGenerating) && (
                  <div className="max-w-md mx-auto">
                    <div className="bg-[#1A1E2F] rounded-xl overflow-hidden">
                      <div className="aspect-[9/16] relative bg-[#262626]">
                        {keyMoment.isGenerating ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <svg className="animate-spin h-8 w-8 text-[#B8B6FC] mb-2" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            <span className="text-[#ADADAD] text-sm">Generating...</span>
                          </div>
                        ) : keyMoment.image ? (
                          <img
                            src={`data:${keyMoment.image.mime_type};base64,${keyMoment.image.image_base64}`}
                            alt="Key Moment"
                            className="w-full h-full object-cover"
                          />
                        ) : null}
                      </div>

                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-400">
                            Key Moment
                          </span>
                          <span className="text-xs text-[#ADADAD]">Scene {keyMoment.beat_number}</span>
                        </div>
                        <p className="text-white text-sm mb-3">{keyMoment.beat_description}</p>

                        {/* Prompt Preview */}
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
                              placeholder="Feedback (optional)..."
                              className="w-full h-14 bg-[#262626] rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#B8B6FC] resize-none mb-2"
                            />
                            <button
                              onClick={refineKeyMoment}
                              disabled={!keyMoment.feedback.trim()}
                              className="w-full py-2 bg-[#262626] text-white text-sm rounded-lg hover:bg-[#333] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Regenerate
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {keyMoment?.image && !keyMoment.isGenerating && film.status === "idle" && (
                  <div className="mt-6 pt-6 border-t border-white/10 flex justify-end">
                    <button
                      onClick={startFilmGeneration}
                      className="px-6 py-3 bg-gradient-to-r from-[#9C99FF] to-[#7370FF] text-white rounded-xl font-medium hover:opacity-90"
                    >
                      Approve & Generate Video →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Section 4: Film Generation */}
        {(film.status === "generating" || film.status === "assembling" || film.status === "ready" || film.status === "failed") && (
          <div className="mt-8 bg-[#0F0E13] rounded-3xl outline outline-1 outline-[#1A1E2F] p-6">
            <h2 className="text-xl font-semibold text-white mb-2">4. Creating Your Film</h2>
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
    </div>
  );
}
