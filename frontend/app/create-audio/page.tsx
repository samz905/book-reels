"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import ModeToggle from "../components/audio-story/ModeToggle";
import GenerateScriptsSection from "../components/audio-story/GenerateScriptsSection";
import ChooseScriptSection from "../components/audio-story/ChooseScriptSection";
import ChooseNarratorSection from "../components/audio-story/ChooseNarratorSection";
import ReviewPublishSection from "../components/audio-story/ReviewPublishSection";
import UploadEpisodeSection from "../components/audio-story/UploadEpisodeSection";
import RecordingModal from "../components/audio-story/RecordingModal";
import {
  Script,
  EpisodeLength,
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
  const [episodeLength, setEpisodeLength] = useState<EpisodeLength>("1 min");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedScripts, setGeneratedScripts] = useState<Script[]>([]);
  const [selectedScriptIndex, setSelectedScriptIndex] = useState<number | null>(null);
  const [narratorTab, setNarratorTab] = useState<"ai" | "my-voice">("ai");
  const [selectedNarratorId, setSelectedNarratorId] = useState<string | null>(null);
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isGeneratingNarration, setIsGeneratingNarration] = useState(false);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);

  // Upload flow state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Shared (Review & Publish)
  const [selectedStoryId, setSelectedStoryId] = useState("");
  const [episodeNumber, setEpisodeNumber] = useState("");
  const [episodeName, setEpisodeName] = useState("");
  const [visibility, setVisibility] = useState<"draft" | "published">("draft");
  const [isPublishing, setIsPublishing] = useState(false);

  // Handle generate scripts (mock)
  const handleGenerateScripts = async () => {
    if (!scriptPrompt.trim()) {
      alert("Please enter some text to generate scripts from.");
      return;
    }
    setIsGenerating(true);
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const scripts = generateMockScripts(scriptPrompt, episodeLength);
    setGeneratedScripts(scripts);
    setSelectedScriptIndex(null);
    setIsGenerating(false);
  };

  // Handle generate narration (mock)
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
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setGeneratedAudioUrl("mock-audio-url");
    setIsGeneratingNarration(false);
  };

  // Handle publish
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
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    alert("Audio episode created successfully!");
    setIsPublishing(false);
    // Reset form or redirect
  };

  // Handle file upload
  const handleFileSelect = (file: File) => {
    setUploadedFile(file);
  };

  // Handle recording
  const handleStartRecording = () => {
    setShowRecordingModal(true);
  };

  const handleRecordingStart = () => {
    setIsRecording(true);
  };

  const handleRecordingStop = () => {
    setIsRecording(false);
    // In a real app, we'd have the recorded audio here
    setShowRecordingModal(false);
  };

  // Show loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-black relative overflow-clip">
        <Header />
        <main className="relative z-10 px-6 py-8 max-w-5xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="bg-[#0F0E13] rounded-xl p-6 h-20" />
            <div className="bg-[#0F0E13] rounded-xl p-6 h-48" />
            <div className="bg-[#0F0E13] rounded-xl p-6 h-48" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-black relative overflow-clip">
        <Header />
        <main className="relative z-10 px-6 py-8 max-w-5xl mx-auto">
          <div className="bg-[#0F0E13] rounded-xl p-8 text-center">
            <h2 className="text-white text-xl font-semibold mb-4">
              Sign in to create audio stories
            </h2>
            <p className="text-white/60 mb-6">
              Generate AI-powered audio or upload your own recordings.
            </p>
            <button
              onClick={() => router.push("/login")}
              className="px-6 py-3 rounded-lg font-semibold text-white transition-opacity hover:opacity-90"
              style={{
                background: "linear-gradient(135deg, #9C99FF 0%, #7370FF 60%)",
              }}
            >
              Sign In
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const selectedNarrator = mockNarrators.find((n) => n.id === selectedNarratorId);

  return (
    <div className="min-h-screen bg-black relative overflow-clip">
      <Header />

      <main className="relative z-10 px-6 py-8 max-w-5xl mx-auto">
        {/* Sub-tabs: CREATE AN AUDIO STORY | CREATE A VIDEO STORY */}
        <div className="flex items-center gap-8 mb-8">
          <button className="text-white text-sm font-semibold uppercase tracking-wide border-b-2 border-white pb-2">
            Create an Audio Story
          </button>
          <button
            onClick={() => router.push("/create")}
            className="text-[#ADADAD] text-sm font-semibold uppercase tracking-wide pb-2 hover:text-white transition-colors"
          >
            Create a Video Story
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="mb-8">
          <ModeToggle activeMode={activeMode} onModeChange={setActiveMode} />
        </div>

        {/* Conditional content based on mode */}
        {activeMode === "create-ai" ? (
          <div className="space-y-6">
            {/* Section 1: Generate Short Scripts */}
            <GenerateScriptsSection
              prompt={scriptPrompt}
              onPromptChange={setScriptPrompt}
              episodeLength={episodeLength}
              onEpisodeLengthChange={setEpisodeLength}
              onGenerate={handleGenerateScripts}
              isGenerating={isGenerating}
            />

            {/* Section 2: Choose a Script */}
            <ChooseScriptSection
              scripts={generatedScripts}
              selectedIndex={selectedScriptIndex}
              onSelect={setSelectedScriptIndex}
            />

            {/* Section 3: Choose a Narrator */}
            <ChooseNarratorSection
              activeTab={narratorTab}
              onTabChange={setNarratorTab}
              narrators={mockNarrators}
              selectedNarratorId={selectedNarratorId}
              selectedNarrator={selectedNarrator}
              onNarratorSelect={setSelectedNarratorId}
              onStartRecording={handleStartRecording}
              onUploadFile={() => {
                // Trigger file upload
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "audio/*";
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) handleFileSelect(file);
                };
                input.click();
              }}
              onGenerateNarration={handleGenerateNarration}
              isGeneratingNarration={isGeneratingNarration}
              credits={mockCredits}
            />

            {/* Section 4: Review & Publish */}
            <ReviewPublishSection
              sectionNumber={4}
              audioUrl={generatedAudioUrl}
              selectedStoryId={selectedStoryId}
              onStorySelect={setSelectedStoryId}
              episodeNumber={episodeNumber}
              onEpisodeNumberChange={setEpisodeNumber}
              episodeName={episodeName}
              onEpisodeNameChange={setEpisodeName}
              visibility={visibility}
              onVisibilityChange={setVisibility}
              onPublish={handlePublish}
              isPublishing={isPublishing}
              stories={mockStories}
            />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Section 1: Upload Your Episode */}
            <UploadEpisodeSection
              uploadedFile={uploadedFile}
              onFileSelect={handleFileSelect}
              onRemoveFile={() => setUploadedFile(null)}
            />

            {/* Section 2: Review & Publish */}
            <ReviewPublishSection
              sectionNumber={2}
              audioUrl={uploadedFile ? URL.createObjectURL(uploadedFile) : null}
              selectedStoryId={selectedStoryId}
              onStorySelect={setSelectedStoryId}
              episodeNumber={episodeNumber}
              onEpisodeNumberChange={setEpisodeNumber}
              episodeName={episodeName}
              onEpisodeNameChange={setEpisodeName}
              visibility={visibility}
              onVisibilityChange={setVisibility}
              onPublish={handlePublish}
              isPublishing={isPublishing}
              stories={mockStories}
            />
          </div>
        )}
      </main>

      <Footer />

      {/* Recording Modal */}
      <RecordingModal
        isOpen={showRecordingModal}
        isRecording={isRecording}
        onStart={handleRecordingStart}
        onStop={handleRecordingStop}
        onClose={() => {
          setShowRecordingModal(false);
          setIsRecording(false);
        }}
      />
    </div>
  );
}
