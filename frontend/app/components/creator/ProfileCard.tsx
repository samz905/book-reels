"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CreatorProfile } from "@/app/data/mockCreatorData";
import ProfileEditModal from "./ProfileEditModal";

interface ProfileCardProps {
  profile: CreatorProfile;
  onUpdate: (profile: CreatorProfile) => Promise<void> | void;
}

export default function ProfileCard({ profile, onUpdate }: ProfileCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async (updatedProfile: CreatorProfile) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await onUpdate(updatedProfile);
      setShowModal(false);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to save profile";
      setSaveError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="bg-[#0F0E13] rounded-xl p-6">
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
                className="w-9 h-9 bg-[#3E3D40] rounded-full flex items-center justify-center hover:bg-[#4E4D50] transition-colors flex-shrink-0"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#E8EAED">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                </svg>
              </button>
            </div>

            <p className="text-white/70 text-sm mt-2 line-clamp-2">
              {profile.bio || "Add your bio here"}
            </p>

            {/* Stats row */}
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
              {profile.newEpisodesWeekly > 0 && (
                <>
                  <span className="text-white/30">|</span>
                  <span className="text-white">
                    <span className="font-semibold">
                      {profile.newEpisodesWeekly}
                    </span>{" "}
                    <span className="text-white/50">New Episodes Weekly</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* View Public Profile button */}
        <div className="mt-4 flex justify-end">
          <Link
            href={`/creator/${profile.username}`}
            className="px-4 py-2 border border-purple text-purple text-sm font-medium rounded-lg hover:bg-purple/10 transition-colors"
          >
            View Public Profile
          </Link>
        </div>
      </div>

      {/* Edit Modal */}
      {showModal && (
        <ProfileEditModal
          profile={profile}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
          isSaving={isSaving}
          error={saveError}
        />
      )}
    </>
  );
}
