"use client";

import { useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";

// ============================================================
// Types
// ============================================================

type Duration = "1" | "2" | "3";
type Style = "cinematic" | "3d_animated" | "2d_animated";
type StoryFunction = string; // hook, setup, inciting_incident, rising_action, midpoint, climax, resolution, crisis, etc.

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate story");
    } finally {
      setIsGenerating(false);
    }
  };

  const regenerateStory = async () => {
    setIsGenerating(true);
    setError(null);
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

      // Update the beat in the story
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
  // Render
  // ============================================================

  return (
    <div className="min-h-screen bg-[#010101]">
      <Header />

      <main className="max-w-[1200px] mx-auto px-6 py-8">
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

            {/* Idea Input */}
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

            {/* Duration Selector */}
            <div className="mb-6">
              <label className="block text-sm text-[#ADADAD] mb-2">
                Duration
              </label>
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

            {/* Style Selector */}
            <div className="mb-6">
              <label className="block text-sm text-[#ADADAD] mb-2">
                Visual Style
              </label>
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

            {/* Generate Button */}
            <button
              onClick={generateStory}
              disabled={isGenerating || !idea.trim()}
              className="w-full py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-[#9C99FF] to-[#7370FF] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Generating Story...
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  Generate Story Beats
                </>
              )}
            </button>

            {/* Error Display */}
            {error && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Right Column: Story Display */}
          <div className="bg-[#0F0E13] rounded-3xl outline outline-1 outline-[#1A1E2F] p-6">
            <h2 className="text-xl font-semibold text-white mb-6">
              2. Story Beats
            </h2>

            {!story && !isGenerating && (
              <div className="text-center py-16 text-[#ADADAD]">
                <svg
                  className="w-16 h-16 mx-auto mb-4 opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <p>Enter your idea and click Generate</p>
              </div>
            )}

            {isGenerating && (
              <div className="text-center py-16">
                <svg
                  className="animate-spin h-12 w-12 mx-auto mb-4 text-[#B8B6FC]"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                <p className="text-[#ADADAD]">Crafting your story...</p>
              </div>
            )}

            {story && !isGenerating && (
              <div className="space-y-4">
                {/* Story Header */}
                <div className="bg-[#1A1E2F] rounded-xl p-4 mb-6">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {story.title}
                  </h3>
                  <div className="text-sm text-[#ADADAD] space-y-1">
                    <p>
                      <span className="text-white/70">Setting:</span>{" "}
                      {story.setting.location}, {story.setting.time}
                    </p>
                    <p>
                      <span className="text-white/70">Atmosphere:</span>{" "}
                      {story.setting.atmosphere}
                    </p>
                    <p>
                      <span className="text-white/70">Characters:</span>{" "}
                      {story.characters.map((c) => c.name).join(", ")}
                    </p>
                  </div>
                </div>

                {/* Beats List */}
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {story.beats.map((beat, index) => (
                    <div
                      key={beat.beat_number}
                      onClick={() =>
                        setSelectedBeatIndex(
                          selectedBeatIndex === index ? null : index
                        )
                      }
                      className={`bg-[#1A1E2F] rounded-xl p-4 cursor-pointer transition-all ${
                        selectedBeatIndex === index
                          ? "ring-2 ring-[#B8B6FC]"
                          : "hover:bg-[#242836]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-[#B8B6FC] rounded-full flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
                          {beat.beat_number}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${
                                getStoryFunctionColor(beat.story_function)
                              }`}
                            >
                              {beat.story_function.replace("_", " ")}
                            </span>
                            {beat.scene_change && (
                              <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/70">
                                scene change
                              </span>
                            )}
                          </div>
                          <p className="text-white text-sm">
                            {beat.description}
                          </p>
                          {beat.dialogue && (
                            <p className="text-[#ADADAD] text-sm mt-2 italic">
                              &ldquo;{beat.dialogue}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Feedback Input (when selected) */}
                      {selectedBeatIndex === index && (
                        <div
                          className="mt-4 pt-4 border-t border-white/10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <label className="block text-xs text-[#ADADAD] mb-2">
                            Feedback for this beat
                          </label>
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

                {/* Global Feedback & Actions */}
                <div className="pt-4 border-t border-white/10">
                  <label className="block text-xs text-[#ADADAD] mb-2">
                    Overall feedback (optional)
                  </label>
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
                      disabled
                      className="flex-1 py-3 bg-gradient-to-r from-[#9C99FF] to-[#7370FF] text-white rounded-xl font-medium opacity-50 cursor-not-allowed"
                    >
                      Approve & Continue
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
