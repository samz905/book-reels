"use client";

import { useState } from "react";

const BACKEND_URL = "http://localhost:8000";

type Status = "idle" | "loading" | "success" | "error";

interface SectionProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

function Section({ title, description, children }: SectionProps) {
  return (
    <div className="bg-card rounded-card p-6 mb-6">
      <h2 className="text-xl font-semibold text-white mb-1">{title}</h2>
      <p className="text-ash-1 text-sm mb-4">{description}</p>
      {children}
    </div>
  );
}

function StatusIndicator({ status, message }: { status: Status; message: string }) {
  if (status === "idle") return null;

  return (
    <div className="flex items-center gap-2 mt-4">
      {status === "loading" && (
        <div className="w-4 h-4 border-2 border-purple border-t-transparent rounded-full animate-spin" />
      )}
      {status === "success" && (
        <div className="w-4 h-4 bg-green-3 rounded-full" />
      )}
      {status === "error" && (
        <div className="w-4 h-4 bg-destructive rounded-full" />
      )}
      <span className={status === "error" ? "text-destructive" : "text-ash-1"}>
        {message}
      </span>
    </div>
  );
}

// ============================================================
// Text Generation Section
// ============================================================
function TextSection() {
  const [prompt, setPrompt] = useState("Write a short haiku about a robot learning to dance");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState("");

  const handleGenerate = async () => {
    setStatus("loading");
    setMessage("Generating text...");
    setResult("");

    try {
      const response = await fetch(`${BACKEND_URL}/test/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          system_prompt: systemPrompt || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to generate text");
      }

      setResult(data.text);
      setStatus("success");
      setMessage("Text generated successfully!");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to generate text");
    }
  };

  return (
    <Section title="Text Generation" description="Test Gemini text generation">
      <div className="space-y-4">
        <div>
          <label className="block text-white text-sm mb-1">System Prompt (optional)</label>
          <input
            type="text"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="e.g., You are a poet"
            className="w-full bg-input text-white rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple placeholder:text-ash-1"
          />
        </div>
        <div>
          <label className="block text-white text-sm mb-1">Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your prompt..."
            className="w-full h-24 bg-input text-white rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-purple placeholder:text-ash-1"
          />
        </div>
        <button
          onClick={handleGenerate}
          disabled={!prompt.trim() || status === "loading"}
          className="bg-green-3 hover:bg-green-3/90 disabled:bg-card-bg-3 disabled:cursor-not-allowed text-dark font-semibold py-2 px-4 rounded-button transition-colors"
        >
          Generate Text
        </button>

        <StatusIndicator status={status} message={message} />

        {result && (
          <div className="mt-4 p-4 bg-card-bg-2 rounded-lg">
            <p className="text-white whitespace-pre-wrap">{result}</p>
          </div>
        )}
      </div>
    </Section>
  );
}

// ============================================================
// Image Generation Section
// ============================================================
function ImageSection() {
  const [prompt, setPrompt] = useState("A friendly robot in a garden with glowing mushrooms, cinematic style");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [imageData, setImageData] = useState<string | null>(null);

  const handleGenerate = async () => {
    setStatus("loading");
    setMessage("Generating image...");
    setImageData(null);

    try {
      const response = await fetch(`${BACKEND_URL}/test/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, aspect_ratio: aspectRatio }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to generate image");
      }

      setImageData(`data:${data.mime_type};base64,${data.image_base64}`);
      setStatus("success");
      setMessage("Image generated successfully!");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to generate image");
    }
  };

  return (
    <Section title="Image Generation" description="Test Gemini image generation">
      <div className="space-y-4">
        <div>
          <label className="block text-white text-sm mb-1">Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the image..."
            className="w-full h-24 bg-input text-white rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-purple placeholder:text-ash-1"
          />
        </div>
        <div>
          <label className="block text-white text-sm mb-1">Aspect Ratio</label>
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
            className="bg-input text-white rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple"
          >
            <option value="9:16">9:16 (Portrait)</option>
            <option value="16:9">16:9 (Landscape)</option>
            <option value="1:1">1:1 (Square)</option>
          </select>
        </div>
        <button
          onClick={handleGenerate}
          disabled={!prompt.trim() || status === "loading"}
          className="bg-green-3 hover:bg-green-3/90 disabled:bg-card-bg-3 disabled:cursor-not-allowed text-dark font-semibold py-2 px-4 rounded-button transition-colors"
        >
          Generate Image
        </button>

        <StatusIndicator status={status} message={message} />

        {imageData && (
          <div className="mt-4">
            <img
              src={imageData}
              alt="Generated"
              className="max-w-full max-h-[400px] rounded-lg mx-auto"
            />
          </div>
        )}
      </div>
    </Section>
  );
}

