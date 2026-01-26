"use client";

import Image from "next/image";
import { CreatorProfile } from "@/app/data/mockCreatorData";
import ShareButton from "../shared/ShareButton";

interface PublicProfileHeaderProps {
  profile: CreatorProfile;
  subscriptionPrice: number;
  subscriptionDescription: string;
  isSticky?: boolean;
}

export default function PublicProfileHeader({
  profile,
  subscriptionPrice,
  subscriptionDescription,
  isSticky = false,
}: PublicProfileHeaderProps) {
  return (
    <div
      className={`bg-[#0F0E13] rounded-xl p-6 transition-all ${
        isSticky ? "shadow-lg backdrop-blur-sm" : ""
      }`}
    >
      {/* Main content row */}
      <div className="flex items-start justify-between gap-6">
        {/* Left side: Avatar + Info */}
        <div className="flex items-start gap-4 flex-1 min-w-0">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full overflow-hidden bg-card-bg-2 flex-shrink-0">
            {profile.avatar ? (
              <Image
                src={profile.avatar}
                alt={profile.name}
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="text-white/50"
                >
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
            )}
          </div>

          {/* Name + Bio */}
          <div className="flex-1 min-w-0">
            <h1 className="text-white text-xl font-bold mb-1">{profile.name}</h1>
            <p className="text-white/70 text-sm leading-[19px] tracking-tight line-clamp-2">
              {profile.bio}
            </p>
          </div>
        </div>

        {/* Right side: Subscribe button */}
        <div className="flex flex-col items-end flex-shrink-0">
          <button
            className="px-6 py-2.5 rounded-lg font-semibold text-white text-sm whitespace-nowrap"
            style={{
              background: "linear-gradient(135deg, #9C99FF 0%, #7370FF 60%)",
            }}
          >
            Subscribe for ${subscriptionPrice.toFixed(2)} / month
          </button>
          <p className="text-white/50 text-xs mt-2 text-right">
            {subscriptionDescription}
          </p>
        </div>
      </div>

      {/* Stats row + Share button */}
      <div className="flex items-center justify-between mt-4">
        {/* Stats */}
        <div className="flex items-center gap-2">
          <span className="text-purple text-sm font-semibold">
            {profile.storiesCount} Stories
          </span>
          <span className="text-white/50">|</span>
          <span className="text-purple text-sm font-semibold">
            {profile.episodesCount} Episodes
          </span>
          <span className="text-white/50">|</span>
          <span className="text-purple text-sm font-semibold">
            {profile.newEpisodesWeekly} New Episodes Weekly
          </span>
        </div>

        {/* Share button */}
        <ShareButton />
      </div>
    </div>
  );
}
