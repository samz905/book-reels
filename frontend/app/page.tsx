"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import CategoryTabs from "./components/CategoryTabs";
import StoryGrid from "./components/StoryGrid";
import { StoryGridSkeleton } from "./components/skeletons";
import { CATEGORIES, type Category, type Story } from "./data/mockStories";
import type { Episode } from "./data/mockCreatorData";
import EpisodeList from "./components/creator/EpisodeList";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "./context/AuthContext";

// API response types
interface ApiStory {
  id: string;
  title: string;
  description: string;
  cover_url: string | null;
  type: "video";
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
    viewCount: apiStory.view_count > 0 ? apiStory.view_count.toLocaleString() : undefined,
  };
}

export default function Home() {
  const { user, loading: authLoading, accessStatus } = useAuth();
  const router = useRouter();
  const isApproved = user && accessStatus === "approved";

  // Redirect pending users to waitlist
  useEffect(() => {
    if (authLoading) return;
    if (user && accessStatus !== "approved") {
      router.push("/waitlist");
    }
  }, [user, authLoading, accessStatus, router]);

  const [activeCategory, setActiveCategory] = useState<Category>("ALL");
  const [isSticky, setIsSticky] = useState(false);
  const stickyRef = useRef<HTMLDivElement>(null);

  // API state
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Story detail popup
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [storyEpisodes, setStoryEpisodes] = useState<Episode[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);

  // Fetch stories from API (only for approved users)
  const fetchStories = useCallback(async () => {
    if (!isApproved) return;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("limit", "50");

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
  }, [activeCategory, isApproved]);

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

  // Handle story card click — fetch episodes and show popup
  const handleStoryClick = useCallback(async (story: Story) => {
    setSelectedStory(story);
    setStoryEpisodes([]);
    setEpisodesLoading(true);
    try {
      const res = await fetch(`/api/stories/${story.id}/episodes`);
      if (res.ok) {
        const eps = await res.json();
        setStoryEpisodes(
          (eps as Array<{ id: string; number: number; name: string; is_free: boolean; status: string; media_url: string | null; generation_id: string | null }>)
            .filter((e) => e.status === "published")
            .map((e) => ({
              id: e.id,
              number: e.number,
              name: e.name,
              isFree: e.is_free,
              status: e.status as "published",
              mediaUrl: e.media_url,
              generationId: e.generation_id,
            }))
        );
      }
    } catch {
      // non-fatal
    } finally {
      setEpisodesLoading(false);
    }
  }, []);

  // ─── Marketing Landing Page (unauthenticated users) ─────────────────
  if (!authLoading && !isApproved) {
    return (
      <div className="min-h-screen bg-gradient-page relative overflow-clip">
        {/* Purple glow effects */}
        <div className="absolute w-[227px] h-[420px] left-[25px] top-[-260px] bg-purple-glow blur-[95px]" />
        <div className="absolute w-[300px] h-[300px] left-1/2 -translate-x-1/2 top-[280px] bg-[rgba(156,153,255,0.12)] blur-[120px] rounded-full" />

        <Header />

        <main className="relative z-10 px-4 md:px-6">
          {/* Hero Section */}
          <section className="text-center py-20 md:py-28 max-w-[800px] mx-auto">
            <div className="absolute w-[227px] h-[170px] left-1/2 -translate-x-1/2 top-[140px] bg-[rgba(156,153,255,0.55)] blur-[95px]" />

            <h1 className="font-medium text-4xl sm:text-5xl lg:text-[72px] leading-tight lg:leading-[72px] tracking-[-1.5px] lg:tracking-[-3.6px] mb-6">
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
            <p className="text-white/70 text-base sm:text-lg lg:text-[19.5px] leading-relaxed lg:leading-7 max-w-[676px] mx-auto mb-10">
              Find stories that move you. Let yours be seen too.
            </p>
            <Link
              href="/login"
              className="inline-block text-[#F8FAFC] font-bold text-[17.9px] leading-7 px-10 py-4 rounded-[14px] hover:opacity-90 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #9C99FF 0%, #7370FF 60%)' }}
            >
              Request Early Access
            </Link>
            <p className="text-white/30 text-sm mt-4">
              Early access is limited. Join the waitlist today.
            </p>
          </section>
        </main>

        <Footer />
      </div>
    );
  }

  // ─── Full App (approved users) ──────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-page relative overflow-clip">
      {/* Purple glow effects */}
      <div className="absolute w-[227px] h-[420px] left-[25px] top-[-260px] bg-purple-glow blur-[95px]" />
      <div className="hidden sm:block absolute w-[227px] h-[420px] left-[740px] top-[1507px] bg-purple-glow blur-[95px]" />


      <Header />

      <main className="relative z-10 px-4 md:px-6">
        {/* Hero Section */}
        <section className="text-center py-12 max-w-[1200px] mx-auto relative">
          {/* Hero glow effect */}
          <div className="absolute w-[227px] h-[170px] left-1/2 -translate-x-1/2 top-[140px] bg-[rgba(156,153,255,0.55)] blur-[95px]" />

          <h1 className="font-medium text-4xl sm:text-5xl lg:text-[72px] leading-tight lg:leading-[72px] tracking-[-1.5px] lg:tracking-[-3.6px] mb-6">
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
          <p className="text-white text-base sm:text-lg lg:text-[19.5px] leading-relaxed lg:leading-7 max-w-[676px] mx-auto mb-8">
            Find stories that move you. Let yours be seen too.
          </p>
          <Link
            href="/create"
            className="inline-block text-[#F8FAFC] font-bold text-[17.9px] leading-7 px-8 py-3.5 rounded-[14px] hover:opacity-90 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #9C99FF 0%, #7370FF 60%)' }}
          >
            Start Creating
          </Link>
        </section>

        {/* Sticky Tabs Container */}
        <div
          ref={stickyRef}
          className={`sticky top-[64px] z-20 py-4 -mx-4 px-4 md:-mx-6 md:px-6 transition-colors duration-200 ${isSticky ? "bg-[#010101]" : ""
            }`}
        >
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
            <StoryGrid stories={filteredStories} onStoryClick={handleStoryClick} />
          )}
        </section>
      </main>

      <Footer />

      {/* Story detail popup with episodes */}
      {selectedStory && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedStory(null)}>
          <div className="bg-panel rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header with cover + info */}
            <div className="p-4 sm:p-6 flex gap-4 sm:gap-5">
              <div className="w-[90px] h-[128px] sm:w-[120px] sm:h-[170px] rounded-xl overflow-hidden flex-shrink-0">
                <Image
                  src={selectedStory.coverImage}
                  alt={selectedStory.title}
                  width={120}
                  height={170}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-white text-xl font-bold mb-2">{selectedStory.title}</h2>
                <p className="text-white/60 text-sm line-clamp-3 mb-3">{selectedStory.description}</p>
                <div className="flex items-center gap-2">
                  <Image
                    src={selectedStory.creatorAvatar}
                    alt={selectedStory.creatorName}
                    width={20}
                    height={20}
                    className="rounded-full"
                  />
                  <span className="text-white/70 text-sm">{selectedStory.creatorName}</span>
                </div>
              </div>
              {/* Close button */}
              <button
                onClick={() => setSelectedStory(null)}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors flex-shrink-0 self-start"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Episodes */}
            <div className="px-4 sm:px-6 pb-4 sm:pb-6">
              {episodesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-[#9C99FF] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : storyEpisodes.length > 0 ? (
                <EpisodeList episodes={storyEpisodes} freeCount={4} />
              ) : (
                <p className="text-white/40 text-sm text-center py-8">No episodes published yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
