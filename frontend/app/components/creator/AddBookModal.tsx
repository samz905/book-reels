"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { uploadEpubFile, uploadEbookCover, validateEpubFile, UploadError } from "@/lib/storage/upload";

interface Story {
  id: string;
  title: string;
}

interface EditingEbook {
  id: string;
  title: string;
  description?: string;
  cover?: string;
  fileUrl?: string;
  price: number;
  isbn?: string;
  storyId: string;
}

interface AddBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    storyId: string;
    title: string;
    description?: string;
    fileUrl: string;
    coverUrl?: string;
    price: number;
    isbn?: string;
  }) => Promise<void>;
  onUpdate?: (ebookId: string, data: {
    title: string;
    description?: string;
    coverUrl?: string;
    price: number;
    isbn?: string;
  }) => Promise<void>;
  stories: Story[];
  preselectedStoryId?: string;
  editingEbook?: EditingEbook;
  isSaving?: boolean;
}

export default function AddBookModal({
  isOpen,
  onClose,
  onSave,
  onUpdate,
  stories,
  preselectedStoryId,
  editingEbook,
  isSaving = false,
}: AddBookModalProps) {
  const isEditMode = !!editingEbook;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedStoryId, setSelectedStoryId] = useState<string>(preselectedStoryId || "");
  const [isStoryDropdownOpen, setIsStoryDropdownOpen] = useState(false);
  const [cover, setCover] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [epubFile, setEpubFile] = useState<File | null>(null);
  const [epubFileName, setEpubFileName] = useState<string>("");
  const [price, setPrice] = useState("");
  const [isbn, setIsbn] = useState("");
  const [mounted, setMounted] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const coverInputRef = useRef<HTMLInputElement>(null);
  const epubInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Pre-populate form when editing
  useEffect(() => {
    if (editingEbook) {
      setTitle(editingEbook.title);
      setDescription(editingEbook.description || "");
      setSelectedStoryId(editingEbook.storyId);
      setCover(editingEbook.cover || null);
      setPrice(editingEbook.price.toString());
      setIsbn(editingEbook.isbn || "");
      setEpubFileName(editingEbook.fileUrl ? "File uploaded" : "");
    } else if (preselectedStoryId) {
      setSelectedStoryId(preselectedStoryId);
    }
  }, [editingEbook, preselectedStoryId]);

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

  const handleCoverUpload = () => {
    coverInputRef.current?.click();
  };

  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image too large. Maximum size is 5MB.");
      return;
    }

    setCoverFile(file);
    setFieldErrors(prev => { const { cover: _, ...rest } = prev; return rest; });
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCover(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleEpubUpload = () => {
    epubInputRef.current?.click();
  };

  const handleEpubFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      validateEpubFile(file);
      setEpubFile(file);
      setEpubFileName(file.name);
      setUploadError(null);
      setFieldErrors(prev => { const { epub: _, ...rest } = prev; return rest; });
    } catch (err) {
      if (err instanceof UploadError) {
        setUploadError(err.message);
      } else {
        setUploadError("Invalid file");
      }
      setEpubFile(null);
      setEpubFileName("");
    }
  };

  const handleSubmit = async () => {
    if (isSaving || isUploading) return;

    // Validate all fields at once
    const errors: Record<string, string> = {};
    if (!cover) errors.cover = "Cover photo is required";
    if (!title.trim()) errors.title = "Book title is required";
    if (!description.trim()) errors.description = "Description is required";
    if (!selectedStoryId) errors.story = "Please select a story";
    if (!isEditMode && !epubFile) errors.epub = "Please upload an EPUB file";
    if (!price) {
      errors.price = "Price is required";
    } else {
      const num = parseFloat(price);
      if (isNaN(num) || num < 4.99) errors.price = "Price must be at least $4.99";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      if (errors.price) setPriceError(errors.price);
      return;
    }
    setFieldErrors({});
    setPriceError(null);
    const priceNum = parseFloat(price);

    setIsUploading(true);
    setUploadError(null);

    try {
      if (isEditMode && editingEbook && onUpdate) {
        // Edit mode - update existing ebook
        let coverUrl: string | undefined;
        if (coverFile) {
          coverUrl = await uploadEbookCover(coverFile, selectedStoryId);
        }

        await onUpdate(editingEbook.id, {
          title: title.trim(),
          description: description.trim(),
          coverUrl: coverUrl || editingEbook.cover,
          price: priceNum,
          isbn: isbn.trim() || undefined,
        });

        resetForm();
        onClose();
      } else {
        // Create mode - new ebook
        const epubResult = await uploadEpubFile(epubFile!, selectedStoryId);

        let coverUrl: string | undefined;
        if (coverFile) {
          coverUrl = await uploadEbookCover(coverFile, selectedStoryId);
        }

        await onSave({
          storyId: selectedStoryId,
          title: title.trim(),
          description: description.trim() || undefined,
          fileUrl: epubResult.path,
          coverUrl,
          price: priceNum,
          isbn: isbn.trim() || undefined,
        });

        resetForm();
      }
    } catch (err) {
      if (err instanceof UploadError) {
        setUploadError(err.message);
      } else {
        setUploadError(err instanceof Error ? err.message : "Upload failed");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setSelectedStoryId(preselectedStoryId || "");
    setCover(null);
    setCoverFile(null);
    setEpubFile(null);
    setEpubFileName("");
    setPrice("");
    setIsbn("");
    setUploadError(null);
    setPriceError(null);
    setFieldErrors({});
  };

  const handleClose = () => {
    if (isSaving || isUploading) return;
    resetForm();
    onClose();
  };

  const selectedStory = stories.find(s => s.id === selectedStoryId);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/95" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-panel border border-panel-border rounded-3xl p-6 w-full max-w-[686px] mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white text-2xl font-bold">{isEditMode ? "Edit Book" : "Add New Book"}</h2>
          <button
            onClick={handleClose}
            disabled={isSaving || isUploading}
            className="w-6 h-6 rounded-full border border-[#ADADAD] flex items-center justify-center hover:border-white transition-colors disabled:opacity-50"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ADADAD" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Hidden file inputs */}
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          onChange={handleCoverFileChange}
          className="hidden"
        />
        <input
          ref={epubInputRef}
          type="file"
          accept=".epub,application/epub+zip"
          onChange={handleEpubFileChange}
          className="hidden"
        />

        {/* Cover upload section */}
        <div className="mb-6">
          <div className="flex gap-6">
          {/* Cover preview */}
          <div className={`w-[125px] h-[217px] bg-[#262626] rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden ${fieldErrors.cover ? "ring-2 ring-red-500" : ""}`}>
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
          <div className="flex flex-col gap-3 pt-[72px]">
            <button
              type="button"
              onClick={handleCoverUpload}
              disabled={isSaving || isUploading}
              className="flex items-center gap-2 px-4 py-2 bg-[#262550] border border-[#B8B6FC] rounded-lg text-white hover:bg-[#363580] transition-colors disabled:opacity-50"
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
          {fieldErrors.cover && <p className="text-red-400 text-xs mt-1">{fieldErrors.cover}</p>}
        </div>

        {/* Book Title */}
        <div className="mb-6">
          <label className="block text-white text-base mb-3">Book Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setFieldErrors(prev => { const { title: _, ...rest } = prev; return rest; }); }}
            disabled={isSaving || isUploading}
            className={`w-full h-14 bg-[#262626] rounded-2xl px-4 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 disabled:opacity-50 ${fieldErrors.title ? "ring-2 ring-red-500 focus:ring-red-500" : "focus:ring-[#B8B6FC]"}`}
            placeholder=""
          />
          {fieldErrors.title && <p className="text-red-400 text-xs mt-1">{fieldErrors.title}</p>}
        </div>

        {/* Description */}
        <div className="mb-6">
          <label className="block text-white text-base mb-3">Description</label>
          <textarea
            value={description}
            onChange={(e) => { setDescription(e.target.value); setFieldErrors(prev => { const { description: _, ...rest } = prev; return rest; }); }}
            disabled={isSaving || isUploading}
            rows={4}
            className={`w-full bg-[#262626] rounded-2xl px-4 py-4 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 resize-none disabled:opacity-50 ${fieldErrors.description ? "ring-2 ring-red-500 focus:ring-red-500" : "focus:ring-[#B8B6FC]"}`}
            placeholder="Describe your ebook..."
          />
          {fieldErrors.description && <p className="text-red-400 text-xs mt-1">{fieldErrors.description}</p>}
        </div>

        {/* Select Story */}
        <div className="mb-6">
          <label className="block text-white text-base mb-3">Select Story</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => !isSaving && !isUploading && setIsStoryDropdownOpen(!isStoryDropdownOpen)}
              disabled={isSaving || isUploading}
              className={`w-full h-14 bg-[#262626] rounded-2xl px-4 text-left text-white flex items-center justify-between disabled:opacity-50 ${fieldErrors.story ? "ring-2 ring-red-500" : isStoryDropdownOpen ? "ring-2 ring-[#B8B6FC]" : ""
                }`}
            >
              <span className={selectedStory ? "text-white" : "text-white/40"}>
                {selectedStory?.title || ""}
              </span>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="#ADADAD"
                className={`transition-transform ${isStoryDropdownOpen ? "rotate-180" : ""}`}
              >
                <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
              </svg>
            </button>

            {/* Dropdown */}
            {isStoryDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#262626] rounded-2xl py-2 z-10 max-h-48 overflow-y-auto">
                {stories.length === 0 ? (
                  <div className="px-4 py-2 text-white/60">No stories available</div>
                ) : (
                  stories.map((story) => (
                    <button
                      key={story.id}
                      type="button"
                      onClick={() => {
                        setSelectedStoryId(story.id);
                        setIsStoryDropdownOpen(false);
                        setFieldErrors(prev => { const { story: _, ...rest } = prev; return rest; });
                      }}
                      className={`w-full px-4 py-2 text-left hover:bg-[#363636] transition-colors ${selectedStoryId === story.id ? "text-[#B8B6FC]" : "text-white"
                        }`}
                    >
                      {story.title}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          {fieldErrors.story && <p className="text-red-400 text-xs mt-1">{fieldErrors.story}</p>}
        </div>

        {/* Book Manuscript and Price row */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Book Manuscript */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <label className="text-white text-base">Book Manuscript</label>
              <span className="text-white/40 text-sm">
                Format: epub
              </span>
            </div>
            <button
              type="button"
              onClick={handleEpubUpload}
              disabled={isSaving || isUploading}
              className={`w-full h-14 bg-[#262626] rounded-2xl px-4 text-left flex items-center justify-between disabled:opacity-50 ${uploadError || fieldErrors.epub ? "ring-2 ring-red-500" : epubFile ? "ring-2 ring-green-500" : ""
                }`}
            >
              <span className={epubFileName ? "text-white truncate pr-2" : "text-white/40"}>
                {epubFileName || ""}
              </span>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#ADADAD" className="flex-shrink-0">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z" />
              </svg>
            </button>
            {(uploadError || fieldErrors.epub) && (
              <p className="text-red-400 text-xs mt-1">{uploadError || fieldErrors.epub}</p>
            )}
          </div>

          {/* Price */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <label className="text-white text-base">Price</label>
              <span className="text-white/40 text-sm ml-auto">Min: $4.99</span>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white">$</span>
              <input
                type="number"
                step="0.01"
                min="4.99"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  setFieldErrors(prev => { const { price: _, ...rest } = prev; return rest; });
                  const num = parseFloat(e.target.value);
                  if (e.target.value && !isNaN(num) && num < 4.99) {
                    setPriceError("Price must be at least $4.99");
                  } else {
                    setPriceError(null);
                  }
                }}
                disabled={isSaving || isUploading}
                className={`w-full h-14 bg-[#262626] rounded-2xl px-4 pl-8 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 disabled:opacity-50 ${priceError ? "ring-2 ring-red-500 focus:ring-red-500" : "focus:ring-[#B8B6FC]"}`}
                placeholder=""
              />
            </div>
            {priceError && (
              <p className="text-red-400 text-xs mt-1">{priceError}</p>
            )}
          </div>
        </div>

        {/* ISBN */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <label className="text-white text-base">ISBN</label>
            <span className="text-white/40 text-sm">Optional</span>
          </div>
          <input
            type="text"
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
            disabled={isSaving || isUploading}
            className="w-full max-w-[320px] h-14 bg-[#262626] rounded-2xl px-4 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#B8B6FC] disabled:opacity-50"
            placeholder=""
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving || isUploading}
            className="px-6 py-3 text-[#ADADAD] text-sm font-bold hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving || isUploading}
            className="px-6 py-3 bg-[#262550] border border-[#B8B6FC] rounded-lg text-[#B8B6FC] text-sm font-semibold hover:bg-[#363580] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {(isSaving || isUploading) && (
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
            {isUploading ? "Uploading..." : isSaving ? "Saving..." : isEditMode ? "Save" : "Publish"}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
