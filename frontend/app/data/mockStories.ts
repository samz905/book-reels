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

export interface Story {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  creatorName: string;
  creatorAvatar: string;
  category: Category;
  hasVideo?: boolean;
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
    creatorAvatar: "https://picsum.photos/seed/avatar1/100/100",
    category: "FANTASY",
    hasVideo: true,
  },
  {
    id: "2",
    title: "Instrumental Studies",
    description:
      "Once upon a time, there was a brand with an amazing story to tell the world.",
    coverImage: "https://picsum.photos/seed/story2/300/450",
    creatorName: "James Cooper",
    creatorAvatar: "https://picsum.photos/seed/avatar2/100/100",
    category: "DRAMA",
  },
  {
    id: "3",
    title: "Beats to Think To",
    description:
      "Once upon a time, there was a brand with an amazing story to tell the world.",
    coverImage: "https://picsum.photos/seed/story3/300/450",
    creatorName: "Mike Chen",
    creatorAvatar: "https://picsum.photos/seed/avatar3/100/100",
    category: "OTHER",
  },
  {
    id: "4",
    title: "A Maiden of Belial",
    description:
      "Once upon a time, there was a brand with an amazing story to tell the world.",
    coverImage: "https://picsum.photos/seed/story4/300/450",
    creatorName: "Becca Kabelis",
    creatorAvatar: "https://picsum.photos/seed/avatar4/100/100",
    category: "FANTASY",
  },
  {
    id: "5",
    title: "Lord of the Beasts",
    description:
      "Once upon a time, there was a brand with an amazing story to tell the world.",
    coverImage: "https://picsum.photos/seed/story5/300/450",
    creatorName: "David Wright",
    creatorAvatar: "https://picsum.photos/seed/avatar5/100/100",
    category: "FANTASY",
    episodeCount: 2,
  },
  {
    id: "6",
    title: "Focus Flow",
    description:
      "Once upon a time, there was a brand with an amazing story to tell the world.",
    coverImage: "https://picsum.photos/seed/story6/300/450",
    creatorName: "Emma Davis",
    creatorAvatar: "https://picsum.photos/seed/avatar6/100/100",
    category: "SLICE OF LIFE",
  },
  {
    id: "7",
    title: "The Gourmet System",
    description:
      "Once upon a time, there was a brand with an amazing story to tell the world.",
    coverImage: "https://picsum.photos/seed/story7/300/450",
    creatorName: "Lisa Park",
    creatorAvatar: "https://picsum.photos/seed/avatar7/100/100",
    category: "COMEDY",
  },
  {
    id: "8",
    title: "Billionaire Heiress",
    description:
      "Once upon a time, there was a brand with an amazing story to tell the world.",
    coverImage: "https://picsum.photos/seed/story8/300/450",
    creatorName: "Rachel Kim",
    creatorAvatar: "https://picsum.photos/seed/avatar8/100/100",
    category: "ROMANCE",
  },
  {
    id: "9",
    title: "Signed, Sealed, Secretly Married",
    description:
      "Once upon a time, there was a brand with an amazing story to tell the world.",
    coverImage: "https://picsum.photos/seed/story9/300/450",
    creatorName: "Amanda Foster",
    creatorAvatar: "https://picsum.photos/seed/avatar9/100/100",
    category: "ROMANCE",
  },
  {
    id: "10",
    title: "The Universe Within",
    description:
      "Once upon a time, there was a brand with an amazing story to tell the world.",
    coverImage: "https://picsum.photos/seed/story10/300/450",
    creatorName: "Chris Morgan",
    creatorAvatar: "https://picsum.photos/seed/avatar10/100/100",
    category: "SCI-FI",
  },
  {
    id: "11",
    title: "Reborn",
    description:
      "Once upon a time, there was a brand with an amazing story to tell the world.",
    coverImage: "https://picsum.photos/seed/story11/300/450",
    creatorName: "Anne K. Whelan",
    creatorAvatar: "https://picsum.photos/seed/avatar11/100/100",
    category: "ACTION",
  },
  {
    id: "12",
    title: "Today's Top Hits",
    description:
      "Once upon a time, there was a brand with an amazing story to tell the world.",
    coverImage: "https://picsum.photos/seed/story12/300/450",
    creatorName: "Tyler Brooks",
    creatorAvatar: "https://picsum.photos/seed/avatar12/100/100",
    category: "OTHER",
  },
  {
    id: "13",
    title: "RapCaviar",
    description:
      "Once upon a time, there was a brand with an amazing story to tell the world.",
    coverImage: "https://picsum.photos/seed/story13/300/450",
    creatorName: "Marcus Johnson",
    creatorAvatar: "https://picsum.photos/seed/avatar13/100/100",
    category: "OTHER",
  },
  {
    id: "14",
    title: "Peaceful Piano",
    description:
      "Once upon a time, there was a brand with an amazing story to tell the world.",
    coverImage: "https://picsum.photos/seed/story14/300/450",
    creatorName: "Sophie Williams",
    creatorAvatar: "https://picsum.photos/seed/avatar14/100/100",
    category: "DRAMA",
  },
  {
    id: "15",
    title: "Chill Hits",
    description:
      "Once upon a time, there was a brand with an amazing story to tell the world.",
    coverImage: "https://picsum.photos/seed/story15/300/450",
    creatorName: "Alex Turner",
    creatorAvatar: "https://picsum.photos/seed/avatar15/100/100",
    category: "SLICE OF LIFE",
  },
  {
    id: "16",
    title: "Rock Classics",
    description:
      "Once upon a time, there was a brand with an amazing story to tell the world.",
    coverImage: "https://picsum.photos/seed/story16/300/450",
    creatorName: "Brian Stone",
    creatorAvatar: "https://picsum.photos/seed/avatar16/100/100",
    category: "HISTORICAL",
    hasVideo: true,
  },
  {
    id: "17",
    title: "Dragon Princess",
    description:
      "Once upon a time, there was a brand with an amazing story to tell the world.",
    coverImage: "https://picsum.photos/seed/story17/300/450",
    creatorName: "Luna Chen",
    creatorAvatar: "https://picsum.photos/seed/avatar17/100/100",
    category: "FANTASY",
    viewCount: "138M+",
  },
  {
    id: "18",
    title: "Elementally Tangled",
    description:
      "Once upon a time, there was a brand with an amazing story to tell the world.",
    coverImage: "https://picsum.photos/seed/story18/300/450",
    creatorName: "Luna Steel",
    creatorAvatar: "https://picsum.photos/seed/avatar18/100/100",
    category: "FANTASY",
  },
];
