"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import EpisodeList from "@/app/components/creator/EpisodeList";
import CreateEpisodeModal from "@/app/components/creator/CreateEpisodeModal";
import AddBookModal from "@/app/components/creator/AddBookModal";
import EditStoryModal from "@/app/components/creator/EditStoryModal";
import LibraryCarousel from "@/app/components/creator/LibraryCarousel";
import CharacterCard from "@/app/components/creator/CharacterCard";
import LocationCard from "@/app/components/creator/LocationCard";
import CharacterModal from "@/app/components/creator/CharacterModal";
import LocationModal from "@/app/components/creator/LocationModal";
import DeleteConfirmModal from "@/app/components/creator/DeleteConfirmModal";
import { useAuth } from "@/app/context/AuthContext";
import {
  Story,
  Ebook,
  formatViewCount,
  StoryCharacterFE,
  StoryLocationFE,
} from "@/app/data/mockCreatorData";
import {
  mapDbStoryToFrontend,
  updateStory,
  createEbook,
  updateEbook,
  getStoryCharacters,
  createStoryCharacter,
  updateStoryCharacter,
  deleteStoryCharacter,
  getStoryLocations,
  createStoryLocation,
  updateStoryLocation,
  deleteStoryLocation,
} from "@/lib/api/creator";

export default function StoryManagementPage() {
  const params = useParams();
  const router = useRouter();
  const storyId = params.storyId as string;
  const { user, loading: authLoading } = useAuth();

  // Data
  const [story, setStory] = useState<Story | null>(null);
  const [characters, setCharacters] = useState<StoryCharacterFE[]>([]);
  const [locations, setLocations] = useState<StoryLocationFE[]>([]);

  // Loading / error
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [showCreateEpisodeModal, setShowCreateEpisodeModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [editingEbook, setEditingEbook] = useState<Ebook | null>(null);

  const [showCharacterModal, setShowCharacterModal] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<StoryCharacterFE | undefined>(undefined);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<StoryLocationFE | undefined>(undefined);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "character" | "location"; id: string; name: string } | null>(null);

  // Saving states
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [isCharSaving, setIsCharSaving] = useState(false);
  const [isLocSaving, setIsLocSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load data
  useEffect(() => {
    if (authLoading || !user) return;

    async function loadData() {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch story with episodes and ebooks
        const storyRes = await fetch(`/api/stories/${storyId}`, {
          credentials: "include",
        });
        if (!storyRes.ok) {
          if (storyRes.status === 404) throw new Error("Story not found");
          throw new Error("Failed to load story");
        }
        const storyData = await storyRes.json();
        const mapped = mapDbStoryToFrontend(storyData);
        setStory(mapped);

        // Fetch characters and locations in parallel
        const [chars, locs] = await Promise.all([
          getStoryCharacters(storyId),
          getStoryLocations(storyId),
        ]);
        setCharacters(chars);
        setLocations(locs);
      } catch (err) {
        console.error("Error loading story:", err);
        setError(err instanceof Error ? err.message : "Failed to load story");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [storyId, user, authLoading]);

  // ============ Story Handlers ============

  const handleEditStory = async (updatedStory: Story) => {
    setIsEditSaving(true);
    try {
      await updateStory(updatedStory.id, {
        title: updatedStory.title,
        type: updatedStory.type,
        description: updatedStory.description,
        cover_url: updatedStory.cover || null,
        genres: updatedStory.genre,
        status: updatedStory.status,
      });
      setStory(updatedStory);
      setShowEditModal(false);
    } catch (err) {
      console.error("Error updating story:", err);
      alert("Failed to update story. Please try again.");
    } finally {
      setIsEditSaving(false);
    }
  };

  // ============ Ebook Handlers ============

  const handleAddBook = async (bookData: {
    storyId: string;
    title: string;
    fileUrl: string;
    coverUrl?: string;
    price: number;
    isbn?: string;
  }) => {
    try {
      const newEbook = await createEbook(bookData.storyId, {
        title: bookData.title,
        file_url: bookData.fileUrl,
        cover_url: bookData.coverUrl || null,
        isbn: bookData.isbn || null,
        price: bookData.price,
      });
      if (story) {
        setStory({ ...story, ebooks: [...story.ebooks, newEbook] });
      }
      setShowAddBookModal(false);
    } catch (err) {
      console.error("Error adding ebook:", err);
      alert("Failed to add ebook. Please try again.");
    }
  };

  const handleUpdateEbook = async (
    ebookId: string,
    data: { title: string; coverUrl?: string; price: number; isbn?: string }
  ) => {
    try {
      const updated = await updateEbook(ebookId, {
        title: data.title,
        cover_url: data.coverUrl || null,
        isbn: data.isbn || null,
        price: data.price,
      });
      if (story) {
        setStory({
          ...story,
          ebooks: story.ebooks.map((e) => (e.id === ebookId ? updated : e)),
        });
      }
    } catch (err) {
      console.error("Error updating ebook:", err);
      throw err;
    }
  };

  // ============ Character Handlers ============

  const handleSaveCharacter = async (data: {
    name: string;
    age: string;
    gender: string;
    description: string;
    role: string;
    visualStyle: string | null;
    imageBase64: string | null;
    imageMimeType: string;
  }) => {
    setIsCharSaving(true);
    try {
      const payload = {
        name: data.name,
        age: data.age,
        gender: data.gender,
        description: data.description,
        role: data.role,
        visual_style: data.visualStyle,
        image_base64: data.imageBase64,
        image_mime_type: data.imageMimeType,
      };

      if (editingCharacter) {
        const updated = await updateStoryCharacter(storyId, editingCharacter.id, payload);
        setCharacters((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      } else {
        const created = await createStoryCharacter(storyId, payload);
        setCharacters((prev) => [...prev, created]);
      }

      setShowCharacterModal(false);
      setEditingCharacter(undefined);
    } catch (err) {
      console.error("Error saving character:", err);
      alert("Failed to save character. Please try again.");
    } finally {
      setIsCharSaving(false);
    }
  };

  const handleEditCharacter = (character: StoryCharacterFE) => {
    setEditingCharacter(character);
    setShowCharacterModal(true);
  };

  const handleDeleteCharacterRequest = (characterId: string) => {
    const char = characters.find((c) => c.id === characterId);
    if (!char) return;
    setDeleteTarget({ type: "character", id: characterId, name: char.name });
    setShowDeleteModal(true);
  };

  // ============ Location Handlers ============

  const handleSaveLocation = async (data: {
    name: string;
    description: string;
    atmosphere: string;
    visualStyle: string | null;
    imageBase64: string | null;
    imageMimeType: string;
  }) => {
    setIsLocSaving(true);
    try {
      const payload = {
        name: data.name,
        description: data.description,
        atmosphere: data.atmosphere,
        visual_style: data.visualStyle,
        image_base64: data.imageBase64,
        image_mime_type: data.imageMimeType,
      };

      if (editingLocation) {
        const updated = await updateStoryLocation(storyId, editingLocation.id, payload);
        setLocations((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
      } else {
        const created = await createStoryLocation(storyId, payload);
        setLocations((prev) => [...prev, created]);
      }

      setShowLocationModal(false);
      setEditingLocation(undefined);
    } catch (err) {
      console.error("Error saving location:", err);
      alert("Failed to save location. Please try again.");
    } finally {
      setIsLocSaving(false);
    }
  };

  const handleEditLocation = (location: StoryLocationFE) => {
    setEditingLocation(location);
    setShowLocationModal(true);
  };

  const handleDeleteLocationRequest = (locationId: string) => {
    const loc = locations.find((l) => l.id === locationId);
    if (!loc) return;
    setDeleteTarget({ type: "location", id: locationId, name: loc.name });
    setShowDeleteModal(true);
  };

  // ============ Delete Handler ============

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === "character") {
        await deleteStoryCharacter(storyId, deleteTarget.id);
        setCharacters((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      } else {
        await deleteStoryLocation(storyId, deleteTarget.id);
        setLocations((prev) => prev.filter((l) => l.id !== deleteTarget.id));
      }
      setShowDeleteModal(false);
      setDeleteTarget(null);
    } catch (err) {
      console.error("Error deleting:", err);
      alert("Failed to delete. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // ============ Render States ============

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-black relative overflow-clip">
        <Header />
        <main className="relative z-10 px-6 py-8 max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-6 w-48 bg-[#1A1E2F] rounded" />
            <div className="bg-[#0F0E13] rounded-xl p-6 h-[340px]" />
            <div className="bg-[#0F0E13] rounded-xl p-6 h-[200px]" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black relative overflow-clip">
        <Header />
        <main className="relative z-10 px-6 py-8 max-w-7xl mx-auto">
          <div className="bg-[#0F0E13] rounded-xl p-8 text-center">
            <h2 className="text-white text-xl font-semibold mb-4">
              Sign in to manage your story
            </h2>
            <button
              onClick={() => router.push("/login")}
              className="px-6 py-3 rounded-lg font-semibold text-white transition-opacity hover:opacity-90"
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

  if (error || !story) {
    return (
      <div className="min-h-screen bg-black relative overflow-clip">
        <Header />
        <main className="relative z-10 px-6 py-8 max-w-7xl mx-auto">
          <div className="bg-[#0F0E13] rounded-xl p-8 text-center">
            <h2 className="text-red-400 text-xl font-semibold mb-4">
              {error || "Story not found"}
            </h2>
            <button
              onClick={() => router.push("/create")}
              className="px-6 py-3 rounded-lg font-semibold text-white bg-[#262550] border border-[#B8B6FC] hover:bg-[#363580] transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const freeCount = 4;

  return (
    <div className="min-h-screen bg-black relative overflow-clip">
      <Header />

      <main className="relative z-10 px-6 py-8 max-w-7xl mx-auto">
        {/* Back link */}
        <button
          onClick={() => router.push("/create")}
          className="text-[#539ED3] text-sm hover:underline mb-6 inline-flex items-center gap-1"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
          Back to Creator Dashboard
        </button>

        {/* Story Card */}
        <div className="bg-[#0F0E13] rounded-xl p-6">
          {/* Action buttons row */}
          <div className="flex items-center justify-end gap-3 mb-4">
            <button
              onClick={() => setShowCreateEpisodeModal(true)}
              className="px-4 py-2 border border-[#1ED760] text-[#1ED760] rounded-lg text-sm font-medium hover:bg-[#1ED760]/10 transition-colors"
            >
              Create New Episode
            </button>
            <button
              onClick={() => {
                setEditingEbook(null);
                setShowAddBookModal(true);
              }}
              className="px-4 py-2 bg-[#1ED760] text-black rounded-lg text-sm font-medium hover:bg-[#1ED760]/90 transition-colors"
            >
              Add New Book
            </button>
          </div>

          {/* Header: Stories + status + edit */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white text-2xl font-bold">Stories</h2>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-semibold ${story.status === "draft" ? "text-[#FF8C00]" : "text-[#1ED760]"}`}>
                {story.status === "draft" ? "DRAFT" : "PUBLISHED"}
              </span>
              <button
                onClick={() => setShowEditModal(true)}
                className="w-9 h-9 bg-[#3E3D40] rounded-full flex items-center justify-center hover:bg-[#4E4D50] transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#E8EAED">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Story info row */}
          <div className="flex gap-6">
            {/* Cover image */}
            <div className="w-[205px] h-[290px] rounded-xl overflow-hidden border border-[#262626] flex-shrink-0 bg-[#262626]">
              {story.cover ? (
                <Image
                  src={story.cover}
                  alt={story.title}
                  width={205}
                  height={290}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#ADADAD]">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Story details */}
            <div className="flex-1 min-w-0">
              <h3 className="text-white text-2xl font-bold mb-3">{story.title}</h3>

              {/* Tags row */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="#ADADAD" />
                    <path d="M10 8.5L15 12L10 15.5V8.5Z" fill="#000" />
                  </svg>
                  <span className="text-[#ADADAD] text-sm tracking-tight">
                    {story.episodeCount} Episodes
                  </span>
                </div>
                <span className="text-[#ADADAD]">|</span>
                <span className="text-[#ADADAD] text-sm tracking-tight">
                  Episode 1-{freeCount} Free
                </span>
              </div>

              {/* Description */}
              <p className="text-white text-sm leading-[19px] tracking-tight mb-4 line-clamp-5">
                {story.description}
              </p>

              {/* Genre + Plays */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  {story.genre && story.genre.length > 0 ? (
                    story.genre.map((g, index) => (
                      <span key={g} className="flex items-center gap-2.5">
                        <span className="text-[#ADADAD] text-sm font-semibold uppercase tracking-tight">{g}</span>
                        {index < story.genre.length - 1 && <span className="text-[#ADADAD]">|</span>}
                      </span>
                    ))
                  ) : (
                    <span className="text-[#ADADAD] text-sm font-semibold uppercase tracking-tight">No genres</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M5.85 8.98333L8.91667 6.95C9.01667 6.88333 9.06667 6.78889 9.06667 6.66667C9.06667 6.54444 9.01667 6.45 8.91667 6.38333L5.85 4.35C5.73889 4.27222 5.625 4.26389 5.50833 4.325C5.39167 4.38611 5.33333 4.48333 5.33333 4.61667V8.71667C5.33333 8.85 5.39167 8.94722 5.50833 9.00833C5.625 9.06944 5.73889 9.06111 5.85 8.98333ZM6.66667 13.3333C5.74444 13.3333 4.87778 13.1583 4.06667 12.8083C3.25556 12.4583 2.55 11.9833 1.95 11.3833C1.35 10.7833 0.875 10.0778 0.525 9.26667C0.175 8.45555 0 7.58889 0 6.66667C0 6.31111 0.0277778 5.95556 0.0833333 5.6C0.138889 5.24444 0.222222 4.89444 0.333333 4.55C0.388889 4.37222 0.502778 4.25278 0.675 4.19167C0.847222 4.13056 1.01111 4.14444 1.16667 4.23333C1.33333 4.32222 1.45278 4.45278 1.525 4.625C1.59722 4.79722 1.60556 4.97778 1.55 5.16667C1.48333 5.41111 1.43056 5.65833 1.39167 5.90833C1.35278 6.15833 1.33333 6.41111 1.33333 6.66667C1.33333 8.15555 1.85 9.41667 2.88333 10.45C3.91667 11.4833 5.17778 12 6.66667 12C8.15555 12 9.41667 11.4833 10.45 10.45C11.4833 9.41667 12 8.15555 12 6.66667C12 5.17778 11.4833 3.91667 10.45 2.88333C9.41667 1.85 8.15555 1.33333 6.66667 1.33333C6.4 1.33333 6.13611 1.35278 5.875 1.39167C5.61389 1.43056 5.35556 1.48889 5.1 1.56667C4.91111 1.62222 4.73333 1.61667 4.56667 1.55C4.4 1.48333 4.27778 1.36667 4.2 1.2C4.12222 1.03333 4.11944 0.863889 4.19167 0.691667C4.26389 0.519444 4.38889 0.405556 4.56667 0.35C4.9 0.227778 5.24444 0.138889 5.6 0.0833333C5.95556 0.0277778 6.31111 0 6.66667 0C7.58889 0 8.45555 0.175 9.26667 0.525C10.0778 0.875 10.7833 1.35 11.3833 1.95C11.9833 2.55 12.4583 3.25556 12.8083 4.06667C13.1583 4.87778 13.3333 5.74444 13.3333 6.66667C13.3333 7.58889 13.1583 8.45555 12.8083 9.26667C12.4583 10.0778 11.9833 10.7833 11.3833 11.3833C10.7833 11.9833 10.0778 12.4583 9.26667 12.8083C8.45555 13.1583 7.58889 13.3333 6.66667 13.3333ZM2.33333 3.33333C2.05556 3.33333 1.81944 3.23611 1.625 3.04167C1.43056 2.84722 1.33333 2.61111 1.33333 2.33333C1.33333 2.05556 1.43056 1.81944 1.625 1.625C1.81944 1.43056 2.05556 1.33333 2.33333 1.33333C2.61111 1.33333 2.84722 1.43056 3.04167 1.625C3.23611 1.81944 3.33333 2.05556 3.33333 2.33333C3.33333 2.61111 3.23611 2.84722 3.04167 3.04167C2.84722 3.23611 2.61111 3.33333 2.33333 3.33333ZM2.66667 6.66667C2.66667 5.55556 3.05556 4.61111 3.83333 3.83333C4.61111 3.05556 5.55556 2.66667 6.66667 2.66667C7.77778 2.66667 8.72222 3.05556 9.5 3.83333C10.2778 4.61111 10.6667 5.55556 10.6667 6.66667C10.6667 7.77778 10.2778 8.72222 9.5 9.5C8.72222 10.2778 7.77778 10.6667 6.66667 10.6667C5.55556 10.6667 4.61111 10.2778 3.83333 9.5C3.05556 8.72222 2.66667 7.77778 2.66667 6.66667Z" fill="#ADADAD" />
                  </svg>
                  <span className="text-[#ADADAD] text-sm tracking-tight">
                    {formatViewCount(story.viewCount)} Plays
                  </span>
                </div>
              </div>

              {/* Show Episodes toggle */}
              <button
                onClick={() => setShowEpisodes(!showEpisodes)}
                className="flex items-center gap-2 text-[#1ED760] text-[22px] font-bold hover:opacity-80 transition-opacity"
              >
                Show Episodes
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="#1ED760"
                  className={`transition-transform ${showEpisodes ? "rotate-180" : ""}`}
                >
                  <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
                </svg>
              </button>

              {showEpisodes && (
                <EpisodeList episodes={story.episodes.filter(e => e.status === "published")} freeCount={freeCount} />
              )}

            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-[#2C2C43] my-6" />

          {/* Character Library */}
          <LibraryCarousel
            title="Character Library"
            onAdd={() => {
              setEditingCharacter(undefined);
              setShowCharacterModal(true);
            }}
            isEmpty={characters.length === 0}
            emptyMessage="No characters yet. Click + to create one."
          >
            {characters.map((char) => (
              <CharacterCard
                key={char.id}
                character={char}
                onEdit={handleEditCharacter}
                onDelete={handleDeleteCharacterRequest}
              />
            ))}
          </LibraryCarousel>

          {/* Divider */}
          <div className="border-t border-[#2C2C43] my-6" />

          {/* Location Library */}
          <LibraryCarousel
            title="Location Library"
            onAdd={() => {
              setEditingLocation(undefined);
              setShowLocationModal(true);
            }}
            isEmpty={locations.length === 0}
            emptyMessage="No locations yet. Click + to create one."
          >
            {locations.map((loc) => (
              <LocationCard
                key={loc.id}
                location={loc}
                onEdit={handleEditLocation}
                onDelete={handleDeleteLocationRequest}
              />
            ))}
          </LibraryCarousel>

          {/* Divider */}
          <div className="border-t border-[#2C2C43] my-6" />

          {/* Ebooks section */}
          <div>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h4 className="text-white text-xl font-semibold mb-2">
                  Dive deeper into the story
                </h4>
                <p className="text-[#ADADAD] text-sm tracking-tight">Ebooks</p>
              </div>
            </div>

            {story.ebooks.length === 0 ? (
              <p className="text-[#ADADAD] text-sm py-4">
                No ebooks yet. Click &quot;Add New Book&quot; to add one.
              </p>
            ) : (
              <div className="overflow-x-auto scrollbar-hide">
                <div className="flex gap-6 min-w-max select-none">
                  {story.ebooks.map((ebook, index) => (
                    <div key={ebook.id} className="flex items-stretch">
                      <div className="w-[354px] flex gap-3">
                        <div className="flex flex-col gap-2 flex-shrink-0 w-[100px]">
                          <div className="w-[100px] h-[160px] rounded bg-[#262626] overflow-hidden">
                            {ebook.cover ? (
                              <Image
                                src={ebook.cover}
                                alt={ebook.title}
                                width={100}
                                height={160}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[#ADADAD]">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[#FF8C00] text-xs font-semibold">
                              ${ebook.price.toFixed(2)}
                            </span>
                            <span className="text-[#ADADAD] text-xs">|</span>
                            <button
                              onClick={() => router.push(`/read/${ebook.id}`)}
                              className="text-[#1ED760] text-xs font-bold hover:opacity-80 transition-opacity"
                            >
                              Read
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <h5 className="text-white text-sm font-semibold line-clamp-2">{ebook.title}</h5>
                          <p className="text-[#C5C5C5] text-sm leading-[19px] tracking-tight line-clamp-7 flex-1">
                            {ebook.description}
                          </p>
                          <div className="flex justify-end mt-auto">
                            <button
                              onClick={() => {
                                setEditingEbook(ebook);
                                setShowAddBookModal(true);
                              }}
                              className="w-9 h-9 bg-[#3E3D40] rounded-full flex items-center justify-center hover:bg-[#4E4D50] transition-colors"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="#E8EAED">
                                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                      {index < story.ebooks.length - 1 && (
                        <div className="w-px bg-[#272727] ml-6 self-stretch" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />

      {/* Modals */}
      <CreateEpisodeModal
        isOpen={showCreateEpisodeModal}
        onClose={() => setShowCreateEpisodeModal(false)}
        onSave={(episode) => {
          setShowCreateEpisodeModal(false);
          const params = new URLSearchParams({
            storyId: storyId as string,
            name: episode.name,
            number: String(episode.number),
            isFree: String(episode.isFree),
          });
          router.push(`/create-episode?${params.toString()}`);
        }}
        nextEpisodeNumber={story.episodes.length + 1}
      />

      <EditStoryModal
        isOpen={showEditModal}
        story={story}
        onClose={() => setShowEditModal(false)}
        onSave={handleEditStory}
        isSaving={isEditSaving}
      />

      <AddBookModal
        isOpen={showAddBookModal}
        onClose={() => {
          setShowAddBookModal(false);
          setEditingEbook(null);
        }}
        onSave={handleAddBook}
        onUpdate={handleUpdateEbook}
        stories={[{ id: story.id, title: story.title }]}
        preselectedStoryId={story.id}
        editingEbook={
          editingEbook
            ? {
                id: editingEbook.id,
                title: editingEbook.title,
                description: editingEbook.description,
                cover: editingEbook.cover,
                fileUrl: editingEbook.fileUrl,
                price: editingEbook.price,
                isbn: editingEbook.isbn,
                storyId: story.id,
              }
            : undefined
        }
      />

      <CharacterModal
        isOpen={showCharacterModal}
        onClose={() => {
          setShowCharacterModal(false);
          setEditingCharacter(undefined);
        }}
        onSave={handleSaveCharacter}
        character={editingCharacter}
        existingCharacters={characters}
        isSaving={isCharSaving}
      />

      <LocationModal
        isOpen={showLocationModal}
        onClose={() => {
          setShowLocationModal(false);
          setEditingLocation(undefined);
        }}
        onSave={handleSaveLocation}
        location={editingLocation}
        existingCharacters={characters}
        isSaving={isLocSaving}
      />

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        title={`Delete ${deleteTarget?.type === "character" ? "Character" : "Location"}`}
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        isDeleting={isDeleting}
      />
    </div>
  );
}
