"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CreatorProfile } from "@/app/data/mockCreatorData";

interface ProfileEditModalProps {
  profile: CreatorProfile;
  onSave: (profile: CreatorProfile) => void;
  onClose: () => void;
  isSaving?: boolean;
  error?: string | null;
}

export default function ProfileEditModal({
  profile,
  onSave,
  onClose,
  isSaving = false,
  error = null,
}: ProfileEditModalProps) {
  const [name, setName] = useState(profile.name);
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    onSave({
      ...profile,
      name,
      username,
      bio,
      avatar,
    });
  };

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Read and convert to data URL
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setAvatar(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Check if error is about username
  const isUsernameError =
    error?.toLowerCase().includes("username") ||
    error?.toLowerCase().includes("taken");

  const modalContent = (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000]">
      <div className="bg-card-bg-1 rounded-2xl p-6 w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white text-xl font-semibold">Profile Details</h2>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="text-white/50 hover:text-white transition-colors disabled:opacity-50"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Avatar section */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-full bg-card-bg-2 overflow-hidden flex items-center justify-center">
            {avatar ? (
              <img
                src={avatar}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <svg
                width="32"
                height="32"
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
          <div>
            <button
              type="button"
              onClick={handleUpload}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-white hover:bg-card-bg-2 transition-colors disabled:opacity-50"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Upload
            </button>
            <p className="text-white/50 text-xs mt-2">
              Make sure it&apos;s at least 400x400 pixels recommended for best
              quality across devices
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white/70 text-sm mb-2">
              Creator name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSaving}
              className="w-full bg-card-bg-2 border border-border rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-purple disabled:opacity-50"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-white/70 text-sm mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isSaving}
              className={`w-full bg-card-bg-2 border rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-purple disabled:opacity-50 ${
                isUsernameError
                  ? "border-red-500 focus:ring-red-500"
                  : "border-border"
              }`}
              placeholder="@username"
            />
            {isUsernameError && (
              <p className="text-red-400 text-xs mt-1">
                This username is already taken. Please choose another.
              </p>
            )}
          </div>

          <div>
            <label className="block text-white/70 text-sm mb-2">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              disabled={isSaving}
              rows={4}
              className="w-full bg-card-bg-2 border border-border rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-purple resize-none disabled:opacity-50"
              placeholder="Tell us about yourself..."
            />
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-6 py-2 text-white/70 hover:text-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 rounded-lg font-semibold text-white disabled:opacity-50 flex items-center gap-2"
              style={{
                background: "linear-gradient(135deg, #9C99FF 0%, #7370FF 60%)",
              }}
            >
              {isSaving && (
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              )}
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  if (!mounted) return null;

  return createPortal(modalContent, document.body);
}
