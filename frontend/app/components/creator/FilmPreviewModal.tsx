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
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleVideoEnded = useCallback(() => {
    if (!nextEpisodeTitle || !onNextEpisode) return;
    onNextEpisode();
  }, [nextEpisodeTitle, onNextEpisode]);

  // Close on escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/95" onClick={onClose} />

      {/* Content */}
      <div className="relative flex flex-col items-center max-h-[95vh] px-4 sm:px-0">
        {/* Close button */}
        <button
          onClick={onClose}
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
        </div>

        {/* Next Episode button (below video, always visible when there's a next ep) */}
        {nextEpisodeTitle && onNextEpisode && (
          <button
            onClick={onNextEpisode}
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
