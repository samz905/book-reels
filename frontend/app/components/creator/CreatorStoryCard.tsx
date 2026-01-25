"use client";

import { useState } from "react";
import Image from "next/image";
import { Story, formatViewCount } from "@/app/data/mockCreatorData";
import EpisodeList from "./EpisodeList";

interface Ebook {
  id: string;
  title: string;
  description: string;
  cover: string;
  price: number;
}

interface CreatorStoryCardProps {
  story: Story;
  onUpdateStory: (story: Story) => void;
}

// Mock ebooks for "Dive deeper" section
const mockEbooks: Ebook[] = [
  {
    id: "ebook-1",
    title: "The Wolf Prince's Mate (The Royals Of Presley Acres)",
    description:
      "Hello, my name is James, and I work as a UI/UX designer. I create user-friendly and visually appealing interfaces that improve user experience and help websites and apps convert visitors into real customers, increasing engagement, trust, and overall business revenue.",
    cover: "https://picsum.photos/seed/ebook1/100/160",
    price: 4.99,
  },
  {
    id: "ebook-2",
    title: "The Wolf Prince's Mate (The Royals Of Presley Acres)",
    description:
      "Hello, my name is James, and I work as a UI/UX designer. I create user-friendly and visually appealing interfaces that improve user experience and help websites and apps convert visitors into real customers, increasing engagement, trust, and overall business revenue.",
    cover: "https://picsum.photos/seed/ebook2/100/160",
    price: 4.99,
  },
  {
    id: "ebook-3",
    title: "The Wolf Prince's Mate (The Royals Of Presley Acres)",
    description:
      "Hello, my name is James, and I work as a UI/UX designer. I create user-friendly and visually appealing interfaces that improve user experience and help websites and apps convert visitors into real customers, increasing engagement, trust, and overall business revenue.",
    cover: "https://picsum.photos/seed/ebook3/100/160",
    price: 4.99,
  },
  {
    id: "ebook-4",
    title: "The Wolf Prince's Mate (The Royals Of Presley Acres)",
    description:
      "Hello, my name is James, and I work as a UI/UX designer. I create user-friendly and visually appealing interfaces that improve user experience and help websites and apps convert visitors into real customers, increasing engagement, trust, and overall business revenue.",
    cover: "https://picsum.photos/seed/ebook4/100/160",
    price: 4.99,
  },
];

