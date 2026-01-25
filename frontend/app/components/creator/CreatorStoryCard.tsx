"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { Story, formatViewCount } from "@/app/data/mockCreatorData";
import EpisodeList from "./EpisodeList";

interface Ebook {
  id: string;
  title: string;
  description: string;
  cover: string;
  price: number;
}

interface CreatorStoryCardProps {
  story: Story;
  onUpdateStory: (story: Story) => void;
}

// Mock ebooks for "Dive deeper" section
const mockEbooks: Ebook[] = [
  {
    id: "ebook-1",
    title: "The Wolf Prince's Mate (The Royals Of Presley Acres)",
    description:
      "Hello, my name is James, and I work as a UI/UX designer. I create user-friendly and visually appealing interfaces that improve user experience and help websites and apps convert visitors into real customers, increasing engagement, trust, and overall business revenue.",
    cover: "https://picsum.photos/seed/ebook1/100/160",
    price: 4.99,
  },
  {
    id: "ebook-2",
    title: "The Wolf Prince's Mate (The Royals Of Presley Acres)",
    description:
      "Hello, my name is James, and I work as a UI/UX designer. I create user-friendly and visually appealing interfaces that improve user experience and help websites and apps convert visitors into real customers, increasing engagement, trust, and overall business revenue.",
    cover: "https://picsum.photos/seed/ebook2/100/160",
    price: 4.99,
  },
  {
    id: "ebook-3",
    title: "The Wolf Prince's Mate (The Royals Of Presley Acres)",
    description:
      "Hello, my name is James, and I work as a UI/UX designer. I create user-friendly and visually appealing interfaces that improve user experience and help websites and apps convert visitors into real customers, increasing engagement, trust, and overall business revenue.",
    cover: "https://picsum.photos/seed/ebook3/100/160",
    price: 4.99,
  },
  {
    id: "ebook-4",
    title: "The Wolf Prince's Mate (The Royals Of Presley Acres)",
    description:
      "Hello, my name is James, and I work as a UI/UX designer. I create user-friendly and visually appealing interfaces that improve user experience and help websites and apps convert visitors into real customers, increasing engagement, trust, and overall business revenue.",
    cover: "https://picsum.photos/seed/ebook4/100/160",
    price: 4.99,
  },
];

