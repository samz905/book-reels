"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { StoryLocationFE, StoryCharacterFE } from "@/app/data/mockCreatorData";
import { VISUAL_STYLES } from "@/app/data/mockCreatorData";
import { generateLocationImage, submitJob } from "@/lib/api/creator";

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    description: string;
    atmosphere: string;
    visualStyle: string | null;
    imageBase64: string | null;
    imageUrl?: string | null;
    imageMimeType: string;
  }) => Promise<void>;
  location?: StoryLocationFE;
  existingCharacters?: StoryCharacterFE[];
  isSaving?: boolean;
  lockedStyle?: string;
  readOnlyFields?: string[];
  /** When provided, generation uses non-blocking gen_jobs + Realtime delivery */
  generationId?: string;
  /** Used as targetId for the gen_job (required when generationId is set) */
  locationId?: string;
}

export default function LocationModal({
  isOpen,
  onClose,
  onSave,
  location,
  existingCharacters = [],
  isSaving = false,
  lockedStyle,
  readOnlyFields = [],
  generationId,
  locationId,
}: LocationModalProps) {
  const isEditing = !!location;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [atmosphere, setAtmosphere] = useState("");
  const [visualStyle, setVisualStyle] = useState<string>("cinematic");
  const [refCharId, setRefCharId] = useState<string>("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState("image/png");
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (location) {
        setName(location.name);
        setDescription(location.description);
        setAtmosphere(location.atmosphere);
        setVisualStyle(lockedStyle || location.visualStyle || "cinematic");
        setRefCharId("");
        setImageBase64(location.imageBase64);
        setImageUrl(location.imageUrl || null);
        setImageMimeType(location.imageMimeType);
      } else {
        setName("");
        setDescription("");
        setAtmosphere("");
        setVisualStyle(lockedStyle || "cinematic");
        setRefCharId("");
        setImageBase64(null);
        setImageUrl(null);
        setImageMimeType("image/png");
      }
      setIsGenerating(false);
      setGenError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, location?.id]);

  // Sync image from parent when Realtime delivers a completed gen_job result.
  useEffect(() => {
    if (!isGenerating) return;
    const newBase64 = location?.imageBase64;
    const newUrl = location?.imageUrl;
    if (newBase64 || newUrl) {
      if (newBase64) setImageBase64(newBase64);
      if (newUrl) setImageUrl(newUrl);
      setImageMimeType(location?.imageMimeType || "image/png");
      setIsGenerating(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.imageBase64, location?.imageUrl]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  const handleUpload = () => fileInputRef.current?.click();

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
      const base64 = dataUrl.split(",")[1];
      const mime = dataUrl.split(";")[0].split(":")[1];
      setImageBase64(base64);
      setImageMimeType(mime);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!name.trim() || !description.trim()) {
      setGenError("Name and Description are required for AI generation.");
      return;
    }
    if (!refCharId && !visualStyle) {
      setGenError("Select a Visual Style or Reference Character.");
      return;
    }

    setIsGenerating(true);
    setGenError(null);

    const refChar = refCharId
      ? existingCharacters.find((c) => c.id === refCharId)
      : null;

    const payload = {
      location_id: locationId,
      name: name.trim(),
      description: description.trim(),
      atmosphere: atmosphere.trim() || undefined,
      visual_style: refChar ? undefined : (lockedStyle || visualStyle),
      reference_image: refChar?.imageBase64
        ? { image_base64: refChar.imageBase64, mime_type: refChar.imageMimeType }
        : undefined,
    };

    // Non-blocking: submit as background job, result arrives via Realtime
    if (generationId && locationId) {
      try {
        await submitJob("location_image", "/assets/generate-location-image", payload, {
          generationId,
          targetId: locationId,
        });
        // isGenerating stays true — Realtime sync effect will clear it when image arrives
      } catch (err) {
        setGenError(err instanceof Error ? err.message : "Failed to start generation");
        setIsGenerating(false);
      }
      return;
    }

    // Blocking fallback (no generationId — e.g. create/[storyId] page)
    try {
      const result = await generateLocationImage(payload);
      setImageBase64(result.image_base64);
      setImageMimeType(result.mime_type);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Image generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (isSaving) return;
    if (!name.trim()) {
      alert("Location name is required");
      return;
    }

    await onSave({
      name: name.trim(),
      description: description.trim(),
      atmosphere: atmosphere.trim(),
      visualStyle: refCharId ? null : visualStyle,
      imageBase64,
      imageUrl,
      imageMimeType,
    });
  };

  const handleClose = () => {
    if (isSaving) return;
    // Allow closing during generation — it continues in background via gen_jobs
    onClose();
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/95" onClick={handleClose} />
      <div className="relative bg-panel border border-panel-border rounded-3xl p-6 w-full max-w-[686px] mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white text-2xl font-bold">
            {isEditing ? "Edit Your Location" : "Create Location"}
          </h2>
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
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

        {/* Image section */}
        <div className="mb-5">
          <div className="max-w-[280px] mx-auto aspect-[9/16] bg-[#262626] rounded-2xl overflow-hidden flex items-center justify-center mb-3">
            {(imageBase64 || imageUrl) ? (
              <img
                src={imageBase64 ? `data:${imageMimeType};base64,${imageBase64}` : imageUrl!}
                alt="Location"
                className="w-full h-full object-cover"
              />
            ) : isGenerating ? (
              <div className="flex flex-col items-center justify-center text-center">
                <svg className="animate-spin h-8 w-8 text-[#B8B6FC] mb-2" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <p className="text-sm text-[#ADADAD]">Generating...</p>
              </div>
            ) : (
              <div className="text-center text-[#ADADAD]">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="mx-auto mb-2">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
                <p className="text-sm">Upload or generate an image</p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleUpload}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 bg-[#262550] border border-[#B8B6FC] rounded-lg text-white text-sm hover:bg-[#363580] transition-colors disabled:opacity-50"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" />
              </svg>
              Upload
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || isSaving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #9C99FF 0%, #7370FF 60%)" }}
            >
              {isGenerating && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {isGenerating ? "Generating..." : "Generate with AI"}
            </button>
          </div>
          {genError && (
            <p className="text-red-400 text-sm mt-2">{genError}</p>
          )}
        </div>

        {/* Location Name */}
        <div className="mb-4">
          <label className="block text-white text-sm mb-2">Location Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={readOnlyFields.includes("name")}
            className={`w-full h-12 bg-[#262626] rounded-xl px-4 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#B8B6FC] ${readOnlyFields.includes("name") ? "opacity-50 cursor-not-allowed" : ""}`}
            placeholder="e.g. Enchanted Forest"
          />
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className="block text-white text-sm mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full h-[100px] bg-[#262626] rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#B8B6FC] resize-none"
            placeholder="Describe the environment, key visual details..."
          />
        </div>

        {/* Atmosphere */}
        <div className="mb-4">
          <label className="block text-white text-sm mb-2">
            Atmosphere <span className="text-[#ADADAD]">(optional)</span>
          </label>
          <input
            type="text"
            value={atmosphere}
            onChange={(e) => setAtmosphere(e.target.value)}
            className="w-full h-12 bg-[#262626] rounded-xl px-4 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#B8B6FC]"
            placeholder="e.g. Mysterious, eerie, warm and inviting"
          />
        </div>

        {/* Reference Character (optional) */}
        {existingCharacters.length > 0 && (
          <div className="mb-4">
            <label className="block text-white text-sm mb-2">
              Reference Character <span className="text-[#ADADAD]">(optional - for style consistency)</span>
            </label>
            <select
              value={refCharId}
              onChange={(e) => setRefCharId(e.target.value)}
              className="w-full h-12 bg-[#262626] rounded-xl px-4 text-white focus:outline-none focus:ring-2 focus:ring-[#B8B6FC] appearance-none cursor-pointer"
            >
              <option value="">None - use Visual Style instead</option>
              {existingCharacters
                .filter((c) => c.imageBase64)
                .map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </select>
          </div>
        )}

        {/* Visual Style (hidden when ref char selected OR lockedStyle is set) */}
        {!refCharId && !lockedStyle && (
          <div className="mb-6">
            <label className="block text-white text-sm mb-2">Visual Style</label>
            <div className="flex flex-wrap gap-2">
              {VISUAL_STYLES.map((style) => (
                <button
                  key={style.value}
                  onClick={() => setVisualStyle(style.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    visualStyle === style.value
                      ? "bg-[#262550] border border-[#B8B6FC] text-[#B8B6FC]"
                      : "bg-[#262626] border border-[#262626] text-[#ADADAD] hover:border-[#444]"
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="px-6 py-3 text-[#ADADAD] text-sm font-bold hover:text-white transition-colors disabled:opacity-50"
          >
            {isGenerating ? "Close" : "Cancel"}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving || isGenerating || (!imageBase64 && !imageUrl)}
            className="px-6 py-3 rounded-lg text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            style={{ background: "linear-gradient(135deg, #9C99FF 0%, #7370FF 60%)" }}
            title={(!imageBase64 && !imageUrl) ? "Upload or generate an image first" : undefined}
          >
            {isSaving && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
