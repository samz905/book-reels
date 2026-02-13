"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Episode } from "@/app/data/mockCreatorData";

interface CreateEpisodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (episode: Omit<Episode, "id">) => void;
  nextEpisodeNumber: number;
}

export default function CreateEpisodeModal({
  isOpen,
  onClose,
  onSave,
  nextEpisodeNumber,
}: CreateEpisodeModalProps) {
  const [episodeName, setEpisodeName] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [thumbnail, setThumbnail] = useState<string | undefined>(undefined);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

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
      setThumbnail(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!episodeName.trim()) {
      alert("Episode name is required");
      return;
    }

    onSave({
      number: nextEpisodeNumber,
      name: episodeName,
      isFree,
      thumbnail,
      status: "draft",
    });

    // Reset form
    setEpisodeName("");
    setIsFree(false);
    setThumbnail(undefined);
  };

  const handleClose = () => {
    setEpisodeName("");
    setIsFree(false);
    setThumbnail(undefined);
    onClose();
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/95" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-[#0F0E13] border border-[#1A1E2F] rounded-3xl p-6 w-full max-w-[500px] mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white text-2xl font-bold">Create New Episode</h2>
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

        {/* Episode Number (auto-assigned) */}
        <div className="mb-6">
          <div className="flex items-baseline gap-3">
            <span className="text-white text-base">Episode Number:</span>
            <span className="text-[#B8B6FC] text-2xl font-bold">{nextEpisodeNumber}</span>
          </div>
          <p className="text-white/40 text-xs mt-1">Automatically assigned as the next episode in sequence</p>
        </div>

        {/* Episode Name */}
        <div className="mb-6">
          <label className="block text-white text-base mb-3">Episode Name</label>
          <input
            type="text"
            value={episodeName}
            onChange={(e) => setEpisodeName(e.target.value)}
            className="w-full h-14 bg-[#262626] rounded-2xl px-4 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#B8B6FC]"
            placeholder="Enter episode name"
          />
        </div>

        {/* Is Free checkbox */}
        <div className="mb-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setIsFree(!isFree)}
              className={`w-6 h-6 rounded border flex items-center justify-center cursor-pointer ${
                isFree ? "bg-[#B8B6FC] border-[#B8B6FC]" : "border-[#ADADAD]"
              }`}
            >
              {isFree && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <span className="text-white text-[17px] font-semibold">Free Episode</span>
          </label>
          <p className="text-white/50 text-sm mt-2 ml-9">
            Free episodes are available to all users without subscription
          </p>
        </div>

        {/* Thumbnail upload */}
        <div className="mb-6">
          <label className="block text-white text-base mb-3">Thumbnail (Optional)</label>
          <div className="flex items-center gap-4">
            <div className="w-[120px] aspect-[9/16] bg-[#262626] rounded-lg flex items-center justify-center overflow-hidden">
              {thumbnail ? (
                <img src={thumbnail} alt="Thumbnail" className="w-full h-full object-cover" />
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B0B0B0" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              )}
            </div>
            <button
              type="button"
              onClick={handleUpload}
              className="flex items-center gap-2 px-4 py-2 bg-[#262550] border border-[#B8B6FC] rounded-lg text-white hover:bg-[#363580] transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" />
              </svg>
              Upload
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="px-6 py-3 text-[#ADADAD] text-sm font-bold hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-6 py-3 bg-[#262550] border border-[#B8B6FC] rounded-lg text-[#B8B6FC] text-sm font-semibold hover:bg-[#363580] transition-colors"
          >
            Create Episode
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
