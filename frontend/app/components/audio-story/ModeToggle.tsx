"use client";

interface ModeToggleProps {
  activeMode: "create-ai" | "upload";
  onModeChange: (mode: "create-ai" | "upload") => void;
}

export default function ModeToggle({ activeMode, onModeChange }: ModeToggleProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-3">
        {/* Create with AI button */}
        <button
          onClick={() => onModeChange("create-ai")}
          className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-all ${
            activeMode === "create-ai"
              ? "text-white"
              : "text-white/70 bg-transparent border border-[#3A3A4A] hover:border-[#5A5A6A]"
          }`}
          style={
            activeMode === "create-ai"
              ? { background: "linear-gradient(135deg, #9C99FF 0%, #7370FF 60%)" }
              : {}
          }
        >
          {/* Sparkle/AI icon */}
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6l2.1-2.1" />
            <circle cx="12" cy="12" r="4" />
          </svg>
          Create with AI
        </button>

        {/* Upload Audio button */}
        <button
          onClick={() => onModeChange("upload")}
          className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-all ${
            activeMode === "upload"
              ? "text-white"
              : "text-white/70 bg-transparent border border-[#3A3A4A] hover:border-[#5A5A6A]"
          }`}
          style={
            activeMode === "upload"
              ? { background: "linear-gradient(135deg, #9C99FF 0%, #7370FF 60%)" }
              : {}
          }
        >
          {/* Upload icon */}
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Upload Audio
        </button>
      </div>

      {/* Tagline */}
      <p className="text-white/50 text-sm">
        Generate with AI or upload your own audio file.
      </p>
    </div>
  );
}
