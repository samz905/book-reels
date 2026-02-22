import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  jsonResponse,
  errorResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  getAuthUser,
  parseBody,
} from "@/lib/api/helpers";
import { EpisodeStoryboardInsert } from "@/types/database";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/generations/[id]/storyboards - List storyboards for a generation
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: generationId } = await params;
  if (!generationId) return errorResponse("generation id is required");

  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const supabase = await createClient();

  const { data: gen } = await supabase
    .from("ai_generations")
    .select("id, user_id")
    .eq("id", generationId)
    .single();

  if (!gen) return notFoundResponse("Generation");
  if (gen.user_id !== user.id) return forbiddenResponse("You can only view your own storyboards");

  const { data: storyboards, error } = await supabase
    .from("episode_storyboards")
    .select("id, generation_id, scene_number, title, visual_description, status, image_url, image_mime_type, prompt_used, error_message, created_at, updated_at")
    .eq("generation_id", generationId)
    .order("scene_number", { ascending: true });

  if (error) return errorResponse(error.message, 500);

  return jsonResponse(storyboards || []);
}

// POST /api/generations/[id]/storyboards - Bulk upsert storyboard rows
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: generationId } = await params;
  if (!generationId) return errorResponse("generation id is required");

  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const supabase = await createClient();

  const { data: gen } = await supabase
    .from("ai_generations")
    .select("id, user_id")
    .eq("id", generationId)
    .single();

  if (!gen) return notFoundResponse("Generation");
  if (gen.user_id !== user.id) return forbiddenResponse("You can only modify your own storyboards");

  const body = await parseBody<Array<Partial<EpisodeStoryboardInsert>>>(request);
  if (!body || !Array.isArray(body) || body.length === 0) {
    return errorResponse("Request body must be a non-empty array");
  }

  // Fetch existing storyboards to preserve fields not being updated
  const { data: existing } = await supabase
    .from("episode_storyboards")
    .select("scene_number, title, visual_description, status, image_url, image_mime_type, prompt_used, error_message")
    .eq("generation_id", generationId)
    .in("scene_number", body.map(r => r.scene_number!));

  const existingMap = new Map(existing?.map(e => [e.scene_number, e]) || []);

  const rows: EpisodeStoryboardInsert[] = body.map((row) => {
    const existingRow = existingMap.get(row.scene_number!);
    return {
      generation_id: generationId,
      scene_number: row.scene_number!,
      // Merge with existing values to preserve fields not being updated
      title: row.title !== undefined ? row.title : (existingRow?.title || ""),
      visual_description: row.visual_description !== undefined ? row.visual_description : (existingRow?.visual_description || ""),
      status: row.status !== undefined ? row.status : (existingRow?.status || "pending"),
      image_url: row.image_url !== undefined ? row.image_url : (existingRow?.image_url || null),
      image_base64: null, // Never store base64 in DB — use image_url (Storage) only
      image_mime_type: row.image_mime_type !== undefined ? row.image_mime_type : (existingRow?.image_mime_type || null),
      prompt_used: row.prompt_used !== undefined ? row.prompt_used : (existingRow?.prompt_used || null),
      error_message: row.error_message !== undefined ? row.error_message : (existingRow?.error_message || null),
    };
  });

  const { data: storyboards, error } = await supabase
    .from("episode_storyboards")
    .upsert(rows, { onConflict: "generation_id,scene_number" })
    .select("id, generation_id, scene_number, title, visual_description, status, image_url, image_mime_type, prompt_used, error_message, created_at, updated_at");

  if (error) return errorResponse(error.message, 500);

  return jsonResponse(storyboards || [], 201);
}