// ============================================================
// Video Generation Section
// ============================================================
function VideoSection() {
  const [prompt, setPrompt] = useState("A robot dancing gracefully in an abandoned factory with golden afternoon light");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    setStatus("loading");
    setMessage("Starting video generation (this takes 30-60 seconds)...");
    setVideoUrl(null);

    try {
      const response = await fetch(`${BACKEND_URL}/test/video`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, aspect_ratio: "9:16" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to generate video");
      }

      // Proxy the video URL through backend
      const proxyUrl = `${BACKEND_URL}/test/video/proxy?url=${encodeURIComponent(data.video_url)}`;
      setVideoUrl(proxyUrl);
      setStatus("success");
      setMessage("Video generated successfully!");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to generate video");
    }
  };

  return (
    <Section title="Video Generation" description="Test Veo 3.1 video generation (takes ~60 seconds)">
      <div className="space-y-4">
        <div>
          <label className="block text-white text-sm mb-1">Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the video..."
            className="w-full h-24 bg-input text-white rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-purple placeholder:text-ash-1"
          />
        </div>
        <button
          onClick={handleGenerate}
          disabled={!prompt.trim() || status === "loading"}
          className="bg-green-3 hover:bg-green-3/90 disabled:bg-card-bg-3 disabled:cursor-not-allowed text-dark font-semibold py-2 px-4 rounded-button transition-colors"
        >
          Generate Video
        </button>

        <StatusIndicator status={status} message={message} />

        {videoUrl && (
          <div className="mt-4">
            <video
              src={videoUrl}
              controls
              autoPlay
              className="w-full max-h-[400px] rounded-lg"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        )}
      </div>
    </Section>
  );
}

// ============================================================
// Frame Extraction Section
// ============================================================
function FrameExtractionSection() {
  const [file, setFile] = useState<File | null>(null);
  const [position, setPosition] = useState("last");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [imageData, setImageData] = useState<string | null>(null);

  const handleExtract = async () => {
    if (!file) return;

    setStatus("loading");
    setMessage("Extracting frame...");
    setImageData(null);

    try {
      const formData = new FormData();
      formData.append("video", file);
      formData.append("position", position);

      const response = await fetch(`${BACKEND_URL}/test/extract-frame`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to extract frame");
      }

      setImageData(`data:${data.mime_type};base64,${data.image_base64}`);
      setStatus("success");
      setMessage("Frame extracted successfully!");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to extract frame");
    }
  };

  return (
    <Section title="Frame Extraction" description="Extract first or last frame from a video (requires ffmpeg)">
      <div className="space-y-4">
        <div>
          <label className="block text-white text-sm mb-1">Video File</label>
          <input
            type="file"
            accept="video/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-white file:mr-4 file:py-2 file:px-4 file:rounded-button file:border-0 file:bg-purple file:text-dark file:font-semibold hover:file:bg-purple/90"
          />
        </div>
        <div>
          <label className="block text-white text-sm mb-1">Position</label>
          <select
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            className="bg-input text-white rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple"
          >
            <option value="first">First Frame</option>
            <option value="last">Last Frame</option>
          </select>
        </div>
        <button
          onClick={handleExtract}
          disabled={!file || status === "loading"}
          className="bg-green-3 hover:bg-green-3/90 disabled:bg-card-bg-3 disabled:cursor-not-allowed text-dark font-semibold py-2 px-4 rounded-button transition-colors"
        >
          Extract Frame
        </button>

        <StatusIndicator status={status} message={message} />

        {imageData && (
          <div className="mt-4">
            <img
              src={imageData}
              alt="Extracted frame"
              className="max-w-full max-h-[300px] rounded-lg mx-auto"
            />
          </div>
        )}
      </div>
    </Section>
  );
}