export default function CreatorStoryCard({
  story,
  onUpdateStory,
}: CreatorStoryCardProps) {
  const [showEpisodes, setShowEpisodes] = useState(false);

  // Calculate free episode count (first 4 are free per design)
  const freeCount = 4;

  return (
    <div className="bg-[#0F0E13] rounded-xl p-6">
      {/* Header row: Stories + navigation arrows + edit button */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white text-2xl font-bold">Stories</h2>
        <div className="flex items-center gap-4">
          {/* Navigation arrows */}
          <div className="flex items-center gap-4">
            <button className="text-[#ADADAD] hover:text-white transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
              </svg>
            </button>
            <button className="text-[#ADADAD] hover:text-white transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
              </svg>
            </button>
          </div>
          {/* Edit button */}
          <button className="w-9 h-9 bg-[#3E3D40] rounded-full flex items-center justify-center hover:bg-[#4E4D50] transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#E8EAED">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Cover image - 205x290 per spec */}
        <div className="w-[205px] h-[290px] rounded-xl overflow-hidden border border-[#262626] flex-shrink-0">
          <Image
            src={story.cover}
            alt={story.title}
            width={205}
            height={290}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Story info */}
        <div className="flex-1 min-w-0">
          {/* Title - 24px bold */}
          <h3 className="text-white text-2xl font-bold mb-3">{story.title}</h3>

          {/* Tags row: Type | Episodes | Free episodes */}
          <div className="flex items-center gap-2 mb-4">
            {/* Story type with icon */}
            <div className="flex items-center gap-1">
              {story.type === "audio" ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#ADADAD">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#ADADAD">
                  <circle cx="12" cy="12" r="10" />
                </svg>
              )}
              <span className="text-[#ADADAD] text-sm tracking-tight">
                {story.type === "audio" ? "Audio Story" : "Video Story"}
              </span>
            </div>

            <span className="text-[#ADADAD]">|</span>

            {/* Episodes count with icon */}
            <div className="flex items-center gap-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="#ADADAD" />
                <path d="M10 8.5L15 12L10 15.5V8.5Z" fill="#000" />
              </svg>
              <span className="text-[#ADADAD] text-sm tracking-tight">
                {story.episodeCount} Episodes
              </span>
            </div>

            <span className="text-[#ADADAD]">|</span>

            {/* Free episodes */}
            <span className="text-[#ADADAD] text-sm tracking-tight">
              Episode 1-{freeCount} Free
            </span>
          </div>

          {/* Description - 14px */}
          <p className="text-white text-sm leading-[19px] tracking-tight mb-4 line-clamp-5">
            {story.description}
          </p>

          {/* Genre + Plays row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <span className="text-[#ADADAD] text-sm font-semibold uppercase tracking-tight">
                Genre
              </span>
              <span className="text-[#ADADAD]">|</span>
              <span className="text-[#ADADAD] text-sm font-semibold uppercase tracking-tight">
                Genre
              </span>
            </div>
            <div className="flex items-center gap-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#ADADAD">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              <span className="text-[#ADADAD] text-sm tracking-tight">
                {formatViewCount(story.viewCount)} Plays
              </span>
            </div>
          </div>

          {/* Show Episodes toggle - green, 22px bold */}
          <button
            onClick={() => setShowEpisodes(!showEpisodes)}
            className="flex items-center gap-2 text-[#1ED760] text-[22px] font-bold hover:opacity-80 transition-opacity"
          >
            Show Episodes
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="#1ED760"
              className={`transition-transform ${showEpisodes ? "rotate-180" : ""}`}
            >
              <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
            </svg>
          </button>

          {/* Episode list (collapsible) */}
          {showEpisodes && (
            <EpisodeList episodes={story.episodes} freeCount={freeCount} />
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-[#2C2C43] my-6" />

      {/* Dive deeper section */}
      <div>
        <div className="mb-6">
          <h4 className="text-white text-xl font-semibold mb-2">
            Dive deeper into the story
          </h4>
          <p className="text-[#ADADAD] text-sm tracking-tight">Ebooks</p>
        </div>

        {/* Ebooks grid */}
        <div className="flex gap-6">
          {mockEbooks.map((ebook, index) => (
            <div key={ebook.id} className="flex gap-3 flex-1">
              {/* Ebook content */}
              <div className="flex gap-3">
                {/* Cover with edit button */}
                <div className="relative flex flex-col gap-2">
                  <div className="w-[100px] h-[160px] rounded overflow-hidden bg-card-bg-2">
                    <Image
                      src={ebook.cover}
                      alt={ebook.title}
                      width={100}
                      height={160}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Edit button on last ebook */}
                  {index === mockEbooks.length - 1 && (
                    <button className="absolute top-2 right-2 w-9 h-9 bg-[#3E3D40] rounded-full flex items-center justify-center hover:bg-[#4E4D50] transition-colors">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#E8EAED">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                      </svg>
                    </button>
                  )}
                  {/* Price */}
                  <span className="text-[#FF8C00] text-sm font-semibold">
                    $ {ebook.price.toFixed(2)}
                  </span>
                </div>

                {/* Info */}
                <div className="flex flex-col gap-1 max-w-[239px]">
                  <h5 className="text-white text-sm font-semibold line-clamp-2">
                    {ebook.title}
                  </h5>
                  <p className="text-[#C5C5C5] text-sm leading-[19px] tracking-tight line-clamp-8">
                    {ebook.description}
                  </p>
                </div>
              </div>

              {/* Vertical divider (except last) */}
              {index < mockEbooks.length - 1 && (
                <div className="w-px bg-[#272727] self-stretch" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
