"use client";

import { useRef, useEffect } from "react";
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

  return (
    <div
      ref={scrollRef}
      className="overflow-x-auto scrollbar-hide"
      style={{ scrollBehavior: "smooth" }}
    >
      <nav className="flex items-center gap-1 min-w-max">
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
