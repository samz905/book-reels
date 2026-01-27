// Types
export interface CartSubscription {
  id: string;
  creatorName: string;
  creatorAvatar: string;
  price: number;
  renewsDate: string;
}

export interface CartEbook {
  id: string;
  title: string;
  coverUrl: string;
  price: number;
}

// Mock Data
export const mockCartSubscriptions: CartSubscription[] = [
  {
    id: "cart-sub-1",
    creatorName: "Jane Cooper",
    creatorAvatar: "https://picsum.photos/seed/cart-creator1/100/100",
    price: 9.99,
    renewsDate: "Feb 3, 2026",
  },
  {
    id: "cart-sub-2",
    creatorName: "Jane Cooper",
    creatorAvatar: "https://picsum.photos/seed/cart-creator2/100/100",
    price: 9.99,
    renewsDate: "Feb 3, 2026",
  },
  {
    id: "cart-sub-3",
    creatorName: "Eleanor Pena",
    creatorAvatar: "https://picsum.photos/seed/cart-creator3/100/100",
    price: 9.99,
    renewsDate: "Feb 3, 2026",
  },
];

export const mockCartEbooks: CartEbook[] = [
  {
    id: "cart-ebook-1",
    title: "The Wolf Prince's Mate (The Royals Of Presley Acres)",
    coverUrl: "https://picsum.photos/seed/cart-ebook1/120/180",
    price: 4.99,
  },
  {
    id: "cart-ebook-2",
    title: "The Wolf Prince's Mate (The Royals Of Presley Acres)",
    coverUrl: "https://picsum.photos/seed/cart-ebook2/120/180",
    price: 4.99,
  },
  {
    id: "cart-ebook-3",
    title: "The Wolf Prince's Mate (The Royals Of Presley Acres)",
    coverUrl: "https://picsum.photos/seed/cart-ebook3/120/180",
    price: 4.99,
  },
  {
    id: "cart-ebook-4",
    title: "The Wolf Prince's Mate (The Royals Of Presley Acres)",
    coverUrl: "https://picsum.photos/seed/cart-ebook4/120/180",
    price: 4.99,
  },
];
