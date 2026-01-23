"use client";

import { CATEGORIES, type Category } from "../data/mockStories";

interface CategoryTabsProps {
  activeCategory: Category;
  onCategoryChange: (category: Category) => void;
}

export default function CategoryTabs({
  activeCategory,
  onCategoryChange,
}: CategoryTabsProps) {
  return (
    <div className="overflow-x-auto scrollbar-hide">
      <nav className="flex items-center min-w-max">
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
