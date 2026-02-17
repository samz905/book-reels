// Types for Public Creator Profiles
import { CreatorProfile, Episode, formatViewCount } from "./mockCreatorData";

export interface Ebook {
  id: string;
  title: string;
  description: string;
  cover: string;
  price: number;
}

export interface PublicStory {
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
  ebooks: Ebook[];
}

export interface PublicCreatorProfile {
  profile: CreatorProfile;
  subscription: {
    monthlyPrice: number;
    description: string;
  };
  stories: PublicStory[];
}

// Helper to create episodes
const createEpisodes = (count: number, storyId: string, freeCount: number = 4): Episode[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `${storyId}-ep-${i + 1}`,
    number: i + 1,
    name: "Episode name",
    isFree: i < freeCount,
  }));
};

// Helper to create ebooks
const createEbooks = (storyId: string, count: number = 4): Ebook[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `${storyId}-ebook-${i + 1}`,
    title: "The Wolf Prince's Mate (The Royals Of Presley Acres)",
    description:
      "Hello, my name is James, and I work as a UI/UX designer. I create user-friendly and visually appealing interfaces that improve user experience and help websites and apps convert visitors into real customers, increasing engagement, trust, and overall business revenue.",
    cover: `https://picsum.photos/seed/${storyId}-ebook${i + 1}/100/160`,
    price: 4.99,
  }));
};

// Mock public creators data - mapped by username
export const mockPublicCreators: Record<string, PublicCreatorProfile> = {
  "luna-steel": {
    profile: {
      name: "Luna Steel",
      username: "luna-steel",
      bio: "Hello, my name is Luna, and I work as a UI/UX designer. I create user-friendly and visually appealing interfaces that improve user experience and help websites and apps convert visitors into real customers, increasing engagement, trust, and overall business revenue.",
      avatar: "https://picsum.photos/seed/avatar18/200/200",
      storiesCount: 5,
      episodesCount: 103,
      newEpisodesWeekly: 19,
    },
    subscription: {
      monthlyPrice: 8.99,
      description: "Unlock all episodes, 5+1 stories, all ebooks",
    },
    stories: [
      {
        id: "luna-story-1",
        title: "Elementally Tangled",
        type: "video",
        episodeCount: 20,
        viewCount: 1400000,
        description:
          "Hello, my name is James, and I work as a UI/UX designer. I create user-friendly and visually appealing interfaces that improve user experience and help websites and apps convert visitors into real customers, increasing engagement, trust, and overall business revenue. Hello, my name is James, and I work as a UI/UX designer. I create user-friendly and visually appealing interfaces that improve user experience.",
        cover: "https://picsum.photos/seed/tangled/300/450",
        episodes: createEpisodes(20, "luna-story-1"),
        likes: 2687,
        genre: ["Fantasy", "Romance"],
        ebooks: createEbooks("luna-story-1"),
      },
      {
        id: "luna-story-2",
        title: "Reborn",
        type: "video",
        episodeCount: 15,
        viewCount: 890000,
        description:
          "Hello, my name is James, and I work as a UI/UX designer. I create user-friendly and visually appealing interfaces that improve user experience and help websites and apps convert visitors into real customers, increasing engagement, trust, and overall business revenue.",
        cover: "https://picsum.photos/seed/reborn/300/450",
        episodes: createEpisodes(15, "luna-story-2"),
        likes: 1845,
        genre: ["Action", "Drama"],
        ebooks: createEbooks("luna-story-2"),
      },
      {
        id: "luna-story-3",
        title: "Story Name",
        type: "video",
        episodeCount: 12,
        viewCount: 560000,
        description:
          "Hello, my name is James, and I work as a UI/UX designer. I create user-friendly and visually appealing interfaces that improve user experience and help websites and apps convert visitors into real customers, increasing engagement, trust, and overall business revenue.",
        cover: "https://picsum.photos/seed/story3luna/300/450",
        episodes: createEpisodes(12, "luna-story-3"),
        likes: 1024,
        genre: ["Fantasy"],
        ebooks: createEbooks("luna-story-3"),
      },
    ],
  },
  "sarah-mitchell": {
    profile: {
      name: "Sarah Mitchell",
      username: "sarah-mitchell",
      bio: "Fantasy author and storyteller. I weave tales of magic, romance, and adventure that transport you to worlds beyond imagination.",
      avatar: "https://picsum.photos/seed/avatar1/200/200",
      storiesCount: 3,
      episodesCount: 45,
      newEpisodesWeekly: 5,
    },
    subscription: {
      monthlyPrice: 6.99,
      description: "Unlock all episodes, 3 stories, all ebooks",
    },
    stories: [
      {
        id: "sarah-story-1",
        title: "Katarina: The Orc Goddess",
        type: "video",
        episodeCount: 25,
        viewCount: 2100000,
        description:
          "In a world where orcs and humans live in uneasy peace, one woman rises to challenge the gods themselves. Follow Katarina's journey from outcast to deity in this epic fantasy adventure.",
        cover: "https://picsum.photos/seed/story1/300/450",
        episodes: createEpisodes(25, "sarah-story-1"),
        likes: 4521,
        genre: ["Fantasy", "Action"],
        ebooks: createEbooks("sarah-story-1"),
      },
    ],
  },
  "anne-k-whelan": {
    profile: {
      name: "Anne K. Whelan",
      username: "anne-k-whelan",
      bio: "Author of dark fantasy and supernatural thrillers. My stories explore the shadows where magic meets mortality.",
      avatar: "https://picsum.photos/seed/avatar11/200/200",
      storiesCount: 2,
      episodesCount: 32,
      newEpisodesWeekly: 3,
    },
    subscription: {
      monthlyPrice: 7.99,
      description: "Unlock all episodes, 2 stories, all ebooks",
    },
    stories: [
      {
        id: "anne-story-1",
        title: "Reborn",
        type: "video",
        episodeCount: 18,
        viewCount: 980000,
        description:
          "Death was only the beginning. When Maya wakes up in a body that isn't hers, she must uncover the truth behind her resurrection before the ones who brought her back demand payment.",
        cover: "https://picsum.photos/seed/story11/300/450",
        episodes: createEpisodes(18, "anne-story-1"),
        likes: 2156,
        genre: ["Action", "Thriller"],
        ebooks: createEbooks("anne-story-1"),
      },
    ],
  },
};

