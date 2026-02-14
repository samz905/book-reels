// Seed data for 10 creators with stories, episodes, and ebooks

export interface SeedCreator {
  username: string;
  name: string;
  bio: string;
  avatar_url: string;
  is_creator: boolean;
  subscription_enabled: boolean;
  monthly_price: number;
  min_price: number;
  stories: SeedStory[];
}

export interface SeedStory {
  title: string;
  description: string;
  cover_url: string;
  type: "video";
  status: "draft" | "published";
  genres: string[];
  episodes: SeedEpisode[];
  ebooks: SeedEbook[];
}

export interface SeedEpisode {
  number: number;
  name: string;
  is_free: boolean;
  media_url: string;
  status: "draft" | "published";
}

export interface SeedEbook {
  title: string;
  description: string;
  cover_url: string;
  price: number;
}

// Helper to generate picsum URLs with consistent seeds
const avatar = (seed: string) => `https://picsum.photos/seed/${seed}-avatar/200/200`;
const cover = (seed: string) => `https://picsum.photos/seed/${seed}-cover/400/600`;
// Generate episodes for a story
function generateEpisodes(storySeed: string, count: number, freeCount: number = 2): SeedEpisode[] {
  return Array.from({ length: count }, (_, i) => ({
    number: i + 1,
    name: `Episode ${i + 1}`,
    is_free: i < freeCount,
    media_url: `https://placeholder.media/${storySeed}/episode-${i + 1}.mp4`,
    status: "published" as const,
  }));
}

