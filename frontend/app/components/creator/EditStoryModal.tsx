"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Story, GENRES } from "@/app/data/mockCreatorData";

interface EditStoryModalProps {
  isOpen: boolean;
  story: Story;
  onClose: () => void;
  onSave: (story: Story) => void | Promise<void>;
  isSaving?: boolean;
}

export default function EditStoryModal({
  isOpen,
  story,
  onClose,
  onSave,
  isSaving = false,
}: EditStoryModalProps) {
  const [cover, setCover] = useState<string>(story.cover);
  const [storyName, setStoryName] = useState(story.title);
  const [storyType] = useState<"video">("video");
  const [selectedGenres, setSelectedGenres] = useState<string[]>(story.genre);
  const [description, setDescription] = useState(story.description);
  const [status, setStatus] = useState<"draft" | "published">(story.status);
  const [isGenreDropdownOpen, setIsGenreDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Reset form when story changes
  useEffect(() => {
    setCover(story.cover);
    setStoryName(story.title);
    setSelectedGenres(story.genre);
    setDescription(story.description);
    setStatus(story.status);
  }, [story]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCover(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleGenreToggle = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre)
        ? prev.filter((g) => g !== genre)
        : [...prev, genre]
    );
  };

  const handleSubmit = async () => {
    if (isSaving) return;

    if (!storyName.trim()) {
      alert("Story name is required");
      return;
    }
    if (selectedGenres.length === 0) {
      alert("Select at least one genre");
      return;
    }
    if (!description.trim()) {
      alert("Description is required");
      return;
    }
    if (description.trim().split(/\s+/).filter(Boolean).length > 200) {
      return;
    }

    await onSave({
      ...story,
      title: storyName,
      type: storyType,
      description,
      cover,
      genre: selectedGenres,
      status,
    });
  };

  const handleClose = () => {
    if (isSaving) return;
    onClose();
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/95" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-panel border border-panel-border rounded-3xl p-6 w-full max-w-[686px] mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white text-2xl font-bold">Edit Story</h2>
          <button
            onClick={handleClose}
            className="w-6 h-6 rounded-full border border-[#ADADAD] flex items-center justify-center hover:border-white transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ADADAD" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Cover upload section */}
        <div className="flex gap-6 mb-6">
          {/* Cover preview */}
          <div className="w-[205px] h-[290px] bg-[#262626] rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
            {cover ? (
              <img src={cover} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <rect x="4" y="4" width="32" height="32" rx="4" stroke="#B0B0B0" strokeWidth="2" fill="none" />
                <circle cx="14" cy="14" r="3" stroke="#B0B0B0" strokeWidth="2" fill="none" />
                <path d="M4 28L14 18L24 28" stroke="#B0B0B0" strokeWidth="2" fill="none" />
                <path d="M22 24L28 18L36 26" stroke="#B0B0B0" strokeWidth="2" fill="none" />
              </svg>
            )}
          </div>

          {/* Upload button and text */}
          <div className="flex flex-col gap-3 pt-[102px]">
            <button
              type="button"
              onClick={handleUpload}
              className="flex items-center gap-2 px-4 py-2 bg-[#262550] border border-[#B8B6FC] rounded-lg text-white hover:bg-[#363580] transition-colors"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" />
              </svg>
              Upload
            </button>
            <p className="text-white text-[10px] leading-[130%] max-w-[283px]">
              Add a clear JPG or PNG (1600×2400 px recommended) — this will represent your book across the platform.
            </p>
          </div>
        </div>

        {/* Story Name */}
        <div className="mb-6">
          <label className="block text-white text-base mb-3">Story Name</label>
          <input
            type="text"
            value={storyName}
            onChange={(e) => setStoryName(e.target.value)}
            className="w-full h-14 bg-[#262626] rounded-2xl px-4 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#B8B6FC]"
            placeholder=""
          />
        </div>

        {/* Select Genres */}
        <div className="mb-6">
          <label className="block text-white text-base mb-3">Select Genres</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsGenreDropdownOpen(!isGenreDropdownOpen)}
              className={`w-full h-14 bg-[#262626] rounded-2xl px-4 text-left text-white flex items-center justify-between ${
                isGenreDropdownOpen ? "ring-2 ring-[#B8B6FC]" : ""
              }`}
            >
              <span className={selectedGenres.length === 0 ? "text-white/40" : "text-white"}>
                {selectedGenres.length === 0
                  ? ""
                  : selectedGenres.join(", ")}
              </span>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="#ADADAD"
                className={`transition-transform ${isGenreDropdownOpen ? "rotate-180" : ""}`}
              >
                <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
              </svg>
            </button>

            {/* Dropdown */}
            {isGenreDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#262626] rounded-2xl py-2 z-10 max-h-48 overflow-y-auto">
                {GENRES.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => handleGenreToggle(genre)}
                    className={`w-full px-4 py-2 text-left hover:bg-[#363636] transition-colors ${
                      selectedGenres.includes(genre) ? "text-[#B8B6FC]" : "text-white"
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Story Description */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-white text-base">Story Description</label>
            <span className={`text-sm ${description.trim().split(/\s+/).filter(Boolean).length > 200 ? "text-red-400" : "text-white/40"}`}>
              {description.trim() ? description.trim().split(/\s+/).filter(Boolean).length : 0}/200 words
            </span>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`w-full h-[148px] bg-[#262626] rounded-2xl px-4 py-4 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 resize-none ${description.trim().split(/\s+/).filter(Boolean).length > 200 ? "ring-2 ring-red-500 focus:ring-red-500" : "focus:ring-[#B8B6FC]"}`}
            placeholder=""
          />
          {description.trim().split(/\s+/).filter(Boolean).length > 200 && (
            <p className="text-red-400 text-sm mt-1">Description exceeds 200 words. Please shorten it to save.</p>
          )}
        </div>

        {/* Status */}
        <div className="mb-6">
          <label className="block text-white text-base font-medium mb-3">Status</label>
          {(() => {
            const hasContent = (story.episodes?.length || 0) > 0 || (story.ebooks?.length || 0) > 0;
            return (
              <>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div
                      onClick={() => setStatus("draft")}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer ${
                        status === "draft" ? "border-[#FF8C00]" : "border-[#ADADAD]"
                      }`}
                    >
                      {status === "draft" && (
                        <div className="w-3 h-3 rounded-full bg-[#FF8C00]" />
                      )}
                    </div>
                    <span className="text-white text-[17px] font-semibold">Draft</span>
                  </label>

                  <label className={`flex items-center gap-3 ${hasContent ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}>
                    <div
                      onClick={() => hasContent && setStatus("published")}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${hasContent ? "cursor-pointer" : "cursor-not-allowed"} ${
                        status === "published" ? "border-[#1ED760]" : "border-[#ADADAD]"
                      }`}
                    >
                      {status === "published" && (
                        <div className="w-3 h-3 rounded-full bg-[#1ED760]" />
                      )}
                    </div>
                    <span className="text-white text-[17px] font-semibold">Published</span>
                  </label>
                </div>
                {!hasContent && (
                  <p className="text-[#FF8C00] text-sm mt-2">
                    Add an episode or ebook to publish.
                  </p>
                )}
              </>
            );
          })()}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            className="px-6 py-3 text-[#ADADAD] text-sm font-bold hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving || description.trim().split(/\s+/).filter(Boolean).length > 200}
            className="px-6 py-3 bg-[#262550] border border-[#B8B6FC] rounded-lg text-[#B8B6FC] text-sm font-semibold hover:bg-[#363580] transition-colors disabled:opacity-50 flex items-center gap-2"
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
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
