"use client";

import { useState } from "react";

interface AudioPlayerProps {
  audioUrl: string | null;
  duration?: string;
}

export default function AudioPlayer({ audioUrl, duration = "1:28" }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState("0:00");
  const [progress, setProgress] = useState(0);

  const handlePlayPause = () => {
    if (!audioUrl) return;
    setIsPlaying(!isPlaying);
    // In a real implementation, this would control actual audio playback
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioUrl) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    setProgress(Math.max(0, Math.min(100, percentage)));
    // Calculate time based on percentage
    const totalSeconds = 88; // 1:28 = 88 seconds
    const currentSeconds = Math.floor((percentage / 100) * totalSeconds);
    const mins = Math.floor(currentSeconds / 60);
    const secs = currentSeconds % 60;
    setCurrentTime(`${mins}:${secs.toString().padStart(2, "0")}`);
  };

  return (
    <div className="flex items-center gap-4 w-full">
      {/* Play/Pause button */}
      <button
        onClick={handlePlayPause}
        disabled={!audioUrl}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
          audioUrl
            ? "bg-white hover:bg-white/90"
            : "bg-[#4A4A4A] cursor-not-allowed"
        }`}
      >
        {isPlaying ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#0F0E13">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#0F0E13">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Progress bar */}
      <div className="flex-1 flex items-center gap-3">
        {/* Seekable progress bar */}
        <div
          onClick={handleSeek}
          className="flex-1 h-1 bg-[#4A4A4A] rounded-full cursor-pointer relative group"
        >
          {/* Progress fill */}
          <div
            className="absolute left-0 top-0 h-full bg-white rounded-full"
            style={{ width: `${progress}%` }}
          />
          {/* Seek handle */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `${progress}%`, transform: "translate(-50%, -50%)" }}
          />
        </div>

        {/* Time display */}
        <span className="text-white/60 text-sm whitespace-nowrap">
          {currentTime} / {duration}
        </span>
      </div>
    </div>
  );
}
