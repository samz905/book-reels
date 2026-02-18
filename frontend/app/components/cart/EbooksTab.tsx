"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import { CartEbook } from "../../data/mockCartData";

interface EbooksTabProps {
  ebooks: CartEbook[];
  onRemove: (id: string) => void;
}

export default function EbooksTab({ ebooks, onRemove }: EbooksTabProps) {
  // Horizontal scroll state
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Check scroll position for arrow states
  const checkScrollPosition = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  // Update scroll position on scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    el.addEventListener("scroll", checkScrollPosition);
    checkScrollPosition(); // Initial check
    return () => el.removeEventListener("scroll", checkScrollPosition);
  }, [checkScrollPosition]);

  // Navigation handlers
  const scrollLeftHandler = () => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: -300, behavior: "smooth" });
  };

  const scrollRightHandler = () => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: 300, behavior: "smooth" });
  };

  return (
    <div className="bg-panel rounded-xl p-6">
      {/* Header with arrows */}
      <div className="flex items-start justify-between mb-3">
        <h2 className="text-white text-2xl font-bold">Ebooks</h2>
        {/* Navigation arrows */}
        <div className="flex items-center gap-4">
          <button
            onClick={scrollLeftHandler}
            className={`transition-colors ${
              canScrollLeft ? "text-white" : "text-[#ADADAD]"
            }`}
            disabled={!canScrollLeft}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
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
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
            </svg>
          </button>
        </div>
      </div>
      <p className="text-white text-xl tracking-[-0.025em] mb-8">
        Ebook purchases don&apos;t unlock episodes. Subscriptions unlock
        episodes 5+.
      </p>

      {/* Ebooks row with scroll */}
      <div
        ref={scrollRef}
        className="overflow-x-auto scrollbar-hide"
        style={{ scrollBehavior: "auto" }}
      >
        <div className="flex gap-[18px] min-w-max pb-2">
          {ebooks.map((ebook) => (
          <div key={ebook.id} className="flex items-center gap-[18px] flex-shrink-0">
            {/* Remove button */}
            <button
              onClick={() => onRemove(ebook.id)}
              className="w-9 h-9 rounded-full bg-[#3E3D40] flex items-center justify-center hover:bg-[#4E4D50] transition-colors flex-shrink-0"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#E8EAED">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
              </svg>
            </button>

            {/* Card content */}
            <div className="flex gap-3">
              {/* Cover */}
              <div className="w-[80px] h-[128px] rounded overflow-hidden flex-shrink-0">
                <Image
                  src={ebook.coverUrl}
                  alt={ebook.title}
                  width={80}
                  height={128}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Title and price */}
              <div className="flex flex-col gap-3 w-[155px]">
                <h3 className="text-white text-sm font-semibold leading-[18px] line-clamp-3">
                  {ebook.title}
                </h3>
                <span className="text-[#FF8C00] text-sm font-semibold leading-[18px]">
                  $ {ebook.price.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}
