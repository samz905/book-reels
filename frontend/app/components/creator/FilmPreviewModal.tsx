"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import ShareButton from "../shared/ShareButton";

interface FilmPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl?: string;
  clipUrls?: string[];
  title?: string;
  nextEpisodeTitle?: string;
  onNextEpisode?: () => void;
  shareUrl?: string;
}

export default function FilmPreviewModal({
  isOpen,
  onClose,
  videoUrl,
  clipUrls,
  title,
  nextEpisodeTitle,
  onNextEpisode,
  shareUrl,
}: FilmPreviewModalProps) {
  const [mounted, setMounted] = useState(false);
  const [currentClipIndex, setCurrentClipIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Sequential mode: play clips one after another
  const isSequential = !!(clipUrls && clipUrls.length > 0);
  const currentUrl = isSequential ? clipUrls[currentClipIndex] : videoUrl;
  const nextClipUrl =
    isSequential && currentClipIndex < clipUrls.length - 1
      ? clipUrls[currentClipIndex + 1]
      : null;

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Reset clip index when modal opens; lock body scroll
  useEffect(() => {
    if (isOpen) {
      setCurrentClipIndex(0);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleVideoEnded = useCallback(() => {
    if (isSequential && clipUrls) {
      if (currentClipIndex < clipUrls.length - 1) {
        setCurrentClipIndex((prev) => prev + 1);
      }
      // Last clip: just stop
      return;
    }
    // Single video mode: original behavior
    if (nextEpisodeTitle && onNextEpisode) {
      onNextEpisode();
    }
  }, [isSequential, clipUrls, currentClipIndex, nextEpisodeTitle, onNextEpisode]);

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

        {/* Title + scene counter */}
        <div className="mb-3 text-center">
          {title && (
            <p className="text-white text-sm font-medium">{title}</p>
          )}
          {isSequential && clipUrls && (
            <p className="text-white/40 text-xs mt-0.5">
              Scene {currentClipIndex + 1} of {clipUrls.length}
            </p>
          )}
        </div>

        {/* Video player - portrait */}
        <div className="relative w-full max-w-[360px] aspect-[9/16] bg-black rounded-2xl overflow-hidden">
          <video
            ref={videoRef}
            key={currentUrl}
            src={currentUrl}
            controls
            autoPlay
            playsInline
            className="w-full h-full object-contain"
            onEnded={handleVideoEnded}
          />
          {/* Hidden preload for next clip — browser caches the video for instant transition */}
          {nextClipUrl && (
            <video
              key={`preload-${nextClipUrl}`}
              src={nextClipUrl}
              preload="auto"
              muted
              className="hidden"
            />
          )}
        </div>

        {/* Scene navigation (sequential mode) */}
        {isSequential && clipUrls && clipUrls.length > 1 && (
          <div className="flex items-center gap-4 mt-3">
            <button
              onClick={() => setCurrentClipIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentClipIndex === 0}
              className="text-white/50 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              title="Previous scene"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>
            <span className="text-white/40 text-xs tabular-nums">
              {currentClipIndex + 1} / {clipUrls.length}
            </span>
            <button
              onClick={() => setCurrentClipIndex((prev) => Math.min(clipUrls.length - 1, prev + 1))}
              disabled={currentClipIndex === clipUrls.length - 1}
              className="text-white/50 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              title="Next scene"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
            </button>
          </div>
        )}

        {/* Actions below video */}
        <div className="mt-3 flex items-center gap-4">
          {shareUrl && (
            <ShareButton url={shareUrl} title={title} iconOnly size="sm" />
          )}
          {nextEpisodeTitle && onNextEpisode && (
            <button
              onClick={onNextEpisode}
              className="flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
              Next: {nextEpisodeTitle}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
