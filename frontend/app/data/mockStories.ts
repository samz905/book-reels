export const CATEGORIES = [
  "ALL",
  "ROMANCE",
  "DRAMA",
  "FANTASY",
  "HORROR",
  "SCI-FI",
  "COMEDY",
  "THRILLER",
  "ACTION",
  "MYSTERY",
  "SLICE OF LIFE",
  "SUPERHERO",
  "HISTORICAL",
  "OTHER",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const STORY_TYPES = ["ALL", "VIDEO", "AUDIO"] as const;

export type StoryType = (typeof STORY_TYPES)[number];

export interface Story {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  creatorName: string;
  creatorUsername: string;
  creatorAvatar: string;
  category: Category;
  storyType?: "VIDEO" | "AUDIO";
  viewCount?: string;
  episodeCount?: number;
}

export const mockStories: Story[] = [
  {
    id: "1",
    title: "Katarina: The Orc Goddess",
    description:
      "Once upon a time, there was a brand with an amazing story to tell the world.",
    coverImage: "https://picsum.photos/seed/story1/300/450",
    creatorName: "Sarah Mitchell",
    creatorUsername: "sarah-mitchell",
    creatorAvatar: "https://picsum.photos/seed/avatar1/100/100",
    category: "FANTASY",
    storyType: "VIDEO",
  },
  {
    id: "2",
    title: "Instrumental Studies",
    description:
      "Once upon a time, there was a brand with an amazing story to tell the world.",
    coverImage: "https://picsum.photos/seed/story2/300/450",
    creatorName: "James Cooper",
    creatorUsername: "james-cooper",
    creatorAvatar: "https://picsum.photos/seed/avatar2/100/100",
    category: "DRAMA",
    storyType: "AUDIO",
  },
  {
    id: "3",
    title: "Beats to Think To",
    description:
      "Once upon a time, there was a brand with an amazing story to tell the world.",
    coverImage: "https://picsum.photos/seed/story3/300/450",
    creatorName: "Mike Chen",
    creatorUsername: "mike-chen",
    creatorAvatar: "https://picsum.photos/seed/avatar3/100/100",
    category: "OTHER",
    storyType: "AUDIO",
  },
  {
    id: "4",
    title: "A Maiden of Belial",
    description:
      "Once upon a time, there was a brand with an amazing story to tell the world.",
    coverImage: "https://picsum.photos/seed/story4/300/450",
    creatorName: "Becca Kabelis",
    creatorUsername: "becca-kabelis",
    creatorAvatar: "https://picsum.photos/seed/avatar4/100/100",
    category: "FANTASY",
    storyType: "VIDEO",
  },
  {
    id: "5",
    title: "Lord of the Beasts",
    description:
      "Once upon a time, there was a brand with an amazing story to tell the world.",
    coverImage: "https://picsum.photos/seed/story5/300/450",
    creatorName: "David Wright",
    creatorUsername: "david-wright",
    creatorAvatar: "https://picsum.photos/seed/avatar5/100/100",
    category: "FANTASY",
    storyType: "VIDEO",
    episodeCount: 2,
  },
  {
    id: "6",
    title: "Focus Flow",
    description:
      "Once upon a time, there was a brand with an amazing story to tell the world.",
    coverImage: "https://picsum.photos/seed/story6/300/450",
    creatorName: "Emma Davis",
    creatorUsername: "emma-davis",
    creatorAvatar: "https://picsum.photos/seed/avatar6/100/100",
    category: "SLICE OF LIFE",
    storyType: "VIDEO",
  },
  {
    id: "7",
    title: "The Gourmet System",
    description:
      "Once upon a time, there was a brand with an amazing story to tell the world.",
    coverImage: "https://picsum.photos/seed/story7/300/450",
    creatorName: "Lisa Park",
    creatorUsername: "lisa-park",
    creatorAvatar: "https://picsum.photos/seed/avatar7/100/100",
    category: "COMEDY",
    storyType: "VIDEO",
  },
  {
    id: "8",
    title: "Billionaire Heiress",
    description:
      "Once upon a time, there was a brand with an amazing story to tell the world.",
    coverImage: "https://picsum.photos/seed/story8/300/450",
    creatorName: "Rachel Kim",
    creatorUsername: "rachel-kim",
    creatorAvatar: "https://picsum.photos/seed/avatar8/100/100",
    category: "ROMANCE",
    storyType: "VIDEO",
  },
  {
    id: "9",
    title: "Signed, Sealed, Secretly Married",
    description:
      "Once upon a time, there was a brand with an amazing story to tell the world.",
    coverImage: "https://picsum.photos/seed/story9/300/450",
    creatorName: "Amanda Foster",
    creatorUsername: "amanda-foster",
    creatorAvatar: "https://picsum.photos/seed/avatar9/100/100",
    category: "ROMANCE",
    storyType: "VIDEO",
  },
  {
    id: "10",
    title: "The Universe Within",
    description:
      "Once upon a time, there was a brand with an amazing story to tell the world.",
    coverImage: "https://picsum.photos/seed/story10/300/450",
    creatorName: "Chris Morgan",
    creatorUsername: "chris-morgan",
    creatorAvatar: "https://picsum.photos/seed/avatar10/100/100",
    category: "SCI-FI",
    storyType: "VIDEO",
  },
  {
    id: "11",
    title: "Reborn",
    description:
      "Once upon a time, there was a brand with an amazing story to tell the world.",
    coverImage: "https://picsum.photos/seed/story11/300/450",
    creatorName: "Anne K. Whelan",
    creatorUsername: "anne-k-whelan",
    creatorAvatar: "https://picsum.photos/seed/avatar11/100/100",
    category: "ACTION",
    storyType: "VIDEO",
  },
  {
    id: "12",
    title: "Today's Top Hits",
    description:
      "Once upon a time, there was a brand with an amazing story to tell the world.",
    coverImage: "https://picsum.photos/seed/story12/300/450",
    creatorName: "Tyler Brooks",
    creatorUsername: "tyler-brooks",
    creatorAvatar: "https://picsum.photos/seed/avatar12/100/100",
    category: "OTHER",
    storyType: "AUDIO",
  },
  {
    id: "13",
    title: "RapCaviar",
    description:
      "Once upon a time, there was a brand with an amazing story to tell the world.",
    coverImage: "https://picsum.photos/seed/story13/300/450",
    creatorName: "Marcus Johnson",
    creatorUsername: "marcus-johnson",
    creatorAvatar: "https://picsum.photos/seed/avatar13/100/100",
    category: "OTHER",
    storyType: "AUDIO",
  },
  {
    id: "14",
    title: "Peaceful Piano",
    description:
      "Once upon a time, there was a brand with an amazing story to tell the world.",
    coverImage: "https://picsum.photos/seed/story14/300/450",
    creatorName: "Sophie Williams",
    creatorUsername: "sophie-williams",
    creatorAvatar: "https://picsum.photos/seed/avatar14/100/100",
    category: "DRAMA",
    storyType: "AUDIO",
  },
  {
    id: "15",
    title: "Chill Hits",
    description:
      "Once upon a time, there was a brand with an amazing story to tell the world.",
    coverImage: "https://picsum.photos/seed/story15/300/450",
    creatorName: "Alex Turner",
    creatorUsername: "alex-turner",
    creatorAvatar: "https://picsum.photos/seed/avatar15/100/100",
    category: "SLICE OF LIFE",
    storyType: "AUDIO",
  },
  {
    id: "16",
    title: "Rock Classics",
    description:
      "Once upon a time, there was a brand with an amazing story to tell the world.",
    coverImage: "https://picsum.photos/seed/story16/300/450",
    creatorName: "Brian Stone",
    creatorUsername: "brian-stone",
    creatorAvatar: "https://picsum.photos/seed/avatar16/100/100",
    category: "HISTORICAL",
    storyType: "VIDEO",
  },
  {
    id: "17",
    title: "Dragon Princess",
    description:
      "Once upon a time, there was a brand with an amazing story to tell the world.",
    coverImage: "https://picsum.photos/seed/story17/300/450",
    creatorName: "Luna Chen",
    creatorUsername: "luna-chen",
    creatorAvatar: "https://picsum.photos/seed/avatar17/100/100",
    category: "FANTASY",
    storyType: "VIDEO",
    viewCount: "138M+",
  },
  {
    id: "18",
    title: "Elementally Tangled",
    description:
      "Once upon a time, there was a brand with an amazing story to tell the world.",
    coverImage: "https://picsum.photos/seed/story18/300/450",
    creatorName: "Luna Steel",
    creatorUsername: "luna-steel",
    creatorAvatar: "https://picsum.photos/seed/avatar18/100/100",
    category: "FANTASY",
    storyType: "VIDEO",
  },
];
