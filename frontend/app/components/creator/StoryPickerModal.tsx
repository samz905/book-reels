"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";

interface StoryOption {
  id: string;
  title: string;
  cover: string;
  episodeCount: number;
}

interface StoryPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (storyId: string) => void;
  stories: StoryOption[];
  title?: string;
  description?: string;
}

export default function StoryPickerModal({
  isOpen,
  onClose,
  onSelect,
  stories,
  title = "Choose a Story",
  description = "Which story should this episode belong to?",
}: StoryPickerModalProps) {
  const [mounted, setMounted] = useState(false);

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

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/95" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-[#0F0E13] border border-[#1A1E2F] rounded-3xl p-6 w-full max-w-[480px] mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-white text-xl font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full border border-[#ADADAD] flex items-center justify-center hover:border-white transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ADADAD" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <p className="text-[#ADADAD] text-sm mb-5">{description}</p>

        {/* Story list */}
        <div className="overflow-y-auto flex-1 space-y-2">
          {stories.length === 0 ? (
            <p className="text-[#ADADAD] text-sm text-center py-8">
              No stories yet. Create a story first.
            </p>
          ) : (
            stories.map((story) => (
              <button
                key={story.id}
                onClick={() => onSelect(story.id)}
                className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-[#1A1E2F] transition-colors text-left group"
              >
                {/* Cover thumbnail */}
                <div className="w-[48px] h-[68px] rounded-lg overflow-hidden border border-[#262626] flex-shrink-0 bg-[#262626]">
                  {story.cover ? (
                    <Image
                      src={story.cover}
                      alt={story.title}
                      width={48}
                      height={68}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#ADADAD]">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Story info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-white text-sm font-semibold truncate group-hover:text-[#B8B6FC] transition-colors">
                    {story.title}
                  </h3>
                  <p className="text-[#ADADAD] text-xs mt-1">
                    {story.episodeCount} episode{story.episodeCount !== 1 ? "s" : ""}
                  </p>
                </div>

                {/* Arrow */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#ADADAD" className="flex-shrink-0 group-hover:fill-[#B8B6FC] transition-colors">
                  <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
                </svg>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
