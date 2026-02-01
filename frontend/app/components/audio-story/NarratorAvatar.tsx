"use client";

import { Narrator } from "../../data/mockAudioStoryData";

interface NarratorAvatarProps {
  narrator: Narrator;
  isSelected: boolean;
  onSelect: () => void;
}

export default function NarratorAvatar({
  narrator,
  isSelected,
  onSelect,
}: NarratorAvatarProps) {
  return (
    <button
      onClick={onSelect}
      className="flex flex-col items-center gap-2 group"
    >
      {/* Avatar circle */}
      <div
        className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-semibold text-sm transition-all ${
          isSelected
            ? "ring-2 ring-[#1ED760] ring-offset-2 ring-offset-[#0F0E13]"
            : "group-hover:ring-2 group-hover:ring-[#4A4A4A] group-hover:ring-offset-2 group-hover:ring-offset-[#0F0E13]"
        }`}
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
      <span
        className={`text-xs transition-colors ${
          isSelected ? "text-white" : "text-white/60 group-hover:text-white"
        }`}
      >
        {narrator.name}
      </span>
    </button>
  );
}
