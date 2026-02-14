"use client";

import { useRef, useState, useCallback, useEffect } from "react";

interface LibraryCarouselProps {
  title: string;
  onAdd?: () => void;
  children: React.ReactNode;
  emptyMessage?: string;
  isEmpty?: boolean;
}

export default function LibraryCarousel({
  title,
  onAdd,
  children,
  emptyMessage = "No items yet.",
  isEmpty = false,
}: LibraryCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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

  const checkScrollPosition = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScrollPosition);
    checkScrollPosition();
    const observer = new ResizeObserver(checkScrollPosition);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScrollPosition);
      observer.disconnect();
    };
  }, [checkScrollPosition]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[#1ED760] text-lg font-bold">{title}</h3>
        <div className="flex items-center gap-3">
          {onAdd && (
            <button
              onClick={onAdd}
              className="w-8 h-8 rounded-full border border-[#1ED760] flex items-center justify-center text-[#1ED760] hover:bg-[#1ED760]/10 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              </svg>
            </button>
          )}
          <button
            onClick={() => scrollRef.current?.scrollBy({ left: -300, behavior: "smooth" })}
            className={`transition-colors ${canScrollLeft ? "text-white" : "text-[#ADADAD]/30"}`}
            disabled={!canScrollLeft}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
          </button>
          <button
            onClick={() => scrollRef.current?.scrollBy({ left: 300, behavior: "smooth" })}
            className={`transition-colors ${canScrollRight ? "text-white" : "text-[#ADADAD]/30"}`}
            disabled={!canScrollRight}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
            </svg>
          </button>
        </div>
      </div>

      {isEmpty ? (
        <p className="text-[#ADADAD] text-sm py-4">{emptyMessage}</p>
      ) : (
        <div
          ref={scrollRef}
          className="overflow-x-auto scrollbar-hide"
          style={{ scrollBehavior: "smooth" }}
        >
          <div className="flex gap-5 min-w-max pb-2">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
