"use client";

import { useState, useEffect, useCallback } from "react";

type GenerationStatus = "idle" | "starting" | "processing" | "completed" | "error";

interface VideoResult {
  uri?: string;
  mimeType?: string;
}

export default function TestVideoPage() {
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [operationName, setOperationName] = useState<string | null>(null);
  const [videoResult, setVideoResult] = useState<VideoResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);

  // Poll for video status
  const pollStatus = useCallback(async (opName: string) => {
    try {
      const response = await fetch(`/api/generate-video?operationName=${encodeURIComponent(opName)}`);
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
        setStatusMessage(`Generating video... (${pollCount * 10}s elapsed)`);
      }
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to check status");
      setOperationName(null);
    }
  }, [pollCount]);

  // Polling effect
  useEffect(() => {
    if (!operationName || status !== "processing") return;

    const interval = setInterval(() => {
      pollStatus(operationName);
    }, 10000); // Poll every 10 seconds

    // Initial poll after a short delay
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

    setStatus("starting");
    setStatusMessage("Starting video generation...");
    setError(null);
    setVideoResult(null);
    setPollCount(0);

    try {
      const response = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start generation");
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
    // Proxy through our API to add authentication
    return `/api/generate-video/proxy?url=${encodeURIComponent(videoResult.uri)}`;
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">AI Video Generator</h1>
        <p className="text-ash-1 mb-8">Test Veo 3.1 text-to-video generation</p>

        {/* Input Section */}
        <div className="bg-card rounded-card p-6 mb-6">
          <label className="block text-white font-medium mb-2">
            Video Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the video you want to generate..."
            className="w-full h-32 bg-input text-white rounded-lg p-4 resize-none focus:outline-none focus:ring-2 focus:ring-purple placeholder:text-ash-1"
            disabled={status === "starting" || status === "processing"}
          />

          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || status === "starting" || status === "processing"}
            className="mt-4 w-full bg-green-3 hover:bg-green-3/90 disabled:bg-card-bg-3 disabled:cursor-not-allowed text-dark font-semibold py-3 px-6 rounded-button transition-colors"
          >
            {status === "starting" || status === "processing" ? "Generating..." : "Generate Video"}
          </button>
        </div>

        {/* Status Section */}
        {status !== "idle" && (
          <div className="bg-card rounded-card p-6 mb-6">
            <div className="flex items-center gap-3">
              {(status === "starting" || status === "processing") && (
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
              <span className="text-white">{statusMessage}</span>
            </div>

            {error && (
              <p className="mt-3 text-destructive text-sm">{error}</p>
            )}
          </div>
        )}

        {/* Video Player Section */}
        {status === "completed" && videoResult && (
          <div className="bg-card rounded-card p-6">
            <h2 className="text-white font-semibold mb-4">Generated Video</h2>
            <div className="aspect-video bg-card-bg-2 rounded-lg overflow-hidden">
              <video
                src={getVideoUrl() || undefined}
                controls
                autoPlay
                className="w-full h-full object-contain"
              >
                Your browser does not support the video tag.
              </video>
            </div>

            {videoResult.uri && (
              <a
                href={getVideoUrl() || "#"}
                download="generated-video.mp4"
                className="mt-4 inline-flex items-center gap-2 text-purple hover:text-purple/80 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Video
              </a>
            )}
          </div>
        )}

        {/* Tips */}
        <div className="mt-8 text-ash-1 text-sm">
          <p className="font-medium text-white mb-2">Tips for better results:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Be descriptive about the scene, lighting, and camera movement</li>
            <li>Specify the style (cinematic, animation, documentary, etc.)</li>
            <li>Video generation typically takes 1-3 minutes</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
