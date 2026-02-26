"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getProfile,
  getMyStories,
  getCreatorSettings,
  getStoryCharacters,
  getStoryLocations,
  mapDbStoryToFrontend,
  mapDbSettingsToFrontend,
} from "@/lib/api/creator";
import { createClient } from "@/lib/supabase/client";
import type { AIGenerationSummary } from "@/lib/supabase/ai-generations";

// ============================================================
// Query Key Factory — centralized for cache invalidation
// ============================================================

export const queryKeys = {
  profile: (userId: string) => ["profile", userId] as const,
  stories: (userId: string) => ["stories", userId] as const,
  story: (storyId: string) => ["story", storyId] as const,
  storyCharacters: (storyId: string) => ["story-characters", storyId] as const,
  storyLocations: (storyId: string) => ["story-locations", storyId] as const,
  creatorSettings: () => ["creator-settings"] as const,
  generations: () => ["generations"] as const,
  storyGenerations: (storyId: string) => ["story-generations", storyId] as const,
};

// ============================================================
// Creator Dashboard hooks — used by /create
// ============================================================

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.profile(userId!),
    queryFn: () => getProfile(userId!),
    enabled: !!userId,
    staleTime: 2 * 60_000, // profiles rarely change
  });
}

export function useMyStories(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.stories(userId!),
    queryFn: () => getMyStories(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useCreatorSettings() {
  return useQuery({
    queryKey: queryKeys.creatorSettings(),
    queryFn: () => getCreatorSettings().then(mapDbSettingsToFrontend),
    staleTime: 2 * 60_000,
  });
}

// ============================================================
// Story Detail hooks — used by /create/[storyId]
// ============================================================

export function useStoryDetail(storyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.story(storyId!),
    queryFn: async () => {
      const res = await fetch(`/api/stories/${storyId}`, {
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 404) throw new Error("Story not found");
        throw new Error("Failed to load story");
      }
      const data = await res.json();
      return mapDbStoryToFrontend(data);
    },
    enabled: !!storyId,
    staleTime: 30_000,
  });
}

export function useStoryCharacters(storyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.storyCharacters(storyId!),
    queryFn: () => getStoryCharacters(storyId!),
    enabled: !!storyId,
    staleTime: 30_000,
  });
}

export function useStoryLocations(storyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.storyLocations(storyId!),
    queryFn: () => getStoryLocations(storyId!),
    enabled: !!storyId,
    staleTime: 30_000,
  });
}

// ============================================================
// Generations with Stories — used by /drafts
// ============================================================

export interface GenerationWithStory extends AIGenerationSummary {
  stories: { id: string; title: string; cover_url: string | null } | null;
  first_storyboard_url?: string | null;
}

// ============================================================
// Story-scoped Generations — used by /create/[storyId]
// ============================================================

export interface StoryGeneration {
  id: string;
  title: string;
  style: string;
  status: string;
  film_id: string | null;
  thumbnail_base64: string | null;
  created_at: string;
  updated_at: string;
  first_storyboard_url?: string | null;
}

export function useStoryGenerations(storyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.storyGenerations(storyId!),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("ai_generations")
        .select(
          `id, title, style, status, film_id,
           thumbnail_base64, created_at, updated_at`
        )
        .eq("story_id", storyId!)
        .neq("status", "published")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      const generations = (data || []) as StoryGeneration[];

      if (generations.length > 0) {
        const genIds = generations.map((g) => g.id);
        const { data: storyboards } = await supabase
          .from("episode_storyboards")
          .select("generation_id, image_url")
          .in("generation_id", genIds)
          .eq("scene_number", 1)
          .eq("status", "completed");
        if (storyboards) {
          const urlMap = new Map<string, string>();
          for (const sb of storyboards) {
            if (sb.image_url) urlMap.set(sb.generation_id, sb.image_url);
          }
          for (const gen of generations) {
            gen.first_storyboard_url = urlMap.get(gen.id) || null;
          }
        }
      }

      return generations;
    },
    enabled: !!storyId,
    staleTime: 15_000,
  });
}

export function useGenerationsWithStories() {
  return useQuery({
    queryKey: queryKeys.generations(),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("ai_generations")
        .select(
          `id, title, style, status, story_id, film_id,
           thumbnail_base64, cost_total, created_at, updated_at,
           stories:story_id ( id, title, cover_url )`
        )
        .neq("status", "published")
        .order("updated_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      const generations = (data || []) as unknown as GenerationWithStory[];

      // Batch-fetch first storyboard image (scene_number=1) for all generations
      if (generations.length > 0) {
        const genIds = generations.map((g) => g.id);
        const { data: storyboards } = await supabase
          .from("episode_storyboards")
          .select("generation_id, image_url")
          .in("generation_id", genIds)
          .eq("scene_number", 1)
          .eq("status", "completed");
        if (storyboards) {
          const urlMap = new Map<string, string>();
          for (const sb of storyboards) {
            if (sb.image_url) urlMap.set(sb.generation_id, sb.image_url);
          }
          for (const gen of generations) {
            gen.first_storyboard_url = urlMap.get(gen.id) || null;
          }
        }
      }

      return generations;
    },
    staleTime: 15_000, // drafts should feel fresh
  });
}
