"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
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

        {/* Audio/Video type badge - bottom left */}
        {story.storyType && (
          <span className="absolute bottom-2 left-2 bg-black/70 text-white text-xs font-medium px-2 py-1 rounded flex items-center gap-1">
            {story.storyType === "AUDIO" ? (
              <svg width="10" height="12" viewBox="0 0 12 14" fill="none">
                <path
                  d="M2.66667 10V3.33333C2.66667 3.14444 2.73056 2.98611 2.85833 2.85833C2.98611 2.73056 3.14444 2.66667 3.33333 2.66667C3.52222 2.66667 3.68056 2.73056 3.80833 2.85833C3.93611 2.98611 4 3.14444 4 3.33333V10C4 10.1889 3.93611 10.3472 3.80833 10.475C3.68056 10.6028 3.52222 10.6667 3.33333 10.6667C3.14444 10.6667 2.98611 10.6028 2.85833 10.475C2.73056 10.3472 2.66667 10.1889 2.66667 10ZM5.33333 12.6667V0.666667C5.33333 0.477778 5.39722 0.319444 5.525 0.191667C5.65278 0.0638889 5.81111 0 6 0C6.18889 0 6.34722 0.0638889 6.475 0.191667C6.60278 0.319444 6.66667 0.477778 6.66667 0.666667V12.6667C6.66667 12.8556 6.60278 13.0139 6.475 13.1417C6.34722 13.2694 6.18889 13.3333 6 13.3333C5.81111 13.3333 5.65278 13.2694 5.525 13.1417C5.39722 13.0139 5.33333 12.8556 5.33333 12.6667ZM0 7.33333V6C0 5.81111 0.0638889 5.65278 0.191667 5.525C0.319444 5.39722 0.477778 5.33333 0.666667 5.33333C0.855556 5.33333 1.01389 5.39722 1.14167 5.525C1.26944 5.65278 1.33333 5.81111 1.33333 6V7.33333C1.33333 7.52222 1.26944 7.68055 1.14167 7.80833C1.01389 7.93611 0.855556 8 0.666667 8C0.477778 8 0.319444 7.93611 0.191667 7.80833C0.0638889 7.68055 0 7.52222 0 7.33333ZM8 10V3.33333C8 3.14444 8.06389 2.98611 8.19167 2.85833C8.31944 2.73056 8.47778 2.66667 8.66667 2.66667C8.85556 2.66667 9.01389 2.73056 9.14167 2.85833C9.26944 2.98611 9.33333 3.14444 9.33333 3.33333V10C9.33333 10.1889 9.26944 10.3472 9.14167 10.475C9.01389 10.6028 8.85556 10.6667 8.66667 10.6667C8.47778 10.6667 8.31944 10.6028 8.19167 10.475C8.06389 10.3472 8 10.1889 8 10ZM10.6667 7.33333V6C10.6667 5.81111 10.7306 5.65278 10.8583 5.525C10.9861 5.39722 11.1444 5.33333 11.3333 5.33333C11.5222 5.33333 11.6806 5.39722 11.8083 5.525C11.9361 5.65278 12 5.81111 12 6V7.33333C12 7.52222 11.9361 7.68055 11.8083 7.80833C11.6806 7.93611 11.5222 8 11.3333 8C11.1444 8 10.9861 7.93611 10.8583 7.80833C10.7306 7.68055 10.6667 7.52222 10.6667 7.33333Z"
                  fill="currentColor"
                />
              </svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M0 0V10H0.68V9.43H1.36V10H2.04V8.71L5.44 8.66V10H6.12V9.43H6.8V10H7.48V0H6.8V0.57H6.12V0H5.44V1.34L2.04 1.34V0H1.36V0.57H0.68V0H0ZM1.36 1.73V2.49H0.68V1.73H1.36ZM6.12 1.73L6.8 1.73V2.49H6.12V1.73ZM5.44 2.88V7.1L2.04 7.11V2.89L5.44 2.88ZM1.36 3.65V4.41H0.68V3.65H1.36ZM6.12 3.65L6.8 3.65V4.41H6.12V3.65ZM1.36 5.57V6.33H0.68V5.57H1.36ZM6.12 5.57L6.8 5.57V6.33H6.12V5.57ZM0.68 7.49L1.36 7.49V8.25L0.68 8.25V7.49ZM6.8 7.49V8.25H6.12V7.49L6.8 7.49Z"
                  fill="currentColor"
                />
              </svg>
            )}
            {story.storyType === "AUDIO" ? "Audio" : "Video"}
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

        <Link
          href={`/creator/${story.creatorUsername}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-[5px] hover:opacity-80 transition-opacity"
        >
          <Image
            src={story.creatorAvatar}
            alt={story.creatorName}
            width={24}
            height={24}
            className="rounded-full"
          />
          <span className="text-white font-semibold text-sm leading-[18px] hover:text-purple transition-colors">
            {story.creatorName}
          </span>
        </Link>
      </div>
    </article>
  );
}
