// Types
export interface UserProfile {
  name: string;
  email: string;
  hasPassword: boolean;
}

export interface Subscription {
  id: string;
  creatorName: string;
  creatorAvatar: string;
  creatorUsername: string;
  price: number;
  status: "active" | "canceled";
  nextBilling: string | null;
}

export interface PurchasedEbook {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  storyTitle: string;
}

export interface PaymentMethod {
  type: "visa" | "mastercard" | "amex";
  lastFour: string;
}

export interface PayoutMethod {
  type: "bank";
  lastFour: string;
  status: "verified" | "pending";
}

// Mock Data
export const mockUserProfile: UserProfile = {
  name: "Jon Doe",
  email: "example@gmail.com",
  hasPassword: true,
};

export const mockSubscriptions: Subscription[] = [
  {
    id: "sub-1",
    creatorName: "Jane Cooper",
    creatorAvatar: "https://picsum.photos/seed/creator1/100/100",
    creatorUsername: "jane-cooper",
    price: 9.99,
    status: "active",
    nextBilling: "Feb 3, 2026",
  },
  {
    id: "sub-2",
    creatorName: "Jane Cooper",
    creatorAvatar: "https://picsum.photos/seed/creator2/100/100",
    creatorUsername: "jane-cooper-2",
    price: 9.99,
    status: "active",
    nextBilling: "Feb 3, 2026",
  },
  {
    id: "sub-3",
    creatorName: "Eleanor Pena",
    creatorAvatar: "https://picsum.photos/seed/creator3/100/100",
    creatorUsername: "eleanor-pena",
    price: 9.99,
    status: "canceled",
    nextBilling: null,
  },
];

export const mockPurchasedEbooks: PurchasedEbook[] = [
  {
    id: "ebook-1",
    title: "The Wolf Prince's Mate (The Royals Of Presley Acres)",
    description:
      "Hello, my name is James, and I work as a UI/UX designer. I create user-friendly and visually appealing interfaces that improve user experience and help websites and apps convert visitors into real customers, increasing engagement, trust, and overall business revenue.",
    coverUrl: "https://picsum.photos/seed/ebook1/200/320",
    storyTitle: "Elementally Tangled",
  },
  {
    id: "ebook-2",
    title: "The Wolf Prince's Mate (The Royals Of Presley Acres)",
    description:
      "Hello, my name is James, and I work as a UI/UX designer. I create user-friendly and visually appealing interfaces that improve user experience and help websites and apps convert visitors into real customers, increasing engagement, trust, and overall business revenue.",
    coverUrl: "https://picsum.photos/seed/ebook2/200/320",
    storyTitle: "Reborn",
  },
  {
    id: "ebook-3",
    title: "The Wolf Prince's Mate (The Royals Of Presley Acres)",
    description:
      "Hello, my name is James, and I work as a UI/UX designer. I create user-friendly and visually appealing interfaces that improve user experience and help websites and apps convert visitors into real customers, increasing engagement, trust, and overall business revenue.",
    coverUrl: "https://picsum.photos/seed/ebook3/200/320",
    storyTitle: "Eternal Descendants",
  },
  {
    id: "ebook-4",
    title: "The Wolf Prince's Mate (The Royals Of Presley Acres)",
    description:
      "Hello, my name is James, and I work as a UI/UX designer. I create user-friendly and visually appealing interfaces that improve user experience and help websites and apps convert visitors into real customers, increasing engagement, trust, and overall business revenue.",
    coverUrl: "https://picsum.photos/seed/ebook4/200/320",
    storyTitle: "Dark Moon Rising",
  },
];

export const mockPaymentMethod: PaymentMethod | null = {
  type: "visa",
  lastFour: "1234",
};

export const mockPayoutMethod: PayoutMethod | null = {
  type: "bank",
  lastFour: "1234",
  status: "verified",
};
