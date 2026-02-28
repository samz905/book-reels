"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import { PublicStory } from "@/app/data/mockPublicCreators";
import EpisodeList from "../creator/EpisodeList";
import ShareButton from "../shared/ShareButton";

interface PublicStoryCardProps {
  story: PublicStory;
}

export default function PublicStoryCard({ story }: PublicStoryCardProps) {
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [expandedEbooks, setExpandedEbooks] = useState<Set<string>>(new Set());

  // Horizontal scroll state for ebooks
  const ebooksScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

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

  // Free episode count for display label
  const freeCount = 4;

  return (
    <div
      className="rounded-xl p-4 sm:p-6"
      style={{
        background:
          "linear-gradient(180deg, rgba(115, 112, 255, 0) 4.21%, rgba(115, 112, 255, 0.3) 100%), #0F0E13",
      }}
    >
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
        {/* Cover image */}
        <div className="w-full sm:w-[205px] aspect-[205/290] sm:aspect-auto sm:h-[290px] rounded-xl overflow-hidden border border-[#262626] flex-shrink-0">
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
          <div className="flex items-start justify-between gap-2 mb-3">
            <h3 className="text-white text-xl sm:text-2xl font-bold">{story.title}</h3>
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
              Episodes 1-{freeCount} Free
            </span>
          </div>

          {/* Description - 14px */}
          <p className="text-white text-sm leading-[19px] tracking-tight mb-4 line-clamp-5">
            {story.description}
          </p>

          {/* Genre row */}
          <div className="flex items-center gap-2.5 mb-4">
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

          {/* Show Episodes toggle - green, 22px bold (only if episodes exist) */}
          {story.episodes.length > 0 && (
            <>
              <button
                onClick={() => setShowEpisodes(!showEpisodes)}
                className="flex items-center gap-2 text-[#1ED760] text-lg sm:text-[22px] font-bold hover:opacity-80 transition-opacity"
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
                <EpisodeList episodes={story.episodes} />
              )}
            </>
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
                  className={`transition-colors ${canScrollLeft ? "text-white" : "text-[#ADADAD]"
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
                  className={`transition-colors ${canScrollRight ? "text-white" : "text-[#ADADAD]"
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
                    {/* Ebook card */}
                    <div className="w-[280px] sm:w-[354px] flex gap-3">
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
                        <p className={`text-[#C5C5C5] text-sm leading-[19px] tracking-tight ${!expandedEbooks.has(ebook.id) ? "line-clamp-8" : ""}`}>
                          {ebook.description}
                        </p>
                        {ebook.description && ebook.description.length > 200 && (
                          <button
                            onClick={() => setExpandedEbooks(prev => {
                              const next = new Set(prev);
                              next.has(ebook.id) ? next.delete(ebook.id) : next.add(ebook.id);
                              return next;
                            })}
                            className="text-white text-xs font-medium hover:opacity-80 transition-colors mt-1 self-end"
                          >
                            {expandedEbooks.has(ebook.id) ? "Show less" : "Read more"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Vertical divider (except last) - 24px gap includes the divider */}
                    {index < story.ebooks.length - 1 && (
                      <div className="w-[1.5px] bg-[#3E3D55] ml-6 self-stretch" />
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
