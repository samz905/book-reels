"use client";

import { Episode } from "@/app/data/mockCreatorData";

interface EpisodeListProps {
  episodes: Episode[];
  onToggleFree: (episodeId: string) => void;
}

export default function EpisodeList({
  episodes,
  onToggleFree,
}: EpisodeListProps) {
  return (
    <div className="space-y-2 mt-4 border-t border-border pt-4">
      {episodes.map((episode) => (
        <div
          key={episode.id}
          className="flex items-center justify-between py-2 px-3 hover:bg-card-bg-2 rounded-lg transition-colors"
        >
          <div className="flex items-center gap-3">
            {/* Checkbox */}
            <button
              onClick={() => onToggleFree(episode.id)}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                episode.isFree
                  ? "bg-green-500 border-green-500"
                  : "border-white/30 hover:border-white/50"
              }`}
            >
              {episode.isFree && (
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>

            {/* Episode info */}
            <span className="text-white text-sm">
              Episode {episode.number} - {episode.name}
            </span>
          </div>

          {/* Status tag */}
          {episode.isFree ? (
            <span className="text-green-500 text-xs font-medium px-2 py-1 rounded bg-green-500/10 border border-green-500/20">
              Free
            </span>
          ) : (
            <span className="flex items-center gap-1 text-purple text-xs font-medium px-2 py-1 rounded bg-purple/10 border border-purple/20">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Subscribe to watch
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
