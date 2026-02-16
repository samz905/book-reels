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
import { EpisodeClipInsert } from "@/types/database";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/generations/[id]/clips - List clips for a generation
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
  if (gen.user_id !== user.id) return forbiddenResponse("You can only view your own clips");

  const { data: clips, error } = await supabase
    .from("episode_clips")
    .select("*")
    .eq("generation_id", generationId)
    .order("scene_number", { ascending: true });

  if (error) return errorResponse(error.message, 500);

  return jsonResponse(clips || []);
}

// POST /api/generations/[id]/clips - Bulk upsert clip rows
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
  if (gen.user_id !== user.id) return forbiddenResponse("You can only modify your own clips");

  const body = await parseBody<Array<Partial<EpisodeClipInsert>>>(request);
  if (!body || !Array.isArray(body) || body.length === 0) {
    return errorResponse("Request body must be a non-empty array");
  }

  const rows: EpisodeClipInsert[] = body.map((row) => ({
    generation_id: generationId,
    scene_number: row.scene_number!,
    ...(row.status !== undefined && { status: row.status }),
    ...(row.video_url !== undefined && { video_url: row.video_url }),
    ...(row.veo_prompt !== undefined && { veo_prompt: row.veo_prompt }),
    ...(row.error_message !== undefined && { error_message: row.error_message }),
    ...(row.cost !== undefined && { cost: row.cost }),
  }));

  const { data: clips, error } = await supabase
    .from("episode_clips")
    .upsert(rows, { onConflict: "generation_id,scene_number" })
    .select();

  if (error) return errorResponse(error.message, 500);

  return jsonResponse(clips || [], 201);
}
