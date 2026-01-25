"use client";

import { useState } from "react";
import Image from "next/image";
import { Story, formatViewCount } from "@/app/data/mockCreatorData";
import EpisodeList from "./EpisodeList";

interface CreatorStoryCardProps {
  story: Story;
  onUpdateStory: (story: Story) => void;
}

export default function CreatorStoryCard({
  story,
  onUpdateStory,
}: CreatorStoryCardProps) {
  const [showEpisodes, setShowEpisodes] = useState(false);

  const handleToggleEpisodeFree = (episodeId: string) => {
    const updatedEpisodes = story.episodes.map((ep) =>
      ep.id === episodeId ? { ...ep, isFree: !ep.isFree } : ep
    );
    onUpdateStory({ ...story, episodes: updatedEpisodes });
  };

  // Get first 4 episodes for "Dive deeper" section
  const previewEpisodes = story.episodes.slice(0, 4);

  return (
    <div className="bg-card-bg-1 rounded-2xl p-6">
      {/* Header with "Stories" label */}
      <h3 className="text-white/50 text-sm font-medium mb-4">Stories</h3>

      <div className="flex gap-6">
        {/* Cover image */}
        <div className="w-32 h-48 rounded-xl overflow-hidden bg-card-bg-2 flex-shrink-0">
          <Image
            src={story.cover}
            alt={story.title}
            width={128}
            height={192}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Story info */}
        <div className="flex-1 min-w-0">
          {/* Title and badges */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-white text-lg font-semibold">{story.title}</h4>
              <div className="flex items-center gap-3 mt-2">
                {/* Type badge */}
                <span className="flex items-center gap-1.5 text-white/70 text-sm">
                  {story.type === "video" ? (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                  ) : (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                  )}
                  {story.type === "video" ? "Video" : "Audio"}
                </span>
                <span className="text-white/30">|</span>
                <span className="text-white/70 text-sm">
                  {story.episodeCount} Episodes
                </span>
                <span className="text-white/30">|</span>
                <span className="text-white/70 text-sm">
                  {formatViewCount(story.viewCount)}
                </span>
              </div>
            </div>

            {/* Likes */}
            <div className="flex items-center gap-1 text-white/50 text-sm">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {story.likes.toLocaleString()}
            </div>
          </div>

          {/* Description */}
          <p className="text-white/70 text-sm mt-3 line-clamp-3">
            {story.description}
          </p>

          {/* Show Episodes toggle */}
          <button
            onClick={() => setShowEpisodes(!showEpisodes)}
            className="flex items-center gap-2 text-purple text-sm font-medium mt-4 hover:text-purple/80 transition-colors"
          >
            Show Episodes
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`transition-transform ${showEpisodes ? "rotate-180" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Episode list (collapsible) */}
          {showEpisodes && (
            <EpisodeList
              episodes={story.episodes}
              onToggleFree={handleToggleEpisodeFree}
            />
          )}
        </div>
      </div>

      {/* Dive deeper section */}
      <div className="mt-6">
        <h4 className="text-white/50 text-sm font-medium mb-3">
          Dive deeper into the story
        </h4>
        <div className="grid grid-cols-4 gap-3">
          {previewEpisodes.map((episode) => (
            <div
              key={episode.id}
              className="relative aspect-video rounded-lg overflow-hidden bg-card-bg-2"
            >
              {episode.thumbnail ? (
                <Image
                  src={episode.thumbnail}
                  alt={`Episode ${episode.number}`}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-white/30 text-xs">
                    Ep {episode.number}
                  </span>
                </div>
              )}
              {/* Episode info overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                <p className="text-white text-xs font-medium truncate">
                  {story.title}
                </p>
                <p className="text-white/60 text-xs">Episode {episode.number}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
