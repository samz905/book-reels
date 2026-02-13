"use client";

import { Episode } from "@/app/data/mockCreatorData";

interface EpisodeListProps {
  episodes: Episode[];
  freeCount: number;
}

export default function EpisodeList({ episodes, freeCount }: EpisodeListProps) {
  return (
    <div className="flex flex-col gap-3 mt-4 border-t border-[#2C2C43] pt-4">
      {episodes.map((episode) => (
        <div
          key={episode.id}
          className="flex items-center gap-3 py-2.5 px-3 rounded-lg border-b-2 border-transparent hover:border-[#ADADAD] transition-colors cursor-pointer"
        >
          {/* Play circle icon */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            className="flex-shrink-0"
          >
            <circle cx="12" cy="12" r="10" fill="#ADADAD" />
            <path d="M10 8L16 12L10 16V8Z" fill="#000000" />
          </svg>

          {/* Episode info */}
          <span className="text-white text-xl tracking-tight">
            Episode {episode.number}:
          </span>
          <span className="text-white text-xl tracking-tight">
            {episode.name}
          </span>

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
      ))}
    </div>
  );
}
