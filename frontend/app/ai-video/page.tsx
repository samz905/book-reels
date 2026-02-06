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
  appearance: string;
  role: "protagonist" | "antagonist" | "supporting";
}

interface Setting {
  location: string;
  time: string;
  atmosphere: string;
}

interface Beat {
  scene_number: number;
  description: string;
  scene_change: boolean;
  dialogue: string | null;
}

interface Story {
  id: string;
  title: string;
  characters: Character[];
  setting: Setting;
  beats: Beat[];
  style: string;
}

interface MoodboardImage {
  type: "character" | "setting" | "key_moment";
  image_base64: string;
  mime_type: string;
  prompt_used: string;
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
  previewUrl: string;
}

interface FilmCost {
  keyframes_usd: number;
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
  setting: number;
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

  // Visual Direction state (Phase 3)
  const [visualStep, setVisualStep] = useState<VisualStep | null>(null);
  const [moodboardStep, setMoodboardStep] = useState<MoodboardStep>("protagonist");
  const [characterImages, setCharacterImages] = useState<Record<string, CharacterImageState>>({});
  const [settingImage, setSettingImage] = useState<SettingImageState | null>(null);
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
    cost: { keyframes_usd: 0, videos_usd: 0, total_usd: 0 },
  });
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cost tracking across all phases
  const [totalCost, setTotalCost] = useState<TotalCost>({
    story: 0,
    characters: 0,
    setting: 0,
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

    // Initialize setting state
    setSettingImage({
      image: null,
      approved: false,
      isGenerating: true,
      feedback: "",
      promptUsed: "",
    });

    // Generate other characters and setting in parallel, using protagonist as reference
    const protagonistRef = {
      image_base64: protagonistImage.image.image_base64,
      mime_type: protagonistImage.image.mime_type,
    };

    await Promise.all([
      ...story.characters
        .filter((char) => char.id !== protagonistImage.character_id)
        .map((char) => generateCharacterImageWithRef(char.id, protagonistRef)),
      generateSettingWithRef(protagonistRef),
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
        setTotalCost((prev) => ({ ...prev, setting: prev.setting + data.cost_usd }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate setting image");
      setSettingImage((prev) => prev ? { ...prev, isGenerating: false } : null);
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
        setTotalCost((prev) => ({ ...prev, setting: prev.setting + data.cost_usd }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refine setting image");
      setSettingImage((prev) => prev ? { ...prev, isGenerating: false } : null);
    }
  };

  const continueToKeyMoment = async () => {
    if (!story || !settingImage?.image || !protagonistImage) return;

    setVisualStep("key_moment");
    setKeyMoment({
      image: null,
      beat_number: 0,
      beat_description: "",
      isGenerating: true,
      feedback: "",
      promptUsed: "",
    });

    // Build approved visuals with actual image data
    // Include protagonist first, then other characters
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

    const approvedVisuals = {
      character_images: allCharacterImages,
      setting_image: {
        image_base64: settingImage.image.image_base64,
        mime_type: settingImage.image.mime_type,
      },
      character_descriptions: story.characters.map((char) => char.appearance),
      setting_description: `${story.setting.location}, ${story.setting.time}. ${story.setting.atmosphere}`,
    };

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
    if (!story || !settingImage?.image || !keyMoment?.feedback.trim() || !protagonistImage) return;

    setKeyMoment((prev) => prev ? { ...prev, isGenerating: true } : null);

    // Include protagonist first, then other characters
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

    const approvedVisuals = {
      character_images: allCharacterImages,
      setting_image: {
        image_base64: settingImage.image.image_base64,
        mime_type: settingImage.image.mime_type,
      },
      character_descriptions: story.characters.map((char) => char.appearance),
      setting_description: `${story.setting.location}, ${story.setting.time}. ${story.setting.atmosphere}`,
    };

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
    if (!story || !settingImage?.image || !keyMoment?.image || !protagonistImage) return;

    // Build approved visuals - include protagonist first
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

    const approvedVisuals = {
      character_images: allCharacterImages,
      setting_image: {
        image_base64: settingImage.image.image_base64,
        mime_type: settingImage.image.mime_type,
      },
      character_descriptions: story.characters.map((char) => char.appearance),
      setting_description: `${story.setting.location}, ${story.setting.time}. ${story.setting.atmosphere}`,
    };

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
      cost: { keyframes_usd: 0, videos_usd: 0, total_usd: 0 },
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
          cost: data.cost || { keyframes_usd: 0, videos_usd: 0, total_usd: 0 },
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
      cost: { keyframes_usd: 0, videos_usd: 0, total_usd: 0 },
    });
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
      setting: 0,
      keyMoments: 0,
      film: 0,
    });
  };

  // Calculate grand total cost
  const grandTotalCost = totalCost.story + totalCost.characters + totalCost.setting + totalCost.keyMoments + totalCost.film;

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
                  <h3 className="text-lg font-semibold text-white mb-2">{story.title}</h3>
                  <div className="text-sm text-[#ADADAD] space-y-1">
                    <p><span className="text-white/70">Setting:</span> {story.setting.location}, {story.setting.time}</p>
                    <p><span className="text-white/70">Atmosphere:</span> {story.setting.atmosphere}</p>
                    <p><span className="text-white/70">Characters:</span> {story.characters.map((c) => c.name).join(", ")}</p>
                  </div>
                </div>

                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                  {story.beats.map((beat, index) => (
                    <div
                      key={beat.scene_number}
                      onClick={() => setSelectedBeatIndex(selectedBeatIndex === index ? null : index)}
                      className={`bg-[#1A1E2F] rounded-xl p-4 cursor-pointer transition-all ${
                        selectedBeatIndex === index ? "ring-2 ring-[#B8B6FC]" : "hover:bg-[#242836]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-[#B8B6FC] rounded-full flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
                          {beat.scene_number}
                        </div>
                        <div className="flex-1">
                          {beat.scene_change && (
                            <div className="mb-2">
                              <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/70">scene change</span>
                            </div>
                          )}
                          <p className="text-white text-sm">{beat.description}</p>
                          {beat.dialogue && (
                            <p className="text-[#ADADAD] text-sm mt-2 italic">&ldquo;{beat.dialogue}&rdquo;</p>
                          )}
                        </div>
                      </div>

                      {selectedBeatIndex === index && (
                        <div className="mt-4 pt-4 border-t border-white/10" onClick={(e) => e.stopPropagation()}>
                          <label className="block text-xs text-[#ADADAD] mb-2">Feedback for this beat</label>
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
                            {isRefining ? "Refining..." : "Refine This Beat"}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
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

                  {/* Setting */}
                  {settingImage && (
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
                          <p className="text-green-400 text-sm text-center">✓ Approved</p>
                        )}
                      </div>
                    </div>
                  )}
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
                        !settingImage?.approved ||
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

            {/* Generating State */}
            {(film.status === "generating" || film.status === "assembling") && (
              <div>
                {/* Preview of latest completed shot */}
                {film.completedShots.length > 0 && (
                  <div className="aspect-[9/16] max-w-xs mx-auto bg-black rounded-xl overflow-hidden mb-6">
                    <video
                      key={film.completedShots[film.completedShots.length - 1].previewUrl}
                      src={`${BACKEND_URL}${film.completedShots[film.completedShots.length - 1].previewUrl}`}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Progress bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-[#ADADAD] mb-2">
                    <span>
                      {film.status === "assembling"
                        ? "Assembling final video..."
                        : film.phase === "keyframe"
                        ? "Setting up frame..."
                        : `Filming Scene ${film.currentShot}`}
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

                {/* Shot status indicators */}
                <div className="flex flex-wrap gap-2 justify-center">
                  {Array.from({ length: film.totalShots }, (_, i) => {
                    const shotNum = i + 1;
                    const isComplete = film.completedShots.some((s) => s.number === shotNum);
                    const isCurrent = film.currentShot === shotNum;

                    return (
                      <div
                        key={shotNum}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                          isComplete
                            ? "bg-green-500 text-white"
                            : isCurrent
                            ? "bg-[#B8B6FC] text-black animate-pulse"
                            : "bg-[#262626] text-[#ADADAD]"
                        }`}
                      >
                        {isComplete ? "✓" : shotNum}
                      </div>
                    );
                  })}
                </div>

                <p className="text-center text-[#ADADAD] text-sm mt-6">
                  {film.status === "assembling"
                    ? "Almost there! Stitching your scenes together..."
                    : "Each scene takes about 30-60 seconds to generate. Sit back and relax!"}
                </p>

                {/* Live cost during generation */}
                {film.cost.total_usd > 0 && (
                  <p className="text-center text-[#ADADAD] text-xs mt-4">
                    Video cost so far: <span className="text-white">${film.cost.total_usd.toFixed(2)}</span>
                  </p>
                )}
              </div>
            )}

            {/* Ready State */}
            {film.status === "ready" && film.finalVideoUrl && (
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
                    {totalCost.setting > 0 && (
                      <div className="flex justify-between text-[#ADADAD]">
                        <span>Setting image</span>
                        <span>${totalCost.setting.toFixed(2)}</span>
                      </div>
                    )}
                    {totalCost.keyMoments > 0 && (
                      <div className="flex justify-between text-[#ADADAD]">
                        <span>Key moment images</span>
                        <span>${totalCost.keyMoments.toFixed(2)}</span>
                      </div>
                    )}
                    {film.cost.keyframes_usd > 0 && (
                      <div className="flex justify-between text-[#ADADAD]">
                        <span>Video keyframes</span>
                        <span>${film.cost.keyframes_usd.toFixed(2)}</span>
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
