"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import { PublicStory, formatViewCount } from "@/app/data/mockPublicCreators";
import EpisodeList from "../creator/EpisodeList";
import ShareButton from "../shared/ShareButton";

interface PublicStoryCardProps {
  story: PublicStory;
}

export default function PublicStoryCard({ story }: PublicStoryCardProps) {
  const [showEpisodes, setShowEpisodes] = useState(false);

  // Horizontal scroll state for ebooks
  const ebooksScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Handle wheel - vertical to horizontal scroll with non-passive listener
  useEffect(() => {
    const el = ebooksScrollRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  // Check scroll position for arrow states
  const checkScrollPosition = useCallback(() => {
    const el = ebooksScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  // Update scroll position on scroll
  useEffect(() => {
    const el = ebooksScrollRef.current;
    if (!el) return;

    el.addEventListener("scroll", checkScrollPosition);
    checkScrollPosition(); // Initial check
    return () => el.removeEventListener("scroll", checkScrollPosition);
  }, [checkScrollPosition]);

  // Navigation handlers
  const scrollLeftHandler = () => {
    if (!ebooksScrollRef.current) return;
    ebooksScrollRef.current.scrollBy({ left: -380, behavior: "smooth" });
  };

  const scrollRightHandler = () => {
    if (!ebooksScrollRef.current) return;
    ebooksScrollRef.current.scrollBy({ left: 380, behavior: "smooth" });
  };

  // Calculate free episode count (first 4 are free per design)
  const freeCount = 4;

  return (
    <div
      className="rounded-xl p-6"
      style={{
        background:
          "linear-gradient(180deg, rgba(115, 112, 255, 0) 4.21%, rgba(115, 112, 255, 0.3) 100%), #0F0E13",
      }}
    >
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
          {/* Title row with share button */}
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-white text-2xl font-bold">{story.title}</h3>
            <ShareButton />
          </div>

          {/* Tags row: Episodes | Free episodes */}
          <div className="flex items-center gap-2 mb-4">
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
              {story.genre.map((g, index) => (
                <span key={g}>
                  <span className="text-[#ADADAD] text-sm font-semibold uppercase tracking-tight">
                    {g}
                  </span>
                  {index < story.genre.length - 1 && (
                    <span className="text-[#ADADAD] ml-2.5">|</span>
                  )}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M5.85 8.98333L8.91667 6.95C9.01667 6.88333 9.06667 6.78889 9.06667 6.66667C9.06667 6.54444 9.01667 6.45 8.91667 6.38333L5.85 4.35C5.73889 4.27222 5.625 4.26389 5.50833 4.325C5.39167 4.38611 5.33333 4.48333 5.33333 4.61667V8.71667C5.33333 8.85 5.39167 8.94722 5.50833 9.00833C5.625 9.06944 5.73889 9.06111 5.85 8.98333ZM6.66667 13.3333C5.74444 13.3333 4.87778 13.1583 4.06667 12.8083C3.25556 12.4583 2.55 11.9833 1.95 11.3833C1.35 10.7833 0.875 10.0778 0.525 9.26667C0.175 8.45555 0 7.58889 0 6.66667C0 6.31111 0.0277778 5.95556 0.0833333 5.6C0.138889 5.24444 0.222222 4.89444 0.333333 4.55C0.388889 4.37222 0.502778 4.25278 0.675 4.19167C0.847222 4.13056 1.01111 4.14444 1.16667 4.23333C1.33333 4.32222 1.45278 4.45278 1.525 4.625C1.59722 4.79722 1.60556 4.97778 1.55 5.16667C1.48333 5.41111 1.43056 5.65833 1.39167 5.90833C1.35278 6.15833 1.33333 6.41111 1.33333 6.66667C1.33333 8.15555 1.85 9.41667 2.88333 10.45C3.91667 11.4833 5.17778 12 6.66667 12C8.15555 12 9.41667 11.4833 10.45 10.45C11.4833 9.41667 12 8.15555 12 6.66667C12 5.17778 11.4833 3.91667 10.45 2.88333C9.41667 1.85 8.15555 1.33333 6.66667 1.33333C6.4 1.33333 6.13611 1.35278 5.875 1.39167C5.61389 1.43056 5.35556 1.48889 5.1 1.56667C4.91111 1.62222 4.73333 1.61667 4.56667 1.55C4.4 1.48333 4.27778 1.36667 4.2 1.2C4.12222 1.03333 4.11944 0.863889 4.19167 0.691667C4.26389 0.519444 4.38889 0.405556 4.56667 0.35C4.9 0.227778 5.24444 0.138889 5.6 0.0833333C5.95556 0.0277778 6.31111 0 6.66667 0C7.58889 0 8.45555 0.175 9.26667 0.525C10.0778 0.875 10.7833 1.35 11.3833 1.95C11.9833 2.55 12.4583 3.25556 12.8083 4.06667C13.1583 4.87778 13.3333 5.74444 13.3333 6.66667C13.3333 7.58889 13.1583 8.45555 12.8083 9.26667C12.4583 10.0778 11.9833 10.7833 11.3833 11.3833C10.7833 11.9833 10.0778 12.4583 9.26667 12.8083C8.45555 13.1583 7.58889 13.3333 6.66667 13.3333ZM2.33333 3.33333C2.05556 3.33333 1.81944 3.23611 1.625 3.04167C1.43056 2.84722 1.33333 2.61111 1.33333 2.33333C1.33333 2.05556 1.43056 1.81944 1.625 1.625C1.81944 1.43056 2.05556 1.33333 2.33333 1.33333C2.61111 1.33333 2.84722 1.43056 3.04167 1.625C3.23611 1.81944 3.33333 2.05556 3.33333 2.33333C3.33333 2.61111 3.23611 2.84722 3.04167 3.04167C2.84722 3.23611 2.61111 3.33333 2.33333 3.33333ZM2.66667 6.66667C2.66667 5.55556 3.05556 4.61111 3.83333 3.83333C4.61111 3.05556 5.55556 2.66667 6.66667 2.66667C7.77778 2.66667 8.72222 3.05556 9.5 3.83333C10.2778 4.61111 10.6667 5.55556 10.6667 6.66667C10.6667 7.77778 10.2778 8.72222 9.5 9.5C8.72222 10.2778 7.77778 10.6667 6.66667 10.6667C5.55556 10.6667 4.61111 10.2778 3.83333 9.5C3.05556 8.72222 2.66667 7.77778 2.66667 6.66667Z"
                  fill="#ADADAD"
                />
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
      {story.ebooks && story.ebooks.length > 0 && (
        <>
          <div className="border-t border-[#2C2C43] my-6" />

          {/* Dive deeper section */}
          <div>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h4 className="text-white text-xl font-semibold mb-2">
                  Dive deeper into the story
                </h4>
                <p className="text-[#ADADAD] text-sm tracking-tight">Ebooks</p>
              </div>
              {/* Navigation arrows */}
              <div className="flex items-center gap-4">
                <button
                  onClick={scrollLeftHandler}
                  className={`transition-colors ${
                    canScrollLeft ? "text-white" : "text-[#ADADAD]"
                  }`}
                  disabled={!canScrollLeft}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                  </svg>
                </button>
                <button
                  onClick={scrollRightHandler}
                  className={`transition-colors ${
                    canScrollRight ? "text-white" : "text-[#ADADAD]"
                  }`}
                  disabled={!canScrollRight}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Horizontally scrollable ebooks container */}
            <div
              ref={ebooksScrollRef}
              className="overflow-x-auto scrollbar-hide"
              style={{ scrollBehavior: "smooth" }}
            >
              <div className="flex gap-6 min-w-max">
                {story.ebooks.map((ebook, index) => (
                  <div key={ebook.id} className="flex items-stretch">
                    {/* Ebook card - 354px wide with 322px content area */}
                    <div className="w-[354px] flex gap-3">
                      {/* Cover with price + buy below */}
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
                        {/* Price + Buy row below cover */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#FF8C00] text-sm font-semibold">
                            ${ebook.price.toFixed(2)}
                          </span>
                          <span className="text-[#ADADAD]">|</span>
                          <button className="text-green-3 text-sm font-bold hover:opacity-80 transition-opacity">
                            Buy
                          </button>
                        </div>
                      </div>

                      {/* Info - 12px gap from cover, remaining width */}
                      <div className="flex flex-col flex-1 min-w-0">
                        <h5 className="text-white text-sm font-semibold line-clamp-2">
                          {ebook.title}
                        </h5>
                        <p className="text-[#C5C5C5] text-sm leading-[19px] tracking-tight line-clamp-8 flex-1">
                          {ebook.description}
                        </p>
                      </div>
                    </div>

                    {/* Vertical divider (except last) - 24px gap includes the divider */}
                    {index < story.ebooks.length - 1 && (
                      <div className="w-px bg-[#272727] ml-6 self-stretch" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
