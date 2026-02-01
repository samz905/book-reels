"use client";

import { EpisodeLength } from "../../data/mockAudioStoryData";
import EpisodeLengthToggle from "./EpisodeLengthToggle";

interface GenerateScriptsSectionProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  episodeLength: EpisodeLength;
  onEpisodeLengthChange: (length: EpisodeLength) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export default function GenerateScriptsSection({
  prompt,
  onPromptChange,
  episodeLength,
  onEpisodeLengthChange,
  onGenerate,
  isGenerating,
}: GenerateScriptsSectionProps) {
  const wordCount = prompt.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="bg-[#0F0E13] rounded-xl p-6 border border-[#1A1E2F]">
      <h2 className="text-white text-lg font-bold mb-4">1. Generate Short Scripts</h2>

      <p className="text-white/60 text-sm mb-4">
        Paste text (chapter or scene), describe an idea or outline. Include tone, style, and creative direction for best output.
      </p>

      {/* Textarea */}
      <textarea
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        placeholder="Enter your story text, scene description, or creative direction..."
        className="w-full h-32 bg-[#262626] text-white rounded-2xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-[#B8B6FC] placeholder-white/40"
      />

      {/* Helper text */}
      <p className="text-white/40 text-xs mt-2 mb-4">
        AI works best with 200 words. Current: {wordCount} words
      </p>

      {/* Episode Length + Generate Button */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <span className="text-white text-sm">Episode Length</span>
          <EpisodeLengthToggle value={episodeLength} onChange={onEpisodeLengthChange} />
        </div>

        <button
          onClick={onGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm text-white bg-[#1ED760] hover:bg-[#1DB954] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Generating...
            </>
          ) : (
            <>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6l2.1-2.1" />
              </svg>
              Generate Scripts
            </>
          )}
        </button>
      </div>
    </div>
  );
}
