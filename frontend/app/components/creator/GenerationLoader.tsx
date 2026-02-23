"use client";

import { useState, useEffect, useRef } from "react";

interface GenerationLoaderProps {
  total: number;
  completed: number;
  retrying: number;
  tips: string[];
  phase?: string;
}

export default function GenerationLoader({
  total,
  completed,
  retrying,
  tips,
  phase,
}: GenerationLoaderProps) {
  const [tipIndex, setTipIndex] = useState(0);
  const [tipVisible, setTipVisible] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Rotate tips every 6 seconds with fade transition
  useEffect(() => {
    if (tips.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setTipVisible(false);
      setTimeout(() => {
        setTipIndex((prev) => (prev + 1) % tips.length);
        setTipVisible(true);
      }, 400);
    }, 6000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [tips.length]);

  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 min-h-[400px]">
      {/* Pulsing spinner */}
      <div className="relative mb-8">
        <div className="w-20 h-20 rounded-full border-4 border-[#9C99FF]/20 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full border-4 border-transparent border-t-[#9C99FF] border-r-[#9C99FF] animate-spin absolute inset-0" />
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="relative z-10">
            <path
              d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z"
              fill="#9C99FF"
              fillOpacity="0.8"
            />
          </svg>
        </div>
      </div>

      {/* Phase text */}
      {phase && (
        <h2 className="text-white text-xl font-bold mb-3 text-center">{phase}</h2>
      )}

      {/* Progress counter + bar (hidden when total is 0, e.g. scene descriptions phase) */}
      {total > 0 && (
        <>
          <p className="text-[#ADADAD] text-sm mb-4">
            {completed} of {total} ready
          </p>
          <div className="w-full max-w-xs h-2 bg-white/10 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-gradient-to-r from-[#9C99FF] to-[#7370FF] rounded-full transition-all duration-700 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </>
      )}

      {/* Retry status */}
      {retrying > 0 && (
        <p className="text-amber-400/80 text-xs mb-6 flex items-center gap-1.5">
          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Retrying {retrying} {retrying === 1 ? "item" : "items"}...
        </p>
      )}

      {/* Rotating tip */}
      {tips.length > 0 && (
        <div className="max-w-md text-left min-h-[48px] flex items-center">
          <p
            className={`text-[#ADADAD]/70 text-sm italic transition-opacity duration-400 ${
              tipVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            {tips[tipIndex]}
          </p>
        </div>
      )}
    </div>
  );
}
