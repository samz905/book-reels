"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import PublicProfileHeader from "../../components/public/PublicProfileHeader";
import PublicStoryCard from "../../components/public/PublicStoryCard";
import { ProfileHeaderSkeleton, PublicStorySkeleton } from "../../components/skeletons";
import type { CreatorProfile, Episode } from "../../data/mockCreatorData";
import type { PublicStory, Ebook, PublicCreatorProfile } from "../../data/mockPublicCreators";

// API response types
interface ApiCreatorSettings {
  subscription_enabled: boolean;
  monthly_price: number;
  min_price: number;
}

interface ApiEpisode {
  id: string;
  number: number;
  name: string;
  is_free: boolean;
  status: string;
  media_url: string | null;
}

interface ApiEbook {
  id: string;
  title: string;
  description: string;
  cover_url: string | null;
  price: number;
}

interface ApiStory {
  id: string;
  title: string;
  description: string;
  cover_url: string | null;
  type: "video";
  view_count: number;
  likes: number;
  genres: string[];
  episodes: ApiEpisode[];
  ebooks: ApiEbook[];
}

interface ApiCreatorResponse {
  id: string;
  username: string;
  name: string;
  bio: string;
  avatar_url: string | null;
  is_creator: boolean;
  creator_settings: ApiCreatorSettings[] | ApiCreatorSettings | null;
  stories?: ApiStory[];
}

// Transform API data to frontend format
function transformCreatorData(api: ApiCreatorResponse): PublicCreatorProfile {
  const settings = Array.isArray(api.creator_settings)
    ? api.creator_settings[0]
    : api.creator_settings;

  const stories = api.stories || [];
  const totalEpisodes = stories.reduce((sum, s) => sum + (s.episodes?.filter(e => e.status === "published").length || 0), 0);

  const profile: CreatorProfile = {
    name: api.name,
    username: api.username,
    bio: api.bio || "",
    avatar: api.avatar_url,
    storiesCount: stories.length,
    episodesCount: totalEpisodes,
    newEpisodesWeekly: Math.min(stories.length * 2, 10), // Estimate
  };

  const transformedStories: PublicStory[] = stories.map((story) => {
    const publishedEps = (story.episodes || []).filter(e => e.status === "published");
    return {
    id: story.id,
    title: story.title,
    type: story.type,
    episodeCount: publishedEps.length,
    viewCount: story.view_count,
    description: story.description || "",
    cover: story.cover_url || "https://picsum.photos/seed/default/300/450",
    likes: story.likes,
    genre: story.genres,
    episodes: publishedEps.map((ep): Episode => ({
      id: ep.id,
      number: ep.number,
      name: ep.name,
      isFree: ep.is_free,
      status: ep.status as "published",
      mediaUrl: ep.media_url || null,
    })),
    ebooks: (story.ebooks || []).map((eb): Ebook => ({
      id: eb.id,
      title: eb.title,
      description: eb.description || "",
      cover: eb.cover_url || "https://picsum.photos/seed/default/100/160",
      price: Number(eb.price),
    })),
  };
  });

  return {
    profile,
    subscription: {
      monthlyPrice: settings?.monthly_price || 9.99,
      description: `Unlock all episodes, ${stories.length} stories, all ebooks`,
    },
    stories: transformedStories,
  };
}

export default function PublicCreatorProfilePage() {
  const params = useParams();
  const username = params.username as string;

  const [creator, setCreator] = useState<PublicCreatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCreator() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/profiles/username/${username}`);

        if (response.status === 404) {
          setCreator(null);
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to fetch creator");
        }

        const data: ApiCreatorResponse = await response.json();
        setCreator(transformCreatorData(data));
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    if (username) {
      fetchCreator();
    }
  }, [username]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black relative overflow-clip">
        <Header />
        <div className="sticky top-[86px] z-20 px-6 py-6 max-w-7xl mx-auto">
          <ProfileHeaderSkeleton />
        </div>
        <main className="px-6 pb-8 max-w-7xl mx-auto relative z-10">
          <div className="space-y-6">
            <PublicStorySkeleton />
            <PublicStorySkeleton />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-page relative overflow-clip">
        <Header />
        <main className="px-6 py-20 max-w-7xl mx-auto text-center">
          <h1 className="text-white text-3xl font-bold mb-4">Error</h1>
          <p className="text-white/70 text-lg mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-purple rounded-lg text-white hover:bg-purple/80 transition-colors"
          >
            Try Again
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  // 404 - Creator not found
  if (!creator) {
    return (
      <div className="min-h-screen bg-gradient-page relative overflow-clip">
        <Header />
        <main className="px-6 py-20 max-w-7xl mx-auto text-center">
          <h1 className="text-white text-3xl font-bold mb-4">
            Creator Not Found
          </h1>
          <p className="text-white/70 text-lg">
            The creator you&apos;re looking for doesn&apos;t exist or has been
            removed.
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-clip">
      <Header />

      {/* Sticky Profile Header */}
      <div className="sticky top-[86px] z-20 px-6 py-6 max-w-7xl mx-auto">
        <PublicProfileHeader
          profile={creator.profile}
          subscriptionPrice={creator.subscription.monthlyPrice}
          subscriptionDescription={creator.subscription.description}
        />
      </div>

      {/* Stories List */}
      <main className="px-6 pb-8 max-w-7xl mx-auto relative z-10">
        <div className="space-y-6">
          {creator.stories.length > 0 ? (
            creator.stories.map((story) => (
              <PublicStoryCard key={story.id} story={story} />
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-white/70">No stories published yet.</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
