"use client";

import { EpisodeLength, EPISODE_LENGTHS } from "../../data/mockAudioStoryData";

interface EpisodeLengthToggleProps {
  value: EpisodeLength;
  onChange: (value: EpisodeLength) => void;
}

export default function EpisodeLengthToggle({ value, onChange }: EpisodeLengthToggleProps) {
  return (
    <div className="flex items-center gap-1 bg-[#1A1A1A] rounded-full p-1">
      {EPISODE_LENGTHS.map((length) => (
        <button
          key={length}
          onClick={() => onChange(length)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
            value === length
              ? "bg-white text-black"
              : "text-white/60 hover:text-white"
          }`}
        >
          {length}
        </button>
      ))}
    </div>
  );
}
