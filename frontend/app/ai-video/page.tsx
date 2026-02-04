"use client";

import { useState, useEffect, useRef } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";

// ============================================================
// Types
// ============================================================

type Duration = "1" | "2" | "3";
type Style = "cinematic" | "3d_animated" | "2d_animated";
type StoryFunction = string;
type VisualStep = "characters" | "environment" | "key_moments";
type MomentType = "hook" | "midpoint" | "climax";

interface Character {
  id: string;
  name: string;
  appearance: string;
  role: "protagonist" | "supporting";
}

interface Setting {
  location: string;
  time: string;
  atmosphere: string;
}

interface Beat {
  beat_number: number;
  description: string;
  story_function: StoryFunction;
  scene_change: boolean;
  dialogue: string | null;
}

interface Story {
  id: string;
  title: string;
  characters: Character[];
  setting: Setting;
  beats: Beat[];
  duration: string;
  style: string;
}

interface MoodboardImage {
  type: "character" | "environment" | "key_moment";
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

interface EnvironmentImageState {
  image: MoodboardImage | null;
  approved: boolean;
  isGenerating: boolean;
  feedback: string;
  promptUsed: string;
}

interface KeyMomentImageState {
  moment_type: MomentType;
  beat_number: number;
  beat_description: string;
  image: MoodboardImage | null;
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
  environment: number;
  keyMoments: number;
  film: number;
}

// ============================================================
// Constants
// ============================================================

const BACKEND_URL = "http://localhost:8000";

const DURATION_OPTIONS: { value: Duration; label: string; shots: string }[] = [
  { value: "1", label: "1 min", shots: "7-8 shots" },
  { value: "2", label: "2 min", shots: "15 shots" },
  { value: "3", label: "3 min", shots: "22-23 shots" },
];

const STYLE_OPTIONS: { value: Style; label: string }[] = [
  { value: "cinematic", label: "Cinematic" },
  { value: "3d_animated", label: "3D Animated" },
  { value: "2d_animated", label: "2D Animated" },
];

const STORY_FUNCTION_COLORS: Record<string, string> = {
  hook: "bg-blue-500/20 text-blue-400",
  setup: "bg-blue-500/20 text-blue-400",
  inciting_incident: "bg-yellow-500/20 text-yellow-400",
  rising_action: "bg-orange-500/20 text-orange-400",
  midpoint: "bg-purple-500/20 text-purple-400",
  climax: "bg-red-500/20 text-red-400",
  crisis: "bg-red-400/20 text-red-300",
  resolution: "bg-green-500/20 text-green-400",
  falling_action: "bg-teal-500/20 text-teal-400",
};

const getStoryFunctionColor = (func: string) => {
  return STORY_FUNCTION_COLORS[func] || "bg-gray-500/20 text-gray-400";
};

const MOMENT_TYPE_LABELS: Record<MomentType, string> = {
  hook: "Opening Hook",
  midpoint: "Midpoint",
  climax: "Climax",
};

const MOMENT_TYPE_COLORS: Record<MomentType, string> = {
  hook: "bg-blue-500/20 text-blue-400",
  midpoint: "bg-purple-500/20 text-purple-400",
  climax: "bg-red-500/20 text-red-400",
};

// ============================================================
// Main Component
// ============================================================

export default function AIVideoPage() {
  // Input state
  const [idea, setIdea] = useState("");
  const [duration, setDuration] = useState<Duration>("1");
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
  const [characterImages, setCharacterImages] = useState<Record<string, CharacterImageState>>({});
  const [environmentImage, setEnvironmentImage] = useState<EnvironmentImageState | null>(null);
  const [keyMoments, setKeyMoments] = useState<KeyMomentImageState[]>([]);
  const [isGeneratingKeyMoments, setIsGeneratingKeyMoments] = useState(false);

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
    environment: 0,
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
        body: JSON.stringify({ idea, duration, style }),
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
          duration,
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
    setCharacterImages({});
    setEnvironmentImage(null);
    setKeyMoments([]);
    setIsGeneratingKeyMoments(false);
  };

