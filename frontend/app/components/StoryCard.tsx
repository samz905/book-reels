"use client";

import { useState } from "react";
import Image from "next/image";
import type { Story } from "../data/mockStories";

interface StoryCardProps {
  story: Story;
}

export default function StoryCard({ story }: StoryCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <article
      className="cursor-pointer w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative aspect-[205/290] rounded-card overflow-hidden mb-2">
        <Image
          src={story.coverImage}
          alt={story.title}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 205px"
        />

        {/* Hover overlay with play button */}
        <div
          className="absolute inset-0 flex items-center justify-center transition-opacity duration-200"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            opacity: isHovered ? 1 : 0,
          }}
        >
          <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="text-dark"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        {story.viewCount && (
          <span className="absolute top-2 right-2 bg-orange text-white text-xs font-semibold px-2 py-1 rounded">
            {story.viewCount}
          </span>
        )}

        {story.episodeCount && !story.viewCount && (
          <span className="absolute top-2 right-2 bg-accent text-dark text-xs font-semibold px-2 py-1 rounded">
            {story.episodeCount}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-foreground font-bold text-base leading-5 truncate">
            {story.title}
          </h3>
          <p className="text-white/70 text-base leading-5 line-clamp-2">
            {story.description}
          </p>
        </div>

        <div className="flex items-center gap-[5px]">
          <Image
            src={story.creatorAvatar}
            alt={story.creatorName}
            width={24}
            height={24}
            className="rounded-full"
          />
          <span className="text-white font-semibold text-sm leading-[18px]">
            {story.creatorName}
          </span>
        </div>
      </div>
    </article>
  );
}
