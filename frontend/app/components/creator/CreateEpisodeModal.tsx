"use client";

import { useState, useEffect } from "react";
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
  const [isFree, setIsFree] = useState(true); // Beta: all episodes free
  const [mounted, setMounted] = useState(false);

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

  const handleSubmit = () => {
    if (!episodeName.trim()) {
      alert("Episode name is required");
      return;
    }

    onSave({
      number: nextEpisodeNumber,
      name: episodeName,
      isFree,
      status: "draft",
    });

    setEpisodeName("");
    setIsFree(true);
  };

  const handleClose = () => {
    setEpisodeName("");
    setIsFree(true);
    onClose();
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/95" onClick={handleClose} />

      <div className="relative bg-[#0F0E13] border border-[#1A1E2F] rounded-3xl p-6 w-full max-w-[500px] mx-4">
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

        {/* Episode Number */}
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

        {/* Beta: all episodes are free — checkbox hidden */}

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
