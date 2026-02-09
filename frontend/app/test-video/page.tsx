"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type GenerationStatus = "idle" | "starting" | "processing" | "completed" | "error";
type VeoMode = "reference" | "image_to_video" | "video_extend";

interface RefImage {
  base64: string;
  mimeType: string;
  preview: string;
  name: string;
}

interface VideoFile {
  base64: string;
  mimeType: string;
  preview: string;
  name: string;
}

interface VideoResult {
  uri?: string;
  mimeType?: string;
}

export default function TestVideoPage() {
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<VeoMode>("reference");
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [operationName, setOperationName] = useState<string | null>(null);
  const [videoResult, setVideoResult] = useState<VideoResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Mode 1: Reference Images
  const [refImages, setRefImages] = useState<RefImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mode 2: Image to Video
  const [firstFrame, setFirstFrame] = useState<RefImage | null>(null);
  const [lastFrame, setLastFrame] = useState<RefImage | null>(null);
  const firstFrameInputRef = useRef<HTMLInputElement>(null);
  const lastFrameInputRef = useRef<HTMLInputElement>(null);

  // Mode 3: Video Extend
  const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Timer for elapsed time
  useEffect(() => {
    if (status !== "processing" && status !== "starting") {
      setElapsedSeconds(0);
      return;
    }
    const interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [status]);

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<{ base64: string; mimeType: string; preview: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1];
        resolve({ base64, mimeType: file.type, preview: dataUrl });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // --- Mode 1: Reference image helpers ---
  const addImages = async (files: FileList | File[]) => {
    const remaining = 3 - refImages.length;
    const filesToAdd = Array.from(files).slice(0, remaining);
    const newImages: RefImage[] = [];
    for (const file of filesToAdd) {
      if (!file.type.startsWith("image/")) continue;
      const { base64, mimeType, preview } = await fileToBase64(file);
      newImages.push({ base64, mimeType, preview, name: file.name });
    }
    setRefImages((prev) => [...prev, ...newImages].slice(0, 3));
  };

  const removeImage = (index: number) => {
    setRefImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) addImages(e.dataTransfer.files);
  };

  // --- Mode 2: First/last frame helpers ---
  const handleFrameUpload = async (
    file: File,
    setter: React.Dispatch<React.SetStateAction<RefImage | null>>
  ) => {
    if (!file.type.startsWith("image/")) return;
    const { base64, mimeType, preview } = await fileToBase64(file);
    setter({ base64, mimeType, preview, name: file.name });
  };

  // --- Mode 3: Video file helper ---
  const handleVideoUpload = async (file: File) => {
    if (!file.type.startsWith("video/")) return;
    const { base64, mimeType, preview } = await fileToBase64(file);
    setVideoFile({ base64, mimeType, preview, name: file.name });
  };

  // Poll for video status
  const pollStatus = useCallback(
    async (opName: string) => {
      try {
        const response = await fetch(
          `/api/generate-video?operationName=${encodeURIComponent(opName)}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to check status");
        }

        if (data.done) {
          setStatus("completed");
          setStatusMessage("Video generated successfully!");
          setVideoResult(data.video);
          setOperationName(null);
        } else {
          setPollCount((prev) => prev + 1);
        }
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Failed to check status");
        setOperationName(null);
      }
    },
    []
  );

  // Polling effect
  useEffect(() => {
    if (!operationName || status !== "processing") return;

    const interval = setInterval(() => {
      pollStatus(operationName);
    }, 10000);

    const timeout = setTimeout(() => {
      pollStatus(operationName);
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [operationName, status, pollStatus]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    if (mode === "image_to_video" && !firstFrame) return;
    if (mode === "video_extend" && !videoFile) return;

    setStatus("starting");
    setStatusMessage("Starting video generation...");
    setError(null);
    setVideoResult(null);
    setPollCount(0);

    try {
      const body: Record<string, unknown> = { prompt: prompt.trim() };

      if (mode === "reference" && refImages.length > 0) {
        body.referenceImages = refImages.map((img) => ({
          base64: img.base64,
          mimeType: img.mimeType,
        }));
      } else if (mode === "image_to_video" && firstFrame) {
        body.image = { base64: firstFrame.base64, mimeType: firstFrame.mimeType };
        if (lastFrame) {
          body.lastFrame = { base64: lastFrame.base64, mimeType: lastFrame.mimeType };
        }
      } else if (mode === "video_extend" && videoFile) {
        body.video = { base64: videoFile.base64, mimeType: videoFile.mimeType };
      }

      const response = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || "Failed to start generation");
      }

      setOperationName(data.operationName);
      setStatus("processing");
      setStatusMessage("Video generation in progress...");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to start generation");
    }
  };

  const getVideoUrl = () => {
    if (!videoResult?.uri) return null;
    return `/api/generate-video/proxy?url=${encodeURIComponent(videoResult.uri)}`;
  };

  const isGenerating = status === "starting" || status === "processing";

  const canGenerate = (() => {
    if (!prompt.trim() || isGenerating) return false;
    if (mode === "image_to_video" && !firstFrame) return false;
    if (mode === "video_extend" && !videoFile) return false;
    return true;
  })();

  const generateButtonLabel = (() => {
    if (isGenerating) return `Generating... (${elapsedSeconds}s)`;
    if (mode === "reference") return `Generate Video${refImages.length > 0 ? ` with ${refImages.length} ref(s)` : ""}`;
    if (mode === "image_to_video") return `Generate from Frame${lastFrame ? "s" : ""}`;
    return "Extend Video";
  })();

  const switchMode = (newMode: VeoMode) => {
    setMode(newMode);
    // Don't clear prompt when switching — it's reusable
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Veo Prompt Tester</h1>
        <p className="text-ash-1 mb-4">
          Test prompts directly against Veo 3.1. Portrait 9:16, 8 seconds.
        </p>

        {/* Rate limit warning */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="text-amber-200 text-xs">
            Only 2 videos can be generated every minute. Please do not press generate more than twice in a single minute.
          </span>
        </div>

        {/* Mode Tabs */}
        <div className="flex gap-1 bg-card rounded-xl p-1 mb-4">
          {([
            { value: "reference" as VeoMode, label: "Reference Images" },
            { value: "image_to_video" as VeoMode, label: "Image to Video" },
            { value: "video_extend" as VeoMode, label: "Video Extend" },
          ]).map((tab) => (
            <button
              key={tab.value}
              onClick={() => switchMode(tab.value)}
              className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                mode === tab.value
                  ? "bg-purple text-white"
                  : "text-ash-1 hover:text-white hover:bg-white/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Mode 1: Reference Images */}
        {mode === "reference" && (
          <div className="bg-card rounded-xl p-6 mb-4">
            <label className="block text-white font-medium mb-3">
              Reference Images ({refImages.length}/3)
            </label>

            <div className="flex gap-3 mb-3">
              {refImages.map((img, i) => (
                <div key={i} className="relative group">
                  <img
                    src={img.preview}
                    alt={img.name}
                    className="w-24 h-32 object-cover rounded-lg border border-white/10"
                  />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-destructive rounded-full flex items-center justify-center text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    x
                  </button>
                  <span className="absolute bottom-1 left-1 right-1 text-[10px] text-white/70 truncate bg-black/60 rounded px-1">
                    Ref {i + 1}
                  </span>
                </div>
              ))}

              {refImages.length < 3 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className="w-24 h-32 border-2 border-dashed border-white/20 rounded-lg flex flex-col items-center justify-center text-ash-1 hover:border-white/40 hover:text-white transition-colors cursor-pointer"
                >
                  <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-xs">Add</span>
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && addImages(e.target.files)}
            />

            <p className="text-ash-1 text-xs">
              Optional. Up to 3 character/scene reference images (ASSET type).
            </p>
          </div>
        )}

        {/* Mode 2: Image to Video */}
        {mode === "image_to_video" && (
          <div className="bg-card rounded-xl p-6 mb-4">
            <label className="block text-white font-medium mb-3">Starting Frame (required)</label>
            <div className="flex gap-4 mb-4">
              {firstFrame ? (
                <div className="relative group">
                  <img
                    src={firstFrame.preview}
                    alt="Starting frame"
                    className="w-32 h-44 object-cover rounded-lg border border-white/10"
                  />
                  <button
                    onClick={() => setFirstFrame(null)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-destructive rounded-full flex items-center justify-center text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    x
                  </button>
                  <span className="absolute bottom-1 left-1 right-1 text-[10px] text-white/70 truncate bg-black/60 rounded px-1 text-center">
                    Start
                  </span>
                </div>
              ) : (
                <button
                  onClick={() => firstFrameInputRef.current?.click()}
                  className="w-32 h-44 border-2 border-dashed border-white/20 rounded-lg flex flex-col items-center justify-center text-ash-1 hover:border-white/40 hover:text-white transition-colors cursor-pointer"
                >
                  <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-xs">Start Frame</span>
                </button>
              )}
              <input
                ref={firstFrameInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFrameUpload(e.target.files[0], setFirstFrame)}
              />

              <div className="flex items-center text-[#555] text-lg">→</div>

              {lastFrame ? (
                <div className="relative group">
                  <img
                    src={lastFrame.preview}
                    alt="Ending frame"
                    className="w-32 h-44 object-cover rounded-lg border border-white/10"
                  />
                  <button
                    onClick={() => setLastFrame(null)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-destructive rounded-full flex items-center justify-center text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    x
                  </button>
                  <span className="absolute bottom-1 left-1 right-1 text-[10px] text-white/70 truncate bg-black/60 rounded px-1 text-center">
                    End
                  </span>
                </div>
              ) : (
                <button
                  onClick={() => lastFrameInputRef.current?.click()}
                  className="w-32 h-44 border-2 border-dashed border-white/20 rounded-lg flex flex-col items-center justify-center text-ash-1 hover:border-white/40 hover:text-white transition-colors cursor-pointer"
                >
                  <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-xs">End Frame</span>
                  <span className="text-[10px] text-[#555]">(optional)</span>
                </button>
              )}
              <input
                ref={lastFrameInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFrameUpload(e.target.files[0], setLastFrame)}
              />
            </div>

            <p className="text-ash-1 text-xs">
              Veo animates from the starting frame. Add an optional ending frame for interpolation.
            </p>
          </div>
        )}

        {/* Mode 3: Video Extend */}
        {mode === "video_extend" && (
          <div className="bg-card rounded-xl p-6 mb-4">
            <label className="block text-white font-medium mb-3">Source Video (required)</label>

            {videoFile ? (
              <div className="mb-3">
                <video
                  src={videoFile.preview}
                  controls
                  className="w-full max-w-xs rounded-lg border border-white/10"
                />
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-ash-1 truncate">{videoFile.name}</span>
                  <button
                    onClick={() => setVideoFile(null)}
                    className="text-xs text-destructive hover:text-destructive/80"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => videoInputRef.current?.click()}
                className="w-full py-10 border-2 border-dashed border-white/20 rounded-lg flex flex-col items-center justify-center text-ash-1 hover:border-white/40 hover:text-white transition-colors cursor-pointer mb-3"
              >
                <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="text-sm">Upload video to extend</span>
              </button>
            )}

            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleVideoUpload(e.target.files[0])}
            />

            <p className="text-ash-1 text-xs">
              720p only. Veo generates an 8-second continuation from the last second of your video.
            </p>
          </div>
        )}

        {/* Prompt Input */}
        <div className="bg-card rounded-xl p-6 mb-6">
          <label className="block text-white font-medium mb-2">
            {mode === "video_extend" ? "Continuation Prompt" : "Veo Prompt"}
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              mode === "video_extend"
                ? "Describe what should happen next in the video..."
                : `Close-up, slow push in, focusing on the young man.\nThe young man steps forward, says: I didn't come here to bow.\nThe older man replies coldly: Then you've already failed.\nSOUND: Wooden floor creaking. Distant wind.\nNo subtitles. No text overlay. Portrait 9:16, 8 seconds.`
            }
            className="w-full h-40 bg-input text-white rounded-lg p-4 resize-none focus:outline-none focus:ring-2 focus:ring-purple placeholder:text-ash-1 font-mono text-sm"
            disabled={isGenerating}
          />

          <div className="flex items-center justify-between mt-2">
            <span className="text-ash-1 text-xs">
              {prompt.split(/\s+/).filter(Boolean).length} words /{" "}
              {prompt.length} chars
            </span>
            <span className="text-ash-1 text-xs">
              Target: 100-150 words, &lt;300 chars
            </span>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="mt-4 w-full bg-green-3 hover:bg-green-3/90 disabled:bg-card-bg-3 disabled:cursor-not-allowed text-dark font-semibold py-3 px-6 rounded-button transition-colors"
          >
            {generateButtonLabel}
          </button>
        </div>

        {/* Status Section */}
        {status !== "idle" && (
          <div className="bg-card rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3">
              {isGenerating && (
                <div className="w-5 h-5 border-2 border-purple border-t-transparent rounded-full animate-spin" />
              )}
              {status === "completed" && (
                <div className="w-5 h-5 bg-green-3 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              {status === "error" && (
                <div className="w-5 h-5 bg-destructive rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}
              <span className="text-white">
                {isGenerating
                  ? `Generating video... (${elapsedSeconds}s elapsed)`
                  : statusMessage}
              </span>
            </div>

            {error && <p className="mt-3 text-destructive text-sm">{error}</p>}
          </div>
        )}

        {/* Video Player — 9:16 portrait */}
        {status === "completed" && videoResult && (
          <div className="bg-card rounded-xl p-6">
            <h2 className="text-white font-semibold mb-4">Generated Video</h2>
            <div className="flex justify-center">
              <div className="w-[270px] aspect-[9/16] bg-card-bg-2 rounded-lg overflow-hidden">
                <video
                  src={getVideoUrl() || undefined}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4 mt-4">
              {videoResult.uri && (
                <a
                  href={getVideoUrl() || "#"}
                  download="generated-video.mp4"
                  className="inline-flex items-center gap-2 text-purple hover:text-purple/80 transition-colors text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </a>
              )}

              <button
                onClick={() => {
                  setStatus("idle");
                  setVideoResult(null);
                }}
                className="text-ash-1 hover:text-white transition-colors text-sm"
              >
                Generate Another
              </button>
            </div>

            {/* Show the prompt used */}
            <details className="mt-4">
              <summary className="text-ash-1 text-xs cursor-pointer hover:text-white">
                View prompt used
              </summary>
              <pre className="mt-2 text-xs text-white/60 bg-card-bg-2 rounded p-3 whitespace-pre-wrap font-mono">
                {prompt}
              </pre>
            </details>
          </div>
        )}

        {/* Mode-specific Tips */}
        <div className="mt-8 text-ash-1 text-sm">
          {mode === "reference" && (
            <>
              <p className="font-medium text-white mb-2">Reference Images — Prompt tips:</p>
              <pre className="bg-card-bg-2 rounded-lg p-4 text-xs text-white/70 whitespace-pre-wrap font-mono mb-4">{`[Camera], [movement], focusing on [character descriptor].
[Character descriptor] [action], [delivery verb]: [dialogue]
[Other character] [reacts/replies]: [dialogue]
SOUND: [specific ambient sounds]
No subtitles. No text overlay. Portrait 9:16, 8 seconds.`}</pre>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>100-150 words max, front-load camera + subject</li>
                <li>Use visual descriptors not names: &quot;the man in the red headband&quot;</li>
                <li>Colon before dialogue, no quotation marks</li>
                <li>Always include SOUND section (prevents hallucinated audio)</li>
                <li>Reference images handle visual style — prompt handles motion + speech</li>
              </ul>
            </>
          )}

          {mode === "image_to_video" && (
            <>
              <p className="font-medium text-white mb-2">Image to Video — Tips:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Starting frame is required — Veo will animate from this exact image</li>
                <li>Ending frame is optional — adds interpolation between start and end</li>
                <li>Prompt describes the motion/action that happens during the clip</li>
                <li>Works well for: extending a still image into motion, creating transitions</li>
                <li>Cannot be combined with reference images</li>
              </ul>
            </>
          )}

          {mode === "video_extend" && (
            <>
              <p className="font-medium text-white mb-2">Video Extend — Tips:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>720p resolution only for extensions</li>
                <li>Veo continues from the last second of your input video</li>
                <li>Generates an 8-second continuation</li>
                <li>Can chain up to 20 extensions (~148 seconds total)</li>
                <li>Prompt describes what should happen next</li>
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