export default function CreatorStoryCard({
  story,
  onUpdateStory,
}: CreatorStoryCardProps) {
  const [showEpisodes, setShowEpisodes] = useState(false);

  // Horizontal scroll state for ebooks
  const ebooksScrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Handle mouse down - start drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!ebooksScrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - ebooksScrollRef.current.offsetLeft);
    setScrollLeft(ebooksScrollRef.current.scrollLeft);
  }, []);

  // Handle mouse move - drag scroll
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !ebooksScrollRef.current) return;
      e.preventDefault();
      const x = e.pageX - ebooksScrollRef.current.offsetLeft;
      const walk = (x - startX) * 1.5;
      ebooksScrollRef.current.scrollLeft = scrollLeft - walk;
    },
    [isDragging, startX, scrollLeft]
  );

  // Handle mouse up/leave - stop drag
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle wheel - vertical to horizontal scroll
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!ebooksScrollRef.current) return;
    e.preventDefault();
    ebooksScrollRef.current.scrollLeft += e.deltaY;
  }, []);

  // Calculate free episode count (first 4 are free per design)
  const freeCount = 4;

  return (
    <div className="bg-[#0F0E13] rounded-xl p-6">
      {/* Header row: Stories + navigation arrows + edit button */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white text-2xl font-bold">Stories</h2>
        <div className="flex items-center gap-4">
          {/* Navigation arrows */}
          <div className="flex items-center gap-4">
            <button className="text-[#ADADAD] hover:text-white transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
              </svg>
            </button>
            <button className="text-[#ADADAD] hover:text-white transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
              </svg>
            </button>
          </div>
          {/* Edit button */}
          <button className="w-9 h-9 bg-[#3E3D40] rounded-full flex items-center justify-center hover:bg-[#4E4D50] transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#E8EAED">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Cover image - 205x290 per spec */}
        <div className="w-[205px] h-[290px] rounded-xl overflow-hidden border border-[#262626] flex-shrink-0">
          <Image
            src={story.cover}
            alt={story.title}
            width={205}
            height={290}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Story info */}
        <div className="flex-1 min-w-0">
          {/* Title - 24px bold */}
          <h3 className="text-white text-2xl font-bold mb-3">{story.title}</h3>

          {/* Tags row: Type | Episodes | Free episodes */}
          <div className="flex items-center gap-2 mb-4">
            {/* Story type with icon */}
            <div className="flex items-center gap-1">
              {story.type === "audio" ? (
                <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
                  <path d="M2.66667 10V3.33333C2.66667 3.14444 2.73056 2.98611 2.85833 2.85833C2.98611 2.73056 3.14444 2.66667 3.33333 2.66667C3.52222 2.66667 3.68056 2.73056 3.80833 2.85833C3.93611 2.98611 4 3.14444 4 3.33333V10C4 10.1889 3.93611 10.3472 3.80833 10.475C3.68056 10.6028 3.52222 10.6667 3.33333 10.6667C3.14444 10.6667 2.98611 10.6028 2.85833 10.475C2.73056 10.3472 2.66667 10.1889 2.66667 10ZM5.33333 12.6667V0.666667C5.33333 0.477778 5.39722 0.319444 5.525 0.191667C5.65278 0.0638889 5.81111 0 6 0C6.18889 0 6.34722 0.0638889 6.475 0.191667C6.60278 0.319444 6.66667 0.477778 6.66667 0.666667V12.6667C6.66667 12.8556 6.60278 13.0139 6.475 13.1417C6.34722 13.2694 6.18889 13.3333 6 13.3333C5.81111 13.3333 5.65278 13.2694 5.525 13.1417C5.39722 13.0139 5.33333 12.8556 5.33333 12.6667ZM0 7.33333V6C0 5.81111 0.0638889 5.65278 0.191667 5.525C0.319444 5.39722 0.477778 5.33333 0.666667 5.33333C0.855556 5.33333 1.01389 5.39722 1.14167 5.525C1.26944 5.65278 1.33333 5.81111 1.33333 6V7.33333C1.33333 7.52222 1.26944 7.68055 1.14167 7.80833C1.01389 7.93611 0.855556 8 0.666667 8C0.477778 8 0.319444 7.93611 0.191667 7.80833C0.0638889 7.68055 0 7.52222 0 7.33333ZM8 10V3.33333C8 3.14444 8.06389 2.98611 8.19167 2.85833C8.31944 2.73056 8.47778 2.66667 8.66667 2.66667C8.85556 2.66667 9.01389 2.73056 9.14167 2.85833C9.26944 2.98611 9.33333 3.14444 9.33333 3.33333V10C9.33333 10.1889 9.26944 10.3472 9.14167 10.475C9.01389 10.6028 8.85556 10.6667 8.66667 10.6667C8.47778 10.6667 8.31944 10.6028 8.19167 10.475C8.06389 10.3472 8 10.1889 8 10ZM10.6667 7.33333V6C10.6667 5.81111 10.7306 5.65278 10.8583 5.525C10.9861 5.39722 11.1444 5.33333 11.3333 5.33333C11.5222 5.33333 11.6806 5.39722 11.8083 5.525C11.9361 5.65278 12 5.81111 12 6V7.33333C12 7.52222 11.9361 7.68055 11.8083 7.80833C11.6806 7.93611 11.5222 8 11.3333 8C11.1444 8 10.9861 7.93611 10.8583 7.80833C10.7306 7.68055 10.6667 7.52222 10.6667 7.33333Z" fill="#ADADAD"/>
                </svg>
              ) : (
                <svg width="10" height="13" viewBox="0 0 10 13" fill="none">
                  <path fillRule="evenodd" clipRule="evenodd" d="M0 0.000227131V12.8H0.872727V12.0654H1.7446V12.8H2.61818V11.1433L6.98096 11.0769V12.7999H7.85369V12.0653H8.72642V12.7999H9.6V0.000170348H8.72642V0.735789H7.85369V0.000170348H6.98096V1.71745L2.61818 1.72307V0H1.7446V0.735619H0.872727V0L0 0.000227131ZM1.74545 2.2156V3.19351L0.873578 3.19908V2.22122L1.74545 2.2156ZM7.85455 2.2156L8.72727 2.22117V3.19902L7.85455 3.19346V2.2156ZM6.98182 3.68866V9.1039L2.61818 9.11134V3.6961L6.98182 3.68866ZM1.74545 4.67906V5.65691L0.873578 5.66248V4.68462L1.74545 4.67906ZM7.85455 4.67906L8.72727 4.68462V5.66248L7.85455 5.65691V4.67906ZM1.74545 7.14053V8.11838L0.873578 8.12395V7.14615L1.74545 7.14053ZM7.85455 7.14053L8.72727 7.14615V8.12395L7.85455 8.11838V7.14053ZM0.873578 9.602L1.74545 9.60762V10.5855L0.873578 10.5799V9.602ZM8.72727 9.602V10.5799L7.85455 10.5855V9.60762L8.72727 9.602Z" fill="#ADADAD"/>
                </svg>
              )}
              <span className="text-[#ADADAD] text-sm tracking-tight">
                {story.type === "audio" ? "Audio Story" : "Video Story"}
              </span>
            </div>

            <span className="text-[#ADADAD]">|</span>

            {/* Episodes count with icon */}
            <div className="flex items-center gap-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="#ADADAD" />
                <path d="M10 8.5L15 12L10 15.5V8.5Z" fill="#000" />
              </svg>
              <span className="text-[#ADADAD] text-sm tracking-tight">
                {story.episodeCount} Episodes
              </span>
            </div>

            <span className="text-[#ADADAD]">|</span>

            {/* Free episodes */}
            <span className="text-[#ADADAD] text-sm tracking-tight">
              Episode 1-{freeCount} Free
            </span>
          </div>

          {/* Description - 14px */}
          <p className="text-white text-sm leading-[19px] tracking-tight mb-4 line-clamp-5">
            {story.description}
          </p>

          {/* Genre + Plays row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <span className="text-[#ADADAD] text-sm font-semibold uppercase tracking-tight">
                Genre
              </span>
              <span className="text-[#ADADAD]">|</span>
              <span className="text-[#ADADAD] text-sm font-semibold uppercase tracking-tight">
                Genre
              </span>
            </div>
            <div className="flex items-center gap-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#ADADAD">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              <span className="text-[#ADADAD] text-sm tracking-tight">
                {formatViewCount(story.viewCount)} Plays
              </span>
            </div>
          </div>

          {/* Show Episodes toggle - green, 22px bold */}
          <button
            onClick={() => setShowEpisodes(!showEpisodes)}
            className="flex items-center gap-2 text-[#1ED760] text-[22px] font-bold hover:opacity-80 transition-opacity"
          >
            Show Episodes
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="#1ED760"
              className={`transition-transform ${showEpisodes ? "rotate-180" : ""}`}
            >
              <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
            </svg>
          </button>

          {/* Episode list (collapsible) */}
          {showEpisodes && (
            <EpisodeList episodes={story.episodes} freeCount={freeCount} />
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-[#2C2C43] my-6" />

      {/* Dive deeper section */}
      <div>
        <div className="mb-6">
          <h4 className="text-white text-xl font-semibold mb-2">
            Dive deeper into the story
          </h4>
          <p className="text-[#ADADAD] text-sm tracking-tight">Ebooks</p>
        </div>

        {/* Horizontally scrollable ebooks container */}
        <div
          ref={ebooksScrollRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className="overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing"
          style={{ scrollBehavior: "smooth" }}
        >
          <div className="flex gap-6 min-w-max select-none">
            {mockEbooks.map((ebook, index) => (
              <div key={ebook.id} className="flex items-stretch">
                {/* Ebook card - 354px wide with 322px content area */}
                <div className="w-[354px] flex gap-3">
                  {/* Cover with price below */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <div className="w-[100px] h-[160px] rounded bg-card-bg-2">
                      <Image
                        src={ebook.cover}
                        alt={ebook.title}
                        width={100}
                        height={160}
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                    {/* Price below cover */}
                    <span className="text-[#FF8C00] text-sm font-semibold">
                      $ {ebook.price.toFixed(2)}
                    </span>
                  </div>

                  {/* Info - 12px gap from cover, remaining width */}
                  <div className="flex flex-col flex-1 min-w-0">
                    <h5 className="text-white text-sm font-semibold line-clamp-2">
                      {ebook.title}
                    </h5>
                    <p className="text-[#C5C5C5] text-sm leading-[19px] tracking-tight line-clamp-7 flex-1">
                      {ebook.description}
                    </p>
                    {/* Edit button at bottom-right of text area */}
                    <div className="flex justify-end mt-auto">
                      <button className="w-9 h-9 bg-[#3E3D40] rounded-full flex items-center justify-center hover:bg-[#4E4D50] transition-colors">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#E8EAED">
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Vertical divider (except last) - 24px gap includes the divider */}
                {index < mockEbooks.length - 1 && (
                  <div className="w-px bg-[#272727] ml-6 self-stretch" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
