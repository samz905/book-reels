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
    .select("*")
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

  const rows: EpisodeStoryboardInsert[] = body.map((row) => ({
    generation_id: generationId,
    scene_number: row.scene_number!,
    ...(row.title !== undefined && { title: row.title }),
    ...(row.visual_description !== undefined && { visual_description: row.visual_description }),
    ...(row.status !== undefined && { status: row.status }),
    ...(row.image_url !== undefined && { image_url: row.image_url }),
    ...(row.image_base64 !== undefined && { image_base64: row.image_base64 }),
    ...(row.image_mime_type !== undefined && { image_mime_type: row.image_mime_type }),
    ...(row.prompt_used !== undefined && { prompt_used: row.prompt_used }),
    ...(row.error_message !== undefined && { error_message: row.error_message }),
  }));

  const { data: storyboards, error } = await supabase
    .from("episode_storyboards")
    .upsert(rows, { onConflict: "generation_id,scene_number" })
    .select();

  if (error) return errorResponse(error.message, 500);

  return jsonResponse(storyboards || [], 201);
}
