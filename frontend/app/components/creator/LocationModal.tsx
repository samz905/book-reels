"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { StoryLocationFE, StoryCharacterFE, LocationAngleFE } from "@/app/data/mockCreatorData";
import { VISUAL_STYLES } from "@/app/data/mockCreatorData";
import { generateLocationImage, submitJob, getLocationAngles, createLocationAngle, setDefaultLocationAngle, deleteLocationAngle, updateLocationAngle } from "@/lib/api/creator";
import { uploadGenerationAsset } from "@/lib/storage/generation-assets";

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
  /** Error from parent's locationImages state (set by applyFailedJob via Realtime) */
  generatingError?: string | null;
  /** Called when the modal submits a generation job, so parent can update card state */
  onGenerationStarted?: () => void;
  /** Story ID — required for angles management */
  storyId?: string;
  /** Label for the set-default button under angle cards (e.g. "Use this angle" on episode page) */
  defaultAngleLabel?: string;
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
  generatingError,
  onGenerationStarted,
  storyId,
  defaultAngleLabel = "Save as default",
}: LocationModalProps) {
  const isEditing = !!location;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [atmosphere, setAtmosphere] = useState("");
  const [visualStyle, setVisualStyle] = useState<string>("cinematic");
  const [refCharId, setRefCharId] = useState<string>("");
  const [refUploadBase64, setRefUploadBase64] = useState<string | null>(null);
  const [refUploadMime, setRefUploadMime] = useState("image/png");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState("image/png");
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [angles, setAngles] = useState<LocationAngleFE[]>([]);
  const [anglesLoading, setAnglesLoading] = useState(false);
  const [savingAsAngle, setSavingAsAngle] = useState(false);
  const [selectedAngleId, setSelectedAngleId] = useState<string | null>(null);
  const [angleEditor, setAngleEditor] = useState<{ mode: "edit" | "new"; angle?: LocationAngleFE } | null>(null);
  const [angleEditorDiff, setAngleEditorDiff] = useState("");
  const [angleEditorPreview, setAngleEditorPreview] = useState<{ base64: string; mime: string } | null>(null);
  const [isGeneratingAngleEditor, setIsGeneratingAngleEditor] = useState(false);
  const [isSavingAngleEditor, setIsSavingAngleEditor] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refUploadInputRef = useRef<HTMLInputElement>(null);
  const pendingDefaultAngleRef = useRef<Promise<void> | null>(null);

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
        setRefUploadBase64(null);
        setImageBase64(location.imageBase64);
        setImageUrl(location.imageUrl || null);
        setImageMimeType(location.imageMimeType);
      } else {
        setName("");
        setDescription("");
        setAtmosphere("");
        setVisualStyle(lockedStyle || "cinematic");
        setRefCharId("");
        setRefUploadBase64(null);
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

  // Clear spinner when the parent reports a job failure
  useEffect(() => {
    if (!isGenerating || !generatingError) return;
    setGenError(generatingError);
    setIsGenerating(false);
  }, [generatingError, isGenerating]);

  // Safety timeout: clear spinner if stuck for >2 minutes
  useEffect(() => {
    if (!isGenerating) return;
    const timer = setTimeout(() => {
      setIsGenerating(false);
      setGenError("Generation timed out — please try again");
    }, 120_000);
    return () => clearTimeout(timer);
  }, [isGenerating]);

  // Fetch angles when editing a location
  useEffect(() => {
    if (!isOpen || !storyId || !location?.id) {
      setAngles([]);
      return;
    }
    let cancelled = false;
    setAnglesLoading(true);
    getLocationAngles(storyId, location.id)
      .then((data) => { if (!cancelled) setAngles(data); })
      .catch(() => { if (!cancelled) setAngles([]); })
      .finally(() => { if (!cancelled) setAnglesLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen, storyId, location?.id]);

  const handleSaveAsAngle = async () => {
    if (!storyId || !location?.id || savingAsAngle) return;
    const imgUrl = imageUrl || null;
    const imgB64 = imageBase64 || null;
    if (!imgUrl && !imgB64) return;

    // Dedup: skip if this exact URL is already saved as an angle
    if (imgUrl && angles.some((a) => a.imageUrl === imgUrl)) return;

    setSavingAsAngle(true);
    try {
      let url = imgUrl;
      if (!url && imgB64) {
        url = await uploadGenerationAsset(storyId, `angles/${Date.now()}`, imgB64, imageMimeType);
      }
      if (!url) throw new Error("Upload failed");
      const newAngle = await createLocationAngle(storyId, location.id, {
        image_url: url,
        image_mime_type: imageMimeType,
      });
      setAngles((prev) => [...prev, newAngle]);
      // Image is now persisted as an angle — clear base64 so Save doesn't re-upload
      setImageUrl(url);
      setImageBase64(null);
    } catch (err) {
      console.error("Error saving angle:", err);
      alert("Failed to save angle");
    } finally {
      setSavingAsAngle(false);
    }
  };

  const handleSetDefaultAngle = (angle: LocationAngleFE) => {
    if (!storyId || !location?.id) return;
    // Optimistic update — set state before API so Save picks up the new URL
    const prevAngles = angles;
    const prevImageUrl = imageUrl;
    const prevImageBase64 = imageBase64;
    const prevImageMimeType = imageMimeType;
    setAngles((prev) => prev.map((a) => ({ ...a, isDefault: a.id === angle.id })));
    setSelectedAngleId(null);
    setImageUrl(angle.imageUrl);
    setImageBase64(null);
    setImageMimeType(angle.imageMimeType);
    // Store promise so handleSubmit can await it before saving
    const p = setDefaultLocationAngle(storyId, location.id, angle.id)
      .catch((err) => {
        console.error("Error setting default angle:", err);
        // Revert on failure
        setAngles(prevAngles);
        setImageUrl(prevImageUrl);
        setImageBase64(prevImageBase64);
        setImageMimeType(prevImageMimeType);
      })
      .finally(() => { pendingDefaultAngleRef.current = null; });
    pendingDefaultAngleRef.current = p;
  };

  const handleDeleteAngle = async (angleId: string) => {
    if (!storyId || !location?.id) return;
    if (!window.confirm("Delete this angle?")) return;
    try {
      await deleteLocationAngle(storyId, location.id, angleId);
      setAngles((prev) => prev.filter((a) => a.id !== angleId));
    } catch (err) {
      console.error("Error deleting angle:", err);
      alert("Cannot delete the default angle. Set another angle as default first.");
    }
  };

  const handleAngleEditorGenerate = async () => {
    if (!angleEditorDiff.trim() || !angleEditor) return;
    setIsGeneratingAngleEditor(true);
    setGenError(null);

    // Reference: editing angle's image (edit mode) or default angle (new mode)
    const refUrl = angleEditor.mode === "edit"
      ? angleEditor.angle?.imageUrl
      : angles.find((a) => a.isDefault)?.imageUrl;

    const payload = {
      name: name.trim(),
      description: `${description.trim()}. IN THIS ANGLE: ${angleEditorDiff.trim()}`,
      atmosphere: atmosphere.trim(),
      visual_style: lockedStyle || visualStyle,
      reference_image: refUrl
        ? { image_url: refUrl, mime_type: "image/png" }
        : undefined,
    };

    try {
      const result = await generateLocationImage(payload);
      setAngleEditorPreview({ base64: result.image_base64, mime: result.mime_type });
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Failed to generate angle");
    } finally {
      setIsGeneratingAngleEditor(false);
    }
  };

  const handleAngleEditorSave = async () => {
    if (!angleEditorPreview || !storyId || !location?.id || isSavingAngleEditor) return;
    setIsSavingAngleEditor(true);
    try {
      const url = await uploadGenerationAsset(storyId, `angles/${Date.now()}`, angleEditorPreview.base64, angleEditorPreview.mime);
      if (!url) throw new Error("Upload failed");

      if (angleEditor?.mode === "edit" && angleEditor.angle) {
        await updateLocationAngle(storyId, location.id, angleEditor.angle.id, {
          image_url: url,
          image_mime_type: angleEditorPreview.mime,
        });
        setAngles((prev) => prev.map((a) =>
          a.id === angleEditor.angle!.id ? { ...a, imageUrl: url, imageMimeType: angleEditorPreview.mime } : a
        ));
        // If editing the default angle, update main modal image too
        if (angleEditor.angle.isDefault) {
          setImageUrl(url);
          setImageBase64(null);
          setImageMimeType(angleEditorPreview.mime);
        }
      } else {
        const newAngle = await createLocationAngle(storyId, location.id, {
          image_url: url,
          image_mime_type: angleEditorPreview.mime,
        });
        setAngles((prev) => [...prev, newAngle]);
      }

      setAngleEditor(null);
      setAngleEditorDiff("");
      setAngleEditorPreview(null);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Failed to save angle");
    } finally {
      setIsSavingAngleEditor(false);
    }
  };

  const closeAngleEditor = () => {
    setAngleEditor(null);
    setAngleEditorDiff("");
    setAngleEditorPreview(null);
    setGenError(null);
  };

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

  const handleRefUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Please select an image file"); return; }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setRefUploadBase64(dataUrl.split(",")[1]);
      setRefUploadMime(dataUrl.split(";")[0].split(":")[1]);
      setRefCharId(""); // clear library ref — uploaded ref takes priority
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
      reference_image: refUploadBase64
        ? { image_base64: refUploadBase64, mime_type: refUploadMime }
        : refChar?.imageBase64
          ? { image_base64: refChar.imageBase64, mime_type: refChar.imageMimeType }
          : refChar?.imageUrl
            ? { image_url: refChar.imageUrl, mime_type: refChar.imageMimeType }
            : undefined,
    };

    // Non-blocking: submit as background job, result arrives via Realtime
    if (generationId && locationId) {
      // Clear parent error/state BEFORE await so failure effect doesn't see stale error
      onGenerationStarted?.();
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

    // Wait for any pending set-default-angle API call to finish
    // so the DB is consistent before the parent writes + refetches
    if (pendingDefaultAngleRef.current) {
      await pendingDefaultAngleRef.current;
    }

    // If user selected an angle (thumbnail click), set it as default on save
    let finalImageUrl = imageUrl;
    let finalMimeType = imageMimeType;
    if (selectedAngleId && storyId && location?.id) {
      const selAngle = angles.find((a) => a.id === selectedAngleId);
      if (selAngle) {
        if (!selAngle.isDefault) {
          await setDefaultLocationAngle(storyId, location.id, selectedAngleId);
        }
        finalImageUrl = selAngle.imageUrl;
        finalMimeType = selAngle.imageMimeType;
      }
    }

    // Don't send stale base64 if a saved angle was selected
    const submitBase64 = selectedAngleId ? null : imageBase64;
    await onSave({
      name: name.trim(),
      description: description.trim(),
      atmosphere: atmosphere.trim(),
      visualStyle: refCharId ? null : visualStyle,
      imageBase64: submitBase64,
      imageUrl: finalImageUrl,
      imageMimeType: finalMimeType,
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

        {/* Generation overlay — covers form + image section with solid background */}
        {isGenerating && (
          <div className="absolute inset-0 top-[60px] bg-panel rounded-b-3xl flex flex-col items-center justify-center z-10">
            <svg className="animate-spin h-10 w-10 text-[#B8B6FC] mb-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-[#ADADAD] text-sm">Generating image...</p>
          </div>
        )}

        {/* Hidden file inputs */}
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        <input ref={refUploadInputRef} type="file" accept="image/*" onChange={handleRefUpload} className="hidden" />

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
                .filter((c) => c.imageBase64 || c.imageUrl)
                .map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </select>
          </div>
        )}

        {/* Upload Reference Image (optional) */}
        <div className="mb-4">
          <label className="block text-white text-sm mb-2">
            Upload Reference Image <span className="text-[#ADADAD]">(optional - for style consistency)</span>
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => refUploadInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#262626] border border-[#444] rounded-lg text-[#ADADAD] text-sm hover:border-[#B8B6FC] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" /></svg>
              Choose File
            </button>
            {refUploadBase64 && (
              <>
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-[#B8B6FC] flex-shrink-0">
                  <img src={`data:${refUploadMime};base64,${refUploadBase64}`} alt="Ref" className="w-full h-full object-cover" />
                </div>
                <button
                  type="button"
                  onClick={() => setRefUploadBase64(null)}
                  className="text-red-400 text-xs hover:text-red-300"
                >
                  Remove
                </button>
              </>
            )}
          </div>
        </div>

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

        {/* Image section */}
        <div className="mb-5">
          <div className="max-w-[280px] mx-auto aspect-[9/16] bg-[#262626] rounded-2xl overflow-hidden flex items-center justify-center mb-3">
            {(() => {
              const selAngle = selectedAngleId ? angles.find((a) => a.id === selectedAngleId) : null;
              const displayUrl = selAngle ? selAngle.imageUrl : (imageBase64 ? `data:${imageMimeType};base64,${imageBase64}` : imageUrl);
              if (displayUrl) return <img src={displayUrl} alt="Location" className="w-full h-full object-cover" />;
              if (isGenerating) return (
                <div className="flex flex-col items-center justify-center text-center">
                  <svg className="animate-spin h-8 w-8 text-[#B8B6FC] mb-2" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <p className="text-sm text-[#ADADAD]">Generating...</p>
                </div>
              );
              return (
                <div className="text-center text-[#ADADAD]">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="mx-auto mb-2">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                  <p className="text-sm">Upload or generate an image</p>
                </div>
              );
            })()}
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
              {isGenerating ? "Generating..." : (imageBase64 || imageUrl) ? "Regenerate with AI" : "Generate with AI"}
            </button>
          </div>
          {genError && (
            <p className="text-red-400 text-sm mt-2">{genError}</p>
          )}
        </div>

        {/* Angles gallery — only when editing with storyId */}
        {isEditing && storyId && (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-white text-sm font-medium">
                Angles {angles.length > 0 && <span className="text-[#ADADAD]">({angles.length}/10)</span>}
              </label>
              {(imageBase64 || imageUrl || selectedAngleId) && angles.length < 10 && (() => {
                const alreadySaved = !!selectedAngleId || (!!imageUrl && angles.some((a) => a.imageUrl === imageUrl));
                return (
                  <button
                    type="button"
                    onClick={handleSaveAsAngle}
                    disabled={savingAsAngle || alreadySaved}
                    className={`text-xs disabled:opacity-50 ${alreadySaved ? "text-emerald-400 cursor-default" : "text-[#B8B6FC] hover:underline"}`}
                  >
                    {savingAsAngle ? "Saving..." : alreadySaved ? "Saved" : "+ Save current as angle"}
                  </button>
                );
              })()}
            </div>
            {anglesLoading ? (
              <p className="text-[#ADADAD] text-xs">Loading angles...</p>
            ) : angles.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {angles.map((angle) => (
                  <div key={angle.id} className="flex flex-col items-center flex-shrink-0">
                    <div
                      className={`relative group/angle w-[70px] h-[98px] rounded-lg overflow-hidden cursor-pointer border-2 transition-colors ${
                        selectedAngleId === angle.id ? "border-white" : angle.isDefault ? "border-[#B8B6FC]" : "border-transparent hover:border-[#444]"
                      }`}
                      onClick={() => setSelectedAngleId(selectedAngleId === angle.id ? null : angle.id)}
                    >
                      <img src={angle.imageUrl} alt="Angle" className="w-full h-full object-cover" />
                      {/* Default badge */}
                      {angle.isDefault && (
                        <div className="absolute bottom-0 left-0 right-0 bg-[#B8B6FC]/80 text-center text-[8px] text-[#1A1E2F] font-semibold py-0.5">
                          Default
                        </div>
                      )}
                      {/* Edit on hover */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setAngleEditor({ mode: "edit", angle }); }}
                        className="absolute right-1 top-1 w-4 h-4 bg-white/70 rounded-full items-center justify-center opacity-0 group-hover/angle:opacity-100 transition-opacity hidden group-hover/angle:flex"
                        title="Edit angle"
                      >
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="#333"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>
                      </button>
                      {/* Delete on hover (not default) */}
                      {!angle.isDefault && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDeleteAngle(angle.id); }}
                          className="absolute right-1 bottom-1 w-4 h-4 bg-red-500/80 rounded-full items-center justify-center opacity-0 group-hover/angle:opacity-100 transition-opacity hidden group-hover/angle:flex"
                        >
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      )}
                    </div>
                    {/* Action text below the selected card */}
                    {selectedAngleId === angle.id ? (
                      angle.isDefault ? (
                        <span className="text-emerald-400 text-[9px] mt-1">Default</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetDefaultAngle(angle)}
                          className="text-[#B8B6FC] text-[9px] mt-1 hover:underline"
                        >
                          {defaultAngleLabel}
                        </button>
                      )
                    ) : (
                      <span className="h-[22px]" />
                    )}
                  </div>
                ))}
                {/* + New Angle card */}
                {angles.length < 10 && (
                  <div className="flex flex-col items-center flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setAngleEditor({ mode: "new" })}
                      className="w-[70px] h-[98px] rounded-lg border-2 border-dashed border-white/20 hover:border-white/40 flex flex-col items-center justify-center gap-1 transition-colors"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/40"><path d="M12 5v14M5 12h14" /></svg>
                      <span className="text-white/40 text-[9px]">New Angle</span>
                    </button>
                    <span className="h-[22px]" />
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[#ADADAD] text-xs">No angles saved yet. Generate images and save them as angles.</p>
            )}
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

      {/* Angle Editor Popup */}
      {angleEditor && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 rounded-2xl">
          <div className="bg-[#1A1E2F] rounded-2xl p-5 w-full max-w-sm border border-white/10">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold">
                {angleEditor.mode === "edit" ? "Edit Angle" : "New Angle"}
              </h3>
              <button type="button" onClick={closeAngleEditor} className="text-white/40 hover:text-white transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Input + Generate row */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={angleEditorDiff}
                onChange={(e) => setAngleEditorDiff(e.target.value)}
                placeholder="What's different? (viewpoint, time...)"
                className="flex-1 min-w-0 bg-[#0A0A0F] text-white text-sm rounded-lg px-3 py-2 placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-[#B8B6FC]/50 border border-white/10"
                onKeyDown={(e) => { if (e.key === "Enter" && angleEditorDiff.trim() && !isGeneratingAngleEditor) handleAngleEditorGenerate(); }}
                disabled={isGeneratingAngleEditor}
              />
              <button
                type="button"
                onClick={handleAngleEditorGenerate}
                disabled={!angleEditorDiff.trim() || isGeneratingAngleEditor}
                className="px-3 py-2 bg-[#262550] text-[#B8B6FC] text-sm rounded-lg hover:bg-[#2f2d60] disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isGeneratingAngleEditor ? (
                  <div className="w-4 h-4 border-2 border-[#9C99FF] border-t-transparent rounded-full animate-spin" />
                ) : angleEditorPreview ? "Redo" : "Generate"}
              </button>
            </div>

            {genError && <p className="text-red-400 text-xs mb-3">{genError}</p>}

            {/* Reference + Result side by side, equal size, centered */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="flex flex-col items-center gap-1">
                <span className="text-[#ADADAD] text-[10px] uppercase tracking-wide">Reference</span>
                <div className="w-[130px] h-[182px] rounded-xl overflow-hidden bg-[#0A0A0F] border border-white/10">
                  {(() => {
                    const refUrl = angleEditor.mode === "edit"
                      ? angleEditor.angle?.imageUrl
                      : angles.find((a) => a.isDefault)?.imageUrl;
                    return refUrl
                      ? <img src={refUrl} alt="Reference" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-white/20 text-[10px]">No ref</div>;
                  })()}
                </div>
              </div>

              {/* Arrow */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/20 flex-shrink-0 mt-4">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>

              <div className="flex flex-col items-center gap-1">
                <span className="text-[#ADADAD] text-[10px] uppercase tracking-wide">Result</span>
                <div className="w-[130px] h-[182px] rounded-xl overflow-hidden bg-[#0A0A0F] border border-white/10">
                  {isGeneratingAngleEditor ? (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <div className="w-8 h-8 border-2 border-[#9C99FF] border-t-transparent rounded-full animate-spin mb-2" />
                      <span className="text-[#ADADAD] text-xs">Generating...</span>
                    </div>
                  ) : angleEditorPreview ? (
                    <img src={`data:${angleEditorPreview.mime};base64,${angleEditorPreview.base64}`} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/20 text-[10px] text-center px-2">Generate to preview</div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeAngleEditor}
                disabled={isSavingAngleEditor}
                className="px-4 py-2 text-[#ADADAD] text-sm hover:text-white transition-colors"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleAngleEditorSave}
                disabled={!angleEditorPreview || isSavingAngleEditor}
                className="px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                style={{ background: "linear-gradient(135deg, #9C99FF 0%, #7370FF 60%)" }}
              >
                {isSavingAngleEditor ? (
                  <><div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                ) : (
                  "Save"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
}
