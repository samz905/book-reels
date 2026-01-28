"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Ebook } from "@/app/data/mockCreatorData";

interface AddBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (ebook: Omit<Ebook, "id">) => void;
}

export default function AddBookModal({
  isOpen,
  onClose,
  onSave,
}: AddBookModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cover, setCover] = useState<string | null>(null);
  const [price, setPrice] = useState("");
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
      setCover(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      alert("Book title is required");
      return;
    }
    if (!description.trim()) {
      alert("Description is required");
      return;
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      alert("Valid price is required");
      return;
    }

    onSave({
      title,
      description,
      cover: cover || "https://picsum.photos/seed/newbook/100/160",
      price: priceNum,
    });

    // Reset form
    setTitle("");
    setDescription("");
    setCover(null);
    setPrice("");
  };

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setCover(null);
    setPrice("");
    onClose();
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/95" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-[#0F0E13] border border-[#1A1E2F] rounded-3xl p-6 w-full max-w-[600px] mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white text-2xl font-bold">Add New Book</h2>
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
          <div className="w-[100px] h-[160px] bg-[#262626] rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
            {cover ? (
              <img src={cover} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
                <rect x="4" y="4" width="32" height="32" rx="4" stroke="#B0B0B0" strokeWidth="2" fill="none" />
                <circle cx="14" cy="14" r="3" stroke="#B0B0B0" strokeWidth="2" fill="none" />
                <path d="M4 28L14 18L24 28" stroke="#B0B0B0" strokeWidth="2" fill="none" />
              </svg>
            )}
          </div>

          {/* Upload button and text */}
          <div className="flex flex-col gap-3 pt-8">
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
            <p className="text-white text-[10px] leading-[130%] max-w-[200px]">
              Add a clear JPG or PNG — this will be the book cover.
            </p>
          </div>
        </div>

        {/* Book Title */}
        <div className="mb-6">
          <label className="block text-white text-base mb-3">Book Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full h-14 bg-[#262626] rounded-2xl px-4 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#B8B6FC]"
            placeholder="Enter book title"
          />
        </div>

        {/* Description */}
        <div className="mb-6">
          <label className="block text-white text-base mb-3">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full h-[120px] bg-[#262626] rounded-2xl px-4 py-4 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#B8B6FC] resize-none"
            placeholder="Enter book description"
          />
        </div>

        {/* Price */}
        <div className="mb-6">
          <label className="block text-white text-base mb-3">Price</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white">$</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full h-14 bg-[#262626] rounded-2xl px-4 pl-8 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#B8B6FC]"
              placeholder="0.00"
            />
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
            Add Book
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
