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
  const dragState = useRef({ isDown: false, startX: 0, scrollLeft: 0, moved: false });

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!scrollRef.current) return;
    dragState.current = {
      isDown: true,
      startX: e.clientX,
      scrollLeft: scrollRef.current.scrollLeft,
      moved: false,
    };
    setIsDragging(false);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragState.current.isDown || !scrollRef.current) return;
    const dx = e.clientX - dragState.current.startX;
    if (Math.abs(dx) > 3) {
      dragState.current.moved = true;
      setIsDragging(true);
      scrollRef.current.scrollLeft = dragState.current.scrollLeft - dx;
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    dragState.current.isDown = false;
    // Small delay to let click events fire before resetting
    setTimeout(() => setIsDragging(false), 0);
  }, []);

  const handleClick = useCallback((category: Category) => {
    if (dragState.current.moved) return; // Ignore click after drag
    onCategoryChange(category);
  }, [onCategoryChange]);

  return (
    <div
      ref={scrollRef}
      className={`overflow-x-auto scrollbar-hide select-none ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
      style={{ scrollBehavior: isDragging ? "auto" : "smooth" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <nav className="flex items-center gap-1 min-w-max">
        {CATEGORIES.map((category) => (
          <button
            key={category}
            onClick={() => handleClick(category)}
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
