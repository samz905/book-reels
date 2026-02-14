"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import {
  listGenerations as supaListGenerations,
  AIGenerationSummary,
} from "@/lib/supabase/ai-generations";
import { getMyStories } from "@/lib/api/creator";
import StoryPickerModal from "../components/creator/StoryPickerModal";
import CreateEpisodeModal from "../components/creator/CreateEpisodeModal";

const statusColors: Record<string, string> = {
  drafting: "bg-amber-500/20 text-amber-400",
  visuals: "bg-blue-500/20 text-blue-400",
  moodboard: "bg-blue-500/20 text-blue-400",
  key_moments: "bg-blue-500/20 text-blue-400",
  preflight: "bg-purple-500/20 text-purple-400",
  filming: "bg-orange-500/20 text-orange-400",
  ready: "bg-green-500/20 text-green-400",
  failed: "bg-red-500/20 text-red-400",
  interrupted: "bg-orange-500/20 text-orange-400",
};

const statusLabels: Record<string, string> = {
  drafting: "Script",
  visuals: "Visuals",
  moodboard: "Moodboard",
  key_moments: "Key Moments",
  preflight: "Pre-flight",
  filming: "Filming",
  ready: "Ready",
  failed: "Failed",
  interrupted: "Interrupted",
};

const styleLabels: Record<string, string> = {
  cinematic: "Cinematic",
  anime: "Anime",
  animated: "Animated",
  pixar: "Pixar",
  "3d_animated": "Pixar",
  "2d_animated": "Animated",
  "2d_anime": "Anime",
};

export default function DraftsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [drafts, setDrafts] = useState<AIGenerationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [availableStories, setAvailableStories] = useState<{ id: string; title: string; cover: string; episodeCount: number }[]>([]);
  const [showStoryPicker, setShowStoryPicker] = useState(false);
  const [showCreateEpisode, setShowCreateEpisode] = useState(false);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [allEpisodesCount, setAllEpisodesCount] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsLoading(false);
      return;
    }

    (async () => {
      try {
        const data = await supaListGenerations(50);
        setDrafts(data);
      } catch {
        // Non-critical
      } finally {
        setIsLoading(false);
      }
    })();
  }, [user, authLoading]);

  const handleNewEpisode = async () => {
    if (!user) return;
    try {
      const stories = await getMyStories(user.id);
      setAvailableStories(stories.map(s => ({ id: s.id, title: s.title, cover: s.cover, episodeCount: s.episodeCount })));
    } catch { /* ignore */ }
    setShowStoryPicker(true);
  };

  return (
    <div className="min-h-screen bg-black relative overflow-clip">
      <Header />

      <main className="relative z-10 px-6 py-8 max-w-7xl mx-auto">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-white text-2xl font-bold">My Drafts</h1>
            <p className="text-[#ADADAD] text-sm mt-1">
              Resume or manage your episode drafts
            </p>
          </div>
          {user && (
            <button
              onClick={handleNewEpisode}
              className="px-5 py-2.5 rounded-lg font-semibold text-sm text-white transition-opacity hover:opacity-90 border border-[#B8B6FC] flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #9C99FF 0%, #7370FF 60%)",
              }}
            >
              Create New Episode
            </button>
          )}
        </div>

        {/* Loading */}
        {(authLoading || isLoading) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-[#0F0E13] border border-[#1A1E2F] rounded-xl p-4 animate-pulse"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#1A1E2F]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 bg-[#1A1E2F] rounded" />
                    <div className="h-3 w-16 bg-[#1A1E2F] rounded" />
                    <div className="h-3 w-20 bg-[#1A1E2F] rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Not authenticated */}
        {!authLoading && !user && (
          <div className="bg-[#0F0E13] rounded-xl p-8 text-center">
            <h2 className="text-white text-xl font-semibold mb-4">
              Sign in to view your drafts
            </h2>
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
        )}

        {/* Empty state */}
        {!isLoading && user && drafts.length === 0 && (
          <div className="bg-[#0F0E13] border border-[#1A1E2F] rounded-xl p-12 text-center">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#555"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto mb-4"
            >
              <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-[#ADADAD] text-sm">No drafts yet</p>
            <p className="text-[#555] text-xs mt-1">
              Create an episode from the Creator Dashboard to get started
            </p>
          </div>
        )}

        {/* Drafts grid */}
        {!isLoading && user && drafts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {drafts.map((draft) => {
              const colorClass =
                statusColors[draft.status] || "bg-white/10 text-white/60";
              const label = statusLabels[draft.status] || draft.status;
              const styleLabel = styleLabels[draft.style] || draft.style;
              const updatedDate = new Date(draft.updated_at).toLocaleDateString(
                undefined,
                { month: "short", day: "numeric" }
              );

              return (
                <button
                  key={draft.id}
                  onClick={() =>
                    router.push(`/create-episode?g=${draft.id}`)
                  }
                  className="bg-[#0F0E13] border border-[#1A1E2F] rounded-xl p-4 text-left hover:border-[#B8B6FC]/40 transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#1A1E2F] flex items-center justify-center flex-shrink-0">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#666"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium text-sm truncate group-hover:text-[#B8B6FC] transition-colors">
                        {draft.title || "Untitled"}
                      </h3>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full ${colorClass}`}
                        >
                          {label}
                        </span>
                        <span className="text-[11px] text-white/40">
                          {styleLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/30 mt-1.5">
                        Updated {updatedDate}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>

      <Footer />

      <StoryPickerModal
        isOpen={showStoryPicker}
        onClose={() => setShowStoryPicker(false)}
        onSelect={(storyId) => {
          setShowStoryPicker(false);
          setSelectedStoryId(storyId);
          const story = availableStories.find(s => s.id === storyId);
          setAllEpisodesCount(story?.episodeCount || 0);
          setShowCreateEpisode(true);
        }}
        stories={availableStories}
        title="Choose a Story"
        description="Which story should this episode belong to?"
      />

      <CreateEpisodeModal
        isOpen={showCreateEpisode}
        onClose={() => setShowCreateEpisode(false)}
        onSave={(episode) => {
          setShowCreateEpisode(false);
          const params = new URLSearchParams({
            storyId: selectedStoryId!,
            name: episode.name,
            number: String(episode.number),
            isFree: String(episode.isFree),
          });
          router.push(`/create-episode?${params.toString()}`);
        }}
        nextEpisodeNumber={allEpisodesCount + 1}
      />
    </div>
  );
}
