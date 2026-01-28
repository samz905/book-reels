// Database types matching Supabase schema

export type StoryType = "video" | "audio";
export type ContentStatus = "draft" | "published";
export type SubscriptionStatus = "active" | "canceled";
export type CartItemType = "subscription" | "ebook";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          name: string;
          bio: string;
          avatar_url: string | null;
          is_creator: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          name: string;
          bio?: string;
          avatar_url?: string | null;
          is_creator?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          name?: string;
          bio?: string;
          avatar_url?: string | null;
          is_creator?: boolean;
          updated_at?: string;
        };
      };
      creator_settings: {
        Row: {
          id: string;
          user_id: string;
          subscription_enabled: boolean;
          monthly_price: number;
          min_price: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subscription_enabled?: boolean;
          monthly_price?: number;
          min_price?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          subscription_enabled?: boolean;
          monthly_price?: number;
          min_price?: number;
          updated_at?: string;
        };
      };
      stories: {
        Row: {
          id: string;
          creator_id: string;
          title: string;
          description: string;
          cover_url: string | null;
          type: StoryType;
          status: ContentStatus;
          view_count: number;
          likes: number;
          genres: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          creator_id: string;
          title: string;
          description?: string;
          cover_url?: string | null;
          type: StoryType;
          status?: ContentStatus;
          view_count?: number;
          likes?: number;
          genres?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string;
          cover_url?: string | null;
          type?: StoryType;
          status?: ContentStatus;
          view_count?: number;
          likes?: number;
          genres?: string[];
          updated_at?: string;
        };
      };
      episodes: {
        Row: {
          id: string;
          story_id: string;
          number: number;
          name: string;
          is_free: boolean;
          thumbnail_url: string | null;
          media_url: string | null;
          status: ContentStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          story_id: string;
          number: number;
          name: string;
          is_free?: boolean;
          thumbnail_url?: string | null;
          media_url?: string | null;
          status?: ContentStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          number?: number;
          name?: string;
          is_free?: boolean;
          thumbnail_url?: string | null;
          media_url?: string | null;
          status?: ContentStatus;
          updated_at?: string;
        };
      };
      ebooks: {
        Row: {
          id: string;
          story_id: string;
          title: string;
          description: string;
          cover_url: string | null;
          price: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          story_id: string;
          title: string;
          description?: string;
          cover_url?: string | null;
          price: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string;
          cover_url?: string | null;
          price?: number;
          updated_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          creator_id: string;
          price: number;
          status: SubscriptionStatus;
          next_billing: string | null;
          created_at: string;
          canceled_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          creator_id: string;
          price: number;
          status?: SubscriptionStatus;
          next_billing?: string | null;
          created_at?: string;
          canceled_at?: string | null;
        };
        Update: {
          status?: SubscriptionStatus;
          next_billing?: string | null;
          canceled_at?: string | null;
        };
      };
      ebook_purchases: {
        Row: {
          id: string;
          user_id: string;
          ebook_id: string;
          price_paid: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          ebook_id: string;
          price_paid: number;
          created_at?: string;
        };
        Update: never;
      };
      cart_items: {
        Row: {
          id: string;
          user_id: string;
          item_type: CartItemType;
          creator_id: string | null;
          ebook_id: string | null;
          price: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          item_type: CartItemType;
          creator_id?: string | null;
          ebook_id?: string | null;
          price: number;
          created_at?: string;
        };
        Update: {
          price?: number;
        };
      };
    };
    Enums: {
      story_type: StoryType;
      content_status: ContentStatus;
      subscription_status: SubscriptionStatus;
      cart_item_type: CartItemType;
    };
  };
}

// Convenience type exports
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type CreatorSettings = Database["public"]["Tables"]["creator_settings"]["Row"];
export type CreatorSettingsInsert = Database["public"]["Tables"]["creator_settings"]["Insert"];
export type CreatorSettingsUpdate = Database["public"]["Tables"]["creator_settings"]["Update"];

export type Story = Database["public"]["Tables"]["stories"]["Row"];
export type StoryInsert = Database["public"]["Tables"]["stories"]["Insert"];
export type StoryUpdate = Database["public"]["Tables"]["stories"]["Update"];

export type Episode = Database["public"]["Tables"]["episodes"]["Row"];
export type EpisodeInsert = Database["public"]["Tables"]["episodes"]["Insert"];
export type EpisodeUpdate = Database["public"]["Tables"]["episodes"]["Update"];

export type Ebook = Database["public"]["Tables"]["ebooks"]["Row"];
export type EbookInsert = Database["public"]["Tables"]["ebooks"]["Insert"];
export type EbookUpdate = Database["public"]["Tables"]["ebooks"]["Update"];

export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
export type SubscriptionInsert = Database["public"]["Tables"]["subscriptions"]["Insert"];
export type SubscriptionUpdate = Database["public"]["Tables"]["subscriptions"]["Update"];

export type EbookPurchase = Database["public"]["Tables"]["ebook_purchases"]["Row"];
export type EbookPurchaseInsert = Database["public"]["Tables"]["ebook_purchases"]["Insert"];

export type CartItem = Database["public"]["Tables"]["cart_items"]["Row"];
export type CartItemInsert = Database["public"]["Tables"]["cart_items"]["Insert"];

// Extended types with relations
export interface StoryWithEpisodes extends Story {
  episodes: Episode[];
}

export interface StoryWithEbooks extends Story {
  ebooks: Ebook[];
}

export interface StoryFull extends Story {
  episodes: Episode[];
  ebooks: Ebook[];
  creator: Profile;
}

export interface CreatorWithSettings extends Profile {
  creator_settings: CreatorSettings | null;
}

export interface CreatorFull extends Profile {
  creator_settings: CreatorSettings | null;
  stories: StoryFull[];
}

export interface SubscriptionWithCreator extends Subscription {
  creator: Profile;
}

export interface EbookPurchaseWithEbook extends EbookPurchase {
  ebook: Ebook & { story: Story };
}

export interface CartItemWithDetails extends CartItem {
  creator?: Profile;
  ebook?: Ebook;
}
