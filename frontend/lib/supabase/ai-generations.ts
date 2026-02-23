import { createClient } from "./client";
import { deleteGenerationAssets } from "@/lib/storage/generation-assets";

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
  const { data: { user } } = await supabase.auth.getUser();
  const row: Record<string, unknown> = { id, title, style, state };
  if (storyId) row.story_id = storyId;
  if (user) row.user_id = user.id;
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
  // Delete Storage assets first (non-fatal if it fails)
  try { await deleteGenerationAssets(id); } catch (e) {
    console.error("deleteGenerationAssets error:", e);
  }

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

// ============================================================
// Generation Jobs (persistent status tracking)
// ============================================================

export interface GenJob {
  id: string;
  generation_id: string;
  job_type: string;
  target_id: string;
  status: "generating" | "completed" | "failed";
  result: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Check for completed (or failed) generation jobs for a given generation.
 * Called on restore to recover results from jobs that completed while
 * the client was disconnected.
 */
export async function getCompletedJobs(generationId: string): Promise<GenJob[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("gen_jobs")
    .select("*")
    .eq("generation_id", generationId)
    .in("status", ["completed", "failed"]);
  if (error) {
    console.error("getCompletedJobs error:", error);
    return [];
  }
  return data || [];
}

/**
 * Get in-flight (generating) gen_jobs for a generation.
 * Used on restore to re-show loaders for jobs still running on the backend.
 */
export async function getGeneratingJobs(generationId: string): Promise<GenJob[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("gen_jobs")
    .select("*")
    .eq("generation_id", generationId)
    .eq("status", "generating");
  if (error) {
    console.error("getGeneratingJobs error:", error);
    return [];
  }
  return data || [];
}

/**
 * Delete processed gen_jobs after their results have been applied.
 */
export async function clearGenJobs(generationId: string): Promise<void> {
  const supabase = getSupabase();
  await supabase
    .from("gen_jobs")
    .delete()
    .eq("generation_id", generationId)
    .in("status", ["completed", "failed"]);
}
