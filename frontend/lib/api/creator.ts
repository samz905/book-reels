// API helper functions for creator dashboard
import type {
  Profile,
  CreatorSettings,
  Story as DbStory,
  Episode as DbEpisode,
  Ebook as DbEbook,
  StoryFull,
} from "@/types/database";
import type {
  CreatorProfile,
  CreatorStats,
  Subscription as FrontendSubscription,
  Story as FrontendStory,
  Episode as FrontendEpisode,
  Ebook as FrontendEbook,
} from "@/app/data/mockCreatorData";

// ============ Type Mappers ============

export function mapDbProfileToFrontend(
  dbProfile: Profile,
  storiesCount: number = 0,
  episodesCount: number = 0
): CreatorProfile {
  return {
    name: dbProfile.name,
    username: dbProfile.username,
    bio: dbProfile.bio,
    avatar: dbProfile.avatar_url,
    storiesCount,
    episodesCount,
    newEpisodesWeekly: 0, // TODO: compute from recent episodes
  };
}

export function mapDbEpisodeToFrontend(dbEpisode: DbEpisode): FrontendEpisode {
  return {
    id: dbEpisode.id,
    number: dbEpisode.number,
    name: dbEpisode.name,
    isFree: dbEpisode.is_free,
    thumbnail: dbEpisode.thumbnail_url || undefined,
    status: dbEpisode.status,
  };
}

export function mapDbEbookToFrontend(dbEbook: DbEbook): FrontendEbook {
  return {
    id: dbEbook.id,
    title: dbEbook.title,
    description: dbEbook.description,
    cover: dbEbook.cover_url || "",
    fileUrl: dbEbook.file_url || undefined,
    isbn: dbEbook.isbn || undefined,
    price: dbEbook.price,
  };
}

export function mapDbStoryToFrontend(
  dbStory: DbStory & { episodes?: DbEpisode[]; ebooks?: DbEbook[] }
): FrontendStory {
  const episodes = dbStory.episodes || [];
  const ebooks = dbStory.ebooks || [];

  return {
    id: dbStory.id,
    title: dbStory.title,
    type: dbStory.type,
    episodeCount: episodes.length,
    viewCount: dbStory.view_count,
    description: dbStory.description,
    cover: dbStory.cover_url || "",
    episodes: episodes.map(mapDbEpisodeToFrontend),
    likes: dbStory.likes,
    genre: dbStory.genres,
    status: dbStory.status,
    ebooks: ebooks.map(mapDbEbookToFrontend),
  };
}

export function mapDbSettingsToFrontend(
  dbSettings: CreatorSettings | null
): FrontendSubscription {
  if (!dbSettings) {
    return {
      enabled: false,
      monthlyPrice: 0,
      minPrice: 4.99,
    };
  }
  return {
    enabled: dbSettings.subscription_enabled,
    monthlyPrice: dbSettings.monthly_price,
    minPrice: dbSettings.min_price,
  };
}

// ============ API Functions ============

interface ApiError {
  error: string;
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error((data as ApiError).error || "Request failed");
  }
  return data as T;
}

// Profile APIs
export async function getProfile(userId: string): Promise<Profile | null> {
  const response = await fetch(`/api/profiles/${userId}`, {
    credentials: "include",
  });
  if (response.status === 404) {
    return null;
  }
  return handleResponse<Profile>(response);
}

