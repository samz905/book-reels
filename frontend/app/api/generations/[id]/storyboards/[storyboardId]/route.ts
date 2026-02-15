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
  validateUUID,
} from "@/lib/api/helpers";
import { EpisodeStoryboardUpdate } from "@/types/database";

interface RouteParams {
  params: Promise<{ id: string; storyboardId: string }>;
}

// PUT /api/generations/[id]/storyboards/[storyboardId] - Update storyboard
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id: generationId, storyboardId } = await params;
  if (!generationId) return errorResponse("generation id is required");

  const sbValidation = validateUUID(storyboardId, "storyboardId");
  if (sbValidation) return errorResponse(sbValidation);

  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const supabase = await createClient();

  const { data: gen } = await supabase
    .from("ai_generations")
    .select("id, user_id")
    .eq("id", generationId)
    .single();

  if (!gen) return notFoundResponse("Generation");
  if (gen.user_id !== user.id) return forbiddenResponse("You can only update your own storyboards");

  const { data: existing } = await supabase
    .from("episode_storyboards")
    .select("id")
    .eq("id", storyboardId)
    .eq("generation_id", generationId)
    .single();

  if (!existing) return notFoundResponse("Storyboard");

  const body = await parseBody<EpisodeStoryboardUpdate>(request);
  if (!body) return errorResponse("Invalid request body");

  const allowedFields: (keyof EpisodeStoryboardUpdate)[] = [
    "title", "visual_description", "status",
    "image_url", "image_base64", "image_mime_type",
    "prompt_used", "error_message",
  ];
  const updateData: EpisodeStoryboardUpdate = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      (updateData as Record<string, unknown>)[field] = body[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return errorResponse("No valid fields to update");
  }

  const { data: storyboard, error } = await supabase
    .from("episode_storyboards")
    .update(updateData)
    .eq("id", storyboardId)
    .select()
    .single();

  if (error) return errorResponse(error.message, 500);

  return jsonResponse(storyboard);
}

// DELETE /api/generations/[id]/storyboards/[storyboardId] - Delete storyboard
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id: generationId, storyboardId } = await params;
  if (!generationId) return errorResponse("generation id is required");

  const sbValidation = validateUUID(storyboardId, "storyboardId");
  if (sbValidation) return errorResponse(sbValidation);

  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const supabase = await createClient();

  const { data: gen } = await supabase
    .from("ai_generations")
    .select("id, user_id")
    .eq("id", generationId)
    .single();

  if (!gen) return notFoundResponse("Generation");
  if (gen.user_id !== user.id) return forbiddenResponse("You can only delete your own storyboards");

  const { error } = await supabase
    .from("episode_storyboards")
    .delete()
    .eq("id", storyboardId)
    .eq("generation_id", generationId);

  if (error) return errorResponse(error.message, 500);

  return jsonResponse({ success: true });
}
