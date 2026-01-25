"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import StoryTypeTabs from "./components/StoryTypeTabs";
import CategoryTabs from "./components/CategoryTabs";
import StoryGrid from "./components/StoryGrid";
import { mockStories, type Category, type StoryType } from "./data/mockStories";

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<Category>("ALL");
  const [activeStoryType, setActiveStoryType] = useState<StoryType>("ALL");
  const [isSticky, setIsSticky] = useState(false);
  const stickyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (stickyRef.current) {
        const rect = stickyRef.current.getBoundingClientRect();
        setIsSticky(rect.top <= 86);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const filteredStories = useMemo(() => {
    let stories = mockStories;

    if (activeStoryType !== "ALL") {
      stories = stories.filter((story) => story.storyType === activeStoryType);
    }

    if (activeCategory !== "ALL") {
      stories = stories.filter((story) => story.category === activeCategory);
    }

    return stories;
  }, [activeCategory, activeStoryType]);

  return (
    <div className="min-h-screen bg-gradient-page relative overflow-clip">
      {/* Purple glow effects */}
      <div className="absolute w-[227px] h-[420px] left-[25px] top-[-260px] bg-purple-glow blur-[95px]" />
      <div className="absolute w-[227px] h-[420px] left-[740px] top-[1507px] bg-purple-glow blur-[95px]" />

      {/* Gradient overlay */}
      <div className="absolute w-full h-[1167px] left-0 top-[854px] bg-gradient-overlay pointer-events-none" />

      <Header />

      <main className="relative z-10 px-6">
        {/* Hero Section */}
        <section className="text-center py-12 max-w-[1200px] mx-auto relative">
          {/* Hero glow effect */}
          <div className="absolute w-[227px] h-[170px] left-1/2 -translate-x-1/2 top-[140px] bg-[rgba(156,153,255,0.55)] blur-[95px]" />

          <h1 className="font-medium text-[72px] leading-[72px] tracking-[-3.6px] mb-6">
            <span className="text-white">Stories, </span>
            <span
              style={{
                background: 'linear-gradient(135deg, #FFFFFF 0%, #9C99FF 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              reimagined
            </span>
          </h1>
          <p className="text-white text-[19.5px] leading-7 max-w-[676px] mx-auto mb-8">
            Discover immersive stories that unfold in short visual episodes. New
            chapters dropping all the time.
          </p>
          <button
            className="text-[#F8FAFC] font-bold text-[17.9px] leading-7 px-8 py-3.5 rounded-[14px] hover:opacity-90 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #9C99FF 0%, #7370FF 60%)' }}
          >
            Start Watching
          </button>
        </section>

        {/* Sticky Tabs Container */}
        <div
          ref={stickyRef}
          className={`sticky top-[86px] z-20 py-4 -mx-6 px-6 transition-colors duration-200 ${
            isSticky ? "bg-black/80 backdrop-blur-sm" : ""
          }`}
        >
          {/* Story Type Tabs */}
          <section className="max-w-[1440px] mx-auto mb-5">
            <StoryTypeTabs
              activeType={activeStoryType}
              onTypeChange={setActiveStoryType}
            />
          </section>

          {/* Category Tabs */}
          <section className="max-w-[1440px] mx-auto">
            <CategoryTabs
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
            />
          </section>
        </div>

        {/* Story Grid */}
        <section className="max-w-[1392px] mx-auto">
          <StoryGrid stories={filteredStories} />
        </section>
      </main>

      <Footer />
    </div>
  );
}
