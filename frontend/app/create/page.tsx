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
import AddBookModal from "../components/creator/AddBookModal";
import StoryPickerModal from "../components/creator/StoryPickerModal";
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
  updateEbook,
  generateRandomUsername,
  mapDbProfileToFrontend,
  mapDbSettingsToFrontend,
} from "@/lib/api/creator";
import {
  listGenerations as supaListGenerations,
  AIGenerationSummary,
} from "@/lib/supabase/ai-generations";

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
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [showEpisodeStoryPicker, setShowEpisodeStoryPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingBook, setIsAddingBook] = useState(false);
  const [episodeDrafts, setEpisodeDrafts] = useState<AIGenerationSummary[]>([]);

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
          // Create new profile with random username, user's name and avatar
          const randomUsername = generateRandomUsername();
          const userName = user.user_metadata?.full_name ||
                          user.user_metadata?.name ||
                          user.email?.split("@")[0] ||
                          "New Creator";
          const userAvatar = user.user_metadata?.avatar_url ||
                            user.user_metadata?.picture ||
                            null;
          profileData = await createProfile(user.id, {
            username: randomUsername,
            name: userName,
            bio: "",
            avatar_url: userAvatar,
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

        // Fetch episode drafts (AI generations)
        try {
          const drafts = await supaListGenerations(20);
          setEpisodeDrafts(drafts);
        } catch {
          // Non-critical — silently ignore
        }
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
    setError(null);

    console.log("Creating story with data:", storyData);

    try {
      const newStory = await createStory({
        title: storyData.title,
        type: storyData.type,
        description: storyData.description,
        cover_url: storyData.cover || null,
        genres: storyData.genre,
        status: storyData.status,
      });

      console.log("Story created successfully:", newStory);

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
      const errorMessage = err instanceof Error ? err.message : "Failed to create story";
      setError(errorMessage);
      alert(`Failed to create story: ${errorMessage}`);
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
    ebookData: {
      storyId: string;
      title: string;
      fileUrl: string;
      coverUrl?: string;
      price: number;
      isbn?: string;
    }
  ) => {
    try {
      const newEbook = await createEbook(ebookData.storyId, {
        title: ebookData.title,
        file_url: ebookData.fileUrl,
        cover_url: ebookData.coverUrl || null,
        isbn: ebookData.isbn || null,
        price: ebookData.price,
      });

      // Update the story's ebooks
      setStories((prev) =>
        prev.map((s) =>
          s.id === ebookData.storyId
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

  const handleUpdateEbook = async (
    storyId: string,
    ebookId: string,
    data: {
      title: string;
      coverUrl?: string;
      price: number;
      isbn?: string;
    }
  ) => {
    try {
      const updatedEbook = await updateEbook(ebookId, {
        title: data.title,
        cover_url: data.coverUrl || null,
        isbn: data.isbn || null,
        price: data.price,
      });

      // Update the story's ebooks
      setStories((prev) =>
        prev.map((s) =>
          s.id === storyId
            ? {
                ...s,
                ebooks: s.ebooks.map((e) =>
                  e.id === ebookId ? updatedEbook : e
                ),
              }
            : s
        )
      );
    } catch (err) {
      console.error("Error updating ebook:", err);
      throw err;
    }
  };

  // Handler for top-level Add Book modal
  const handleAddBookFromModal = async (ebookData: {
    storyId: string;
    title: string;
    fileUrl: string;
    coverUrl?: string;
    price: number;
    isbn?: string;
  }) => {
    setIsAddingBook(true);
    try {
      const newEbook = await createEbook(ebookData.storyId, {
        title: ebookData.title,
        file_url: ebookData.fileUrl,
        cover_url: ebookData.coverUrl || null,
        isbn: ebookData.isbn || null,
        price: ebookData.price,
      });

      // Update the story's ebooks
      setStories((prev) =>
        prev.map((s) =>
          s.id === ebookData.storyId
            ? {
                ...s,
                ebooks: [...s.ebooks, newEbook],
              }
            : s
        )
      );

      setShowAddBookModal(false);
    } catch (err) {
      console.error("Error creating ebook:", err);
      throw err;
    } finally {
      setIsAddingBook(false);
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
          <div className="bg-[#0F0E13] rounded-xl p-6 flex flex-col gap-5">
            <button
              onClick={() => setShowCreateStoryModal(true)}
              className="w-full py-2 rounded-lg font-semibold text-sm text-white transition-opacity hover:opacity-90 border border-[#B8B6FC]"
              style={{
                background: "linear-gradient(135deg, #9C99FF 0%, #7370FF 60%)",
              }}
            >
              Create New Story
            </button>
            <button
              onClick={() => setShowEpisodeStoryPicker(true)}
              disabled={stories.length === 0}
              className="w-full py-2 rounded-lg font-semibold text-sm text-white transition-opacity border border-[#B8B6FC] disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              style={{
                background: stories.length > 0
                  ? "linear-gradient(135deg, #9C99FF 0%, #7370FF 60%)"
                  : "#333",
              }}
            >
              Create New Episode
            </button>
            <button
              onClick={() => setShowAddBookModal(true)}
              disabled={stories.length === 0}
              className="w-full py-2 rounded-lg font-semibold text-sm text-white transition-opacity border border-[#B8B6FC] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: stories.length > 0
                  ? "linear-gradient(135deg, #9C99FF 0%, #7370FF 60%)"
                  : "#333",
              }}
            >
              Add New Book
            </button>
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
                allStories={stories.map(s => ({ id: s.id, title: s.title }))}
                onUpdateStory={handleStoryUpdate}
                onCreateEpisode={(episodeData) =>
                  handleCreateEpisode(story.id, episodeData)
                }
                onAddEbook={(ebookData) => handleAddEbook(story.id, ebookData)}
                onUpdateEbook={(ebookId, data) => handleUpdateEbook(story.id, ebookId, data)}
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

        {/* Episode Drafts section */}
        {episodeDrafts.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">My Episode Drafts</h2>
              <button
                onClick={() => router.push("/create-episode")}
                className="text-sm text-[#B8B6FC] hover:text-white transition-colors"
              >
                + New Episode
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {episodeDrafts.map((draft) => {
                const statusColors: Record<string, string> = {
                  drafting: "bg-amber-500/20 text-amber-400",
                  moodboard: "bg-blue-500/20 text-blue-400",
                  key_moments: "bg-blue-500/20 text-blue-400",
                  preflight: "bg-purple-500/20 text-purple-400",
                  filming: "bg-orange-500/20 text-orange-400",
                  ready: "bg-green-500/20 text-green-400",
                  failed: "bg-red-500/20 text-red-400",
                };
                const statusLabel: Record<string, string> = {
                  drafting: "Script",
                  moodboard: "Moodboard",
                  key_moments: "Key Moments",
                  preflight: "Pre-flight",
                  filming: "Filming",
                  ready: "Ready",
                  failed: "Failed",
                };
                const colorClass = statusColors[draft.status] || "bg-white/10 text-white/60";
                const label = statusLabel[draft.status] || draft.status;
                const updatedDate = new Date(draft.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });

                return (
                  <button
                    key={draft.id}
                    onClick={() => router.push(`/create-episode?g=${draft.id}`)}
                    className="bg-[#0F0E13] border border-[#1A1E2F] rounded-xl p-4 text-left hover:border-[#B8B6FC]/40 transition-colors group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-white font-medium text-sm truncate flex-1 mr-2 group-hover:text-[#B8B6FC] transition-colors">
                        {draft.title || "Untitled"}
                      </h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${colorClass}`}>
                        {label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-white/40">
                      <span>{draft.style}</span>
                      <span>Updated {updatedDate}</span>
                    </div>
                  </button>
                );
              })}
            </div>
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

      {/* Add Book Modal */}
      <AddBookModal
        isOpen={showAddBookModal}
        onClose={() => setShowAddBookModal(false)}
        onSave={handleAddBookFromModal}
        stories={stories.map(s => ({ id: s.id, title: s.title }))}
        isSaving={isAddingBook}
      />

      {/* Story Picker for Episode Creation */}
      <StoryPickerModal
        isOpen={showEpisodeStoryPicker}
        onClose={() => setShowEpisodeStoryPicker(false)}
        onSelect={(storyId) => {
          setShowEpisodeStoryPicker(false);
          router.push(`/create-episode?storyId=${storyId}`);
        }}
        stories={stories.map(s => ({
          id: s.id,
          title: s.title,
          cover: s.cover,
          episodeCount: s.episodeCount,
        }))}
        title="Choose a Story"
        description="Which story should this episode belong to?"
      />
    </div>
  );
}
