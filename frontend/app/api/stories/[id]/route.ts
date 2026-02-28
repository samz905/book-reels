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
import { StoryUpdate } from "@/types/database";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/stories/[id] - Get story by ID with episodes and ebooks
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const validationError = validateUUID(id);
  if (validationError) {
    return errorResponse(validationError);
  }

  const supabase = await createClient();

  const { data: story, error } = await supabase
    .from("stories")
    .select(`
      *,
      creator:profiles!creator_id (
        id,
        username,
        name,
        avatar_url,
        bio
      ),
      episodes (
        *
      ),
      ebooks (
        *
      )
    `)
    .eq("id", id)
    .single();

  if (error || !story) {
    return notFoundResponse("Story");
  }

  // Sort episodes by number
  if (story.episodes) {
    story.episodes.sort((a: { number: number }, b: { number: number }) => a.number - b.number);
  }

  return jsonResponse(story);
}

// PUT /api/stories/[id] - Update story
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

  // Verify ownership
  const { data: existingStory } = await supabase
    .from("stories")
    .select("creator_id")
    .eq("id", id)
    .single();

  if (!existingStory) {
    return notFoundResponse("Story");
  }

  if (existingStory.creator_id !== user.id) {
    return forbiddenResponse("You can only update your own stories");
  }

  // Parse body
  const body = await parseBody<StoryUpdate>(request);
  if (!body) {
    return errorResponse("Invalid request body");
  }

  // Filter allowed fields
  const allowedFields: (keyof StoryUpdate)[] = [
    "title",
    "description",
    "cover_url",
    "type",
    "status",
    "visual_style",
    "genres",
  ];
  const updateData: StoryUpdate = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      (updateData as Record<string, unknown>)[field] = body[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return errorResponse("No valid fields to update");
  }

  const { data: story, error } = await supabase
    .from("stories")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return errorResponse(error.message, 500);
  }

  return jsonResponse(story);
}

// DELETE /api/stories/[id] - Delete story
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

  // Verify ownership
  const { data: existingStory } = await supabase
    .from("stories")
    .select("creator_id")
    .eq("id", id)
    .single();

  if (!existingStory) {
    return notFoundResponse("Story");
  }

  if (existingStory.creator_id !== user.id) {
    return forbiddenResponse("You can only delete your own stories");
  }

  const { error } = await supabase.from("stories").delete().eq("id", id);

  if (error) {
    return errorResponse(error.message, 500);
  }

  return jsonResponse({ success: true });
}
