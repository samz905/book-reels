"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import posthog from "posthog-js";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ProfileCard from "../components/creator/ProfileCard";
import StatsCard from "../components/creator/StatsCard";
import SubscriptionCard from "../components/creator/SubscriptionCard";
import CreatorStoryCard from "../components/creator/CreatorStoryCard";
import CreateStoryModal from "../components/creator/CreateStoryModal";
import AddBookModal from "../components/creator/AddBookModal";
import StoryPickerModal from "../components/creator/StoryPickerModal";
import CreateEpisodeModal from "../components/creator/CreateEpisodeModal";
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
  createProfile,
  updateProfile,
  createStory,
  updateStory,
  updateCreatorSettings,
  createEpisode,
  createEbook,
  updateEbook,
  generateUsernameFromName,
  mapDbProfileToFrontend,
} from "@/lib/api/creator";
import {
  useProfile,
  useMyStories,
  useCreatorSettings,
  queryKeys,
} from "@/lib/hooks/queries";

export default function CreatePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, accessStatus } = useAuth();

  // React Query — cached, stale-while-revalidate data loading
  const {
    data: profileData,
    isLoading: profileLoading,
    error: profileError,
  } = useProfile(user?.id);
  const {
    data: stories = [],
    isLoading: storiesLoading,
    error: storiesError,
  } = useMyStories(user?.id);
  const { data: subscription = defaultSubscription } = useCreatorSettings();

  // Derived profile with story/episode counts
  const [profile, setProfile] = useState<CreatorProfile | null>(null);

  // Auto-create profile if it doesn't exist
  useEffect(() => {
    if (!user || profileLoading) return;
    if (profileData) {
      const totalEpisodes = stories.reduce((sum, s) => sum + s.episodeCount, 0);
      setProfile(
        mapDbProfileToFrontend(profileData, stories.length, totalEpisodes)
      );
      return;
    }
    // Profile doesn't exist — create one
    const createNewProfile = async () => {
      const userName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "New Creator";
      const username = generateUsernameFromName(userName);
      const userAvatar =
        user.user_metadata?.avatar_url ||
        user.user_metadata?.picture ||
        null;
      await createProfile(user.id, {
        username,
        name: userName,
        bio: "",
        avatar_url: userAvatar,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile(user.id) });
    };
    createNewProfile().catch(console.error);
  }, [user, profileData, profileLoading, stories, queryClient]);

  // UI-only state
  const [showCreateStoryModal, setShowCreateStoryModal] = useState(false);
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [showEpisodeStoryPicker, setShowEpisodeStoryPicker] = useState(false);
  const [showCreateEpisodeModal, setShowCreateEpisodeModal] = useState(false);
  const [selectedStoryIdForEpisode, setSelectedStoryIdForEpisode] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingBook, setIsAddingBook] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLoading = authLoading || profileLoading || storiesLoading;

  // Mutation handlers — call API then invalidate cache
  const handleProfileUpdate = async (updatedProfile: CreatorProfile) => {
    if (!user) return;
    try {
      await updateProfile(user.id, {
        username: updatedProfile.username,
        name: updatedProfile.name,
        bio: updatedProfile.bio,
        avatar_url: updatedProfile.avatar,
      });
      setProfile(updatedProfile);
      queryClient.invalidateQueries({ queryKey: queryKeys.profile(user.id) });
    } catch (err) {
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
      queryClient.invalidateQueries({ queryKey: queryKeys.creatorSettings() });
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
      queryClient.invalidateQueries({ queryKey: queryKeys.stories(user!.id) });
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
    try {
      await createStory({
        title: storyData.title,
        type: storyData.type,
        description: storyData.description,
        cover_url: storyData.cover || null,
        genres: storyData.genre,
        status: storyData.status,
      });
      posthog.capture("story_created", {
        title: storyData.title,
        type: storyData.type,
        genres: storyData.genre,
        status: storyData.status,
      });
      setShowCreateStoryModal(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.stories(user!.id) });
    } catch (err) {
      posthog.captureException(err instanceof Error ? err : new Error(String(err)));
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
      posthog.capture("episode_created", {
        story_id: storyId,
        episode_number: episodeData.number,
        episode_name: episodeData.name,
        is_free: episodeData.isFree,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.stories(user!.id) });
      return newEpisode;
    } catch (err) {
      posthog.captureException(err instanceof Error ? err : new Error(String(err)));
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
      posthog.capture("ebook_added", {
        story_id: storyId,
        title: ebookData.title,
        price: ebookData.price,
        has_cover: !!ebookData.coverUrl,
        has_isbn: !!ebookData.isbn,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.stories(user!.id) });
      return newEbook;
    } catch (err) {
      posthog.captureException(err instanceof Error ? err : new Error(String(err)));
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
      await updateEbook(ebookId, {
        title: data.title,
        cover_url: data.coverUrl || null,
        isbn: data.isbn || null,
        price: data.price,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.stories(user!.id) });
    } catch (err) {
      console.error("Error updating ebook:", err);
      throw err;
    }
  };

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
      await createEbook(ebookData.storyId, {
        title: ebookData.title,
        file_url: ebookData.fileUrl,
        cover_url: ebookData.coverUrl || null,
        isbn: ebookData.isbn || null,
        price: ebookData.price,
      });
      setShowAddBookModal(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.stories(user!.id) });
    } catch (err) {
      console.error("Error creating ebook:", err);
      throw err;
    } finally {
      setIsAddingBook(false);
    }
  };

  // Show loading state (only on first visit — cached data shown instantly on revisit)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black relative overflow-clip">
        <Header />
        <main className="relative z-10 px-4 md:px-6 py-8 pb-16 max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
              <div className="bg-panel rounded-xl p-6 h-48" />
              <div className="bg-panel rounded-xl p-6 h-48" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-panel rounded-xl p-6 h-40" />
              <div className="bg-panel rounded-xl p-6 h-40" />
            </div>
          </div>
        </main>
        {/* <Footer /> */}
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  if (accessStatus !== "approved") {
    router.push("/waitlist");
    return null;
  }

  if ((profileError || storiesError) && !profile) {
    const errMsg = profileError?.message || storiesError?.message || "Failed to load data";
    return (
      <div className="min-h-screen bg-black relative overflow-clip">
        <Header />
        <main className="relative z-10 px-4 md:px-6 py-8 pb-16 max-w-7xl mx-auto">
          <div className="bg-panel rounded-xl p-8 text-center">
            <h2 className="text-red-400 text-xl font-semibold mb-4">
              Error loading dashboard
            </h2>
            <p className="text-white/60 mb-6">{errMsg}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 rounded-lg font-semibold text-white bg-orange-500 hover:bg-orange-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </main>
        {/* <Footer /> */}
      </div>
    );
  }

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

      <main className="relative z-10 px-4 md:px-6 py-8 pb-16 max-w-7xl mx-auto">
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 mb-6">
          <ProfileCard
            profile={displayProfile}
            onUpdate={handleProfileUpdate}
          />

          <div className="bg-panel rounded-xl p-6 flex flex-col gap-5">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <StatsCard stats={emptyStats} />
          <SubscriptionCard
            subscription={subscription}
            onUpdate={handleSubscriptionUpdate}
          />
        </div>

        {stories.length > 0 && (
          <div className="space-y-6">
            {stories.map((story) => (
              <CreatorStoryCard
                key={story.id}
                story={story}
                allStories={stories.map(s => ({ id: s.id, title: s.title }))}
                onUpdateStory={handleStoryUpdate}
                onAddEbook={(ebookData) => handleAddEbook(story.id, ebookData)}
                onUpdateEbook={(ebookId, data) => handleUpdateEbook(story.id, ebookId, data)}
              />
            ))}
          </div>
        )}

        {stories.length === 0 && (
          <div className="bg-panel rounded-xl p-8 text-center">
            <h3 className="text-white text-lg font-semibold mb-2">
              No stories yet
            </h3>
            <p className="text-white/60 mb-4">
              Create your first story to start publishing content.
            </p>
          </div>
        )}

      </main>

      {/* <Footer /> */}

      <CreateStoryModal
        isOpen={showCreateStoryModal}
        onClose={() => setShowCreateStoryModal(false)}
        onSave={handleCreateStory}
        isSaving={isSaving}
      />

      <AddBookModal
        isOpen={showAddBookModal}
        onClose={() => setShowAddBookModal(false)}
        onSave={handleAddBookFromModal}
        stories={stories.map(s => ({ id: s.id, title: s.title }))}
        isSaving={isAddingBook}
      />

      <StoryPickerModal
        isOpen={showEpisodeStoryPicker}
        onClose={() => setShowEpisodeStoryPicker(false)}
        onSelect={(storyId) => {
          setShowEpisodeStoryPicker(false);
          setSelectedStoryIdForEpisode(storyId);
          setShowCreateEpisodeModal(true);
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

      <CreateEpisodeModal
        isOpen={showCreateEpisodeModal}
        onClose={() => setShowCreateEpisodeModal(false)}
        onSave={(episode) => {
          setShowCreateEpisodeModal(false);
          const params = new URLSearchParams({
            storyId: selectedStoryIdForEpisode!,
            name: episode.name,
            number: String(episode.number),
            isFree: String(episode.isFree),
          });
          router.push(`/create-episode?${params.toString()}`);
        }}
        nextEpisodeNumber={(() => {
          const eps = stories.find(s => s.id === selectedStoryIdForEpisode)?.episodes || [];
          return eps.length > 0 ? Math.max(...eps.map(e => e.number)) + 1 : 1;
        })()}
        existingEpisodeNumbers={
          stories.find(s => s.id === selectedStoryIdForEpisode)?.episodes.map(e => e.number) || []
        }
      />
    </div>
  );
}
