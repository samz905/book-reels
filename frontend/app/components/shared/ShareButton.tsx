"use client";

import { useState, useRef, useCallback } from "react";

interface ShareButtonProps {
  url?: string;
  title?: string;
  className?: string;
  iconOnly?: boolean;
  size?: "sm" | "md";
  disabled?: boolean;
}

export default function ShareButton({
  url,
  title,
  className = "",
  iconOnly = false,
  size = "md",
  disabled = false,
}: ShareButtonProps) {
  const [showCopied, setShowCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleShare = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;

    const shareUrl = url || window.location.href;
    const shareTitle = title || document.title;

    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, url: shareUrl });
      } catch {
        // User cancelled or share failed
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        if (timerRef.current) clearTimeout(timerRef.current);
        setShowCopied(true);
        timerRef.current = setTimeout(() => setShowCopied(false), 2000);
      } catch {
        // Clipboard not available
      }
    }
  }, [url, title, disabled]);

  const iconSize = size === "sm" ? 16 : 20;

  return (
    <button
      onClick={handleShare}
      disabled={disabled}
      className={`relative flex items-center gap-2 text-white/70 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
      {!iconOnly && <span className="text-sm font-medium">Share</span>}

      {/* Copied tooltip */}
      {showCopied && (
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 text-xs text-white bg-black/80 rounded whitespace-nowrap pointer-events-none">
          Copied!
        </span>
      )}
    </button>
  );
}
