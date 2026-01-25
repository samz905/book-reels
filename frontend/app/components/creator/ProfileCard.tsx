"use client";

import { useState } from "react";
import Image from "next/image";
import { CreatorProfile } from "@/app/data/mockCreatorData";
import ProfileEditModal from "./ProfileEditModal";

interface ProfileCardProps {
  profile: CreatorProfile;
  onUpdate: (profile: CreatorProfile) => void;
  isPopulated: boolean;
}

export default function ProfileCard({
  profile,
  onUpdate,
  isPopulated,
}: ProfileCardProps) {
  const [showModal, setShowModal] = useState(false);

  const handleSave = (updatedProfile: CreatorProfile) => {
    onUpdate(updatedProfile);
    setShowModal(false);
  };

  return (
    <>
      <div className="bg-card-bg-1 rounded-2xl p-6">
        <div className="flex gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-card-bg-2 overflow-hidden flex-shrink-0 flex items-center justify-center">
            {profile.avatar ? (
              <Image
                src={profile.avatar}
                alt={profile.name}
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            ) : (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-white/50"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-white text-lg font-semibold">
                  {profile.name}
                </h2>
                <p className="text-white/50 text-sm">@{profile.username}</p>
              </div>

              {/* Edit button */}
              <button
                onClick={() => setShowModal(true)}
                className="p-2 bg-card-bg-3 rounded-full hover:bg-card-bg-4 transition-colors flex-shrink-0"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-white"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </div>

            <p className="text-white/70 text-sm mt-2 line-clamp-2">
              {profile.bio}
            </p>

            {/* Stats row - only show when populated */}
            {isPopulated && (
              <div className="flex items-center gap-4 mt-4 text-sm">
                <span className="text-white">
                  <span className="font-semibold">{profile.storiesCount}</span>{" "}
                  <span className="text-white/50">Stories</span>
                </span>
                <span className="text-white/30">|</span>
                <span className="text-white">
                  <span className="font-semibold">{profile.episodesCount}</span>{" "}
                  <span className="text-white/50">Episodes</span>
                </span>
                <span className="text-white/30">|</span>
                <span className="text-white">
                  <span className="font-semibold">
                    {profile.newEpisodesWeekly}
                  </span>{" "}
                  <span className="text-white/50">New Episodes Weekly</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* View Public Profile button - only show when populated */}
        {isPopulated && (
          <div className="mt-4 flex justify-end">
            <button className="px-4 py-2 border border-purple text-purple text-sm font-medium rounded-lg hover:bg-purple/10 transition-colors">
              View Public Profile
            </button>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showModal && (
        <ProfileEditModal
          profile={profile}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