export async function createProfile(
  userId: string,
  data: { username: string; name: string; bio?: string; avatar_url?: string | null }
): Promise<Profile> {
  const response = await fetch(`/api/profiles/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  return handleResponse<Profile>(response);
}

export async function updateProfile(
  userId: string,
  data: {
    username?: string;
    name?: string;
    bio?: string;
    avatar_url?: string | null;
  }
): Promise<Profile> {
  const response = await fetch(`/api/profiles/${userId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (response.status === 409) {
    throw new Error("Username already taken");
  }

  return handleResponse<Profile>(response);
}

// Story APIs
export async function getMyStories(
  creatorId: string
): Promise<FrontendStory[]> {
  const response = await fetch(
    `/api/stories?creator_id=${creatorId}&status=all`,
    { credentials: "include" }
  );
  const result = await handleResponse<{ data: StoryFull[] }>(response);

  // Now fetch episodes and ebooks for each story
  const storiesWithDetails = await Promise.all(
    result.data.map(async (story) => {
      const [episodesRes, ebooksRes] = await Promise.all([
        fetch(`/api/stories/${story.id}/episodes`, { credentials: "include" }),
        fetch(`/api/stories/${story.id}/ebooks`, { credentials: "include" }),
      ]);

      const episodes = episodesRes.ok
        ? await episodesRes.json()
        : [];
      const ebooks = ebooksRes.ok ? await ebooksRes.json() : [];

      return {
        ...story,
        episodes,
        ebooks,
      };
    })
  );

  return storiesWithDetails.map(mapDbStoryToFrontend);
}

export async function createStory(data: {
  title: string;
  type: "video" | "audio";
  description?: string;
  cover_url?: string | null;
  genres?: string[];
  status?: "draft" | "published";
}): Promise<FrontendStory> {
  console.log("[createStory] Sending request with data:", data);

  const response = await fetch("/api/stories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  console.log("[createStory] Response status:", response.status);

  if (!response.ok) {
    const errorData = await response.json();
    console.error("[createStory] API error:", errorData);
    throw new Error(errorData.error || `Request failed with status ${response.status}`);
  }

  const dbStory = await response.json();
  console.log("[createStory] Story created:", dbStory);

  return mapDbStoryToFrontend({ ...dbStory, episodes: [], ebooks: [] });
}

export async function updateStory(
  storyId: string,
  data: {
    title?: string;
    type?: "video" | "audio";
    description?: string;
    cover_url?: string | null;
    genres?: string[];
    status?: "draft" | "published";
  }
): Promise<DbStory> {
  const response = await fetch(`/api/stories/${storyId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  return handleResponse<DbStory>(response);
}

// Episode APIs
export async function createEpisode(
  storyId: string,
  data: {
    number: number;
    name: string;
    is_free?: boolean;
    thumbnail_url?: string | null;
    media_url?: string | null;
    status?: "draft" | "published";
  }
): Promise<FrontendEpisode> {
  const response = await fetch(`/api/stories/${storyId}/episodes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  const dbEpisode = await handleResponse<DbEpisode>(response);
  return mapDbEpisodeToFrontend(dbEpisode);
}

// Ebook APIs
export async function createEbook(
  storyId: string,
  data: {
    title: string;
    description?: string;
    cover_url?: string | null;
    file_url?: string | null;
    isbn?: string | null;
    price: number;
  }
): Promise<FrontendEbook> {
  const response = await fetch(`/api/stories/${storyId}/ebooks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  const dbEbook = await handleResponse<DbEbook>(response);
  return mapDbEbookToFrontend(dbEbook);
}

export async function updateEbook(
  ebookId: string,
  data: {
    title?: string;
    description?: string;
    cover_url?: string | null;
    isbn?: string | null;
    price?: number;
  }
): Promise<FrontendEbook> {
  const response = await fetch(`/api/ebooks/${ebookId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  const dbEbook = await handleResponse<DbEbook>(response);
  return mapDbEbookToFrontend(dbEbook);
}

export interface EbookReadResponse {
  url: string;
  title: string;
  storyTitle: string;
  expiresIn: number;
}

export async function getEbookReadUrl(ebookId: string): Promise<EbookReadResponse> {
  const response = await fetch(`/api/ebooks/${ebookId}/read`, {
    credentials: "include",
  });
  return handleResponse<EbookReadResponse>(response);
}

// Creator Settings APIs
export async function getCreatorSettings(): Promise<CreatorSettings | null> {
  const response = await fetch("/api/creator/settings", {
    credentials: "include",
  });
  if (response.status === 404) {
    return null;
  }
  return handleResponse<CreatorSettings>(response);
}

export async function updateCreatorSettings(data: {
  subscription_enabled?: boolean;
  monthly_price?: number;
  min_price?: number;
}): Promise<CreatorSettings> {
  const response = await fetch("/api/creator/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  return handleResponse<CreatorSettings>(response);
}

// Stats API (computed from stories)
export async function getCreatorStats(userId: string): Promise<CreatorStats> {
  // For now, return empty stats - this would need a dedicated endpoint
  // to compute earnings, subscriptions, etc.
  return {
    thisMonth: 0,
    lifetime: 0,
    subscriptions: 0,
    ebooks: 0,
    activeSubscribers: 0,
  };
}

// Helper to generate random username
export function generateRandomUsername(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `creator-${suffix}`;
}

// Purchased Ebooks API
export interface PurchasedEbook {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  storyTitle: string;
}

interface PurchaseResponse {
  id: string;
  ebook: {
    id: string;
    title: string;
    description: string;
    cover_url: string | null;
    story: { id: string; title: string } | { id: string; title: string }[] | null;
  } | null;
}

export async function getPurchasedEbooks(): Promise<PurchasedEbook[]> {
  const response = await fetch("/api/purchases", {
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status === 401) {
      return [];
    }
    throw new Error("Failed to fetch purchased ebooks");
  }

  const purchases = await response.json() as PurchaseResponse[];

  return purchases
    .filter((p) => p.ebook)
    .map((purchase) => {
      const ebook = purchase.ebook!;
      const storyData = ebook.story;
      const story = Array.isArray(storyData) ? storyData[0] : storyData;

      return {
        id: ebook.id,
        title: ebook.title,
        description: ebook.description || "",
        coverUrl: ebook.cover_url || "",
        storyTitle: story?.title || "Unknown Story",
      };
    });
}
