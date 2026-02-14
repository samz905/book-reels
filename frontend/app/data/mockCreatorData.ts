// Types for Creator Profile

export interface CreatorProfile {
  name: string;
  username: string;
  bio: string;
  avatar: string | null;
  storiesCount: number;
  episodesCount: number;
  newEpisodesWeekly: number;
}

export interface CreatorStats {
  thisMonth: number;
  lifetime: number;
  subscriptions: number;
  ebooks: number;
  activeSubscribers: number;
}

export interface Subscription {
  enabled: boolean;
  monthlyPrice: number;
  minPrice: number;
}

export interface Episode {
  id: string;
  number: number;
  name: string;
  isFree: boolean;
  status?: "draft" | "published";
}

export interface Ebook {
  id: string;
  title: string;
  description: string;
  cover: string;
  fileUrl?: string;
  isbn?: string;
  price: number;
}

export interface Story {
  id: string;
  title: string;
  type: "video";
  episodeCount: number;
  viewCount: number;
  description: string;
  cover: string;
  episodes: Episode[];
  likes: number;
  genre: string[];
  status: "draft" | "published";
  ebooks: Ebook[];
}

export interface StoryCharacterFE {
  id: string;
  name: string;
  age: string;
  gender: string;
  description: string;
  role: string;
  visualStyle: string | null;
  imageBase64: string | null;
  imageMimeType: string;
}

export interface StoryLocationFE {
  id: string;
  name: string;
  description: string;
  atmosphere: string;
  visualStyle: string | null;
  imageBase64: string | null;
  imageMimeType: string;
}

export const VISUAL_STYLES = [
  { value: "cinematic", label: "Cinematic" },
  { value: "anime", label: "Anime" },
  { value: "animated", label: "Animated" },
  { value: "pixar", label: "Pixar" },
];

export const GENRES = [
  "Fantasy",
  "Romance",
  "Action",
  "Drama",
  "Thriller",
  "Mystery",
  "Horror",
  "Sci-Fi",
  "Comedy",
  "Adventure",
];

// Empty state defaults
export const emptyProfile: CreatorProfile = {
  name: "Creator name",
  username: "username",
  bio: "Add your bio here",
  avatar: null,
  storiesCount: 0,
  episodesCount: 0,
  newEpisodesWeekly: 0,
};

export const emptyStats: CreatorStats = {
  thisMonth: 0,
  lifetime: 0,
  subscriptions: 0,
  ebooks: 0,
  activeSubscribers: 0,
};

export const defaultSubscription: Subscription = {
  enabled: false,
  monthlyPrice: 0,
  minPrice: 0,
};

// Mock populated data
export const mockProfile: CreatorProfile = {
  name: "Luna Steel",
  username: "luna-steel",
  bio: "Hello, my name is Luna, and I work as a UI/UX designer. I create user-friendly and visually appealing interfaces that improve user experience and help websites and apps convert visitors into real customers, increasing engagement, trust, and overall business revenue.",
  avatar: "https://picsum.photos/seed/avatar18/200/200",
  storiesCount: 5,
  episodesCount: 103,
  newEpisodesWeekly: 19,
};

export const mockStats: CreatorStats = {
  thisMonth: 1287,
  lifetime: 1287,
  subscriptions: 5287,
  ebooks: 5287,
  activeSubscribers: 182,
};

export const mockSubscription: Subscription = {
  enabled: true,
  monthlyPrice: 8.0,
  minPrice: 4.99,
};

// Mock episodes for stories
const createEpisodes = (count: number, storyId: string): Episode[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `${storyId}-ep-${i + 1}`,
    number: i + 1,
    name: "Episode name",
    isFree: i < 3, // First 3 episodes are free
  }));
};

export const mockStories: Story[] = [
  {
    id: "story-1",
    title: "Story Name",
    type: "video",
    episodeCount: 20,
    viewCount: 1400000,
    description:
      "Hello, my name is James, and I work as a UI/UX designer. I create user-friendly and visually appealing interfaces that improve user experience and help websites and apps convert visitors into real customers, increasing engagement, trust, and overall business revenue.",
    cover: "https://picsum.photos/seed/tangled/300/450",
    episodes: createEpisodes(20, "story-1"),
    likes: 2687,
    genre: ["Fantasy", "Romance"],
    status: "published",
    ebooks: [
      {
        id: "ebook-1",
        title: "The Wolf Prince's Mate (The Royals Of Presley Acres)",
        description:
          "Hello, my name is James, and I work as a UI/UX designer. I create user-friendly and visually appealing interfaces.",
        cover: "https://picsum.photos/seed/ebook1/100/160",
        price: 4.99,
      },
    ],
  },
  {
    id: "story-2",
    title: "Story Name",
    type: "video",
    episodeCount: 15,
    viewCount: 890000,
    description:
      "Hello, my name is James, and I work as a UI/UX designer. I create user-friendly and visually appealing interfaces that improve user experience and help websites and apps convert visitors into real customers, increasing engagement, trust, and overall business revenue.",
    cover: "https://picsum.photos/seed/descendants/300/450",
    episodes: createEpisodes(15, "story-2"),
    likes: 1845,
    genre: ["Drama", "Thriller"],
    status: "published",
    ebooks: [],
  },
];

// Helper to format numbers (e.g., 1400000 -> "1.4M")
export const formatViewCount = (count: number): string => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
};

// Helper to format currency
export const formatCurrency = (amount: number): string => {
  return `$${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
};
