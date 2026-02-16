"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Episode } from "@/app/data/mockCreatorData";
import FilmPreviewModal from "./FilmPreviewModal";

interface EpisodeListProps {
  episodes: Episode[];
  freeCount: number;
  editable?: boolean;
}

export default function EpisodeList({ episodes, freeCount, editable }: EpisodeListProps) {
  const [playingEpisode, setPlayingEpisode] = useState<Episode | null>(null);
  const router = useRouter();

  return (
    <div className="flex flex-col gap-3 mt-4 border-t border-[#2C2C43] pt-4">
      {episodes.map((episode) => {
        const hasVideo = !!episode.mediaUrl;
        return (
          <div
            key={episode.id}
            className={`flex items-center gap-3 py-2.5 px-3 rounded-lg border-b-2 border-transparent hover:border-[#ADADAD] transition-colors ${hasVideo ? "cursor-pointer" : ""}`}
            onClick={hasVideo ? () => setPlayingEpisode(episode) : undefined}
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

            {/* Status */}
            {episode.number <= freeCount ? (
              <span className="text-[#ADADAD] text-xl tracking-tight">
                (Free)
              </span>
            ) : (
              <div className="flex items-center gap-1">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="#ADADAD"
                >
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" />
                </svg>
                <span className="text-[#1ED760] text-xl tracking-tight">
                  Subscribe to watch
                </span>
              </div>
            )}
          </div>
        );
      })}

      {/* Film preview modal */}
      <FilmPreviewModal
        isOpen={!!playingEpisode}
        onClose={() => setPlayingEpisode(null)}
        videoUrl={playingEpisode?.mediaUrl || ""}
        title={playingEpisode ? `Episode ${playingEpisode.number}: ${playingEpisode.name}` : undefined}
      />
    </div>
  );
}
