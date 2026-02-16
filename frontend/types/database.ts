// Database types matching Supabase schema

export type StoryType = "video";
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
          media_url: string | null;
          generation_id: string | null;
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
          media_url?: string | null;
          generation_id?: string | null;
          status?: ContentStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          number?: number;
          name?: string;
          is_free?: boolean;
          media_url?: string | null;
          generation_id?: string | null;
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
          file_url: string | null;
          isbn: string | null;
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
          file_url?: string | null;
          isbn?: string | null;
          price: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string;
          cover_url?: string | null;
          file_url?: string | null;
          isbn?: string | null;
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
      ai_generations: {
        Row: {
          id: string;
          title: string;
          style: string;
          status: string;
          film_id: string | null;
          episode_id: string | null;
          thumbnail_base64: string | null;
          state: Record<string, unknown>;
          cost_total: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          title?: string;
          style?: string;
          status?: string;
          film_id?: string | null;
          episode_id?: string | null;
          thumbnail_base64?: string | null;
          state?: Record<string, unknown>;
          cost_total?: number;
        };
        Update: {
          title?: string;
          style?: string;
          status?: string;
          film_id?: string | null;
          episode_id?: string | null;
          thumbnail_base64?: string | null;
          state?: Record<string, unknown>;
          cost_total?: number;
        };
      };
      ai_film_jobs: {
        Row: {
          film_id: string;
          generation_id: string | null;
          status: string;
          total_shots: number;
          current_shot: number;
          phase: string;
          completed_shots: Array<{ number: number; preview_url: string; veo_prompt?: string }>;
          final_video_url: string | null;
          error_message: string | null;
          cost_scene_refs: number;
          cost_videos: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          film_id: string;
          generation_id?: string | null;
          status: string;
          total_shots: number;
          current_shot?: number;
          phase?: string;
          completed_shots?: Array<{ number: number; preview_url: string; veo_prompt?: string }>;
          final_video_url?: string | null;
          error_message?: string | null;
          cost_scene_refs?: number;
          cost_videos?: number;
        };
        Update: {
          status?: string;
          total_shots?: number;
          current_shot?: number;
          phase?: string;
          completed_shots?: Array<{ number: number; preview_url: string; veo_prompt?: string }>;
          final_video_url?: string | null;
          error_message?: string | null;
          cost_scene_refs?: number;
          cost_videos?: number;
        };
      };
      story_characters: {
        Row: {
          id: string;
          story_id: string;
          name: string;
          age: string;
          gender: string;
          description: string;
          role: string;
          visual_style: string | null;
          image_base64: string | null;
          image_url: string | null;
          image_mime_type: string;

          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          story_id: string;
          name: string;
          age?: string;
          gender?: string;
          description?: string;
          role?: string;
          visual_style?: string | null;
          image_base64?: string | null;
          image_url?: string | null;
          image_mime_type?: string;

        };
        Update: {
          name?: string;
          age?: string;
          gender?: string;
          description?: string;
          role?: string;
          visual_style?: string | null;
          image_base64?: string | null;
          image_url?: string | null;
          image_mime_type?: string;

        };
      };
      story_locations: {
        Row: {
          id: string;
          story_id: string;
          name: string;
          description: string;
          atmosphere: string;
          visual_style: string | null;
          image_base64: string | null;
          image_url: string | null;
          image_mime_type: string;

          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          story_id: string;
          name: string;
          description?: string;
          atmosphere?: string;
          visual_style?: string | null;
          image_base64?: string | null;
          image_url?: string | null;
          image_mime_type?: string;

        };
        Update: {
          name?: string;
          description?: string;
          atmosphere?: string;
          visual_style?: string | null;
          image_base64?: string | null;
          image_url?: string | null;
          image_mime_type?: string;

        };
      };
      episode_storyboards: {
        Row: {
          id: string;
          generation_id: string;
          scene_number: number;
          title: string;
          visual_description: string;
          status: string;
          image_url: string | null;
          image_base64: string | null;
          image_mime_type: string;
          prompt_used: string | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          generation_id: string;
          scene_number: number;
          title?: string;
          visual_description?: string;
          status?: string;
          image_url?: string | null;
          image_base64?: string | null;
          image_mime_type?: string;
          prompt_used?: string | null;
          error_message?: string | null;
        };
        Update: {
          title?: string;
          visual_description?: string;
          status?: string;
          image_url?: string | null;
          image_base64?: string | null;
          image_mime_type?: string;
          prompt_used?: string | null;
          error_message?: string | null;
        };
      };
      episode_clips: {
        Row: {
          id: string;
          generation_id: string;
          scene_number: number;
          status: string;
          video_url: string | null;
          veo_prompt: string | null;
          error_message: string | null;
          cost: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          generation_id: string;
          scene_number: number;
          status?: string;
          video_url?: string | null;
          veo_prompt?: string | null;
          error_message?: string | null;
          cost?: number;
        };
        Update: {
          status?: string;
          video_url?: string | null;
          veo_prompt?: string | null;
          error_message?: string | null;
          cost?: number;
        };
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

export type StoryCharacter = Database["public"]["Tables"]["story_characters"]["Row"];
export type StoryCharacterInsert = Database["public"]["Tables"]["story_characters"]["Insert"];
export type StoryCharacterUpdate = Database["public"]["Tables"]["story_characters"]["Update"];

export type StoryLocation = Database["public"]["Tables"]["story_locations"]["Row"];
export type StoryLocationInsert = Database["public"]["Tables"]["story_locations"]["Insert"];
export type StoryLocationUpdate = Database["public"]["Tables"]["story_locations"]["Update"];

export type EpisodeStoryboard = Database["public"]["Tables"]["episode_storyboards"]["Row"];
export type EpisodeStoryboardInsert = Database["public"]["Tables"]["episode_storyboards"]["Insert"];
export type EpisodeStoryboardUpdate = Database["public"]["Tables"]["episode_storyboards"]["Update"];

export type EpisodeClip = Database["public"]["Tables"]["episode_clips"]["Row"];
export type EpisodeClipInsert = Database["public"]["Tables"]["episode_clips"]["Insert"];
export type EpisodeClipUpdate = Database["public"]["Tables"]["episode_clips"]["Update"];

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
