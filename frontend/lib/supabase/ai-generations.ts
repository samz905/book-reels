import { createClient } from "./client";

// ============================================================
// Types
// ============================================================

export interface AIGenerationSummary {
  id: string;
  title: string;
  style: string;
  status: string;
  story_id: string | null;
  film_id: string | null;
  thumbnail_base64: string | null;
  cost_total: number;
  created_at: string;
  updated_at: string;
}

export interface AIFilmJob {
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
}

export interface AIGenerationFull extends AIGenerationSummary {
  state: Record<string, unknown>;
  film_job?: AIFilmJob | null;
}

// ============================================================
// CRUD
// ============================================================

function getSupabase() {
  return createClient();
}

export async function createGeneration(
  id: string,
  title: string,
  style: string,
  state: Record<string, unknown> = {},
  storyId?: string | null
): Promise<AIGenerationSummary | null> {
  const supabase = getSupabase();
  const row: Record<string, unknown> = { id, title, style, state };
  if (storyId) row.story_id = storyId;
  const { data, error } = await supabase
    .from("ai_generations")
    .insert(row)
    .select("id, title, style, status, story_id, film_id, thumbnail_base64, cost_total, created_at, updated_at")
    .single();
  if (error) {
    console.error("createGeneration error:", error);
    return null;
  }
  return data;
}

export async function updateGeneration(
  id: string,
  updates: {
    title?: string;
    style?: string;
    status?: string;
    film_id?: string | null;
    thumbnail_base64?: string | null;
    state?: Record<string, unknown>;
    cost_total?: number;
  }
): Promise<boolean> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("ai_generations")
    .update(updates)
    .eq("id", id);
  if (error) {
    console.error("updateGeneration error:", error);
    return false;
  }
  return true;
}

export async function getGeneration(id: string): Promise<AIGenerationFull | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("ai_generations")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;

  // Fetch linked film job if one exists
  let film_job: AIFilmJob | null = null;
  if (data.film_id) {
    const { data: fj } = await supabase
      .from("ai_film_jobs")
      .select("*")
      .eq("film_id", data.film_id)
      .single();
    film_job = fj;
  }

  return { ...data, film_job };
}

export async function listGenerations(limit = 50): Promise<AIGenerationSummary[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("ai_generations")
    .select("id, title, style, status, story_id, film_id, thumbnail_base64, cost_total, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("listGenerations error:", error);
    return [];
  }
  return data || [];
}

export async function deleteGeneration(id: string): Promise<boolean> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("ai_generations")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("deleteGeneration error:", error);
    return false;
  }
  return true;
}

// ============================================================
// Film Jobs
// ============================================================

export async function upsertFilmJob(
  job: Omit<AIFilmJob, "created_at" | "updated_at">
): Promise<boolean> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("ai_film_jobs")
    .upsert(job, { onConflict: "film_id" });
  if (error) {
    console.error("upsertFilmJob error:", error);
    return false;
  }
  return true;
}

export async function getFilmJob(filmId: string): Promise<AIFilmJob | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("ai_film_jobs")
    .select("*")
    .eq("film_id", filmId)
    .single();
  if (error) return null;
  return data;
}
