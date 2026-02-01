"use client";

import { useRef } from "react";

interface UploadEpisodeSectionProps {
  uploadedFile: File | null;
  onFileSelect: (file: File) => void;
  onRemoveFile: () => void;
}

export default function UploadEpisodeSection({
  uploadedFile,
  onFileSelect,
  onRemoveFile,
}: UploadEpisodeSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate it's an audio file
      if (!file.type.startsWith("audio/")) {
        alert("Please select an audio file.");
        return;
      }
      onFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.startsWith("audio/")) {
        alert("Please select an audio file.");
        return;
      }
      onFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div className="bg-[#0F0E13] rounded-xl p-6 border border-[#1A1E2F]">
      <h2 className="text-white text-lg font-bold mb-4">1. Upload Your Episode</h2>

      {/* Upload area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="relative"
      >
        {uploadedFile ? (
          /* File uploaded state */
          <div className="flex items-center justify-between p-6 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
            <div className="flex items-center gap-4">
              {/* Audio icon */}
              <div className="w-12 h-12 rounded-lg bg-[#262626] flex items-center justify-center">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-white"
                >
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              </div>
              <div>
                <p className="text-white font-medium">{uploadedFile.name}</p>
                <p className="text-white/50 text-sm">
                  {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              onClick={onRemoveFile}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>
        ) : (
          /* Empty upload state */
          <div className="flex flex-col items-center justify-center py-16 bg-[#1A1A1A] rounded-xl border-2 border-dashed border-[#3A3A3A]">
            {/* Upload icon */}
            <div className="w-16 h-16 rounded-full bg-[#262626] flex items-center justify-center mb-4">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-white/60"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>

            {/* Upload button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm text-white transition-colors"
              style={{
                background: "linear-gradient(135deg, #9C99FF 0%, #7370FF 60%)",
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Upload File
            </button>

            <p className="text-white/40 text-sm mt-4">
              Upload your pre-recorded audio file
            </p>
            <p className="text-white/30 text-xs mt-1">
              Drag and drop or click to browse
            </p>
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
