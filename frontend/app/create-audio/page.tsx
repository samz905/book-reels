"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import RecordingModal from "../components/audio-story/RecordingModal";
import UnderlineTabs from "../components/UnderlineTabs";
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
        <UnderlineTabs
          tabs={[
            { id: "audio", label: "Create AN audio Story" },
            { id: "video", label: "Create a Video story" },
          ]}
          activeTab="audio"
          onTabChange={(id) => {
            if (id === "video") router.push("/create");
          }}
          className="mb-4"
        />

        {/* Main Card Container */}
        <div className="bg-[#0F0E13] rounded-xl pb-8">
          {/* Mode Toggle */}
          <div className="flex flex-col items-center pt-8 gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveMode("create-ai")}
                className="flex items-center gap-2 px-[49px] py-4 rounded-xl text-lg font-bold transition-all"
                style={{
                  background: activeMode === "create-ai"
                    ? "linear-gradient(135deg, #9C99FF 0%, #7370FF 60%)"
                    : "#262550",
                  fontFamily: "Mulish",
                }}
              >
                {/* Microphone Icon */}
                <svg width="15" height="20" viewBox="0 0 15 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7.2404 12.4125C6.34324 12.4125 5.58107 12.0989 4.9539 11.4718C4.32674 10.8446 4.01315 10.0824 4.01315 9.18525V3.22725C4.01315 2.33008 4.32674 1.56792 4.9539 0.94075C5.58107 0.313583 6.34324 0 7.2404 0C8.13757 0 8.89974 0.313583 9.5269 0.94075C10.1541 1.56792 10.4677 2.33008 10.4677 3.22725V9.18525C10.4677 10.0824 10.1541 10.8446 9.5269 11.4718C8.89974 12.0989 8.13757 12.4125 7.2404 12.4125ZM6.15065 18.4125V16.4032C4.56165 16.1826 3.20232 15.5107 2.07265 14.3875C0.943154 13.2643 0.255737 11.9018 0.010404 10.3C-0.0307627 9.99283 0.0502373 9.73025 0.253404 9.51225C0.456737 9.29425 0.711987 9.18525 1.01915 9.18525C1.32649 9.18525 1.5869 9.29108 1.8004 9.50275C2.01407 9.71425 2.15824 9.97367 2.2329 10.281C2.48607 11.4637 3.08415 12.431 4.02715 13.183C4.96999 13.9348 6.04107 14.3108 7.2404 14.3108C8.4564 14.3108 9.53165 13.9307 10.4662 13.1705C11.4008 12.4102 11.9947 11.447 12.2479 10.281C12.3226 9.97367 12.4667 9.71425 12.6804 9.50275C12.8939 9.29108 13.1543 9.18525 13.4617 9.18525C13.7688 9.18525 14.0231 9.29525 14.2244 9.51525C14.4257 9.73508 14.5057 9.99867 14.4644 10.306C14.2191 11.8745 13.5368 13.2277 12.4177 14.3655C11.2983 15.5033 9.93582 16.1826 8.33015 16.4032V18.4125C8.33015 18.7198 8.22532 18.9783 8.01565 19.1877C7.80599 19.3974 7.54757 19.5022 7.2404 19.5022C6.93324 19.5022 6.67482 19.3974 6.46515 19.1877C6.25549 18.9783 6.15065 18.7198 6.15065 18.4125Z" fill="white"/>
                </svg>
                <span className="text-white">Create with AI</span>
              </button>

              <button
                onClick={() => setActiveMode("upload")}
                className="flex items-center gap-2 px-[49px] py-4 rounded-xl text-lg font-bold transition-all"
                style={{
                  background: activeMode === "upload"
                    ? "linear-gradient(135deg, #9C99FF 0%, #7370FF 60%)"
                    : "#262550",
                  fontFamily: "Mulish",
                }}
              >
                {/* Upload Icon */}
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
                  1. Generate Short Scripts
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
                      <svg width="23" height="22" viewBox="0 0 23 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M1.10513 5.27132C0.820528 5.16611 0.524779 5.08334 0.219997 5.02511C0.19762 5.02085 0.175195 5.01672 0.152719 5.01269C-0.0509063 4.97637 -0.0509063 4.68428 0.152719 4.64795C0.175195 4.64393 0.19762 4.6398 0.219997 4.63554C0.524779 4.57731 0.820528 4.49454 1.10513 4.38933C1.27545 4.32635 1.44178 4.25538 1.60366 4.17678C2.72471 3.63261 3.6326 2.72471 4.1768 1.60366C4.25537 1.44178 4.32638 1.27545 4.38932 1.10513C4.49453 0.820528 4.5773 0.524779 4.63553 0.219997C4.63979 0.19762 4.64393 0.175195 4.64795 0.152719C4.68428 -0.0509063 4.97636 -0.0509063 5.01269 0.152719C5.01671 0.175195 5.02085 0.19762 5.02511 0.219997C5.08334 0.524779 5.16611 0.820528 5.27132 1.10513C5.33429 1.27545 5.40527 1.44178 5.48387 1.60366C6.02804 2.72471 6.93593 3.63261 8.057 4.17678C8.21888 4.25538 8.3852 4.32635 8.55551 4.38933C8.84012 4.49454 9.13586 4.57731 9.44066 4.63554C9.46304 4.6398 9.48545 4.64393 9.50792 4.64795C9.71156 4.68428 9.71156 4.97637 9.50792 5.01269C9.48545 5.01672 9.46304 5.02085 9.44066 5.02511C9.13586 5.08334 8.84012 5.16611 8.55551 5.27132C8.3852 5.33429 8.21888 5.40527 8.057 5.48387C6.93593 6.02804 6.02804 6.93594 5.48387 8.057C5.40527 8.21888 5.33429 8.3852 5.27132 8.55551C5.16611 8.84013 5.08334 9.13587 5.02511 9.44067C5.02085 9.46302 5.01671 9.48545 5.01269 9.50793C4.97636 9.71157 4.68428 9.71157 4.64795 9.50793C4.64393 9.48545 4.63979 9.46302 4.63553 9.44067C4.5773 9.13587 4.49453 8.84013 4.38932 8.55551C4.32638 8.3852 4.25537 8.21888 4.1768 8.057C3.6326 6.93594 2.72471 6.02804 1.60366 5.48387C1.44178 5.40527 1.27545 5.33429 1.10513 5.27132ZM7.90931 12.507C7.71026 12.4534 7.50845 12.4063 7.30409 12.366C7.27214 12.3598 7.24016 12.3536 7.20812 12.3477L7.1984 12.3459L7.18526 12.3435C7.16504 12.3398 7.14284 12.3358 7.09844 12.3279L7.08293 12.3251C6.75728 12.2635 6.75728 11.7972 7.08293 11.7355L7.09844 11.7328C7.14284 11.7248 7.16504 11.7209 7.18526 11.7172L7.1984 11.7148L7.20812 11.713C7.24016 11.707 7.27214 11.7009 7.30406 11.6946C7.50842 11.6544 7.71026 11.6073 7.90931 11.5537C8.07932 11.5078 8.24732 11.4572 8.41316 11.4019C11.0962 10.5076 13.2076 8.39625 14.1019 5.71316C14.1572 5.54733 14.2078 5.37932 14.2537 5.20928C14.3073 5.01026 14.3544 4.80842 14.3946 4.60406C14.4009 4.57214 14.407 4.54017 14.413 4.50813L14.4148 4.4984L14.4172 4.48527C14.4208 4.46528 14.4248 4.44335 14.4325 4.39994L14.4328 4.39845L14.4355 4.38294C14.4972 4.05728 14.9635 4.05728 15.0251 4.38294L15.0279 4.39845C15.0358 4.44284 15.0398 4.46504 15.0435 4.48527L15.0459 4.4984L15.0477 4.50813C15.0536 4.54017 15.0598 4.57214 15.066 4.60406C15.1063 4.80845 15.1534 5.01026 15.207 5.20928C15.2528 5.37932 15.3034 5.54733 15.3587 5.71316C16.2531 8.39625 18.3644 10.5076 21.0475 11.4019C21.2133 11.4572 21.3813 11.5078 21.5514 11.5537C21.7504 11.6073 21.9522 11.6544 22.1566 11.6946C22.1885 11.7009 22.2205 11.707 22.2525 11.713L22.2622 11.7148L22.2754 11.7172C22.2956 11.7209 22.3178 11.7248 22.3622 11.7328L22.3777 11.7355C22.7034 11.7972 22.7034 12.2635 22.3777 12.3251L22.3622 12.3279L22.3152 12.3363L22.2754 12.3435L22.2622 12.3459L22.2525 12.3477C22.2205 12.3536 22.1885 12.3598 22.1566 12.366C21.9522 12.4063 21.7504 12.4534 21.5514 12.507C21.3813 12.5528 21.2133 12.6034 21.0475 12.6587C18.3644 13.5531 16.2531 15.6644 15.3587 18.3475C15.3034 18.5133 15.2528 18.6813 15.207 18.8514C15.1534 19.0504 15.1063 19.2522 15.066 19.4566C15.0598 19.4885 15.0536 19.5205 15.0477 19.5525L15.0459 19.5622L15.0435 19.5754L15.0381 19.605L15.0282 19.6605L15.0251 19.6777C14.9635 20.0034 14.4972 20.0034 14.4355 19.6777L14.4328 19.6622C14.4249 19.6179 14.4209 19.5956 14.4172 19.5754L14.4148 19.5622L14.413 19.5525C14.407 19.5205 14.4009 19.4885 14.3946 19.4566C14.3544 19.2522 14.3073 19.0504 14.2537 18.8514C14.2078 18.6813 14.1572 18.5133 14.1019 18.3475C13.2076 15.6644 11.0962 13.5531 8.41316 12.6587C8.24732 12.6034 8.07932 12.5528 7.90931 12.507ZM3.41855 18.7534C3.76082 18.8187 4.08503 18.9331 4.38371 19.0891C4.51658 19.1584 4.64438 19.236 4.76645 19.3211C5.10662 19.5583 5.40239 19.8541 5.63957 20.1942C5.72468 20.3163 5.80226 20.4441 5.87159 20.5769C6.02753 20.8756 6.14192 21.1999 6.20729 21.5421C6.20999 21.5563 6.21263 21.5704 6.21515 21.5846C6.2381 21.7132 6.42257 21.7132 6.44552 21.5846C6.44804 21.5704 6.45065 21.5563 6.45335 21.5421C6.51875 21.1999 6.63314 20.8756 6.78905 20.5769C6.85841 20.4441 6.93599 20.3163 7.0211 20.1942C7.25825 19.8541 7.55405 19.5583 7.89422 19.3211C8.01629 19.236 8.14409 19.1584 8.27693 19.0891C8.57564 18.9331 8.89985 18.8187 9.24212 18.7534C9.25625 18.7507 9.27041 18.748 9.2846 18.7455C9.41321 18.7226 9.41321 18.5381 9.2846 18.5152C9.27041 18.5126 9.25625 18.51 9.24212 18.5073C8.89985 18.4419 8.57564 18.3275 8.27693 18.1716C8.14409 18.1022 8.01629 18.0247 7.89422 17.9395C7.55405 17.7024 7.25825 17.4066 7.0211 17.0665C6.93599 16.9444 6.85841 16.8166 6.78905 16.6837C6.63314 16.385 6.51875 16.0608 6.45335 15.7185C6.45065 15.7044 6.44804 15.6902 6.44552 15.676C6.42257 15.5474 6.2381 15.5474 6.21515 15.676C6.21263 15.6902 6.20999 15.7044 6.20729 15.7185C6.14192 16.0608 6.02753 16.385 5.87159 16.6837C5.80226 16.8166 5.72468 16.9444 5.63957 17.0665C5.40239 17.4066 5.10662 17.7024 4.76645 17.9395C4.64438 18.0247 4.51658 18.1022 4.38371 18.1716C4.08503 18.3275 3.76082 18.4419 3.41855 18.5073C3.40442 18.51 3.39026 18.5126 3.37604 18.5152C3.24746 18.5381 3.24746 18.7226 3.37604 18.7455C3.39026 18.748 3.40442 18.7507 3.41855 18.7534Z" fill="white"/>
                      </svg>
                    )}
                    <span className="text-white text-sm font-bold" style={{ fontFamily: "Mulish" }}>Generate Scripts</span>
                  </button>
                </div>
              </div>

              {/* Section 2: Choose a Script */}
              <div className="mx-6 mt-8 rounded-3xl outline outline-1 outline-[#1A1E2F] p-6">
                <h2 className="text-white text-2xl font-bold leading-6" style={{ fontFamily: "Mulish" }}>
                  2. Choose a Script
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
                  3. Choose a Narrator
                </h2>
                <div className="w-full h-px bg-[#2C2C43] my-4" />

                {/* Tabs */}
                <UnderlineTabs
                  tabs={[
                    { id: "ai", label: "AI Narrators" },
                    { id: "my-voice", label: "MY Voice" },
                  ]}
                  activeTab={narratorTab}
                  onTabChange={(id) => setNarratorTab(id as "ai" | "my-voice")}
                  variant="pill"
                  className="mb-6"
                />

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
                          <svg width="23" height="22" viewBox="0 0 23 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" clipRule="evenodd" d="M1.10513 5.27132C0.820528 5.16611 0.524779 5.08334 0.219997 5.02511C0.19762 5.02085 0.175195 5.01672 0.152719 5.01269C-0.0509063 4.97637 -0.0509063 4.68428 0.152719 4.64795C0.175195 4.64393 0.19762 4.6398 0.219997 4.63554C0.524779 4.57731 0.820528 4.49454 1.10513 4.38933C1.27545 4.32635 1.44178 4.25538 1.60366 4.17678C2.72471 3.63261 3.6326 2.72471 4.1768 1.60366C4.25537 1.44178 4.32638 1.27545 4.38932 1.10513C4.49453 0.820528 4.5773 0.524779 4.63553 0.219997C4.63979 0.19762 4.64393 0.175195 4.64795 0.152719C4.68428 -0.0509063 4.97636 -0.0509063 5.01269 0.152719C5.01671 0.175195 5.02085 0.19762 5.02511 0.219997C5.08334 0.524779 5.16611 0.820528 5.27132 1.10513C5.33429 1.27545 5.40527 1.44178 5.48387 1.60366C6.02804 2.72471 6.93593 3.63261 8.057 4.17678C8.21888 4.25538 8.3852 4.32635 8.55551 4.38933C8.84012 4.49454 9.13586 4.57731 9.44066 4.63554C9.46304 4.6398 9.48545 4.64393 9.50792 4.64795C9.71156 4.68428 9.71156 4.97637 9.50792 5.01269C9.48545 5.01672 9.46304 5.02085 9.44066 5.02511C9.13586 5.08334 8.84012 5.16611 8.55551 5.27132C8.3852 5.33429 8.21888 5.40527 8.057 5.48387C6.93593 6.02804 6.02804 6.93594 5.48387 8.057C5.40527 8.21888 5.33429 8.3852 5.27132 8.55551C5.16611 8.84013 5.08334 9.13587 5.02511 9.44067C5.02085 9.46302 5.01671 9.48545 5.01269 9.50793C4.97636 9.71157 4.68428 9.71157 4.64795 9.50793C4.64393 9.48545 4.63979 9.46302 4.63553 9.44067C4.5773 9.13587 4.49453 8.84013 4.38932 8.55551C4.32638 8.3852 4.25537 8.21888 4.1768 8.057C3.6326 6.93594 2.72471 6.02804 1.60366 5.48387C1.44178 5.40527 1.27545 5.33429 1.10513 5.27132ZM7.90931 12.507C7.71026 12.4534 7.50845 12.4063 7.30409 12.366C7.27214 12.3598 7.24016 12.3536 7.20812 12.3477L7.1984 12.3459L7.18526 12.3435C7.16504 12.3398 7.14284 12.3358 7.09844 12.3279L7.08293 12.3251C6.75728 12.2635 6.75728 11.7972 7.08293 11.7355L7.09844 11.7328C7.14284 11.7248 7.16504 11.7209 7.18526 11.7172L7.1984 11.7148L7.20812 11.713C7.24016 11.707 7.27214 11.7009 7.30406 11.6946C7.50842 11.6544 7.71026 11.6073 7.90931 11.5537C8.07932 11.5078 8.24732 11.4572 8.41316 11.4019C11.0962 10.5076 13.2076 8.39625 14.1019 5.71316C14.1572 5.54733 14.2078 5.37932 14.2537 5.20928C14.3073 5.01026 14.3544 4.80842 14.3946 4.60406C14.4009 4.57214 14.407 4.54017 14.413 4.50813L14.4148 4.4984L14.4172 4.48527C14.4208 4.46528 14.4248 4.44335 14.4325 4.39994L14.4328 4.39845L14.4355 4.38294C14.4972 4.05728 14.9635 4.05728 15.0251 4.38294L15.0279 4.39845C15.0358 4.44284 15.0398 4.46504 15.0435 4.48527L15.0459 4.4984L15.0477 4.50813C15.0536 4.54017 15.0598 4.57214 15.066 4.60406C15.1063 4.80845 15.1534 5.01026 15.207 5.20928C15.2528 5.37932 15.3034 5.54733 15.3587 5.71316C16.2531 8.39625 18.3644 10.5076 21.0475 11.4019C21.2133 11.4572 21.3813 11.5078 21.5514 11.5537C21.7504 11.6073 21.9522 11.6544 22.1566 11.6946C22.1885 11.7009 22.2205 11.707 22.2525 11.713L22.2622 11.7148L22.2754 11.7172C22.2956 11.7209 22.3178 11.7248 22.3622 11.7328L22.3777 11.7355C22.7034 11.7972 22.7034 12.2635 22.3777 12.3251L22.3622 12.3279L22.3152 12.3363L22.2754 12.3435L22.2622 12.3459L22.2525 12.3477C22.2205 12.3536 22.1885 12.3598 22.1566 12.366C21.9522 12.4063 21.7504 12.4534 21.5514 12.507C21.3813 12.5528 21.2133 12.6034 21.0475 12.6587C18.3644 13.5531 16.2531 15.6644 15.3587 18.3475C15.3034 18.5133 15.2528 18.6813 15.207 18.8514C15.1534 19.0504 15.1063 19.2522 15.066 19.4566C15.0598 19.4885 15.0536 19.5205 15.0477 19.5525L15.0459 19.5622L15.0435 19.5754L15.0381 19.605L15.0282 19.6605L15.0251 19.6777C14.9635 20.0034 14.4972 20.0034 14.4355 19.6777L14.4328 19.6622C14.4249 19.6179 14.4209 19.5956 14.4172 19.5754L14.4148 19.5622L14.413 19.5525C14.407 19.5205 14.4009 19.4885 14.3946 19.4566C14.3544 19.2522 14.3073 19.0504 14.2537 18.8514C14.2078 18.6813 14.1572 18.5133 14.1019 18.3475C13.2076 15.6644 11.0962 13.5531 8.41316 12.6587C8.24732 12.6034 8.07932 12.5528 7.90931 12.507ZM3.41855 18.7534C3.76082 18.8187 4.08503 18.9331 4.38371 19.0891C4.51658 19.1584 4.64438 19.236 4.76645 19.3211C5.10662 19.5583 5.40239 19.8541 5.63957 20.1942C5.72468 20.3163 5.80226 20.4441 5.87159 20.5769C6.02753 20.8756 6.14192 21.1999 6.20729 21.5421C6.20999 21.5563 6.21263 21.5704 6.21515 21.5846C6.2381 21.7132 6.42257 21.7132 6.44552 21.5846C6.44804 21.5704 6.45065 21.5563 6.45335 21.5421C6.51875 21.1999 6.63314 20.8756 6.78905 20.5769C6.85841 20.4441 6.93599 20.3163 7.0211 20.1942C7.25825 19.8541 7.55405 19.5583 7.89422 19.3211C8.01629 19.236 8.14409 19.1584 8.27693 19.0891C8.57564 18.9331 8.89985 18.8187 9.24212 18.7534C9.25625 18.7507 9.27041 18.748 9.2846 18.7455C9.41321 18.7226 9.41321 18.5381 9.2846 18.5152C9.27041 18.5126 9.25625 18.51 9.24212 18.5073C8.89985 18.4419 8.57564 18.3275 8.27693 18.1716C8.14409 18.1022 8.01629 18.0247 7.89422 17.9395C7.55405 17.7024 7.25825 17.4066 7.0211 17.0665C6.93599 16.9444 6.85841 16.8166 6.78905 16.6837C6.63314 16.385 6.51875 16.0608 6.45335 15.7185C6.45065 15.7044 6.44804 15.6902 6.44552 15.676C6.42257 15.5474 6.2381 15.5474 6.21515 15.676C6.21263 15.6902 6.20999 15.7044 6.20729 15.7185C6.14192 16.0608 6.02753 16.385 5.87159 16.6837C5.80226 16.8166 5.72468 16.9444 5.63957 17.0665C5.40239 17.4066 5.10662 17.7024 4.76645 17.9395C4.64438 18.0247 4.51658 18.1022 4.38371 18.1716C4.08503 18.3275 3.76082 18.4419 3.41855 18.5073C3.40442 18.51 3.39026 18.5126 3.37604 18.5152C3.24746 18.5381 3.24746 18.7226 3.37604 18.7455C3.39026 18.748 3.40442 18.7507 3.41855 18.7534Z" fill="white"/>
                          </svg>
                        )}
                        <span className="text-white text-sm font-bold" style={{ fontFamily: "Mulish" }}>Generate Narration</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Top Row: Voice Preview + Buttons */}
                    <div className="flex gap-4">
                      {/* Voice Preview Card */}
                      <div className="w-[200px] h-[200px] bg-[#16151D] rounded-xl flex flex-col items-center justify-center gap-3">
                        <img
                          src="https://i.pravatar.cc/90?u=my-voice"
                          alt="My Voice"
                          className="w-[90px] h-[90px] rounded-full"
                        />
                        <span className="text-white text-xl font-bold" style={{ fontFamily: "Mulish" }}>Sarah</span>
                        <span className="text-[#ADADAD] text-sm" style={{ fontFamily: "Mulish" }}>Use this voice</span>
                      </div>

                      {/* Start Recording Button */}
                      <button
                        onClick={() => setShowRecordingModal(true)}
                        className="flex-1 h-[200px] bg-[#16151D] rounded-xl flex items-center justify-center"
                      >
                        <div className="flex items-center gap-2 px-[49px] py-4 rounded-xl text-lg font-bold text-white border border-[#B8B6FC] bg-[#262550]" style={{ fontFamily: "Mulish" }}>
                          {/* Mic Icon */}
                          <svg width="15" height="20" viewBox="0 0 15 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M7.2404 12.4125C6.34324 12.4125 5.58107 12.0989 4.9539 11.4718C4.32674 10.8446 4.01315 10.0824 4.01315 9.18525V3.22725C4.01315 2.33008 4.32674 1.56792 4.9539 0.94075C5.58107 0.313583 6.34324 0 7.2404 0C8.13757 0 8.89974 0.313583 9.5269 0.94075C10.1541 1.56792 10.4677 2.33008 10.4677 3.22725V9.18525C10.4677 10.0824 10.1541 10.8446 9.5269 11.4718C8.89974 12.0989 8.13757 12.4125 7.2404 12.4125ZM6.15065 18.4125V16.4032C4.56165 16.1826 3.20232 15.5107 2.07265 14.3875C0.943154 13.2643 0.255737 11.9018 0.010404 10.3C-0.0307627 9.99283 0.0502373 9.73025 0.253404 9.51225C0.456737 9.29425 0.711987 9.18525 1.01915 9.18525C1.32649 9.18525 1.5869 9.29108 1.8004 9.50275C2.01407 9.71425 2.15824 9.97367 2.2329 10.281C2.48607 11.4637 3.08415 12.431 4.02715 13.183C4.96999 13.9348 6.04107 14.3108 7.2404 14.3108C8.4564 14.3108 9.53165 13.9307 10.4662 13.1705C11.4008 12.4102 11.9947 11.447 12.2479 10.281C12.3226 9.97367 12.4667 9.71425 12.6804 9.50275C12.8939 9.29108 13.1543 9.18525 13.4617 9.18525C13.7688 9.18525 14.0231 9.29525 14.2244 9.51525C14.4257 9.73508 14.5057 9.99867 14.4644 10.306C14.2191 11.8745 13.5368 13.2277 12.4177 14.3655C11.2983 15.5033 9.93582 16.1826 8.33015 16.4032V18.4125C8.33015 18.7198 8.22532 18.9783 8.01565 19.1877C7.80599 19.3974 7.54757 19.5022 7.2404 19.5022C6.93324 19.5022 6.67482 19.3974 6.46515 19.1877C6.25549 18.9783 6.15065 18.7198 6.15065 18.4125Z" fill="white"/>
                          </svg>
                          <span>Start Recording</span>
                        </div>
                      </button>

                      {/* Upload File Button */}
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
                        className="flex-1 h-[200px] bg-[#16151D] rounded-xl flex items-center justify-center"
                      >
                        <div className="flex items-center gap-2 px-[49px] py-4 rounded-xl text-lg font-bold text-white border border-[#B8B6FC] bg-[#262550]" style={{ fontFamily: "Mulish" }}>
                          {/* Upload File Icon */}
                          <svg width="15" height="19" viewBox="0 0 15 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6.75 11.45V15.1345C6.75 15.3473 6.82183 15.5256 6.9655 15.6693C7.109 15.8128 7.28717 15.8845 7.5 15.8845C7.71283 15.8845 7.891 15.8128 8.0345 15.6693C8.17817 15.5256 8.25 15.3473 8.25 15.1345V11.45L9.573 12.773C9.6475 12.8473 9.73117 12.9031 9.824 12.9402C9.917 12.9774 10.01 12.9935 10.103 12.9885C10.1958 12.9833 10.2878 12.9622 10.3788 12.925C10.4698 12.8878 10.5525 12.8321 10.627 12.7578C10.7718 12.6026 10.8468 12.4269 10.852 12.2308C10.857 12.0346 10.782 11.8589 10.627 11.7037L8.13275 9.2095C8.03908 9.116 7.94033 9.05 7.8365 9.0115C7.73267 8.973 7.6205 8.95375 7.5 8.95375C7.3795 8.95375 7.26733 8.973 7.1635 9.0115C7.05967 9.05 6.96092 9.116 6.86725 9.2095L4.373 11.7037C4.22433 11.8526 4.151 12.0267 4.153 12.226C4.15483 12.4253 4.23333 12.6026 4.3885 12.7578C4.54367 12.9026 4.71933 12.9776 4.9155 12.9827C5.1115 12.9878 5.28708 12.9128 5.44225 12.7578L6.75 11.45ZM1.80775 19C1.30258 19 0.875 18.825 0.525 18.475C0.175 18.125 0 17.6974 0 17.1923V1.80775C0 1.30258 0.175 0.875 0.525 0.525C0.875 0.175 1.30258 0 1.80775 0H9.002C9.243 0 9.47475 0.0468332 9.69725 0.1405C9.91958 0.234 10.1128 0.362834 10.277 0.527L14.473 4.723C14.6372 4.88717 14.766 5.08042 14.8595 5.30275C14.9532 5.52525 15 5.757 15 5.998V17.1923C15 17.6974 14.825 18.125 14.475 18.475C14.125 18.825 13.6974 19 13.1923 19H1.80775ZM9 5.096C9 5.35383 9.08625 5.56892 9.25875 5.74125C9.43108 5.91375 9.64617 6 9.904 6H13.5L9 1.5V5.096Z" fill="white"/>
                          </svg>
                          <span>Upload File</span>
                        </div>
                      </button>
                    </div>

                    {/* Bottom Row: Audio Player + Checkbox + Name Input */}
                    <div className="flex items-center gap-4 mt-6">
                      {/* Audio Player */}
                      <div className="flex items-center gap-3 px-3 py-2 bg-[#16151D] rounded-lg" style={{ width: 280 }}>
                        <button className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                          <svg width="10" height="12" viewBox="0 0 10 12" fill="white">
                            <path d="M0 0L10 6L0 12V0Z"/>
                          </svg>
                        </button>
                        <div className="flex-1 h-[4px] bg-[#272726] rounded-full relative">
                          <div className="absolute left-0 top-0 w-[40px] h-full bg-[#5C5C5B] rounded-full"/>
                        </div>
                        <span className="text-white text-sm whitespace-nowrap" style={{ fontFamily: "Mulish" }}>0:00 / 1:28</span>
                      </div>

                      {/* Checkbox */}
                      <label className="flex items-center gap-3 whitespace-nowrap">
                        <div className="w-6 h-6 bg-white rounded flex items-center justify-center flex-shrink-0">
                          <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                            <path d="M1 5L5 9L13 1" stroke="#16151D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <span className="text-white text-base font-semibold" style={{ fontFamily: "Mulish" }}>Use my voice and save it</span>
                      </label>

                      {/* Name Input */}
                      <input
                        type="text"
                        placeholder="Name your voice"
                        className="flex-1 h-10 px-4 bg-[#262626] rounded-lg text-white text-base placeholder-[#ADADAD] focus:outline-none"
                        style={{ fontFamily: "Mulish" }}
                      />
                    </div>

                    {/* Generate Narration Button */}
                    <div className="flex justify-center mt-6">
                      <button
                        onClick={handleGenerateNarration}
                        disabled={isGeneratingNarration}
                        className="flex items-center gap-2 px-8 py-4 rounded-xl bg-[#2E4E3A] outline outline-1 outline-[#1ED760] disabled:opacity-50"
                      >
                        {isGeneratingNarration ? (
                          <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                        ) : (
                          <svg width="23" height="22" viewBox="0 0 23 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" clipRule="evenodd" d="M1.10513 5.27132C0.820528 5.16611 0.524779 5.08334 0.219997 5.02511C0.19762 5.02085 0.175195 5.01672 0.152719 5.01269C-0.0509063 4.97637 -0.0509063 4.68428 0.152719 4.64795C0.175195 4.64393 0.19762 4.6398 0.219997 4.63554C0.524779 4.57731 0.820528 4.49454 1.10513 4.38933C1.27545 4.32635 1.44178 4.25538 1.60366 4.17678C2.72471 3.63261 3.6326 2.72471 4.1768 1.60366C4.25537 1.44178 4.32638 1.27545 4.38932 1.10513C4.49453 0.820528 4.5773 0.524779 4.63553 0.219997C4.63979 0.19762 4.64393 0.175195 4.64795 0.152719C4.68428 -0.0509063 4.97636 -0.0509063 5.01269 0.152719C5.01671 0.175195 5.02085 0.19762 5.02511 0.219997C5.08334 0.524779 5.16611 0.820528 5.27132 1.10513C5.33429 1.27545 5.40527 1.44178 5.48387 1.60366C6.02804 2.72471 6.93593 3.63261 8.057 4.17678C8.21888 4.25538 8.3852 4.32635 8.55551 4.38933C8.84012 4.49454 9.13586 4.57731 9.44066 4.63554C9.46304 4.6398 9.48545 4.64393 9.50792 4.64795C9.71156 4.68428 9.71156 4.97637 9.50792 5.01269C9.48545 5.01672 9.46304 5.02085 9.44066 5.02511C9.13586 5.08334 8.84012 5.16611 8.55551 5.27132C8.3852 5.33429 8.21888 5.40527 8.057 5.48387C6.93593 6.02804 6.02804 6.93594 5.48387 8.057C5.40527 8.21888 5.33429 8.3852 5.27132 8.55551C5.16611 8.84013 5.08334 9.13587 5.02511 9.44067C5.02085 9.46302 5.01671 9.48545 5.01269 9.50793C4.97636 9.71157 4.68428 9.71157 4.64795 9.50793C4.64393 9.48545 4.63979 9.46302 4.63553 9.44067C4.5773 9.13587 4.49453 8.84013 4.38932 8.55551C4.32638 8.3852 4.25537 8.21888 4.1768 8.057C3.6326 6.93594 2.72471 6.02804 1.60366 5.48387C1.44178 5.40527 1.27545 5.33429 1.10513 5.27132ZM7.90931 12.507C7.71026 12.4534 7.50845 12.4063 7.30409 12.366C7.27214 12.3598 7.24016 12.3536 7.20812 12.3477L7.1984 12.3459L7.18526 12.3435C7.16504 12.3398 7.14284 12.3358 7.09844 12.3279L7.08293 12.3251C6.75728 12.2635 6.75728 11.7972 7.08293 11.7355L7.09844 11.7328C7.14284 11.7248 7.16504 11.7209 7.18526 11.7172L7.1984 11.7148L7.20812 11.713C7.24016 11.707 7.27214 11.7009 7.30406 11.6946C7.50842 11.6544 7.71026 11.6073 7.90931 11.5537C8.07932 11.5078 8.24732 11.4572 8.41316 11.4019C11.0962 10.5076 13.2076 8.39625 14.1019 5.71316C14.1572 5.54733 14.2078 5.37932 14.2537 5.20928C14.3073 5.01026 14.3544 4.80842 14.3946 4.60406C14.4009 4.57214 14.407 4.54017 14.413 4.50813L14.4148 4.4984L14.4172 4.48527C14.4208 4.46528 14.4248 4.44335 14.4325 4.39994L14.4328 4.39845L14.4355 4.38294C14.4972 4.05728 14.9635 4.05728 15.0251 4.38294L15.0279 4.39845C15.0358 4.44284 15.0398 4.46504 15.0435 4.48527L15.0459 4.4984L15.0477 4.50813C15.0536 4.54017 15.0598 4.57214 15.066 4.60406C15.1063 4.80845 15.1534 5.01026 15.207 5.20928C15.2528 5.37932 15.3034 5.54733 15.3587 5.71316C16.2531 8.39625 18.3644 10.5076 21.0475 11.4019C21.2133 11.4572 21.3813 11.5078 21.5514 11.5537C21.7504 11.6073 21.9522 11.6544 22.1566 11.6946C22.1885 11.7009 22.2205 11.707 22.2525 11.713L22.2622 11.7148L22.2754 11.7172C22.2956 11.7209 22.3178 11.7248 22.3622 11.7328L22.3777 11.7355C22.7034 11.7972 22.7034 12.2635 22.3777 12.3251L22.3622 12.3279L22.3152 12.3363L22.2754 12.3435L22.2622 12.3459L22.2525 12.3477C22.2205 12.3536 22.1885 12.3598 22.1566 12.366C21.9522 12.4063 21.7504 12.4534 21.5514 12.507C21.3813 12.5528 21.2133 12.6034 21.0475 12.6587C18.3644 13.5531 16.2531 15.6644 15.3587 18.3475C15.3034 18.5133 15.2528 18.6813 15.207 18.8514C15.1534 19.0504 15.1063 19.2522 15.066 19.4566C15.0598 19.4885 15.0536 19.5205 15.0477 19.5525L15.0459 19.5622L15.0435 19.5754L15.0381 19.605L15.0282 19.6605L15.0251 19.6777C14.9635 20.0034 14.4972 20.0034 14.4355 19.6777L14.4328 19.6622C14.4249 19.6179 14.4209 19.5956 14.4172 19.5754L14.4148 19.5622L14.413 19.5525C14.407 19.5205 14.4009 19.4885 14.3946 19.4566C14.3544 19.2522 14.3073 19.0504 14.2537 18.8514C14.2078 18.6813 14.1572 18.5133 14.1019 18.3475C13.2076 15.6644 11.0962 13.5531 8.41316 12.6587C8.24732 12.6034 8.07932 12.5528 7.90931 12.507ZM3.41855 18.7534C3.76082 18.8187 4.08503 18.9331 4.38371 19.0891C4.51658 19.1584 4.64438 19.236 4.76645 19.3211C5.10662 19.5583 5.40239 19.8541 5.63957 20.1942C5.72468 20.3163 5.80226 20.4441 5.87159 20.5769C6.02753 20.8756 6.14192 21.1999 6.20729 21.5421C6.20999 21.5563 6.21263 21.5704 6.21515 21.5846C6.2381 21.7132 6.42257 21.7132 6.44552 21.5846C6.44804 21.5704 6.45065 21.5563 6.45335 21.5421C6.51875 21.1999 6.63314 20.8756 6.78905 20.5769C6.85841 20.4441 6.93599 20.3163 7.0211 20.1942C7.25825 19.8541 7.55405 19.5583 7.89422 19.3211C8.01629 19.236 8.14409 19.1584 8.27693 19.0891C8.57564 18.9331 8.89985 18.8187 9.24212 18.7534C9.25625 18.7507 9.27041 18.748 9.2846 18.7455C9.41321 18.7226 9.41321 18.5381 9.2846 18.5152C9.27041 18.5126 9.25625 18.51 9.24212 18.5073C8.89985 18.4419 8.57564 18.3275 8.27693 18.1716C8.14409 18.1022 8.01629 18.0247 7.89422 17.9395C7.55405 17.7024 7.25825 17.4066 7.0211 17.0665C6.93599 16.9444 6.85841 16.8166 6.78905 16.6837C6.63314 16.385 6.51875 16.0608 6.45335 15.7185C6.45065 15.7044 6.44804 15.6902 6.44552 15.676C6.42257 15.5474 6.2381 15.5474 6.21515 15.676C6.21263 15.6902 6.20999 15.7044 6.20729 15.7185C6.14192 16.0608 6.02753 16.385 5.87159 16.6837C5.80226 16.8166 5.72468 16.9444 5.63957 17.0665C5.40239 17.4066 5.10662 17.7024 4.76645 17.9395C4.64438 18.0247 4.51658 18.1022 4.38371 18.1716C4.08503 18.3275 3.76082 18.4419 3.41855 18.5073C3.40442 18.51 3.39026 18.5126 3.37604 18.5152C3.24746 18.5381 3.24746 18.7226 3.37604 18.7455C3.39026 18.748 3.40442 18.7507 3.41855 18.7534Z" fill="white"/>
                          </svg>
                        )}
                        <span className="text-white text-sm font-bold" style={{ fontFamily: "Mulish" }}>Generate Narration</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            /* Upload Mode - Section 1 */
            <div className="mx-6 mt-8 rounded-3xl outline outline-1 outline-[#1A1E2F] p-6">
              <h2 className="text-white text-2xl font-bold" style={{ fontFamily: "Mulish" }}>1. Upload Your Episode</h2>
              <div className="w-full h-px bg-[#2C2C43] my-4" />

              {/* Centered Card */}
              <div className="flex justify-center">
                <div className="w-[636px] h-[279px] bg-[#16151D] rounded-xl flex items-center justify-center">
                  {uploadedFile ? (
                    <div className="flex items-center gap-4 p-4">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                      </svg>
                      <span className="text-white text-lg" style={{ fontFamily: "Mulish" }}>{uploadedFile.name}</span>
                      <button onClick={() => setUploadedFile(null)} className="text-red-400 ml-2">
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
                      className="flex items-center gap-2 px-[49px] py-4 rounded-xl text-lg font-bold text-white border border-[#B8B6FC] bg-[#262550]"
                      style={{ fontFamily: "Mulish" }}
                    >
                      {/* Upload File Icon */}
                      <svg width="15" height="19" viewBox="0 0 15 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6.75 11.45V15.1345C6.75 15.3473 6.82183 15.5256 6.9655 15.6693C7.109 15.8128 7.28717 15.8845 7.5 15.8845C7.71283 15.8845 7.891 15.8128 8.0345 15.6693C8.17817 15.5256 8.25 15.3473 8.25 15.1345V11.45L9.573 12.773C9.6475 12.8473 9.73117 12.9031 9.824 12.9402C9.917 12.9774 10.01 12.9935 10.103 12.9885C10.1958 12.9833 10.2878 12.9622 10.3788 12.925C10.4698 12.8878 10.5525 12.8321 10.627 12.7578C10.7718 12.6026 10.8468 12.4269 10.852 12.2308C10.857 12.0346 10.782 11.8589 10.627 11.7037L8.13275 9.2095C8.03908 9.116 7.94033 9.05 7.8365 9.0115C7.73267 8.973 7.6205 8.95375 7.5 8.95375C7.3795 8.95375 7.26733 8.973 7.1635 9.0115C7.05967 9.05 6.96092 9.116 6.86725 9.2095L4.373 11.7037C4.22433 11.8526 4.151 12.0267 4.153 12.226C4.15483 12.4253 4.23333 12.6026 4.3885 12.7578C4.54367 12.9026 4.71933 12.9776 4.9155 12.9827C5.1115 12.9878 5.28708 12.9128 5.44225 12.7578L6.75 11.45ZM1.80775 19C1.30258 19 0.875 18.825 0.525 18.475C0.175 18.125 0 17.6974 0 17.1923V1.80775C0 1.30258 0.175 0.875 0.525 0.525C0.875 0.175 1.30258 0 1.80775 0H9.002C9.243 0 9.47475 0.0468332 9.69725 0.1405C9.91958 0.234 10.1128 0.362834 10.277 0.527L14.473 4.723C14.6372 4.88717 14.766 5.08042 14.8595 5.30275C14.9532 5.52525 15 5.757 15 5.998V17.1923C15 17.6974 14.825 18.125 14.475 18.475C14.125 18.825 13.6974 19 13.1923 19H1.80775ZM9 5.096C9 5.35383 9.08625 5.56892 9.25875 5.74125C9.43108 5.91375 9.64617 6 9.904 6H13.5L9 1.5V5.096Z" fill="white"/>
                      </svg>
                      <span>Upload File</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Review & Publish (shared) */}
          <div className="mx-6 mt-8 rounded-3xl outline outline-1 outline-[#1A1E2F] p-6">
            <h2 className="text-white text-2xl font-bold" style={{ fontFamily: "Mulish" }}>{activeMode === "create-ai" ? "4" : "2"}. Review & Publish</h2>
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
