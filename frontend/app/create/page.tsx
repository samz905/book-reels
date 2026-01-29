"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ProfileCard from "../components/creator/ProfileCard";
import StatsCard from "../components/creator/StatsCard";
import SubscriptionCard from "../components/creator/SubscriptionCard";
import CreatorStoryCard from "../components/creator/CreatorStoryCard";
import CreateStoryModal from "../components/creator/CreateStoryModal";
import { useAuth } from "../context/AuthContext";
import {
  CreatorProfile,
  CreatorStats,
  Subscription,
  Story,
  emptyStats,
  defaultSubscription,
} from "../data/mockCreatorData";
import {
  getProfile,
  createProfile,
  updateProfile,
  getMyStories,
  createStory,
  updateStory,
  getCreatorSettings,
  updateCreatorSettings,
  createEpisode,
  createEbook,
  generateRandomUsername,
  mapDbProfileToFrontend,
  mapDbSettingsToFrontend,
} from "@/lib/api/creator";

export default function CreatePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Loading and error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [stats, setStats] = useState<CreatorStats>(emptyStats);
  const [subscription, setSubscription] =
    useState<Subscription>(defaultSubscription);
  const [stories, setStories] = useState<Story[]>([]);
  const [showCreateStoryModal, setShowCreateStoryModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch data on mount when user is authenticated
  useEffect(() => {
    async function loadData() {
      if (!user) return;

      setIsLoading(true);
      setError(null);
      setUserId(user.id);

      try {
        // Fetch or create profile
        let profileData = await getProfile(user.id);

        if (!profileData) {
          // Create new profile with random username and user's actual name
          const randomUsername = generateRandomUsername();
          const userName = user.user_metadata?.full_name ||
                          user.user_metadata?.name ||
                          user.email?.split("@")[0] ||
                          "New Creator";
          profileData = await createProfile(user.id, {
            username: randomUsername,
            name: userName,
            bio: "",
          });
        }

        // Fetch stories for this creator
        const storiesData = await getMyStories(user.id);

        // Fetch creator settings
        const settingsData = await getCreatorSettings();

        // Compute episode count
        const totalEpisodes = storiesData.reduce(
          (sum, s) => sum + s.episodes.length,
          0
        );

        // Map to frontend types
        const mappedProfile = mapDbProfileToFrontend(
          profileData,
          storiesData.length,
          totalEpisodes
        );
        const mappedSubscription = mapDbSettingsToFrontend(settingsData);

        setProfile(mappedProfile);
        setStories(storiesData);
        setSubscription(mappedSubscription);
      } catch (err) {
        console.error("Error loading creator data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    }

    if (!authLoading) {
      if (user) {
        loadData();
      } else {
        setIsLoading(false);
      }
    }
  }, [user, authLoading]);

  // Update handlers
  const handleProfileUpdate = async (updatedProfile: CreatorProfile) => {
    if (!userId) return;

    try {
      await updateProfile(userId, {
        username: updatedProfile.username,
        name: updatedProfile.name,
        bio: updatedProfile.bio,
        avatar_url: updatedProfile.avatar,
      });
      setProfile(updatedProfile);
    } catch (err) {
      // Re-throw so the modal can handle the error (e.g., 409)
      throw err;
    }
  };

  const handleSubscriptionUpdate = async (updatedSubscription: Subscription) => {
    try {
      await updateCreatorSettings({
        subscription_enabled: updatedSubscription.enabled,
        monthly_price: updatedSubscription.monthlyPrice,
        min_price: updatedSubscription.minPrice,
      });
      setSubscription(updatedSubscription);
    } catch (err) {
      console.error("Error updating subscription:", err);
      throw err;
    }
  };

  const handleStoryUpdate = async (updatedStory: Story) => {
    try {
      await updateStory(updatedStory.id, {
        title: updatedStory.title,
        type: updatedStory.type,
        description: updatedStory.description,
        cover_url: updatedStory.cover || null,
        genres: updatedStory.genre,
        status: updatedStory.status,
      });
      setStories((prev) =>
        prev.map((s) => (s.id === updatedStory.id ? updatedStory : s))
      );
    } catch (err) {
      console.error("Error updating story:", err);
      throw err;
    }
  };

  const handleCreateStory = async (
    storyData: Omit<
      Story,
      "id" | "episodeCount" | "viewCount" | "likes" | "episodes" | "ebooks"
    >
  ) => {
    setIsSaving(true);
    try {
      const newStory = await createStory({
        title: storyData.title,
        type: storyData.type,
        description: storyData.description,
        cover_url: storyData.cover || null,
        genres: storyData.genre,
        status: storyData.status,
      });
      setStories((prev) => [...prev, newStory]);
      setShowCreateStoryModal(false);

      // Update profile story count
      if (profile) {
        setProfile({
          ...profile,
          storiesCount: profile.storiesCount + 1,
        });
      }
    } catch (err) {
      console.error("Error creating story:", err);
      setError(err instanceof Error ? err.message : "Failed to create story");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateEpisode = async (
    storyId: string,
    episodeData: { number: number; name: string; isFree: boolean }
  ) => {
    try {
      const newEpisode = await createEpisode(storyId, {
        number: episodeData.number,
        name: episodeData.name,
        is_free: episodeData.isFree,
        status: "draft",
      });

      // Update the story's episodes
      setStories((prev) =>
        prev.map((s) =>
          s.id === storyId
            ? {
                ...s,
                episodes: [...s.episodes, newEpisode],
                episodeCount: s.episodeCount + 1,
              }
            : s
        )
      );

      // Update profile episode count
      if (profile) {
        setProfile({
          ...profile,
          episodesCount: profile.episodesCount + 1,
        });
      }

      return newEpisode;
    } catch (err) {
      console.error("Error creating episode:", err);
      throw err;
    }
  };

  const handleAddEbook = async (
    storyId: string,
    ebookData: { title: string; description: string; cover: string; price: number }
  ) => {
    try {
      const newEbook = await createEbook(storyId, {
        title: ebookData.title,
        description: ebookData.description,
        cover_url: ebookData.cover || null,
        price: ebookData.price,
      });

      // Update the story's ebooks
      setStories((prev) =>
        prev.map((s) =>
          s.id === storyId
            ? {
                ...s,
                ebooks: [...s.ebooks, newEbook],
              }
            : s
        )
      );

      return newEbook;
    } catch (err) {
      console.error("Error creating ebook:", err);
      throw err;
    }
  };

  // Show loading state
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-black relative overflow-clip">
        <Header />
        <main className="relative z-10 px-6 py-8 max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            {/* Profile skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
              <div className="bg-[#0F0E13] rounded-xl p-6 h-48" />
              <div className="bg-[#0F0E13] rounded-xl p-6 h-48" />
            </div>
            {/* Stats skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#0F0E13] rounded-xl p-6 h-40" />
              <div className="bg-[#0F0E13] rounded-xl p-6 h-40" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-black relative overflow-clip">
        <Header />
        <main className="relative z-10 px-6 py-8 max-w-7xl mx-auto">
          <div className="bg-[#0F0E13] rounded-xl p-8 text-center">
            <h2 className="text-white text-xl font-semibold mb-4">
              Sign in to access your creator dashboard
            </h2>
            <p className="text-white/60 mb-6">
              Create stories, publish episodes, and manage your content.
            </p>
            <button
              onClick={() => router.push("/login")}
              className="px-6 py-3 rounded-lg font-semibold text-white transition-opacity hover:opacity-90"
              style={{
                background: "linear-gradient(135deg, #9C99FF 0%, #7370FF 60%)",
              }}
            >
              Sign In
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Show error state
  if (error && !profile) {
    return (
      <div className="min-h-screen bg-black relative overflow-clip">
        <Header />
        <main className="relative z-10 px-6 py-8 max-w-7xl mx-auto">
          <div className="bg-[#0F0E13] rounded-xl p-8 text-center">
            <h2 className="text-red-400 text-xl font-semibold mb-4">
              Error loading dashboard
            </h2>
            <p className="text-white/60 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 rounded-lg font-semibold text-white bg-orange-500 hover:bg-orange-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Default empty profile if still null
  const displayProfile = profile || {
    name: "New Creator",
    username: "loading...",
    bio: "",
    avatar: null,
    storiesCount: 0,
    episodesCount: 0,
    newEpisodesWeekly: 0,
  };

  return (
    <div className="min-h-screen bg-black relative overflow-clip">
      <Header />

      <main className="relative z-10 px-6 py-8 max-w-7xl mx-auto">
        {/* Error banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {/* Top row: Profile + Create New Story */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 mb-6">
          <ProfileCard
            profile={displayProfile}
            onUpdate={handleProfileUpdate}
          />

          {/* Create New Story card */}
          <div className="bg-[#0F0E13] rounded-xl p-6 flex flex-col">
            <button
              onClick={() => setShowCreateStoryModal(true)}
              className="w-full py-3 rounded-lg font-semibold text-white transition-opacity hover:opacity-90"
              style={{
                background: "linear-gradient(135deg, #9C99FF 0%, #7370FF 60%)",
              }}
            >
              Create New Story
            </button>
            <p className="text-white/50 text-sm mt-3">
              Set up a new story and start publishing episodes and books.
            </p>
          </div>
        </div>

        {/* Stats + Subscription row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <StatsCard stats={stats} />
          <SubscriptionCard
            subscription={subscription}
            onUpdate={handleSubscriptionUpdate}
          />
        </div>

        {/* Stories section */}
        {stories.length > 0 && (
          <div className="space-y-6">
            {stories.map((story) => (
              <CreatorStoryCard
                key={story.id}
                story={story}
                onUpdateStory={handleStoryUpdate}
                onCreateEpisode={(episodeData) =>
                  handleCreateEpisode(story.id, episodeData)
                }
                onAddEbook={(ebookData) => handleAddEbook(story.id, ebookData)}
              />
            ))}
          </div>
        )}

        {/* Empty state for stories */}
        {stories.length === 0 && (
          <div className="bg-[#0F0E13] rounded-xl p-8 text-center">
            <h3 className="text-white text-lg font-semibold mb-2">
              No stories yet
            </h3>
            <p className="text-white/60 mb-4">
              Create your first story to start publishing content.
            </p>
          </div>
        )}
      </main>

      <Footer />

      {/* Create Story Modal */}
      <CreateStoryModal
        isOpen={showCreateStoryModal}
        onClose={() => setShowCreateStoryModal(false)}
        onSave={handleCreateStory}
        isSaving={isSaving}
      />
    </div>
  );
}
