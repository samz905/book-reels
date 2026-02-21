// Account page types (shared by components)

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
