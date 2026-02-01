"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import RecordingModal from "../components/audio-story/RecordingModal";
import {
  Script,
  EpisodeLength,
  EPISODE_LENGTHS,
  mockNarrators,
  mockStories,
  mockCredits,
  generateMockScripts,
} from "../data/mockAudioStoryData";

export default function CreateAudioPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Top-level mode
  const [activeMode, setActiveMode] = useState<"create-ai" | "upload">("create-ai");

  // Create with AI flow state
  const [scriptPrompt, setScriptPrompt] = useState("");
  const [episodeLength, setEpisodeLength] = useState<EpisodeLength>("2 min");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedScripts, setGeneratedScripts] = useState<Script[]>([]);
  const [selectedScriptIndex, setSelectedScriptIndex] = useState<number | null>(null);
  const [narratorTab, setNarratorTab] = useState<"ai" | "my-voice">("ai");
  const [selectedNarratorId, setSelectedNarratorId] = useState<string | null>(null);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isGeneratingNarration, setIsGeneratingNarration] = useState(false);

  // Upload flow state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Shared (Review & Publish)
  const [selectedStoryId, setSelectedStoryId] = useState("");
  const [episodeNumber, setEpisodeNumber] = useState("");
  const [episodeName, setEpisodeName] = useState("");
  const [visibility, setVisibility] = useState<"draft" | "published">("draft");
  const [isPublishing, setIsPublishing] = useState(false);
  const [showStoryDropdown, setShowStoryDropdown] = useState(false);

  // Handlers
  const handleGenerateScripts = async () => {
    if (!scriptPrompt.trim()) {
      alert("Please enter some text to generate scripts from.");
      return;
    }
    setIsGenerating(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const scripts = generateMockScripts(scriptPrompt, episodeLength);
    setGeneratedScripts(scripts);
    setSelectedScriptIndex(null);
    setIsGenerating(false);
  };

  const handleGenerateNarration = async () => {
    if (selectedScriptIndex === null) {
      alert("Please select a script first.");
      return;
    }
    if (!selectedNarratorId) {
      alert("Please select a narrator first.");
      return;
    }
    setIsGeneratingNarration(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsGeneratingNarration(false);
  };

  const handlePublish = async () => {
    if (!selectedStoryId) {
      alert("Please select a story.");
      return;
    }
    if (!episodeName.trim()) {
      alert("Please enter an episode name.");
      return;
    }
    setIsPublishing(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    alert("Audio episode created successfully!");
    setIsPublishing(false);
  };

  const selectedStory = mockStories.find((s) => s.id === selectedStoryId);

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#010101]">
        <Header />
        <main className="px-6 py-8 max-w-[1440px] mx-auto">
          <div className="animate-pulse bg-[#0F0E13] rounded-xl h-96" />
        </main>
        <Footer />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-[#010101]">
        <Header />
        <main className="px-6 py-8 max-w-[1440px] mx-auto">
          <div className="bg-[#0F0E13] rounded-xl p-8 text-center">
            <h2 className="text-white text-xl font-semibold mb-4">Sign in to create audio stories</h2>
            <p className="text-[#ADADAD] mb-6">Generate AI-powered audio or upload your own recordings.</p>
            <button
              onClick={() => router.push("/login")}
              className="px-6 py-3 rounded-xl font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #9C99FF 0%, #7370FF 60%)" }}
            >
              Sign In
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#010101]">
      <Header />

      <main className="px-6 pt-6 max-w-[1440px] mx-auto">
        {/* Sub-tabs */}
        <div className="flex items-end gap-0 mb-4">
          <div className="h-[41px] px-[15px] py-2 rounded-lg border-b-2 border-white flex items-center">
            <span className="text-white text-base font-bold uppercase" style={{ fontFamily: "Mulish" }}>
              Create AN audio Story
            </span>
          </div>
          <button
            onClick={() => router.push("/create")}
            className="h-[42px] px-3 pt-3 flex flex-col items-center"
          >
            <span className="text-[#BEC0C9] text-base font-normal uppercase leading-5 tracking-[0.25px] hover:text-white transition-colors" style={{ fontFamily: "Mulish" }}>
              Create a Video story
            </span>
          </button>
        </div>

        {/* Main Card Container */}
        <div className="bg-[#0F0E13] rounded-xl pb-8">
          {/* Mode Toggle */}
          <div className="flex flex-col items-center pt-8 gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveMode("create-ai")}
                className={`flex items-center gap-2 px-[49px] py-4 rounded-xl text-lg font-bold transition-all ${
                  activeMode === "create-ai" ? "outline outline-1 outline-[#B8B6FC]" : ""
                }`}
                style={{
                  background: activeMode === "create-ai"
                    ? "linear-gradient(135deg, #9C99FF 0%, #7370FF 60%)"
                    : "#262550",
                  fontFamily: "Mulish",
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2L14.4 7.2L20 8L16 12L17 18L12 15L7 18L8 12L4 8L9.6 7.2L12 2Z" />
                </svg>
                <span className="text-white">Create with AI</span>
              </button>

              <button
                onClick={() => setActiveMode("upload")}
                className={`flex items-center gap-2 px-[49px] py-4 rounded-xl text-lg font-bold transition-all ${
                  activeMode === "upload" ? "outline outline-1 outline-[#B8B6FC]" : ""
                }`}
                style={{
                  background: activeMode === "upload"
                    ? "linear-gradient(135deg, #9C99FF 0%, #7370FF 60%)"
                    : "#262550",
                  fontFamily: "Mulish",
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M17 8L12 3L7 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 3V15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-white">Upload Audio</span>
              </button>
            </div>
            <p className="text-[#ADADAD] text-base" style={{ fontFamily: "Mulish" }}>
              Generate with AI or upload your own audio file.
            </p>
          </div>

          {activeMode === "create-ai" ? (
            <>
              {/* Section 1: Generate Short Scripts */}
              <div className="mx-6 mt-8 rounded-3xl outline outline-1 outline-[#1A1E2F] p-6">
                <h2 className="text-white text-2xl font-bold leading-6" style={{ fontFamily: "Mulish" }}>
                  Generate Short Scripts
                </h2>
                <div className="w-full h-px bg-[#2C2C43] my-4" />

                <p className="text-white text-base mb-4" style={{ fontFamily: "Mulish" }}>
                  Paste text (chapter or scene), describe an idea or outline. Include tone, style, and creative direction for best output.
                </p>

                <div className="w-full h-[148px] bg-[#262626] rounded-2xl">
                  <textarea
                    value={scriptPrompt}
                    onChange={(e) => setScriptPrompt(e.target.value)}
                    className="w-full h-full bg-transparent text-white p-4 resize-none focus:outline-none placeholder-white/40 text-base"
                    style={{ fontFamily: "Mulish" }}
                  />
                </div>

                <p className="text-[#ADADAD] text-sm mt-2 mb-6" style={{ fontFamily: "Mulish" }}>
                  AI works best with 200 words.
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-white text-base" style={{ fontFamily: "Mulish" }}>Episode Length:</span>
                    <div className="flex items-center gap-2">
                      {EPISODE_LENGTHS.map((length) => (
                        <button
                          key={length}
                          onClick={() => setEpisodeLength(length)}
                          className={`px-[9px] py-[6px] rounded-full text-xs font-semibold transition-all ${
                            episodeLength === length
                              ? "bg-white text-black"
                              : "text-[#ADADAD] outline outline-1 outline-[#ADADAD]"
                          }`}
                          style={{ fontFamily: "Mulish" }}
                        >
                          {length}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateScripts}
                    disabled={isGenerating}
                    className="flex items-center gap-2 px-8 py-4 rounded-xl bg-[#2E4E3A] outline outline-1 outline-[#1ED760] disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                        <path d="M12 2L14.4 7.2L20 8L16 12L17 18L12 15L7 18L8 12L4 8L9.6 7.2L12 2Z" />
                      </svg>
                    )}
                    <span className="text-white text-sm font-bold" style={{ fontFamily: "Mulish" }}>Generate Scripts</span>
                  </button>
                </div>
              </div>

              {/* Section 2: Choose a Script */}
              <div className="mx-6 mt-8 rounded-3xl outline outline-1 outline-[#1A1E2F] p-6">
                <h2 className="text-white text-2xl font-bold leading-6" style={{ fontFamily: "Mulish" }}>
                  Choose a Script
                </h2>
                <div className="w-full h-px bg-[#2C2C43] my-4" />

                {generatedScripts.length === 0 && (
                  <p className="text-center text-[#ADADAD] text-base py-2" style={{ fontFamily: "Mulish" }}>
                    You don&apos;t have any scripts yet, please generate scripts.
                  </p>
                )}

                <div className="grid grid-cols-3 gap-6 mt-6">
                  {[1, 2, 3].map((num, idx) => {
                    const script = generatedScripts[idx];
                    const isSelected = selectedScriptIndex === idx;
                    return (
                      <button
                        key={num}
                        onClick={() => script && setSelectedScriptIndex(idx)}
                        disabled={!script}
                        className="w-full h-[565px] bg-[#16151D] rounded-xl p-4 text-left"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-white text-xl font-bold" style={{ fontFamily: "Mulish" }}>
                            Script Option {num}
                          </span>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isSelected ? "" : ""}`}>
                            {isSelected ? (
                              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                                <circle cx="16" cy="16" r="13.5" fill="#1ED760" stroke="#1ED760"/>
                                <path d="M10 16L14 20L22 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            ) : (
                              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                                <circle cx="16" cy="16" r="13.5" stroke="#ADADAD" strokeWidth="2"/>
                              </svg>
                            )}
                          </div>
                        </div>
                        <div className="w-full h-px bg-[#2C2C43] my-4" />
                        <p className="text-[#ADADAD] text-base" style={{ fontFamily: "Mulish" }}>
                          Duration: {script?.duration || ""}
                        </p>
                        {script && (
                          <p className="text-white/80 text-sm mt-4 leading-relaxed line-clamp-[18]" style={{ fontFamily: "Mulish" }}>
                            {script.content}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 3: Choose a Narrator */}
              <div className="mx-6 mt-8 rounded-3xl outline outline-1 outline-[#1A1E2F] p-6">
                <h2 className="text-white text-2xl font-bold leading-6" style={{ fontFamily: "Mulish" }}>
                  Choose a Narrator
                </h2>
                <div className="w-full h-px bg-[#2C2C43] my-4" />

                {/* Tabs */}
                <div className="flex items-end gap-0 px-6 mb-6">
                  <div className={`h-[41px] px-[15px] py-2 rounded-lg ${narratorTab === "ai" ? "border-b-2 border-white" : ""}`}>
                    <button onClick={() => setNarratorTab("ai")} className={`text-base uppercase ${narratorTab === "ai" ? "text-white font-bold" : "text-[#BEC0C9] font-normal"}`} style={{ fontFamily: "Mulish" }}>
                      AI Narrators
                    </button>
                  </div>
                  <div className={`h-[42px] px-3 pt-3 ${narratorTab === "my-voice" ? "border-b-2 border-white" : ""}`}>
                    <button onClick={() => setNarratorTab("my-voice")} className={`text-base uppercase ${narratorTab === "my-voice" ? "text-white font-bold" : "text-[#BEC0C9] font-normal"}`} style={{ fontFamily: "Mulish" }}>
                      MY voice
                    </button>
                  </div>
                </div>

                {narratorTab === "ai" ? (
                  <>
                    {/* Narrator Grid - 2 rows */}
                    <div className="flex flex-col gap-3">
                      {[0, 1].map((rowIdx) => (
                        <div key={rowIdx} className="flex gap-3">
                          {mockNarrators.slice(rowIdx * 10, (rowIdx + 1) * 10).map((narrator) => {
                            const isSelected = selectedNarratorId === narrator.id;
                            return (
                              <button
                                key={narrator.id}
                                onClick={() => setSelectedNarratorId(narrator.id)}
                                className={`flex-1 h-[120px] px-1 py-5 bg-[#16151D] rounded-xl flex flex-col items-center justify-center gap-2 relative overflow-hidden ${
                                  isSelected ? "outline outline-1 outline-white" : ""
                                }`}
                              >
                                {isSelected && (
                                  <div className="absolute inset-0 bg-black/90 rounded-xl flex items-center justify-center z-10">
                                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                                      <circle cx="16" cy="16" r="13" fill="#1ED760"/>
                                      <path d="M16 10V22M16 10L11 15M16 10L21 15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </div>
                                )}
                                <img
                                  src={`https://i.pravatar.cc/50?u=${narrator.id}`}
                                  alt={narrator.name}
                                  className="w-[50px] h-[50px] rounded-full"
                                />
                                <div className="text-center">
                                  <p className="text-white text-xs font-medium" style={{ fontFamily: "Inter" }}>{narrator.name}</p>
                                  <p className="text-[#B0B0B0] text-xs" style={{ fontFamily: "Inter" }}>{narrator.voiceType}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>

                    {/* Credits + Generate */}
                    <div className="flex items-center justify-end gap-4 mt-6">
                      <div className="flex items-center gap-1">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="#FF8C00">
                          <path d="M10 2L12.09 6.26L17 7.27L13.55 10.97L14.91 16L10 13.9L5.09 16L6.45 10.97L3 7.27L7.91 6.26L10 2Z" />
                        </svg>
                        <span className="text-white text-sm" style={{ fontFamily: "Mulish" }}>{mockCredits.available} {mockCredits.label}</span>
                      </div>
                      <button className="px-4 py-2 text-[#1ED760] text-sm font-bold" style={{ fontFamily: "Mulish" }}>
                        Buy Credits
                      </button>
                      <button
                        onClick={handleGenerateNarration}
                        disabled={isGeneratingNarration || !selectedNarratorId}
                        className="flex items-center gap-2 px-8 py-4 rounded-xl bg-[#2E4E3A] outline outline-1 outline-[#1ED760] disabled:opacity-50"
                      >
                        {isGeneratingNarration ? (
                          <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                        ) : (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                            <path d="M12 2L14.4 7.2L20 8L16 12L17 18L12 15L7 18L8 12L4 8L9.6 7.2L12 2Z" />
                          </svg>
                        )}
                        <span className="text-white text-sm font-bold" style={{ fontFamily: "Mulish" }}>Generate Narration</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center">
                    <div className="flex items-center justify-center gap-4">
                      <button
                        onClick={() => setShowRecordingModal(true)}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl text-white border border-[#B8B6FC] bg-[#262550]"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                          <line x1="12" y1="19" x2="12" y2="23" />
                          <line x1="8" y1="23" x2="16" y2="23" />
                        </svg>
                        Start Recording
                      </button>
                      <button
                        className="flex items-center gap-2 px-6 py-3 rounded-xl text-white"
                        style={{ background: "linear-gradient(135deg, #9C99FF 0%, #7370FF 60%)" }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        Upload File
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Upload Mode - Section 1 */
            <div className="mx-6 mt-8 rounded-3xl outline outline-1 outline-[#1A1E2F] p-6">
              <h2 className="text-white text-2xl font-bold" style={{ fontFamily: "Mulish" }}>Upload Your Episode</h2>
              <div className="w-full h-px bg-[#2C2C43] my-4" />
              <div className="flex flex-col items-center py-12">
                {uploadedFile ? (
                  <div className="flex items-center gap-4 p-4 bg-[#16151D] rounded-xl">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                    </svg>
                    <span className="text-white">{uploadedFile.name}</span>
                    <button onClick={() => setUploadedFile(null)} className="text-red-400">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = "audio/*";
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) setUploadedFile(file);
                      };
                      input.click();
                    }}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl text-white"
                    style={{ background: "linear-gradient(135deg, #9C99FF 0%, #7370FF 60%)" }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Upload File
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Review & Publish (shared) */}
          <div className="mx-6 mt-8 rounded-3xl outline outline-1 outline-[#1A1E2F] p-6">
            <h2 className="text-white text-2xl font-bold" style={{ fontFamily: "Mulish" }}>Review & Publish</h2>
            <div className="w-full h-px bg-[#2C2C43] my-4" />

            <p className="text-center text-[#ADADAD] text-base mb-8" style={{ fontFamily: "Mulish" }}>
              You don&apos;t have anything to review and publish yet.
            </p>

            {/* Form Layout */}
            <div className="flex gap-[115px]">
              {/* Left Column */}
              <div className="flex-1 flex flex-col gap-6">
                <div>
                  <label className="text-white text-base mb-3 block" style={{ fontFamily: "Mulish" }}>Select Story</label>
                  <div className="relative">
                    <button
                      onClick={() => setShowStoryDropdown(!showStoryDropdown)}
                      className="w-full h-14 px-4 bg-[#262626] rounded-2xl flex items-center justify-between"
                    >
                      <span className={selectedStory ? "text-white" : "text-transparent"} style={{ fontFamily: "Mulish" }}>
                        {selectedStory?.title || "Select"}
                      </span>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ transform: "rotate(-90deg)" }}>
                        <path d="M9 18l6-6-6-6" stroke="#ADADAD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    {showStoryDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] z-10">
                        {mockStories.map((story) => (
                          <button
                            key={story.id}
                            onClick={() => { setSelectedStoryId(story.id); setShowStoryDropdown(false); }}
                            className="w-full text-left px-4 py-3 hover:bg-[#2A2A2A] text-white"
                            style={{ fontFamily: "Mulish" }}
                          >
                            {story.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-white text-base mb-3 block" style={{ fontFamily: "Mulish" }}>Episode Name</label>
                  <input
                    type="text"
                    value={episodeName}
                    onChange={(e) => setEpisodeName(e.target.value)}
                    className="w-full h-14 px-4 bg-[#262626] text-white rounded-2xl focus:outline-none"
                    style={{ fontFamily: "Mulish" }}
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="w-[332px] flex flex-col gap-6">
                <div>
                  <label className="text-white text-base mb-3 block" style={{ fontFamily: "Mulish" }}>Episode Number</label>
                  <input
                    type="text"
                    value={episodeNumber}
                    onChange={(e) => setEpisodeNumber(e.target.value)}
                    className="w-full h-14 px-4 bg-[#262626] text-white rounded-2xl focus:outline-none"
                    style={{ fontFamily: "Mulish" }}
                  />
                </div>

                <div>
                  <label className="text-white text-base mb-3 block" style={{ fontFamily: "Mulish" }}>Visibility</label>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-[7px] cursor-pointer">
                      <div className="w-6 h-6 relative" onClick={() => setVisibility("draft")}>
                        {visibility === "draft" ? (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/>
                            <circle cx="12" cy="12" r="5" fill="white"/>
                          </svg>
                        ) : (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="#ADADAD" strokeWidth="2"/>
                          </svg>
                        )}
                      </div>
                      <span className="text-white text-base" style={{ fontFamily: "Mulish" }}>Drafts</span>
                    </label>
                    <label className="flex items-center gap-[10px] cursor-pointer">
                      <div className="w-6 h-6 relative" onClick={() => setVisibility("published")}>
                        {visibility === "published" ? (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/>
                            <circle cx="12" cy="12" r="5" fill="white"/>
                          </svg>
                        ) : (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="#ADADAD" strokeWidth="2"/>
                          </svg>
                        )}
                      </div>
                      <span className="text-white text-base" style={{ fontFamily: "Mulish" }}>Published</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end mt-8">
              <button
                onClick={handlePublish}
                disabled={isPublishing}
                className="px-8 py-[18px] rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #9C99FF 0%, #7370FF 60%)", fontFamily: "Mulish" }}
              >
                {isPublishing ? "Creating..." : "Create Audio Episode"}
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      <RecordingModal
        isOpen={showRecordingModal}
        isRecording={isRecording}
        onStart={() => setIsRecording(true)}
        onStop={() => { setIsRecording(false); setShowRecordingModal(false); }}
        onClose={() => { setShowRecordingModal(false); setIsRecording(false); }}
      />
    </div>
  );
}
