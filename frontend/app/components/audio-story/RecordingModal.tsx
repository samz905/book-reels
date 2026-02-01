"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface RecordingModalProps {
  isOpen: boolean;
  isRecording: boolean;
  onStart: () => void;
  onStop: () => void;
  onClose: () => void;
}

export default function RecordingModal({
  isOpen,
  isRecording,
  onStart,
  onStop,
  onClose,
}: RecordingModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F0E13]">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-white/60 hover:text-white transition-colors"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
        </svg>
      </button>

      {/* Content */}
      <div className="flex flex-col items-center gap-8">
        {isRecording ? (
          <>
            {/* Sound wave animation with Recording text */}
            <div className="flex items-center gap-3">
              {/* Sound wave bars */}
              <div className="flex items-center gap-[3px] h-6">
                {[0.5, 0.8, 1, 0.8, 0.5].map((scale, i) => (
                  <div
                    key={i}
                    className="w-[3px] bg-white rounded-full"
                    style={{
                      height: `${scale * 24}px`,
                      animation: "soundWave 0.5s ease-in-out infinite",
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>
              {/* Recording text */}
              <span className="text-white text-lg font-medium">Recording</span>
            </div>

            {/* Stop button */}
            <button
              onClick={onStop}
              className="absolute bottom-8 right-8 text-white/70 text-sm font-medium hover:text-white transition-colors"
            >
              Stop
            </button>

            {/* CSS for sound wave animation */}
            <style jsx>{`
              @keyframes soundWave {
                0%, 100% { transform: scaleY(0.5); }
                50% { transform: scaleY(1); }
              }
            `}</style>
          </>
        ) : (
          <>
            {/* Start Recording button */}
            <button
              onClick={onStart}
              className="flex items-center gap-3 px-8 py-4 rounded-full font-semibold text-white border-2 border-[#B8B6FC] bg-transparent hover:bg-[#B8B6FC]/10 transition-colors"
            >
              <svg
                width="24"
                height="24"
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
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
