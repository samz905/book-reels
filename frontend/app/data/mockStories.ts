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
  creatorUsername: string;
  creatorAvatar: string;
  category: Category;
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
  },
];