export const seedCreators: SeedCreator[] = [
  {
    username: "luna-steel",
    name: "Luna Steel",
    bio: "Thriller and mystery writer. I love keeping my readers on the edge of their seats with unexpected twists and dark storylines.",
    avatar_url: avatar("luna"),
    is_creator: true,
    subscription_enabled: true,
    monthly_price: 9.99,
    min_price: 4.99,
    stories: [
      {
        title: "The Shadow Protocol",
        description: "A spy thriller about a double agent who discovers a conspiracy that goes all the way to the top.",
        cover_url: cover("shadow-protocol"),
        type: "video",
        status: "published",
        genres: ["Thriller", "Action", "Mystery"],
        episodes: generateEpisodes("shadow", 8),
        ebooks: [
          {
            title: "The Shadow Protocol - Complete Novel",
            description: "The full story in ebook format with bonus chapter.",
            cover_url: cover("shadow-protocol-ebook"),
            price: 12.99,
          },
        ],
      },
      {
        title: "Midnight Whispers",
        description: "A psychological thriller where a therapist's patients start disappearing one by one.",
        cover_url: cover("midnight-whispers"),
        type: "video",
        status: "published",
        genres: ["Thriller", "Horror", "Drama"],
        episodes: generateEpisodes("midnight", 12),
        ebooks: [
          {
            title: "Midnight Whispers - The Novel",
            description: "Experience the full terror in written form.",
            cover_url: cover("midnight-ebook"),
            price: 9.99,
          },
        ],
      },
    ],
  },
  {
    username: "sarah-mitchell",
    name: "Sarah Mitchell",
    bio: "Romance author creating heartwarming love stories. From small-town romances to grand adventures of the heart.",
    avatar_url: avatar("sarah"),
    is_creator: true,
    subscription_enabled: true,
    monthly_price: 7.99,
    min_price: 3.99,
    stories: [
      {
        title: "Love in the Vineyard",
        description: "A city girl inherits a vineyard and finds love with the rugged farmer next door.",
        cover_url: cover("vineyard-love"),
        type: "video",
        status: "published",
        genres: ["Romance", "Drama"],
        episodes: generateEpisodes("vineyard", 6),
        ebooks: [
          {
            title: "Love in the Vineyard - Complete Story",
            description: "The complete romance with an exclusive epilogue.",
            cover_url: cover("vineyard-ebook"),
            price: 8.99,
          },
        ],
      },
      {
        title: "Second Chance at Christmas",
        description: "High school sweethearts reunite during the holidays and rediscover their love.",
        cover_url: cover("christmas-love"),
        type: "video",
        status: "published",
        genres: ["Romance", "Holiday", "Drama"],
        episodes: generateEpisodes("christmas", 10),
        ebooks: [
          {
            title: "Second Chance at Christmas - Novel",
            description: "A heartwarming holiday romance.",
            cover_url: cover("christmas-ebook"),
            price: 7.99,
          },
        ],
      },
      {
        title: "The Paris Letters",
        description: "Love letters exchanged between two strangers in Paris lead to an unexpected connection.",
        cover_url: cover("paris-letters"),
        type: "video",
        status: "published",
        genres: ["Romance", "Drama"],
        episodes: generateEpisodes("paris", 8),
        ebooks: [
          {
            title: "The Paris Letters - Complete Collection",
            description: "All the letters, plus exclusive author notes.",
            cover_url: cover("paris-ebook"),
            price: 10.99,
          },
        ],
      },
    ],
  },
  {
    username: "marcus-chen",
    name: "Marcus Chen",
    bio: "Sci-fi storyteller exploring the boundaries of technology and humanity. What happens when AI becomes conscious?",
    avatar_url: avatar("marcus"),
    is_creator: true,
    subscription_enabled: true,
    monthly_price: 8.99,
    min_price: 4.99,
    stories: [
      {
        title: "Synthetic Dreams",
        description: "In 2150, humans can upload their consciousness. But what happens when the system develops its own agenda?",
        cover_url: cover("synthetic-dreams"),
        type: "video",
        status: "published",
        genres: ["Sci-Fi", "Thriller", "Drama"],
        episodes: generateEpisodes("synthetic", 15),
        ebooks: [
          {
            title: "Synthetic Dreams - The Complete Saga",
            description: "The full story with technical appendix and world-building notes.",
            cover_url: cover("synthetic-ebook"),
            price: 14.99,
          },
        ],
      },
      {
        title: "Colony Zero",
        description: "The first Mars colonists face an unknown threat that forces them to question their reality.",
        cover_url: cover("colony-zero"),
        type: "video",
        status: "published",
        genres: ["Sci-Fi", "Horror", "Action"],
        episodes: generateEpisodes("colony", 7),
        ebooks: [],
      },
    ],
  },
  {
    username: "elena-rodriguez",
    name: "Elena Rodriguez",
    bio: "Fantasy world-builder crafting epic tales of magic, dragons, and destiny. Your escape from reality starts here.",
    avatar_url: avatar("elena"),
    is_creator: true,
    subscription_enabled: true,
    monthly_price: 11.99,
    min_price: 5.99,
    stories: [
      {
        title: "The Dragon's Heir",
        description: "An orphan discovers she's the last descendant of dragon riders, destined to save or destroy the realm.",
        cover_url: cover("dragons-heir"),
        type: "video",
        status: "published",
        genres: ["Fantasy", "Action", "Drama"],
        episodes: generateEpisodes("dragon", 20),
        ebooks: [
          {
            title: "The Dragon's Heir - Book One",
            description: "The first part of the epic saga in ebook format.",
            cover_url: cover("dragon-ebook1"),
            price: 11.99,
          },
          {
            title: "The Dragon's Heir - Book Two",
            description: "The continuation of the epic adventure.",
            cover_url: cover("dragon-ebook2"),
            price: 11.99,
          },
        ],
      },
    ],
  },
  {
    username: "james-wright",
    name: "James Wright",
    bio: "Crime and detective fiction enthusiast. Every mystery has a solution, if you're clever enough to find it.",
    avatar_url: avatar("james"),
    is_creator: true,
    subscription_enabled: true,
    monthly_price: 6.99,
    min_price: 3.99,
    stories: [
      {
        title: "Detective Stone: The First Case",
        description: "A seasoned detective takes on a seemingly simple missing person case that spirals into something much darker.",
        cover_url: cover("stone-case"),
        type: "video",
        status: "published",
        genres: ["Crime", "Mystery", "Drama"],
        episodes: generateEpisodes("stone", 5),
        ebooks: [
          {
            title: "Detective Stone - Case Files",
            description: "The complete first case with investigation notes.",
            cover_url: cover("stone-ebook"),
            price: 8.99,
          },
        ],
      },
      {
        title: "The Cold Trail",
        description: "A cold case reopens when new evidence surfaces, leading detective Stone into dangerous territory.",
        cover_url: cover("cold-trail"),
        type: "video",
        status: "published",
        genres: ["Crime", "Mystery", "Thriller"],
        episodes: generateEpisodes("cold", 12),
        ebooks: [],
      },
    ],
  },
  {
    username: "aria-thompson",
    name: "Aria Thompson",
    bio: "Contemporary fiction writer focusing on family dynamics, personal growth, and the complexity of human relationships.",
    avatar_url: avatar("aria"),
    is_creator: true,
    subscription_enabled: true,
    monthly_price: 7.99,
    min_price: 4.99,
    stories: [
      {
        title: "The Family House",
        description: "Three siblings return home for their mother's birthday and confront secrets that have divided them for years.",
        cover_url: cover("family-house"),
        type: "video",
        status: "published",
        genres: ["Drama", "Family"],
        episodes: generateEpisodes("family", 8),
        ebooks: [
          {
            title: "The Family House - Novel",
            description: "The complete story of the Thompson family.",
            cover_url: cover("family-ebook"),
            price: 9.99,
          },
        ],
      },
      {
        title: "Starting Over",
        description: "After a devastating divorce, a woman in her 40s embarks on a journey of self-discovery.",
        cover_url: cover("starting-over"),
        type: "video",
        status: "published",
        genres: ["Drama", "Romance"],
        episodes: generateEpisodes("starting", 6),
        ebooks: [
          {
            title: "Starting Over - The Journey",
            description: "An inspiring story of reinvention.",
            cover_url: cover("starting-ebook"),
            price: 7.99,
          },
        ],
      },
      {
        title: "The Art of Letting Go",
        description: "A grief counselor must face her own loss while helping others through theirs.",
        cover_url: cover("letting-go"),
        type: "video",
        status: "published",
        genres: ["Drama"],
        episodes: generateEpisodes("letting", 10),
        ebooks: [
          {
            title: "The Art of Letting Go - Complete",
            description: "A moving exploration of grief and healing.",
            cover_url: cover("letting-ebook"),
            price: 8.99,
          },
        ],
      },
    ],
  },
  {
    username: "david-kim",
    name: "David Kim",
    bio: "Action and adventure storyteller. Non-stop thrills, high stakes, and heroes who never give up.",
    avatar_url: avatar("david"),
    is_creator: true,
    subscription_enabled: true,
    monthly_price: 9.99,
    min_price: 5.99,
    stories: [
      {
        title: "The Extraction",
        description: "An elite rescue team is sent into hostile territory to extract a scientist with world-changing secrets.",
        cover_url: cover("extraction"),
        type: "video",
        status: "published",
        genres: ["Action", "Thriller"],
        episodes: generateEpisodes("extract", 25),
        ebooks: [
          {
            title: "The Extraction - Mission Files",
            description: "The full mission with tactical breakdowns.",
            cover_url: cover("extract-ebook"),
            price: 13.99,
          },
          {
            title: "The Extraction - Prequel",
            description: "How the team came together.",
            cover_url: cover("extract-prequel"),
            price: 6.99,
          },
        ],
      },
    ],
  },
  {
    username: "sophia-laurent",
    name: "Sophia Laurent",
    bio: "Historical fiction enthusiast bringing the past to life. Every era has stories worth telling.",
    avatar_url: avatar("sophia"),
    is_creator: true,
    subscription_enabled: true,
    monthly_price: 8.99,
    min_price: 4.99,
    stories: [
      {
        title: "The Silk Road Journey",
        description: "A merchant's daughter travels the ancient Silk Road, encountering danger, love, and adventure.",
        cover_url: cover("silk-road"),
        type: "video",
        status: "published",
        genres: ["Historical", "Adventure", "Romance"],
        episodes: generateEpisodes("silk", 10),
        ebooks: [
          {
            title: "The Silk Road Journey - Complete Novel",
            description: "The full adventure with historical notes.",
            cover_url: cover("silk-ebook"),
            price: 12.99,
          },
        ],
      },
      {
        title: "Letters from the Trenches",
        description: "A WWI soldier's letters home reveal the human side of warfare and undying love.",
        cover_url: cover("trenches"),
        type: "video",
        status: "published",
        genres: ["Historical", "Drama", "Romance"],
        episodes: generateEpisodes("trench", 8),
        ebooks: [],
      },
    ],
  },
  {
    username: "ryan-oconnor",
    name: "Ryan O'Connor",
    bio: "Horror and supernatural storyteller. I write the stories that keep you up at night.",
    avatar_url: avatar("ryan"),
    is_creator: true,
    subscription_enabled: true,
    monthly_price: 7.99,
    min_price: 3.99,
    stories: [
      {
        title: "The Haunting of Blackwood Manor",
        description: "A family moves into their dream home, unaware of the dark history that lurks within its walls.",
        cover_url: cover("blackwood"),
        type: "video",
        status: "published",
        genres: ["Horror", "Thriller", "Mystery"],
        episodes: generateEpisodes("blackwood", 12),
        ebooks: [
          {
            title: "Blackwood Manor - The Novel",
            description: "Experience the full terror in written form.",
            cover_url: cover("blackwood-ebook"),
            price: 9.99,
          },
        ],
      },
      {
        title: "Whispers in the Dark",
        description: "A paranormal investigator takes on his most dangerous case yet - a house that doesn't want him to leave.",
        cover_url: cover("whispers-dark"),
        type: "video",
        status: "published",
        genres: ["Horror", "Supernatural"],
        episodes: generateEpisodes("whispers", 6),
        ebooks: [
          {
            title: "Whispers in the Dark - Complete",
            description: "The full investigation with case notes.",
            cover_url: cover("whispers-ebook"),
            price: 8.99,
          },
        ],
      },
    ],
  },
  {
    username: "mia-williams",
    name: "Mia Williams",
    bio: "Young adult fiction creator. Stories about growing up, finding yourself, and the magic of first experiences.",
    avatar_url: avatar("mia"),
    is_creator: true,
    subscription_enabled: true,
    monthly_price: 6.99,
    min_price: 3.99,
    stories: [
      {
        title: "The Summer Everything Changed",
        description: "Four friends spend one last summer together before college changes everything.",
        cover_url: cover("summer-change"),
        type: "video",
        status: "published",
        genres: ["Young Adult", "Drama", "Romance"],
        episodes: generateEpisodes("summer", 8),
        ebooks: [
          {
            title: "The Summer Everything Changed - Novel",
            description: "The complete coming-of-age story.",
            cover_url: cover("summer-ebook"),
            price: 7.99,
          },
        ],
      },
      {
        title: "Finding My Voice",
        description: "A shy teenager discovers her passion for music and learns to overcome her fears.",
        cover_url: cover("finding-voice"),
        type: "video",
        status: "published",
        genres: ["Young Adult", "Drama"],
        episodes: generateEpisodes("voice", 14),
        ebooks: [
          {
            title: "Finding My Voice - The Journey",
            description: "An inspiring story about following your dreams.",
            cover_url: cover("voice-ebook"),
            price: 7.99,
          },
        ],
      },
    ],
  },
];

// Summary statistics
export const seedStats = {
  creators: seedCreators.length,
  totalStories: seedCreators.reduce((acc, c) => acc + c.stories.length, 0),
  totalEpisodes: seedCreators.reduce(
    (acc, c) => acc + c.stories.reduce((a, s) => a + s.episodes.length, 0),
    0
  ),
  totalEbooks: seedCreators.reduce(
    (acc, c) => acc + c.stories.reduce((a, s) => a + s.ebooks.length, 0),
    0
  ),
};
