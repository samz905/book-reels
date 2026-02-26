"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Episode } from "@/app/data/mockCreatorData";

interface CreateEpisodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (episode: Omit<Episode, "id">) => void;
  nextEpisodeNumber: number;
  existingEpisodeNumbers?: number[];
}

export default function CreateEpisodeModal({
  isOpen,
  onClose,
  onSave,
  nextEpisodeNumber,
  existingEpisodeNumbers = [],
}: CreateEpisodeModalProps) {
  const [episodeName, setEpisodeName] = useState("");
  const [episodeNum, setEpisodeNum] = useState<number | "">(nextEpisodeNumber);
  const [isFree, setIsFree] = useState(true); // Beta: all episodes free
  const [mounted, setMounted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Sync default when prop changes
  useEffect(() => {
    setEpisodeNum(nextEpisodeNumber);
  }, [nextEpisodeNumber]);

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
    const errors: Record<string, string> = {};

    if (episodeNum === "" || episodeNum < 1) {
      errors.number = "Episode number must be at least 1";
    } else if (existingEpisodeNumbers.includes(episodeNum)) {
      errors.number = `Episode ${episodeNum} already exists`;
    }

    if (!episodeName.trim()) {
      errors.name = "Episode name is required";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    onSave({
      number: episodeNum as number,
      name: episodeName,
      isFree,
      status: "draft",
    });

    setEpisodeName("");
    setEpisodeNum(nextEpisodeNumber);
    setIsFree(true);
    setFieldErrors({});
  };

  const handleClose = () => {
    setEpisodeName("");
    setEpisodeNum(nextEpisodeNumber);
    setIsFree(true);
    setFieldErrors({});
    onClose();
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/95" onClick={handleClose} />

      <div className="relative bg-panel border border-panel-border rounded-3xl p-6 w-full max-w-[500px] mx-4">
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
          <label className="block text-white text-base mb-3">Episode Number</label>
          <input
            type="number"
            min="1"
            value={episodeNum}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "") { setEpisodeNum(""); return; }
              const num = parseInt(val);
              if (!isNaN(num) && num > 0) setEpisodeNum(num);
              setFieldErrors(prev => { const { number: _, ...rest } = prev; return rest; });
            }}
            onBlur={() => { if (episodeNum === "") setEpisodeNum(nextEpisodeNumber); }}
            className={`w-24 h-14 bg-[#262626] rounded-2xl px-4 text-white text-center text-lg font-bold focus:outline-none focus:ring-2 ${fieldErrors.number ? "ring-2 ring-red-500 focus:ring-red-500" : "focus:ring-[#B8B6FC]"}`}
          />
          {fieldErrors.number && (
            <p className="text-red-400 text-xs mt-2">{fieldErrors.number}</p>
          )}
        </div>

        {/* Episode Name */}
        <div className="mb-6">
          <label className="block text-white text-base mb-3">Episode Name</label>
          <input
            type="text"
            value={episodeName}
            onChange={(e) => {
              setEpisodeName(e.target.value);
              setFieldErrors(prev => { const { name: _, ...rest } = prev; return rest; });
            }}
            className={`w-full h-14 bg-[#262626] rounded-2xl px-4 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 ${fieldErrors.name ? "ring-2 ring-red-500 focus:ring-red-500" : "focus:ring-[#B8B6FC]"}`}
            placeholder="Enter episode name"
          />
          {fieldErrors.name && (
            <p className="text-red-400 text-xs mt-2">{fieldErrors.name}</p>
          )}
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