  const startVisualDirection = async () => {
    if (!story) return;

    setVisualStep("characters");

    const initialStates: Record<string, CharacterImageState> = {};
    story.characters.forEach((char) => {
      initialStates[char.id] = {
        image: null,
        approved: false,
        isGenerating: true,
        feedback: "",
        promptUsed: "",
      };
    });
    setCharacterImages(initialStates);

    await Promise.all(
      story.characters.map((char) => generateCharacterImage(char.id))
    );
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

  const refineCharacterImage = async (characterId: string) => {
    if (!story) return;
    const charState = characterImages[characterId];
    if (!charState?.feedback.trim()) return;

    setCharacterImages((prev) => ({
      ...prev,
      [characterId]: { ...prev[characterId], isGenerating: true },
    }));

    try {
      const response = await fetch(`${BACKEND_URL}/moodboard/refine-character`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          story,
          character_id: characterId,
          feedback: charState.feedback,
        }),
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

  const approveCharacter = (characterId: string) => {
    setCharacterImages((prev) => ({
      ...prev,
      [characterId]: { ...prev[characterId], approved: true },
    }));
  };

  const allCharactersApproved = () => {
    if (!story) return false;
    return story.characters.every((char) => characterImages[char.id]?.approved);
  };

  const continueToEnvironment = async () => {
    if (!story) return;

    setVisualStep("environment");
    setEnvironmentImage({
      image: null,
      approved: false,
      isGenerating: true,
      feedback: "",
      promptUsed: "",
    });

    try {
      const response = await fetch(`${BACKEND_URL}/moodboard/generate-environment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to generate environment image");
      }

      const data = await response.json();

      setEnvironmentImage({
        image: data.image,
        approved: false,
        isGenerating: false,
        feedback: "",
        promptUsed: data.prompt_used,
      });
      // Track environment image cost
      if (data.cost_usd) {
        setTotalCost((prev) => ({ ...prev, environment: prev.environment + data.cost_usd }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate environment image");
      setEnvironmentImage((prev) => prev ? { ...prev, isGenerating: false } : null);
    }
  };

  const refineEnvironmentImage = async () => {
    if (!story || !environmentImage?.feedback.trim()) return;

    setEnvironmentImage((prev) => prev ? { ...prev, isGenerating: true } : null);

    try {
      const response = await fetch(`${BACKEND_URL}/moodboard/refine-environment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          story,
          feedback: environmentImage.feedback,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to refine environment image");
      }

      const data = await response.json();

      setEnvironmentImage({
        image: data.image,
        approved: false,
        isGenerating: false,
        feedback: "",
        promptUsed: data.prompt_used,
      });
      // Track environment refinement cost
      if (data.cost_usd) {
        setTotalCost((prev) => ({ ...prev, environment: prev.environment + data.cost_usd }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refine environment image");
      setEnvironmentImage((prev) => prev ? { ...prev, isGenerating: false } : null);
    }
  };

  const continueToKeyMoments = async () => {
    if (!story || !environmentImage?.image) return;

    setVisualStep("key_moments");
    setIsGeneratingKeyMoments(true);
    setKeyMoments([]);

    // Build approved visuals with actual image data
    const approvedVisuals = {
      character_images: story.characters
        .filter((char) => characterImages[char.id]?.image)
        .map((char) => ({
          image_base64: characterImages[char.id].image!.image_base64,
          mime_type: characterImages[char.id].image!.mime_type,
        })),
      environment_image: {
        image_base64: environmentImage.image.image_base64,
        mime_type: environmentImage.image.mime_type,
      },
      character_descriptions: story.characters.map((char) => char.appearance),
      environment_description: `${story.setting.location}, ${story.setting.time}. ${story.setting.atmosphere}`,
    };

    try {
      const response = await fetch(`${BACKEND_URL}/moodboard/generate-key-moments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story, approved_visuals: approvedVisuals }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to generate key moments");
      }

      const data = await response.json();

      // Transform backend response to frontend state
      const moments: KeyMomentImageState[] = data.key_moments.map((km: any) => ({
        moment_type: km.moment_type,
        beat_number: km.beat_number,
        beat_description: km.beat_description,
        image: km.image,
        isGenerating: false,
        feedback: "",
        promptUsed: km.prompt_used,
      }));

      setKeyMoments(moments);
      // Track key moments cost (3 images)
      if (data.cost_usd) {
        setTotalCost((prev) => ({ ...prev, keyMoments: prev.keyMoments + data.cost_usd }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate key moments");
    } finally {
      setIsGeneratingKeyMoments(false);
    }
  };

  const refineKeyMoment = async (momentType: MomentType) => {
    if (!story || !environmentImage?.image) return;
    const moment = keyMoments.find((m) => m.moment_type === momentType);
    if (!moment?.feedback.trim()) return;

    // Update to generating state
    setKeyMoments((prev) =>
      prev.map((m) =>
        m.moment_type === momentType ? { ...m, isGenerating: true } : m
      )
    );

    const approvedVisuals = {
      character_images: story.characters
        .filter((char) => characterImages[char.id]?.image)
        .map((char) => ({
          image_base64: characterImages[char.id].image!.image_base64,
          mime_type: characterImages[char.id].image!.mime_type,
        })),
      environment_image: {
        image_base64: environmentImage.image.image_base64,
        mime_type: environmentImage.image.mime_type,
      },
      character_descriptions: story.characters.map((char) => char.appearance),
      environment_description: `${story.setting.location}, ${story.setting.time}. ${story.setting.atmosphere}`,
    };

    try {
      const response = await fetch(`${BACKEND_URL}/moodboard/refine-key-moment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          story,
          approved_visuals: approvedVisuals,
          moment_type: momentType,
          feedback: moment.feedback,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to refine key moment");
      }

      const data = await response.json();

      setKeyMoments((prev) =>
        prev.map((m) =>
          m.moment_type === momentType
            ? {
                ...m,
                image: data.key_moment.image,
                promptUsed: data.key_moment.prompt_used,
                isGenerating: false,
                feedback: "",
              }
            : m
        )
      );
      // Track key moment refinement cost
      if (data.cost_usd) {
        setTotalCost((prev) => ({ ...prev, keyMoments: prev.keyMoments + data.cost_usd }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refine key moment");
      setKeyMoments((prev) =>
        prev.map((m) =>
          m.moment_type === momentType ? { ...m, isGenerating: false } : m
        )
      );
    }
  };

  // Count approved characters
  const approvedCount = story
    ? story.characters.filter((char) => characterImages[char.id]?.approved).length
    : 0;

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
    if (!story || !environmentImage?.image || keyMoments.length === 0) return;

    // Build approved visuals
    const approvedVisuals = {
      character_images: story.characters
        .filter((char) => characterImages[char.id]?.image)
        .map((char) => ({
          image_base64: characterImages[char.id].image!.image_base64,
          mime_type: characterImages[char.id].image!.mime_type,
        })),
      environment_image: {
        image_base64: environmentImage.image.image_base64,
        mime_type: environmentImage.image.mime_type,
      },
      character_descriptions: story.characters.map((char) => char.appearance),
      environment_description: `${story.setting.location}, ${story.setting.time}. ${story.setting.atmosphere}`,
    };

    // Build key moment images for video references
    const keyMomentImages = keyMoments
      .filter((m) => m.image)
      .map((m) => ({
        moment_type: m.moment_type,
        image_base64: m.image!.image_base64,
        mime_type: m.image!.mime_type,
      }));

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
          key_moment_images: keyMomentImages,
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
      environment: 0,
      keyMoments: 0,
      film: 0,
    });
  };

  // Calculate grand total cost
  const grandTotalCost = totalCost.story + totalCost.characters + totalCost.environment + totalCost.keyMoments + totalCost.film;

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
              <label className="block text-sm text-[#ADADAD] mb-2">Duration</label>
              <div className="flex gap-3">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDuration(opt.value)}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                      duration === opt.value
                        ? "bg-[#B8B6FC] text-black"
                        : "bg-[#262626] text-white hover:bg-[#333]"
                    }`}
                  >
                    <div>{opt.label}</div>
                    <div className="text-xs opacity-70">{opt.shots}</div>
                  </button>
                ))}
              </div>
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
                      key={beat.beat_number}
                      onClick={() => setSelectedBeatIndex(selectedBeatIndex === index ? null : index)}
                      className={`bg-[#1A1E2F] rounded-xl p-4 cursor-pointer transition-all ${
                        selectedBeatIndex === index ? "ring-2 ring-[#B8B6FC]" : "hover:bg-[#242836]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-[#B8B6FC] rounded-full flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
                          {beat.beat_number}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${getStoryFunctionColor(beat.story_function)}`}>
                              {beat.story_function.replace("_", " ")}
                            </span>
                            {beat.scene_change && (
                              <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/70">scene change</span>
                            )}
                          </div>
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
              <div className={`flex items-center gap-2 ${visualStep === "characters" ? "text-[#B8B6FC]" : "text-white/50"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  visualStep === "characters" ? "bg-[#B8B6FC] text-black" :
                  (visualStep === "environment" || visualStep === "key_moments") ? "bg-green-500 text-white" : "bg-[#262626]"
                }`}>
                  {(visualStep === "environment" || visualStep === "key_moments") ? "✓" : "1"}
                </div>
                <span className="text-sm font-medium">Characters</span>
              </div>
              <div className="flex-1 h-px bg-white/10" />
              <div className={`flex items-center gap-2 ${visualStep === "environment" ? "text-[#B8B6FC]" : "text-white/50"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  visualStep === "environment" ? "bg-[#B8B6FC] text-black" :
                  visualStep === "key_moments" ? "bg-green-500 text-white" : "bg-[#262626]"
                }`}>
                  {visualStep === "key_moments" ? "✓" : "2"}
                </div>
                <span className="text-sm font-medium">Environment</span>
              </div>
              <div className="flex-1 h-px bg-white/10" />
              <div className={`flex items-center gap-2 ${visualStep === "key_moments" ? "text-[#B8B6FC]" : "text-white/50"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  visualStep === "key_moments" ? "bg-[#B8B6FC] text-black" : "bg-[#262626]"
                }`}>
                  3
                </div>
                <span className="text-sm font-medium">Key Moments</span>
              </div>
            </div>

            {/* Step 1: Characters */}
            {visualStep === "characters" && story && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-white">Character References</h3>
                  <span className="text-sm text-[#ADADAD]">
                    {approvedCount} of {story.characters.length} approved
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {story.characters.map((char) => {
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
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              char.role === "protagonist" ? "bg-[#B8B6FC]/20 text-[#B8B6FC]" : "bg-white/10 text-white/70"
                            }`}>
                              {char.role}
                            </span>
                          </div>

                          {!charState.approved && !charState.isGenerating && (
                            <>
                              <textarea
                                value={charState.feedback}
                                onChange={(e) => setCharacterImages((prev) => ({
                                  ...prev,
                                  [char.id]: { ...prev[char.id], feedback: e.target.value },
                                }))}
                                placeholder="Feedback (optional)..."
                                className="w-full h-16 bg-[#262626] rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#B8B6FC] resize-none mb-2"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => refineCharacterImage(char.id)}
                                  disabled={!charState.feedback.trim()}
                                  className="flex-1 py-2 bg-[#262626] text-white text-sm rounded-lg hover:bg-[#333] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Regenerate
                                </button>
                                <button
                                  onClick={() => approveCharacter(char.id)}
                                  className="flex-1 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-500"
                                >
                                  Approve
                                </button>
                              </div>
                            </>
                          )}

                          {charState.approved && (
                            <p className="text-green-400 text-sm text-center">✓ Approved</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 pt-6 border-t border-white/10 flex justify-end">
                  <button
                    onClick={continueToEnvironment}
                    disabled={!allCharactersApproved()}
                    className="px-6 py-3 bg-gradient-to-r from-[#9C99FF] to-[#7370FF] text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue to Environment →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Environment */}
            {visualStep === "environment" && environmentImage && (
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Environment Reference</h3>

                <div className="max-w-md mx-auto">
                  <div className="bg-[#1A1E2F] rounded-xl overflow-hidden">
                    <div className="aspect-[9/16] relative bg-[#262626]">
                      {environmentImage.isGenerating ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <svg className="animate-spin h-8 w-8 text-[#B8B6FC] mb-2" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          <span className="text-[#ADADAD] text-sm">Generating...</span>
                        </div>
                      ) : environmentImage.image ? (
                        <img
                          src={`data:${environmentImage.image.mime_type};base64,${environmentImage.image.image_base64}`}
                          alt="Environment"
                          className="w-full h-full object-cover"
                        />
                      ) : null}
                    </div>

                    <div className="p-4">
                      <h4 className="text-white font-medium mb-2">{story?.setting.location}</h4>

                      {!environmentImage.isGenerating && (
                        <>
                          <textarea
                            value={environmentImage.feedback}
                            onChange={(e) => setEnvironmentImage((prev) => prev ? { ...prev, feedback: e.target.value } : null)}
                            placeholder="Feedback (optional)..."
                            className="w-full h-16 bg-[#262626] rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#B8B6FC] resize-none mb-2"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={refineEnvironmentImage}
                              disabled={!environmentImage.feedback.trim()}
                              className="flex-1 py-2 bg-[#262626] text-white text-sm rounded-lg hover:bg-[#333] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Regenerate
                            </button>
                            <button
                              onClick={continueToKeyMoments}
                              className="flex-1 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-500"
                            >
                              Approve & Continue
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Key Moments */}
            {visualStep === "key_moments" && (
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Key Moments (Hook, Midpoint, Climax)</h3>
                <p className="text-sm text-[#ADADAD] mb-6">
                  These reference images use your approved characters and environment for visual consistency.
                </p>

                {isGeneratingKeyMoments && keyMoments.length === 0 && (
                  <div className="text-center py-16">
                    <svg className="animate-spin h-12 w-12 mx-auto mb-4 text-[#B8B6FC]" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-[#ADADAD]">Generating 3 key moments with reference images...</p>
                    <p className="text-[#ADADAD] text-sm mt-2">This may take a couple of minutes</p>
                  </div>
                )}

                {keyMoments.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {keyMoments.map((moment) => (
                      <div key={moment.moment_type} className="bg-[#1A1E2F] rounded-xl overflow-hidden">
                        <div className="aspect-[9/16] relative bg-[#262626]">
                          {moment.isGenerating ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <svg className="animate-spin h-8 w-8 text-[#B8B6FC] mb-2" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              <span className="text-[#ADADAD] text-sm">Regenerating...</span>
                            </div>
                          ) : moment.image ? (
                            <img
                              src={`data:${moment.image.mime_type};base64,${moment.image.image_base64}`}
                              alt={MOMENT_TYPE_LABELS[moment.moment_type]}
                              className="w-full h-full object-cover"
                            />
                          ) : null}
                        </div>

                        <div className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${MOMENT_TYPE_COLORS[moment.moment_type]}`}>
                              {MOMENT_TYPE_LABELS[moment.moment_type]}
                            </span>
                            <span className="text-xs text-[#ADADAD]">Beat {moment.beat_number}</span>
                          </div>
                          <p className="text-white text-sm mb-3 line-clamp-2">{moment.beat_description}</p>

                          {/* Prompt Preview */}
                          <details className="mb-3">
                            <summary className="text-xs text-[#ADADAD] cursor-pointer hover:text-white">
                              View prompt
                            </summary>
                            <pre className="mt-2 text-xs text-white/70 whitespace-pre-wrap font-mono bg-[#262626] rounded-lg p-2 max-h-32 overflow-y-auto">
                              {moment.promptUsed}
                            </pre>
                          </details>

                          {!moment.isGenerating && (
                            <>
                              <textarea
                                value={moment.feedback}
                                onChange={(e) => setKeyMoments((prev) =>
                                  prev.map((m) =>
                                    m.moment_type === moment.moment_type
                                      ? { ...m, feedback: e.target.value }
                                      : m
                                  )
                                )}
                                placeholder="Feedback (optional)..."
                                className="w-full h-14 bg-[#262626] rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#B8B6FC] resize-none mb-2"
                              />
                              <button
                                onClick={() => refineKeyMoment(moment.moment_type)}
                                disabled={!moment.feedback.trim()}
                                className="w-full py-2 bg-[#262626] text-white text-sm rounded-lg hover:bg-[#333] disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Regenerate
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {keyMoments.length > 0 && film.status === "idle" && (
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
                    {totalCost.environment > 0 && (
                      <div className="flex justify-between text-[#ADADAD]">
                        <span>Environment image</span>
                        <span>${totalCost.environment.toFixed(2)}</span>
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
