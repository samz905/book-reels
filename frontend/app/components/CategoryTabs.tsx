"use client";

import { useRef, useState, useCallback } from "react";
import { CATEGORIES, type Category } from "../data/mockStories";

interface CategoryTabsProps {
  activeCategory: Category;
  onCategoryChange: (category: Category) => void;
}

export default function CategoryTabs({
  activeCategory,
  onCategoryChange,
}: CategoryTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
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

  // Handle wheel - vertical to horizontal scroll
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!scrollRef.current) return;
    e.preventDefault();
    scrollRef.current.scrollLeft += e.deltaY;
  }, []);

  return (
    <div
      ref={scrollRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      className="overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing"
      style={{ scrollBehavior: "smooth" }}
    >
      <nav className="flex items-center gap-1 min-w-max select-none">
        {CATEGORIES.map((category) => (
          <button
            key={category}
            onClick={() => onCategoryChange(category)}
            className={`px-3 py-2 text-base leading-5 tracking-[0.25px] uppercase transition-colors whitespace-nowrap ${
              activeCategory === category
                ? "text-white font-bold text-sm border-b-2 border-white rounded-lg"
                : "text-[#BEC0C9] font-normal hover:text-white"
            }`}
          >
            {category}
          </button>
        ))}
      </nav>
    </div>
  );
}
