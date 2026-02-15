"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import {
  useGenerationsWithStories,
  useMyStories,
  GenerationWithStory,
} from "@/lib/hooks/queries";
import StoryPickerModal from "../components/creator/StoryPickerModal";
import CreateEpisodeModal from "../components/creator/CreateEpisodeModal";

// ─── Progress pipeline ──────────────────────────────────────────

const STEPS = ["Script", "Visuals", "Filming", "Ready"] as const;

function getStepIndex(status: string): number {
  switch (status) {
    case "drafting":
      return 0;
    case "visuals":
    case "moodboard":
    case "key_moments":
      return 1;
    case "preflight":
    case "filming":
      return 2;
    case "ready":
      return 3;
    default:
      return -1;
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    drafting: "Script",
    visuals: "Visuals",
    moodboard: "Moodboard",
    key_moments: "Key Moments",
    preflight: "Pre-flight",
    filming: "Filming",
    ready: "Ready",
    failed: "Failed",
    interrupted: "Interrupted",
  };
  return labels[status] || status;
}

const styleLabels: Record<string, string> = {
  cinematic: "Cinematic",
  anime: "Anime",
  animated: "Animated",
  pixar: "Pixar",
  "3d_animated": "Pixar",
  "2d_animated": "Animated",
  "2d_anime": "Anime",
};

// ─── Filters ─────────────────────────────────────────────────────

