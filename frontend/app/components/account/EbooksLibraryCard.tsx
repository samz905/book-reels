"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { PurchasedEbook } from "../../data/mockAccountData";

interface EbooksLibraryCardProps {
  ebooks: PurchasedEbook[];
  isLoading?: boolean;
  onReadNow?: (ebookId: string) => void;
}

export default function EbooksLibraryCard({
  ebooks,
  isLoading = false,
  onReadNow,
}: EbooksLibraryCardProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Drag scrolling state
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Handle mouse down - start drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  }, []);

  // Handle mouse move - drag scroll
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !scrollRef.current) return;
      e.preventDefault();
      const x = e.pageX - scrollRef.current.offsetLeft;
      const walk = (x - startX) * 1.5;
      scrollRef.current.scrollLeft = scrollLeft - walk;
    },
    [isDragging, startX, scrollLeft]
  );

  // Handle mouse up/leave - stop drag
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle wheel - vertical to horizontal scroll with non-passive listener
  useEffect(() => {
    const el = scrollRef.current;
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

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 378; // Card width + gap
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="bg-[#0F0E13] rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white text-2xl font-bold">Ebooks Library</h2>

        {/* Navigation Arrows */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => scroll("left")}
            className="text-[#ADADAD] hover:text-white transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z"
                fill="currentColor"
              />
            </svg>
          </button>
          <button
            onClick={() => scroll("right")}
            className="text-[#ADADAD] hover:text-white transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M8.59 16.59L10 18L16 12L10 6L8.59 7.41L13.17 12L8.59 16.59Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3 w-[322px] animate-pulse">
              <div className="flex flex-col gap-2 flex-shrink-0">
                <div className="w-[100px] h-[160px] rounded-lg bg-[#272727]" />
                <div className="h-4 w-16 bg-[#272727] rounded" />
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <div className="h-4 bg-[#272727] rounded w-3/4" />
                <div className="h-3 bg-[#272727] rounded w-full" />
                <div className="h-3 bg-[#272727] rounded w-full" />
                <div className="h-3 bg-[#272727] rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && ebooks.length === 0 && (
        <div className="text-center py-8">
          <p className="text-[#ADADAD] text-sm">
            You haven&apos;t purchased any ebooks yet.
          </p>
        </div>
      )}

      {/* Ebooks Scroll Container */}
      {!isLoading && ebooks.length > 0 && (
      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="flex gap-6 overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing select-none"
      >
        {ebooks.map((ebook, index) => (
          <div key={ebook.id} className="flex gap-6 flex-shrink-0">
            {/* Ebook Card */}
            <div className="flex gap-3 w-[322px]">
              {/* Cover and Read Now */}
              <div className="flex flex-col gap-2 flex-shrink-0">
                <div className="w-[100px] h-[160px] rounded-lg overflow-hidden bg-[#272727]">
                  {ebook.coverUrl ? (
                    <Image
                      src={ebook.coverUrl}
                      alt={ebook.title}
                      width={100}
                      height={160}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#ADADAD]">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/>
                      </svg>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => onReadNow?.(ebook.id)}
                  className="text-green-3 text-xs font-bold hover:opacity-80 transition-opacity text-left"
                >
                  Read
                </button>
              </div>

              {/* Title and Description */}
              <div className="flex flex-col gap-1 min-w-0">
                <h3 className="text-white text-sm font-semibold line-clamp-2 leading-[18px]">
                  {ebook.title}
                </h3>
                <p className="text-[#C5C5C5] text-sm font-normal leading-[19px] tracking-[-0.025em] line-clamp-8">
                  {ebook.description}
                </p>
              </div>
            </div>

            {/* Divider (except for last item) */}
            {index < ebooks.length - 1 && (
              <div className="w-px h-[202px] bg-[#272727] flex-shrink-0" />
            )}
          </div>
        ))}
      </div>
      )}
    </div>
  );
}
