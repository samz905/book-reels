"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import StoryTypeTabs from "./components/StoryTypeTabs";
import CategoryTabs from "./components/CategoryTabs";
import StoryGrid from "./components/StoryGrid";
import { StoryGridSkeleton } from "./components/skeletons";
import { CATEGORIES, type Category, type StoryType, type Story } from "./data/mockStories";

// API response types
interface ApiStory {
  id: string;
  title: string;
  description: string;
  cover_url: string | null;
  type: "video" | "audio";
  view_count: number;
  likes: number;
  genres: string[];
  creator: {
    id: string;
    username: string;
    name: string;
    avatar_url: string | null;
  } | null;
}

interface ApiResponse {
  data: ApiStory[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Transform API story to frontend Story format
function transformStory(apiStory: ApiStory): Story {
  const genre = apiStory.genres[0]?.toUpperCase() || "OTHER";
  const category = CATEGORIES.includes(genre as Category) ? (genre as Category) : "OTHER";

  return {
    id: apiStory.id,
    title: apiStory.title,
    description: apiStory.description || "",
    coverImage: apiStory.cover_url || "https://picsum.photos/seed/default/300/450",
    creatorName: apiStory.creator?.name || "Unknown Creator",
    creatorUsername: apiStory.creator?.username || "unknown",
    creatorAvatar: apiStory.creator?.avatar_url || "https://picsum.photos/seed/avatar/100/100",
    category,
    storyType: apiStory.type.toUpperCase() as "VIDEO" | "AUDIO",
    viewCount: apiStory.view_count > 0 ? apiStory.view_count.toLocaleString() : undefined,
  };
}

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<Category>("ALL");
  const [activeStoryType, setActiveStoryType] = useState<StoryType>("ALL");
  const [isSticky, setIsSticky] = useState(false);
  const stickyRef = useRef<HTMLDivElement>(null);

  // API state
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch stories from API
  const fetchStories = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("limit", "50");

      if (activeStoryType !== "ALL") {
        params.set("type", activeStoryType.toLowerCase());
      }

      if (activeCategory !== "ALL") {
        params.set("category", activeCategory);
      }

      const response = await fetch(`/api/stories?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch stories");
      }

      const data: ApiResponse = await response.json();
      setStories(data.data.map(transformStory));
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [activeCategory, activeStoryType]);

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  // Sticky header behavior
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

  // Filter stories client-side for category (API might not filter all categories perfectly)
  const filteredStories = useMemo(() => {
    if (activeCategory === "ALL") {
      return stories;
    }
    return stories.filter((story) => story.category === activeCategory);
  }, [stories, activeCategory]);

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
          {loading ? (
            <StoryGridSkeleton count={12} />
          ) : error ? (
            <div className="py-12 text-center">
              <p className="text-white/70 mb-4">{error}</p>
              <button
                onClick={fetchStories}
                className="px-6 py-2 bg-purple rounded-lg text-white hover:bg-purple/80 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : (
            <StoryGrid stories={filteredStories} />
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
