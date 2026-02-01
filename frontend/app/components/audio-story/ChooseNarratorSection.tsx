"use client";

import { useState } from "react";
import { Narrator, AudioCredits } from "../../data/mockAudioStoryData";
import NarratorGrid from "./NarratorGrid";
import NarratorPreview from "./NarratorPreview";

interface ChooseNarratorSectionProps {
  activeTab: "ai" | "my-voice";
  onTabChange: (tab: "ai" | "my-voice") => void;
  narrators: Narrator[];
  selectedNarratorId: string | null;
  selectedNarrator: Narrator | undefined;
  onNarratorSelect: (id: string) => void;
  onStartRecording: () => void;
  onUploadFile: () => void;
  onGenerateNarration: () => void;
  isGeneratingNarration: boolean;
  credits: AudioCredits;
}

export default function ChooseNarratorSection({
  activeTab,
  onTabChange,
  narrators,
  selectedNarratorId,
  selectedNarrator,
  onNarratorSelect,
  onStartRecording,
  onUploadFile,
  onGenerateNarration,
  isGeneratingNarration,
  credits,
}: ChooseNarratorSectionProps) {
  const [useCustomVoice, setUseCustomVoice] = useState(false);

  return (
    <div className="bg-[#0F0E13] rounded-xl p-6 border border-[#1A1E2F]">
      <h2 className="text-white text-lg font-bold mb-4">3. Choose a Narrator</h2>

      {/* Tabs */}
      <div className="flex items-center gap-6 mb-6">
        <button
          onClick={() => onTabChange("ai")}
          className={`text-sm font-semibold uppercase tracking-wide pb-2 transition-colors ${
            activeTab === "ai"
              ? "text-white border-b-2 border-white"
              : "text-[#ADADAD] hover:text-white"
          }`}
        >
          AI Narrators
        </button>
        <button
          onClick={() => onTabChange("my-voice")}
          className={`text-sm font-semibold uppercase tracking-wide pb-2 transition-colors ${
            activeTab === "my-voice"
              ? "text-white border-b-2 border-white"
              : "text-[#ADADAD] hover:text-white"
          }`}
        >
          My Voice
        </button>
      </div>

      {activeTab === "ai" ? (
        <>
          {/* Narrator Grid */}
          <NarratorGrid
            narrators={narrators}
            selectedId={selectedNarratorId}
            onSelect={onNarratorSelect}
          />

          {/* Selected narrator preview */}
          {selectedNarrator && (
            <div className="mt-6 border-t border-[#2A2A2A] pt-6">
              <NarratorPreview narrator={selectedNarrator} />

              {/* Voice input buttons - shown when narrator is selected */}
              <div className="flex items-center justify-center gap-4 mt-6">
                {/* Start Recording button */}
                <button
                  onClick={onStartRecording}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm text-white border border-[#B8B6FC] bg-[#262550] hover:bg-[#363570] transition-colors"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                  Start Recording
                </button>

                {/* Upload File button */}
                <button
                  onClick={onUploadFile}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm text-white transition-colors"
                  style={{
                    background: "linear-gradient(135deg, #9C99FF 0%, #7370FF 60%)",
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Upload File
                </button>
              </div>
            </div>
          )}

          {/* Bottom row: Checkbox + Credits + Generate button */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#2A2A2A]">
            <div className="flex items-center gap-6">
              {/* Use custom voice checkbox */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCustomVoice}
                  onChange={(e) => setUseCustomVoice(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    useCustomVoice
                      ? "border-[#1ED760] bg-[#1ED760]"
                      : "border-[#4A4A4A]"
                  }`}
                >
                  {useCustomVoice && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  )}
                </div>
                <span className="text-white/70 text-sm">Only the voice I want to use</span>
              </label>

              {/* Credits indicator */}
              <div className="flex items-center gap-2 text-[#1ED760]">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                <span className="text-sm font-medium">
                  {credits.available} {credits.label}
                </span>
              </div>

              {/* Buy credits link */}
              <button className="text-[#B8B6FC] text-sm hover:underline">
                Buy Credits
              </button>
            </div>

            {/* Generate Narration button */}
            <button
              onClick={onGenerateNarration}
              disabled={isGeneratingNarration || !selectedNarratorId}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm text-white bg-[#1ED760] hover:bg-[#1DB954] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGeneratingNarration ? (
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
                  >
                    <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6l2.1-2.1" />
                  </svg>
                  Generate Narration
                </>
              )}
            </button>
          </div>
        </>
      ) : (
        /* My Voice tab content */
        <div className="py-8">
          {/* Voice input buttons */}
          <div className="flex items-center justify-center gap-4">
            {/* Start Recording button */}
            <button
              onClick={onStartRecording}
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm text-white border border-[#B8B6FC] bg-[#262550] hover:bg-[#363570] transition-colors"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
              Start Recording
            </button>

            {/* Upload File button */}
            <button
              onClick={onUploadFile}
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm text-white transition-colors"
              style={{
                background: "linear-gradient(135deg, #9C99FF 0%, #7370FF 60%)",
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Upload File
            </button>
          </div>

          <p className="text-white/40 text-sm text-center mt-4">
            Record your own narration or upload a pre-recorded audio file
          </p>
        </div>
      )}
    </div>
  );
}
