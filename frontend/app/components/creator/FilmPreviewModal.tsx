"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

interface FilmPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  title?: string;
  nextEpisodeTitle?: string;
  onNextEpisode?: () => void;
}

export default function FilmPreviewModal({
  isOpen,
  onClose,
  videoUrl,
  title,
  nextEpisodeTitle,
  onNextEpisode,
}: FilmPreviewModalProps) {
  const [mounted, setMounted] = useState(false);
  const [showUpNext, setShowUpNext] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const videoRef = useRef<HTMLVideoElement>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setShowUpNext(false);
      setCountdown(5);
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Clear countdown on unmount or when hidden
  useEffect(() => {
    if (!showUpNext && countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, [showUpNext]);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const handlePlayNext = useCallback(() => {
    setShowUpNext(false);
    setCountdown(5);
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    onNextEpisode?.();
  }, [onNextEpisode]);

  const handleVideoEnded = useCallback(() => {
    if (!nextEpisodeTitle || !onNextEpisode) return;
    setShowUpNext(true);
    setCountdown(5);

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          countdownRef.current = null;
          handlePlayNext();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [nextEpisodeTitle, onNextEpisode, handlePlayNext]);

  const cancelAutoPlay = useCallback(() => {
    setShowUpNext(false);
    setCountdown(5);
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  // Close on escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        cancelAutoPlay();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose, cancelAutoPlay]);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/95" onClick={() => { cancelAutoPlay(); onClose(); }} />

      {/* Content */}
      <div className="relative flex flex-col items-center max-h-[95vh] px-4 sm:px-0">
        {/* Close button */}
        <button
          onClick={() => { cancelAutoPlay(); onClose(); }}
          className="absolute -top-2 -right-2 z-10 w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Title */}
        {title && (
          <p className="text-white text-sm font-medium mb-3 text-center">{title}</p>
        )}

        {/* Video player - portrait */}
        <div className="relative w-full max-w-[360px] aspect-[9/16] bg-black rounded-2xl overflow-hidden">
          <video
            ref={videoRef}
            key={videoUrl}
            src={videoUrl}
            controls
            autoPlay
            playsInline
            className="w-full h-full object-contain"
            onEnded={handleVideoEnded}
          />

          {/* Up Next overlay */}
          {showUpNext && nextEpisodeTitle && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6">
              <p className="text-white/60 text-sm mb-2">Up Next</p>
              <p className="text-white text-lg font-bold text-center mb-4">
                {nextEpisodeTitle}
              </p>

              {/* Countdown ring */}
              <div className="relative w-16 h-16 mb-4">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle
                    cx="32" cy="32" r="28"
                    fill="none"
                    stroke="#333"
                    strokeWidth="3"
                  />
                  <circle
                    cx="32" cy="32" r="28"
                    fill="none"
                    stroke="#1ED760"
                    strokeWidth="3"
                    strokeDasharray={`${2 * Math.PI * 28}`}
                    strokeDashoffset={`${2 * Math.PI * 28 * (1 - countdown / 5)}`}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-linear"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-white text-xl font-bold">
                  {countdown}
                </span>
              </div>

              <button
                onClick={handlePlayNext}
                className="px-6 py-2.5 rounded-lg font-semibold text-black bg-[#1ED760] hover:bg-[#1ED760]/90 transition-colors mb-3"
              >
                Play Now
              </button>
              <button
                onClick={cancelAutoPlay}
                className="text-white/50 text-sm hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Next Episode button (below video, always visible when there's a next ep) */}
        {nextEpisodeTitle && onNextEpisode && !showUpNext && (
          <button
            onClick={handlePlayNext}
            className="mt-3 flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
            Next: {nextEpisodeTitle}
          </button>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