// ============================================================
// Video Assembly Section
// ============================================================
function VideoAssemblySection() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [crossfade, setCrossfade] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const handleAssemble = async () => {
    if (!files || files.length < 2) return;

    setStatus("loading");
    setMessage("Assembling videos...");
    setVideoUrl(null);

    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("videos", files[i]);
      }
      formData.append("crossfade", crossfade.toString());

      const response = await fetch(`${BACKEND_URL}/test/assemble`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to assemble videos");
      }

      // Create blob URL from response
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setStatus("success");
      setMessage("Videos assembled successfully!");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to assemble videos");
    }
  };

  return (
    <Section title="Video Assembly" description="Stitch multiple videos together (requires ffmpeg)">
      <div className="space-y-4">
        <div>
          <label className="block text-white text-sm mb-1">Video Files (select 2+)</label>
          <input
            type="file"
            accept="video/*"
            multiple
            onChange={(e) => setFiles(e.target.files)}
            className="w-full text-white file:mr-4 file:py-2 file:px-4 file:rounded-button file:border-0 file:bg-purple file:text-dark file:font-semibold hover:file:bg-purple/90"
          />
          {files && <p className="text-ash-1 text-sm mt-1">{files.length} files selected</p>}
        </div>
        <div>
          <label className="block text-white text-sm mb-1">Crossfade Duration (seconds)</label>
          <input
            type="number"
            value={crossfade}
            onChange={(e) => setCrossfade(parseFloat(e.target.value) || 0)}
            min={0}
            max={2}
            step={0.1}
            className="w-24 bg-input text-white rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple"
          />
        </div>
        <button
          onClick={handleAssemble}
          disabled={!files || files.length < 2 || status === "loading"}
          className="bg-green-3 hover:bg-green-3/90 disabled:bg-card-bg-3 disabled:cursor-not-allowed text-dark font-semibold py-2 px-4 rounded-button transition-colors"
        >
          Assemble Videos
        </button>

        <StatusIndicator status={status} message={message} />

        {videoUrl && (
          <div className="mt-4">
            <video
              src={videoUrl}
              controls
              className="w-full max-h-[300px] rounded-lg"
            >
              Your browser does not support the video tag.
            </video>
            <a
              href={videoUrl}
              download="assembled.mp4"
              className="mt-2 inline-flex items-center gap-2 text-purple hover:text-purple/80 transition-colors"
            >
              Download Assembled Video
            </a>
          </div>
        )}
      </div>
    </Section>
  );
}

// ============================================================
// Main Page
// ============================================================
export default function TestBackendPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Backend Utilities Test</h1>
        <p className="text-ash-1 mb-8">
          Test the Python backend core utilities. Make sure the backend is running on port 8000.
        </p>

        <TextSection />
        <ImageSection />
        <VideoSection />
        <FrameExtractionSection />
        <VideoAssemblySection />

        <div className="mt-8 p-4 bg-card-bg-2 rounded-lg">
          <h3 className="text-white font-medium mb-2">Setup Notes</h3>
          <ul className="text-ash-1 text-sm space-y-1">
            <li>• Backend: <code className="text-purple">cd backend && uvicorn app.main:app --reload --port 8000</code></li>
            <li>• FFmpeg required for frame extraction and video assembly</li>
            <li>• Video generation takes 30-60 seconds</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
