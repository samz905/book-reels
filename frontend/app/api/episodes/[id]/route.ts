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
import { EpisodeUpdate } from "@/types/database";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/episodes/[id] - Get episode by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const validationError = validateUUID(id);
  if (validationError) {
    return errorResponse(validationError);
  }

  const supabase = await createClient();

  const { data: episode, error } = await supabase
    .from("episodes")
    .select(`
      *,
      story:stories (
        id,
        title,
        creator_id
      )
    `)
    .eq("id", id)
    .single();

  if (error || !episode) {
    return notFoundResponse("Episode");
  }

  return jsonResponse(episode);
}

// PUT /api/episodes/[id] - Update episode
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const validationError = validateUUID(id);
  if (validationError) {
    return errorResponse(validationError);
  }

  const user = await getAuthUser(request);
  if (!user) {
    return unauthorizedResponse();
  }

  const supabase = await createClient();

  // Get episode with story to verify ownership
  const { data: episode } = await supabase
    .from("episodes")
    .select(`
      id,
      story:stories (
        creator_id
      )
    `)
    .eq("id", id)
    .single();

  if (!episode) {
    return notFoundResponse("Episode");
  }

  // Handle Supabase returning story as array or single object
  const storyData = episode.story;
  const story = Array.isArray(storyData) ? storyData[0] : storyData;
  if (!story || (story as { creator_id: string }).creator_id !== user.id) {
    return forbiddenResponse("You can only update your own episodes");
  }

  // Parse body
  const body = await parseBody<EpisodeUpdate>(request);
  if (!body) {
    return errorResponse("Invalid request body");
  }

  // Filter allowed fields
  const allowedFields: (keyof EpisodeUpdate)[] = [
    "name",
    "is_free",
    "media_url",
    "status",
    "number",
  ];
  const updateData: EpisodeUpdate = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      (updateData as Record<string, unknown>)[field] = body[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return errorResponse("No valid fields to update");
  }

  const { data: updated, error } = await supabase
    .from("episodes")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return errorResponse(error.message, 500);
  }

  return jsonResponse(updated);
}

// DELETE /api/episodes/[id] - Delete episode
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const validationError = validateUUID(id);
  if (validationError) {
    return errorResponse(validationError);
  }

  const user = await getAuthUser(request);
  if (!user) {
    return unauthorizedResponse();
  }

  const supabase = await createClient();

  // Get episode with story to verify ownership
  const { data: episode } = await supabase
    .from("episodes")
    .select(`
      id,
      story:stories (
        creator_id
      )
    `)
    .eq("id", id)
    .single();

  if (!episode) {
    return notFoundResponse("Episode");
  }

  // Handle Supabase returning story as array or single object
  const storyData = episode.story;
  const story = Array.isArray(storyData) ? storyData[0] : storyData;
  if (!story || (story as { creator_id: string }).creator_id !== user.id) {
    return forbiddenResponse("You can only delete your own episodes");
  }

  const { error } = await supabase.from("episodes").delete().eq("id", id);

  if (error) {
    return errorResponse(error.message, 500);
  }

  return jsonResponse({ success: true });
}
