"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Episode } from "@/app/data/mockCreatorData";
import { useAuth } from "@/app/context/AuthContext";
import FilmPreviewModal from "./FilmPreviewModal";

interface EpisodeListProps {
  episodes: Episode[];
  freeCount?: number;
  editable?: boolean;
  creatorUsername?: string;
}

export default function EpisodeList({ episodes, editable, creatorUsername }: EpisodeListProps) {
  const [playingEpisode, setPlayingEpisode] = useState<Episode | null>(null);
  const [showLoginGate, setShowLoginGate] = useState(false);
  const [showSubscribeGate, setShowSubscribeGate] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  // Check if an episode is playable (has video + user has access)
  const isEpisodePlayable = useCallback((ep: Episode) => {
    if (!ep.mediaUrl) return false;
    if (ep.number <= 2) return true;
    if (!user) return false;
    if (ep.number <= 4) return true;
    // Ep 5+: requires subscription — for now, not playable without sub
    return false;
  }, [user]);

  // Get the next playable episode after the current one
  const getNextPlayableEpisode = useCallback((current: Episode): Episode | null => {
    const sorted = [...episodes].sort((a, b) => a.number - b.number);
    const currentIndex = sorted.findIndex(e => e.id === current.id);
    for (let i = currentIndex + 1; i < sorted.length; i++) {
      if (isEpisodePlayable(sorted[i])) return sorted[i];
    }
    return null;
  }, [episodes, isEpisodePlayable]);

  const nextEpisode = playingEpisode ? getNextPlayableEpisode(playingEpisode) : null;

  const handleNextEpisode = useCallback(() => {
    if (nextEpisode) {
      setPlayingEpisode(nextEpisode);
    }
  }, [nextEpisode]);

  const handleEpisodeClick = (episode: Episode) => {
    const hasVideo = !!episode.mediaUrl;
    if (!hasVideo) return;

    // Ep 1-2: always free, play directly
    if (episode.number <= 2) {
      setPlayingEpisode(episode);
      return;
    }

    // Not logged in: show login gate for ep 3+
    if (!user) {
      setShowLoginGate(true);
      return;
    }

    // Ep 3-4: free for logged in users
    if (episode.number <= 4) {
      setPlayingEpisode(episode);
      return;
    }

    // Ep 5+: requires subscription (for now, show subscribe gate)
    setShowSubscribeGate(true);
  };

  return (
    <div className="flex flex-col gap-3 mt-4 border-t border-[#2C2C43] pt-4">
      {episodes.map((episode) => {
        const hasVideo = !!episode.mediaUrl;

        // Determine episode tier label
        let statusLabel: React.ReactNode;
        if (episode.number <= 2) {
          statusLabel = (
            <span className="text-[#ADADAD] text-xl tracking-tight">(Free)</span>
          );
        } else if (episode.number <= 4) {
          statusLabel = user ? (
            <span className="text-[#ADADAD] text-xl tracking-tight">(Free)</span>
          ) : (
            <span className="text-[#ADADAD] text-base tracking-tight">(Free | Login to watch)</span>
          );
        } else {
          statusLabel = (
            <div className="flex items-center gap-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#ADADAD">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" />
              </svg>
              <span className="text-[#1ED760] text-xl tracking-tight">
                Subscribe to watch
              </span>
            </div>
          );
        }

        return (
          <div
            key={episode.id}
            className={`flex items-center gap-3 py-2.5 px-3 rounded-lg border-b-2 border-transparent hover:border-[#ADADAD] transition-colors ${hasVideo ? "cursor-pointer" : ""}`}
            onClick={hasVideo ? () => handleEpisodeClick(episode) : undefined}
          >
            {/* Play circle icon */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              className="flex-shrink-0"
            >
              <circle cx="12" cy="12" r="10" fill={hasVideo ? "#9C99FF" : "#ADADAD"} />
              <path d="M10 8L16 12L10 16V8Z" fill={hasVideo ? "#fff" : "#000000"} />
            </svg>

            {/* Episode info */}
            <span className="text-white text-xl tracking-tight">
              Episode {episode.number}:
            </span>
            <span className="text-white text-xl tracking-tight flex-1">
              {episode.name}
            </span>

            {/* Edit button (creator dashboard only) */}
            {editable && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (episode.generationId) {
                    router.push(`/create-episode?g=${episode.generationId}`);
                  }
                }}
                disabled={!episode.generationId}
                className={`p-1.5 rounded-md transition-colors ${episode.generationId ? "hover:bg-white/10" : "opacity-30 cursor-not-allowed"}`}
                title={episode.generationId ? "Edit episode" : "No linked generation"}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ADADAD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            )}

            {/* Status label */}
            {statusLabel}
          </div>
        );
      })}

      {/* Film preview modal */}
      <FilmPreviewModal
        isOpen={!!playingEpisode}
        onClose={() => setPlayingEpisode(null)}
        videoUrl={playingEpisode?.mediaUrl || ""}
        title={playingEpisode ? `Episode ${playingEpisode.number}: ${playingEpisode.name}` : undefined}
        nextEpisodeTitle={nextEpisode ? `Episode ${nextEpisode.number}: ${nextEpisode.name}` : undefined}
        onNextEpisode={nextEpisode ? handleNextEpisode : undefined}
      />

      {/* Login gate overlay */}
      {showLoginGate && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowLoginGate(false)}>
          <div className="bg-panel rounded-2xl p-8 max-w-sm w-full text-center" onClick={(e) => e.stopPropagation()}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="mx-auto mb-4">
              <circle cx="12" cy="12" r="10" fill="#9C99FF" />
              <path d="M10 8L16 12L10 16V8Z" fill="#fff" />
            </svg>
            <h3 className="text-white text-xl font-bold mb-2">Login to watch more</h3>
            <p className="text-white/60 text-sm mb-6">
              Create a free account to unlock more episodes.
            </p>
            <button
              onClick={() => router.push("/login")}
              className="w-full py-3 rounded-lg font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #9C99FF 0%, #7370FF 60%)" }}
            >
              Continue
            </button>
            <button
              onClick={() => setShowLoginGate(false)}
              className="mt-3 text-white/50 text-sm hover:text-white transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}

      {/* Subscribe gate overlay */}
      {showSubscribeGate && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSubscribeGate(false)}>
          <div className="bg-panel rounded-2xl p-8 max-w-sm w-full text-center" onClick={(e) => e.stopPropagation()}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="#ADADAD" className="mx-auto mb-4">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" />
            </svg>
            <h3 className="text-white text-xl font-bold mb-2">Subscribe to watch</h3>
            <p className="text-white/60 text-sm mb-6">
              Subscribe to unlock all episodes across every story by this creator.
            </p>
            <button
              onClick={() => {
                setShowSubscribeGate(false);
                if (creatorUsername) {
                  router.push(`/creator/${creatorUsername}`);
                }
              }}
              className="w-full py-3 rounded-lg font-semibold text-black bg-[#1ED760] hover:bg-[#1ED760]/90 transition-colors"
            >
              Subscribe
            </button>
            <button
              onClick={() => setShowSubscribeGate(false)}
              className="mt-3 text-white/50 text-sm hover:text-white transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
