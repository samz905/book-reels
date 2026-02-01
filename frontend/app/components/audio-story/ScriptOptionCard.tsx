"use client";

import { Script } from "../../data/mockAudioStoryData";

interface ScriptOptionCardProps {
  script: Script;
  isSelected: boolean;
  onSelect: () => void;
  optionNumber: number;
}

export default function ScriptOptionCard({
  script,
  isSelected,
  onSelect,
  optionNumber,
}: ScriptOptionCardProps) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left bg-[#1A1A1A] rounded-xl p-4 border transition-all hover:border-[#3A3A4A] ${
        isSelected ? "border-[#1ED760]" : "border-[#2A2A2A]"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-white font-semibold">Script Option {optionNumber}</h3>
        {/* Radio circle */}
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
            isSelected ? "border-[#1ED760] bg-[#1ED760]" : "border-[#4A4A4A]"
          }`}
        >
          {isSelected && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          )}
        </div>
      </div>

      {/* Duration */}
      <p className="text-white/50 text-xs mb-3">Duration: {script.duration}</p>

      {/* Script preview */}
      <p className="text-white/70 text-sm line-clamp-6 leading-relaxed">
        {script.content}
      </p>
    </button>
  );
}
