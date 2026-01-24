"use client";

import { type StoryType } from "../data/mockStories";

interface StoryTypeTabsProps {
  activeType: StoryType;
  onTypeChange: (type: StoryType) => void;
}

function FilmIcon({ className }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M4 3C3.44772 3 3 3.44772 3 4V16C3 16.5523 3.44772 17 4 17H16C16.5523 17 17 16.5523 17 16V4C17 3.44772 16.5523 3 16 3H4ZM5 5H7V7H5V5ZM13 5H15V7H13V5ZM9 5H11V15H9V5ZM5 9H7V11H5V9ZM13 9H15V11H13V9ZM5 13H7V15H5V13ZM13 13H15V15H13V13Z"
        fill="currentColor"
      />
    </svg>
  );
}

function AudioIcon({ className }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M7 18V6H9V18H7ZM11 22V2H13V22H11ZM3 14V10H5V14H3ZM15 18V6H17V18H15ZM19 14V10H21V14H19Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function StoryTypeTabs({
  activeType,
  onTypeChange,
}: StoryTypeTabsProps) {
  return (
    <nav className="flex items-center justify-center gap-3">
      {/* ALL Tab */}
      <button
        onClick={() => onTypeChange("ALL")}
        className={`px-3 py-3 text-base leading-5 tracking-[0.25px] uppercase transition-colors ${
          activeType === "ALL"
            ? "text-white font-bold border-b-2 border-white rounded-lg"
            : "text-[#BEC0C9] font-medium hover:text-white"
        }`}
      >
        ALL
      </button>

      {/* Divider */}
      <div className="w-[1px] h-[22px] bg-[#ADADAD]" />

      {/* VIDEO STORIES Tab */}
      <button
        onClick={() => onTypeChange("VIDEO")}
        className={`flex items-center gap-2 px-3 py-3 text-base leading-5 tracking-[0.25px] uppercase transition-colors ${
          activeType === "VIDEO"
            ? "text-white font-bold border-b-2 border-white rounded-lg"
            : "text-[#BEC0C9] font-medium hover:text-white"
        }`}
      >
        <FilmIcon />
        <span>VIDEO STORIES</span>
      </button>

      {/* Divider */}
      <div className="w-[1px] h-[22px] bg-[#ADADAD]" />

      {/* AUDIO STORIES Tab */}
      <button
        onClick={() => onTypeChange("AUDIO")}
        className={`flex items-center gap-2 px-3 py-3 text-base leading-5 tracking-[0.25px] uppercase transition-colors ${
          activeType === "AUDIO"
            ? "text-white font-bold border-b-2 border-white rounded-lg"
            : "text-[#BEC0C9] font-medium hover:text-white"
        }`}
      >
        <AudioIcon />
        <span>AUDIO STORIES</span>
      </button>
    </nav>
  );
}
