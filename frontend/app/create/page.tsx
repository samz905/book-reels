"use client";

import { useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ProfileCard from "../components/creator/ProfileCard";
import StatsCard from "../components/creator/StatsCard";
import SubscriptionCard from "../components/creator/SubscriptionCard";
import CreatorStoryCard from "../components/creator/CreatorStoryCard";
import CreateStoryModal from "../components/creator/CreateStoryModal";
import {
  CreatorProfile,
  CreatorStats,
  Subscription,
  Story,
  emptyProfile,
  emptyStats,
  defaultSubscription,
  mockProfile,
  mockStats,
  mockSubscription,
  mockStories,
} from "../data/mockCreatorData";

export default function CreatePage() {
  // State
  const [isPopulated, setIsPopulated] = useState(false);
  const [profile, setProfile] = useState<CreatorProfile>(emptyProfile);
  const [stats, setStats] = useState<CreatorStats>(emptyStats);
  const [subscription, setSubscription] =
    useState<Subscription>(defaultSubscription);
  const [stories, setStories] = useState<Story[]>([]);
  const [showCreateStoryModal, setShowCreateStoryModal] = useState(false);

  // Populate function (temp button)
  const handlePopulate = () => {
    setProfile(mockProfile);
    setStats(mockStats);
    setSubscription(mockSubscription);
    setStories(mockStories);
    setIsPopulated(true);
  };

  // Update handlers
  const handleProfileUpdate = (updatedProfile: CreatorProfile) => {
    setProfile(updatedProfile);
  };

  const handleSubscriptionUpdate = (updatedSubscription: Subscription) => {
    setSubscription(updatedSubscription);
  };

  const handleStoryUpdate = (updatedStory: Story) => {
    setStories((prev) =>
      prev.map((s) => (s.id === updatedStory.id ? updatedStory : s))
    );
  };

  const handleCreateStory = (
    storyData: Omit<Story, "id" | "episodeCount" | "viewCount" | "likes" | "episodes" | "ebooks">
  ) => {
    const newStory: Story = {
      ...storyData,
      id: `story-${Date.now()}`,
      episodeCount: 0,
      viewCount: 0,
      likes: 0,
      episodes: [],
      ebooks: [],
    };
    setStories((prev) => [...prev, newStory]);
    setShowCreateStoryModal(false);
  };

  return (
    <div className="min-h-screen bg-black relative overflow-clip">
      <Header />

      <main className="relative z-10 px-6 py-8 max-w-7xl mx-auto">
        {/* Temp populate button */}
        {!isPopulated && (
          <button
            onClick={handlePopulate}
            className="mb-6 px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
          >
            Populate (remove this later)
          </button>
        )}

        {/* Top row: Profile + Create New Story / View Public Profile area */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 mb-6">
          <ProfileCard
            profile={profile}
            onUpdate={handleProfileUpdate}
            isPopulated={isPopulated}
          />

          {/* Create New Story card (only in empty state) */}
          {!isPopulated && (
            <div className="bg-[#0F0E13] rounded-xl p-6 flex flex-col">
              <button
                onClick={() => setShowCreateStoryModal(true)}
                className="w-full py-3 rounded-lg font-semibold text-white transition-opacity hover:opacity-90"
                style={{
                  background:
                    "linear-gradient(135deg, #9C99FF 0%, #7370FF 60%)",
                }}
              >
                Create New Story
              </button>
              <p className="text-white/50 text-sm mt-3">
                Set up a new story and start publishing episodes and books.
              </p>
            </div>
          )}
        </div>

        {/* Stats + Subscription row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <StatsCard stats={stats} />
          <SubscriptionCard
            subscription={subscription}
            onUpdate={handleSubscriptionUpdate}
          />
        </div>

        {/* Stories section (only when populated) */}
        {isPopulated && stories.length > 0 && (
          <div className="space-y-6">
            {stories.map((story) => (
              <CreatorStoryCard
                key={story.id}
                story={story}
                onUpdateStory={handleStoryUpdate}
              />
            ))}
          </div>
        )}
      </main>

      <Footer />

      {/* Create Story Modal */}
      <CreateStoryModal
        isOpen={showCreateStoryModal}
        onClose={() => setShowCreateStoryModal(false)}
        onSave={handleCreateStory}
      />
    </div>
  );
}