const FILTERS = [
  { key: "all", label: "All" },
  { key: "drafting", label: "Script" },
  { key: "visuals", label: "Visuals" },
  { key: "filming", label: "Filming" },
  { key: "ready", label: "Ready" },
  { key: "failed", label: "Failed" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

function matchesFilter(status: string, filter: FilterKey): boolean {
  if (filter === "all") return true;
  if (filter === "drafting") return status === "drafting";
  if (filter === "visuals")
    return ["visuals", "moodboard", "key_moments"].includes(status);
  if (filter === "filming")
    return ["preflight", "filming"].includes(status);
  if (filter === "ready") return status === "ready";
  if (filter === "failed")
    return ["failed", "interrupted"].includes(status);
  return true;
}

// ─── Sub-components ──────────────────────────────────────────────

function ProgressDots({ status }: { status: string }) {
  const step = getStepIndex(status);
  const isFailed = step === -1;

  return (
    <div className="flex items-center gap-0.5">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center">
          <div
            className={`w-[6px] h-[6px] rounded-full transition-colors ${
              isFailed
                ? "bg-red-400/50"
                : i <= step
                  ? "bg-[#9C99FF]"
                  : "bg-white/10"
            }`}
            title={label}
          />
          {i < STEPS.length - 1 && (
            <div
              className={`w-2 h-[1px] ${
                isFailed
                  ? "bg-red-400/20"
                  : i < step
                    ? "bg-[#9C99FF]/50"
                    : "bg-white/5"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function DraftCard({
  draft,
  onClick,
}: {
  draft: GenerationWithStory;
  onClick: () => void;
}) {
  const step = getStepIndex(draft.status);
  const isFailed = step === -1;
  const updatedDate = new Date(draft.updated_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const styleLabel = styleLabels[draft.style] || draft.style;

  return (
    <button
      onClick={onClick}
      className="bg-[#0F0E13] border border-[#1A1E2F] rounded-xl p-4 text-left hover:border-[#9C99FF]/40 transition-all group w-full"
    >
      <div className="flex items-start gap-3">
        {/* Thumbnail or icon */}
        {draft.thumbnail_base64 ? (
          <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-[#1A1E2F]">
            <img
              src={`data:image/jpeg;base64,${draft.thumbnail_base64}`}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-11 h-11 rounded-lg bg-[#1A1E2F] flex items-center justify-center flex-shrink-0">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#555"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3 className="text-white font-medium text-sm truncate group-hover:text-[#B8B6FC] transition-colors">
            {draft.title || "Untitled"}
          </h3>

          {/* Progress + status label */}
          <div className="flex items-center gap-2 mt-2">
            <ProgressDots status={draft.status} />
            <span
              className={`text-[10px] font-medium ${
                isFailed ? "text-red-400" : "text-white/40"
              }`}
            >
              {getStatusLabel(draft.status)}
            </span>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-2 mt-2">
            {styleLabel && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/30">
                {styleLabel}
              </span>
            )}
            <span className="text-[10px] text-white/20">{updatedDate}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

function StorySection({
  storyName,
  coverUrl,
  drafts,
  onDraftClick,
}: {
  storyName: string;
  coverUrl: string | null;
  drafts: GenerationWithStory[];
  onDraftClick: (id: string) => void;
}) {
  return (
    <div className="border-l-2 border-[#9C99FF]/40 pl-5">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-4">
        {coverUrl ? (
          <div className="w-8 h-11 rounded overflow-hidden flex-shrink-0 bg-[#1A1E2F]">
            <Image
              src={coverUrl}
              alt={storyName}
              width={32}
              height={44}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-8 h-11 rounded bg-[#1A1E2F] flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#555">
              <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z" />
            </svg>
          </div>
        )}
        <div>
          <h3 className="text-white text-sm font-semibold">{storyName}</h3>
          <p className="text-white/30 text-[11px]">
            {drafts.length} draft{drafts.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Draft cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {drafts.map((draft) => (
          <DraftCard
            key={draft.id}
            draft={draft}
            onClick={() => onDraftClick(draft.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────

export default function DraftsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Data — React Query (cached)
  const { data: drafts = [], isLoading: draftsLoading } =
    useGenerationsWithStories();
  const { data: stories = [] } = useMyStories(user?.id);

  // UI state
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [showStoryPicker, setShowStoryPicker] = useState(false);
  const [showCreateEpisode, setShowCreateEpisode] = useState(false);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [selectedEpisodeCount, setSelectedEpisodeCount] = useState(0);

  const isLoading = authLoading || draftsLoading;

  // Filter + search
  const filtered = useMemo(() => {
    return drafts.filter((d) => {
      if (!matchesFilter(d.status, filter)) return false;
      if (
        search &&
        !(d.title || "").toLowerCase().includes(search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [drafts, filter, search]);

  // Group by story_id
  const grouped = useMemo(() => {
    const map = new Map<
      string | null,
      {
        story: GenerationWithStory["stories"];
        drafts: GenerationWithStory[];
      }
    >();
    for (const d of filtered) {
      const key = d.story_id;
      if (!map.has(key)) map.set(key, { story: d.stories, drafts: [] });
      map.get(key)!.drafts.push(d);
    }
    return [...map.entries()].sort((a, b) => {
      if (a[0] === null) return 1;
      if (b[0] === null) return -1;
      return (
        new Date(b[1].drafts[0].updated_at).getTime() -
        new Date(a[1].drafts[0].updated_at).getTime()
      );
    });
  }, [filtered]);

  // Filter counts for badges
  const filterCounts = useMemo(() => {
    const counts: Record<FilterKey, number> = {
      all: drafts.length,
      drafting: 0,
      visuals: 0,
      filming: 0,
      ready: 0,
      failed: 0,
    };
    for (const d of drafts) {
      if (matchesFilter(d.status, "drafting")) counts.drafting++;
      if (matchesFilter(d.status, "visuals")) counts.visuals++;
      if (matchesFilter(d.status, "filming")) counts.filming++;
      if (matchesFilter(d.status, "ready")) counts.ready++;
      if (matchesFilter(d.status, "failed")) counts.failed++;
    }
    return counts;
  }, [drafts]);

  const handleDraftClick = (id: string) => {
    router.push(`/create-episode?g=${id}`);
  };

  const storyPickerData = stories.map((s) => ({
    id: s.id,
    title: s.title,
    cover: s.cover,
    episodeCount: s.episodeCount,
  }));

  return (
    <div className="min-h-screen bg-black relative overflow-clip">
      <Header />

      <main className="relative z-10 px-6 py-8 max-w-7xl mx-auto">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-white text-2xl font-bold">My Drafts</h1>
            <p className="text-white/40 text-sm mt-0.5">
              Resume or manage your episode drafts
            </p>
          </div>
          {user && (
            <button
              onClick={() => setShowStoryPicker(true)}
              className="px-5 py-2.5 rounded-lg font-semibold text-sm text-white transition-opacity hover:opacity-90 border border-[#B8B6FC] flex-shrink-0"
              style={{
                background:
                  "linear-gradient(135deg, #9C99FF 0%, #7370FF 60%)",
              }}
            >
              Create New Episode
            </button>
          )}
        </div>

        {/* Search + filters */}
        {user && !isLoading && drafts.length > 0 && (
          <div className="space-y-3 mb-6">
            {/* Search */}
            <div className="relative max-w-sm">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#555"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="absolute left-3 top-1/2 -translate-y-1/2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                placeholder="Search drafts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#0F0E13] border border-[#1A1E2F] rounded-lg text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#9C99FF]/40 transition-colors"
              />
            </div>

            {/* Filter chips */}
            <div className="flex items-center gap-2 flex-wrap">
              {FILTERS.map((f) => {
                const count = filterCounts[f.key];
                const active = filter === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      active
                        ? "text-white border border-[#9C99FF]/60"
                        : "text-white/40 border border-transparent hover:text-white/60 hover:border-[#1A1E2F]"
                    }`}
                    style={
                      active
                        ? {
                            background:
                              "linear-gradient(135deg, rgba(156,153,255,0.15) 0%, rgba(115,112,255,0.15) 100%)",
                          }
                        : undefined
                    }
                  >
                    {f.label}
                    {count > 0 && (
                      <span
                        className={`ml-1.5 ${active ? "text-[#B8B6FC]" : "text-white/20"}`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="border-l-2 border-[#1A1E2F] pl-5">
                <div className="flex items-center gap-3 mb-4 animate-pulse">
                  <div className="w-8 h-11 rounded bg-[#1A1E2F]" />
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-28 bg-[#1A1E2F] rounded" />
                    <div className="h-2.5 w-16 bg-[#1A1E2F] rounded" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div
                      key={j}
                      className="bg-[#0F0E13] border border-[#1A1E2F] rounded-xl p-4 animate-pulse"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-lg bg-[#1A1E2F]" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3.5 w-24 bg-[#1A1E2F] rounded" />
                          <div className="h-2 w-16 bg-[#1A1E2F] rounded" />
                          <div className="h-2 w-20 bg-[#1A1E2F] rounded" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Not authenticated */}
        {!authLoading && !user && (
          <div className="bg-[#0F0E13] rounded-xl p-8 text-center">
            <h2 className="text-white text-xl font-semibold mb-4">
              Sign in to view your drafts
            </h2>
            <button
              onClick={() => router.push("/login")}
              className="px-6 py-3 rounded-lg font-semibold text-white transition-opacity hover:opacity-90"
              style={{
                background:
                  "linear-gradient(135deg, #9C99FF 0%, #7370FF 60%)",
              }}
            >
              Sign In
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && user && drafts.length === 0 && (
          <div className="bg-[#0F0E13] border border-[#1A1E2F] rounded-xl p-12 text-center">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#555"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto mb-4"
            >
              <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-white/40 text-sm">No drafts yet</p>
            <p className="text-white/20 text-xs mt-1">
              Create an episode from the Creator Dashboard to get started
            </p>
          </div>
        )}

        {/* No results for filter/search */}
        {!isLoading && user && drafts.length > 0 && filtered.length === 0 && (
          <div className="bg-[#0F0E13] border border-[#1A1E2F] rounded-xl p-8 text-center">
            <p className="text-white/40 text-sm">
              No drafts match your{" "}
              {search ? "search" : "filter"}
            </p>
            <button
              onClick={() => {
                setSearch("");
                setFilter("all");
              }}
              className="text-[#9C99FF] text-sm mt-2 hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Story-grouped draft sections */}
        {!isLoading && user && filtered.length > 0 && (
          <div className="space-y-8">
            {grouped.map(([storyId, group]) => (
              <StorySection
                key={storyId || "unlinked"}
                storyName={
                  group.story?.title || (storyId ? "Unknown Story" : "Unlinked Drafts")
                }
                coverUrl={group.story?.cover_url || null}
                drafts={group.drafts}
                onDraftClick={handleDraftClick}
              />
            ))}
          </div>
        )}
      </main>

      <Footer />

      <StoryPickerModal
        isOpen={showStoryPicker}
        onClose={() => setShowStoryPicker(false)}
        onSelect={(storyId) => {
          setShowStoryPicker(false);
          setSelectedStoryId(storyId);
          const story = storyPickerData.find((s) => s.id === storyId);
          setSelectedEpisodeCount(story?.episodeCount || 0);
          setShowCreateEpisode(true);
        }}
        stories={storyPickerData}
        title="Choose a Story"
        description="Which story should this episode belong to?"
      />

      <CreateEpisodeModal
        isOpen={showCreateEpisode}
        onClose={() => setShowCreateEpisode(false)}
        onSave={(episode) => {
          setShowCreateEpisode(false);
          const params = new URLSearchParams({
            storyId: selectedStoryId!,
            name: episode.name,
            number: String(episode.number),
            isFree: String(episode.isFree),
          });
          router.push(`/create-episode?${params.toString()}`);
        }}
        nextEpisodeNumber={selectedEpisodeCount + 1}
      />
    </div>
  );
}
