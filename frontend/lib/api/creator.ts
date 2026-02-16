// API helper functions for creator dashboard
import type {
  Profile,
  CreatorSettings,
  Story as DbStory,
  Episode as DbEpisode,
  Ebook as DbEbook,
  StoryFull,
  StoryCharacter as DbStoryCharacter,
  StoryLocation as DbStoryLocation,
  EpisodeStoryboard as DbEpisodeStoryboard,
} from "@/types/database";
import type {
  CreatorProfile,
  CreatorStats,
  Subscription as FrontendSubscription,
  Story as FrontendStory,
  Episode as FrontendEpisode,
  Ebook as FrontendEbook,
  StoryCharacterFE,
  StoryLocationFE,
  EpisodeStoryboardFE,
} from "@/app/data/mockCreatorData";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

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
  const publishedCount = episodes.filter(e => e.status === "published").length;

  return {
    id: dbStory.id,
    title: dbStory.title,
    type: dbStory.type,
    episodeCount: publishedCount,
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
    `/api/stories?creator_id=${creatorId}&status=all&include=episodes,ebooks`,
    { credentials: "include" }
  );
  const result = await handleResponse<{ data: StoryFull[] }>(response);

  return result.data.map(mapDbStoryToFrontend);
}

export async function createStory(data: {
  title: string;
  type: "video";
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
    type?: "video";
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

// ============ Character & Location Mappers ============

export function mapDbCharacterToFrontend(db: DbStoryCharacter): StoryCharacterFE {
  return {
    id: db.id,
    name: db.name,
    age: db.age,
    gender: db.gender,
    description: db.description,
    role: db.role,
    visualStyle: db.visual_style,
    imageBase64: db.image_base64,
    imageUrl: db.image_url,
    imageMimeType: db.image_mime_type,
  };
}

export function mapDbLocationToFrontend(db: DbStoryLocation): StoryLocationFE {
  return {
    id: db.id,
    name: db.name,
    description: db.description,
    atmosphere: db.atmosphere,
    visualStyle: db.visual_style,
    imageBase64: db.image_base64,
    imageUrl: db.image_url,
    imageMimeType: db.image_mime_type,
  };
}

export function mapDbStoryboardToFrontend(db: DbEpisodeStoryboard): EpisodeStoryboardFE {
  return {
    id: db.id,
    generationId: db.generation_id,
    sceneNumber: db.scene_number,
    title: db.title,
    visualDescription: db.visual_description,
    status: db.status as EpisodeStoryboardFE['status'],
    imageUrl: db.image_url,
    imageBase64: db.image_base64,
    imageMimeType: db.image_mime_type,
    promptUsed: db.prompt_used,
    errorMessage: db.error_message,
  };
}

// ============ Character CRUD ============

export async function getStoryCharacters(storyId: string): Promise<StoryCharacterFE[]> {
  const response = await fetch(`/api/stories/${storyId}/characters`, {
    credentials: "include",
  });
  const data = await handleResponse<DbStoryCharacter[]>(response);
  return data.map(mapDbCharacterToFrontend);
}

export async function createStoryCharacter(
  storyId: string,
  data: {
    name: string;
    age?: string;
    gender?: string;
    description?: string;
    role?: string;
    visual_style?: string | null;
    image_base64?: string | null;
    image_url?: string | null;
    image_mime_type?: string;
  }
): Promise<StoryCharacterFE> {
  const response = await fetch(`/api/stories/${storyId}/characters`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  const db = await handleResponse<DbStoryCharacter>(response);
  return mapDbCharacterToFrontend(db);
}

export async function updateStoryCharacter(
  storyId: string,
  characterId: string,
  data: {
    name?: string;
    age?: string;
    gender?: string;
    description?: string;
    role?: string;
    visual_style?: string | null;
    image_base64?: string | null;
    image_url?: string | null;
    image_mime_type?: string;
  }
): Promise<StoryCharacterFE> {
  const response = await fetch(`/api/stories/${storyId}/characters/${characterId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  const db = await handleResponse<DbStoryCharacter>(response);
  return mapDbCharacterToFrontend(db);
}

export async function deleteStoryCharacter(storyId: string, characterId: string): Promise<void> {
  const response = await fetch(`/api/stories/${storyId}/characters/${characterId}`, {
    method: "DELETE",
    credentials: "include",
  });
  await handleResponse<{ success: boolean }>(response);
}

// ============ Location CRUD ============

export async function getStoryLocations(storyId: string): Promise<StoryLocationFE[]> {
  const response = await fetch(`/api/stories/${storyId}/locations`, {
    credentials: "include",
  });
  const data = await handleResponse<DbStoryLocation[]>(response);
  return data.map(mapDbLocationToFrontend);
}

export async function createStoryLocation(
  storyId: string,
  data: {
    name: string;
    description?: string;
    atmosphere?: string;
    visual_style?: string | null;
    image_base64?: string | null;
    image_url?: string | null;
    image_mime_type?: string;
  }
): Promise<StoryLocationFE> {
  const response = await fetch(`/api/stories/${storyId}/locations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  const db = await handleResponse<DbStoryLocation>(response);
  return mapDbLocationToFrontend(db);
}

export async function updateStoryLocation(
  storyId: string,
  locationId: string,
  data: {
    name?: string;
    description?: string;
    atmosphere?: string;
    visual_style?: string | null;
    image_base64?: string | null;
    image_url?: string | null;
    image_mime_type?: string;
  }
): Promise<StoryLocationFE> {
  const response = await fetch(`/api/stories/${storyId}/locations/${locationId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  const db = await handleResponse<DbStoryLocation>(response);
  return mapDbLocationToFrontend(db);
}

export async function deleteStoryLocation(storyId: string, locationId: string): Promise<void> {
  const response = await fetch(`/api/stories/${storyId}/locations/${locationId}`, {
    method: "DELETE",
    credentials: "include",
  });
  await handleResponse<{ success: boolean }>(response);
}

// ============ Storyboard CRUD ============

export async function getEpisodeStoryboards(generationId: string): Promise<EpisodeStoryboardFE[]> {
  const response = await fetch(`/api/generations/${generationId}/storyboards`, {
    credentials: "include",
  });
  const data = await handleResponse<DbEpisodeStoryboard[]>(response);
  return data.map(mapDbStoryboardToFrontend);
}

export async function upsertEpisodeStoryboards(
  generationId: string,
  rows: Array<{
    scene_number: number;
    title?: string;
    visual_description?: string;
    status?: string;
    image_url?: string | null;
    image_base64?: string | null;
    image_mime_type?: string;
    prompt_used?: string | null;
    error_message?: string | null;
  }>
): Promise<EpisodeStoryboardFE[]> {
  const response = await fetch(`/api/generations/${generationId}/storyboards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(rows),
  });
  const data = await handleResponse<DbEpisodeStoryboard[]>(response);
  return data.map(mapDbStoryboardToFrontend);
}

export async function updateEpisodeStoryboard(
  generationId: string,
  storyboardId: string,
  data: {
    title?: string;
    visual_description?: string;
    status?: string;
    image_url?: string | null;
    image_base64?: string | null;
    image_mime_type?: string;
    prompt_used?: string | null;
    error_message?: string | null;
  }
): Promise<EpisodeStoryboardFE> {
  const response = await fetch(`/api/generations/${generationId}/storyboards/${storyboardId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  const db = await handleResponse<DbEpisodeStoryboard>(response);
  return mapDbStoryboardToFrontend(db);
}

export async function deleteEpisodeStoryboard(generationId: string, storyboardId: string): Promise<void> {
  const response = await fetch(`/api/generations/${generationId}/storyboards/${storyboardId}`, {
    method: "DELETE",
    credentials: "include",
  });
  await handleResponse<{ success: boolean }>(response);
}

// ============ Generation context (for persistent job tracking) ============

export interface GenerationContext {
  generationId: string;
  targetId?: string;
}

/**
 * Submit a generation as a background job to the backend.
 * Returns immediately with job_id — results arrive via Supabase Realtime.
 * The user can close the tab; the backend continues processing.
 */
export async function submitJob(
  jobType: string,
  backendPath: string,
  payload: unknown,
  ctx: GenerationContext
): Promise<string> {
  const response = await fetch(`${BACKEND_URL}/jobs/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      generation_id: ctx.generationId,
      job_type: jobType,
      target_id: ctx.targetId || "",
      backend_path: backendPath,
      payload,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || err.error || `Job submission failed: ${response.status}`);
  }
  const data = await response.json();
  return data.job_id;
}

// ============ AI Image Generation ============

export async function generateCharacterImage(
  data: {
    name: string;
    age: string;
    gender?: string;
    description: string;
    visual_style?: string;
    reference_image?: { image_base64: string; mime_type: string };
  },
): Promise<{ image_base64: string; mime_type: string; cost_usd: number }> {
  const response = await fetch(`${BACKEND_URL}/assets/generate-character-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || "Image generation failed");
  }
  return response.json();
}

export async function generateLocationImage(
  data: {
    name: string;
    description: string;
    atmosphere?: string;
    visual_style?: string;
    reference_image?: { image_base64: string; mime_type: string };
  },
): Promise<{ image_base64: string; mime_type: string; cost_usd: number }> {
  const response = await fetch(`${BACKEND_URL}/assets/generate-location-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || "Image generation failed");
  }
  return response.json();
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