// Helper function to get creator by username
export function getCreatorByUsername(username: string): PublicCreatorProfile | null {
  // First try exact match
  if (mockPublicCreators[username]) {
    return mockPublicCreators[username];
  }

  // Fallback: generate a basic profile from the username
  // This allows any creator link to work even if not in mockPublicCreators
  const name = username
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return {
    profile: {
      name,
      username,
      bio: "Creator on Oddega. Follow for amazing stories, engaging episodes, and exclusive content.",
      avatar: `https://picsum.photos/seed/${username}/200/200`,
      storiesCount: 3,
      episodesCount: 45,
      newEpisodesWeekly: 5,
    },
    subscription: {
      monthlyPrice: 6.99,
      description: "Unlock all episodes and exclusive content",
    },
    stories: [
      {
        id: `${username}-story-1`,
        title: "Story Name",
        type: "video",
        episodeCount: 15,
        viewCount: 850000,
        description:
          "An amazing story that will captivate your imagination. Follow along as we explore themes of adventure, mystery, and discovery.",
        cover: `https://picsum.photos/seed/${username}-cover/300/450`,
        episodes: createEpisodes(15, `${username}-story-1`),
        likes: 1500,
        genre: ["Fantasy", "Adventure"],
        ebooks: createEbooks(`${username}-story-1`),
      },
    ],
  };
}

// Re-export formatViewCount for convenience
export { formatViewCount };
