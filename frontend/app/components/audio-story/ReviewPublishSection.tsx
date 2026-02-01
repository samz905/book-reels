"use client";

import { useState } from "react";
import AudioPlayer from "./AudioPlayer";
import { MockStory } from "../../data/mockAudioStoryData";

interface ReviewPublishSectionProps {
  sectionNumber: number;
  audioUrl: string | null;
  selectedStoryId: string;
  onStorySelect: (id: string) => void;
  episodeNumber: string;
  onEpisodeNumberChange: (value: string) => void;
  episodeName: string;
  onEpisodeNameChange: (value: string) => void;
  visibility: "draft" | "published";
  onVisibilityChange: (value: "draft" | "published") => void;
  onPublish: () => void;
  isPublishing: boolean;
  stories: MockStory[];
}

export default function ReviewPublishSection({
  sectionNumber,
  audioUrl,
  selectedStoryId,
  onStorySelect,
  episodeNumber,
  onEpisodeNumberChange,
  episodeName,
  onEpisodeNameChange,
  visibility,
  onVisibilityChange,
  onPublish,
  isPublishing,
  stories,
}: ReviewPublishSectionProps) {
  const [showStoryDropdown, setShowStoryDropdown] = useState(false);
  const selectedStory = stories.find((s) => s.id === selectedStoryId);

  return (
    <div className="bg-[#0F0E13] rounded-xl p-6 border border-[#1A1E2F]">
      <h2 className="text-white text-lg font-bold mb-4">
        {sectionNumber}. Review & Publish
      </h2>

      {/* Empty state message */}
      {!audioUrl && (
        <p className="text-white/50 text-sm mb-6">
          You don&apos;t have anything to review and publish yet.
        </p>
      )}

      {/* Audio Player */}
      <div className="mb-6">
        <AudioPlayer audioUrl={audioUrl} />
      </div>

      {/* Form Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Select Story */}
        <div>
          <label className="text-white text-sm mb-2 block">Select Story</label>
          <div className="relative">
            <button
              onClick={() => setShowStoryDropdown(!showStoryDropdown)}
              className="w-full flex items-center justify-between px-4 py-3 bg-[#262626] rounded-xl text-left focus:outline-none focus:ring-2 focus:ring-[#B8B6FC]"
            >
              <span className={selectedStory ? "text-white" : "text-white/40"}>
                {selectedStory?.title || "Select a story"}
              </span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
                className={`text-white/60 transition-transform ${
                  showStoryDropdown ? "rotate-180" : ""
                }`}
              >
                <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
              </svg>
            </button>

            {/* Dropdown */}
            {showStoryDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] shadow-lg z-10 max-h-48 overflow-y-auto">
                {stories.map((story) => (
                  <button
                    key={story.id}
                    onClick={() => {
                      onStorySelect(story.id);
                      setShowStoryDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-[#2A2A2A] transition-colors ${
                      selectedStoryId === story.id
                        ? "text-[#1ED760]"
                        : "text-white"
                    }`}
                  >
                    {story.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Episode Number */}
        <div>
          <label className="text-white text-sm mb-2 block">Episode Number</label>
          <input
            type="text"
            value={episodeNumber}
            onChange={(e) => onEpisodeNumberChange(e.target.value)}
            placeholder="e.g., 1"
            className="w-full px-4 py-3 bg-[#262626] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8B6FC] placeholder-white/40"
          />
        </div>

        {/* Episode Name */}
        <div>
          <label className="text-white text-sm mb-2 block">Episode Name</label>
          <input
            type="text"
            value={episodeName}
            onChange={(e) => onEpisodeNameChange(e.target.value)}
            placeholder="Enter episode name"
            className="w-full px-4 py-3 bg-[#262626] text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B8B6FC] placeholder-white/40"
          />
        </div>

        {/* Visibility */}
        <div>
          <label className="text-white text-sm mb-2 block">Visibility</label>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="visibility"
                checked={visibility === "draft"}
                onChange={() => onVisibilityChange("draft")}
                className="sr-only"
              />
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  visibility === "draft"
                    ? "border-[#1ED760]"
                    : "border-[#4A4A4A]"
                }`}
              >
                {visibility === "draft" && (
                  <div className="w-2.5 h-2.5 rounded-full bg-[#1ED760]" />
                )}
              </div>
              <span className="text-white text-sm">Drafts</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="visibility"
                checked={visibility === "published"}
                onChange={() => onVisibilityChange("published")}
                className="sr-only"
              />
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  visibility === "published"
                    ? "border-[#1ED760]"
                    : "border-[#4A4A4A]"
                }`}
              >
                {visibility === "published" && (
                  <div className="w-2.5 h-2.5 rounded-full bg-[#1ED760]" />
                )}
              </div>
              <span className="text-white text-sm">Published</span>
            </label>
          </div>
        </div>
      </div>

      {/* Publish button */}
      <div className="flex justify-end mt-6">
        <button
          onClick={onPublish}
          disabled={isPublishing}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm text-white bg-[#1ED760] hover:bg-[#1DB954] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPublishing ? (
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
              Creating...
            </>
          ) : (
            "Create Audio Episode"
          )}
        </button>
      </div>
    </div>
  );
}
