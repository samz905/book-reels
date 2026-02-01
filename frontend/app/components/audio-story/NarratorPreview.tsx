"use client";

import { Narrator } from "../../data/mockAudioStoryData";

interface NarratorPreviewProps {
  narrator: Narrator;
  onPlayPreview?: () => void;
}

export default function NarratorPreview({ narrator, onPlayPreview }: NarratorPreviewProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-4">
      {/* Large avatar */}
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-xl ring-2 ring-[#1ED760] ring-offset-2 ring-offset-[#0F0E13]"
        style={{ backgroundColor: "#E57373" }}
      >
        {narrator.avatar ? (
          <img
            src={narrator.avatar}
            alt={narrator.name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          narrator.initials
        )}
      </div>

      {/* Name */}
      <h3 className="text-white text-xl font-semibold">{narrator.name}</h3>

      {/* Description if available */}
      {narrator.description && (
        <p className="text-white/50 text-sm">{narrator.description}</p>
      )}

      {/* Play preview button */}
      {onPlayPreview && (
        <button
          onClick={onPlayPreview}
          className="flex items-center gap-2 text-white/70 text-sm hover:text-white transition-colors"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
          One line promo
        </button>
      )}
    </div>
  );
}
