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
import { StoryLocationUpdate } from "@/types/database";

interface RouteParams {
  params: Promise<{ id: string; locationId: string }>;
}

// PUT /api/stories/[id]/locations/[locationId] - Update location
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id: storyId, locationId } = await params;

  const storyValidation = validateUUID(storyId, "id");
  if (storyValidation) return errorResponse(storyValidation);

  const locValidation = validateUUID(locationId, "locationId");
  if (locValidation) return errorResponse(locValidation);

  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const supabase = await createClient();

  const { data: story } = await supabase
    .from("stories")
    .select("id, creator_id")
    .eq("id", storyId)
    .single();

  if (!story) return notFoundResponse("Story");
  if (story.creator_id !== user.id) {
    return forbiddenResponse("You can only update locations in your own stories");
  }

  const { data: existing } = await supabase
    .from("story_locations")
    .select("id")
    .eq("id", locationId)
    .eq("story_id", storyId)
    .single();

  if (!existing) return notFoundResponse("Location");

  const body = await parseBody<StoryLocationUpdate>(request);
  if (!body) return errorResponse("Invalid request body");

  const allowedFields: (keyof StoryLocationUpdate)[] = [
    "name", "description", "atmosphere",
    "visual_style", "image_url", "image_mime_type",
  ];
  const updateData: StoryLocationUpdate = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      (updateData as Record<string, unknown>)[field] = body[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return errorResponse("No valid fields to update");
  }

  const { data: location, error } = await supabase
    .from("story_locations")
    .update(updateData)
    .eq("id", locationId)
    .select("id, story_id, name, description, atmosphere, visual_style, image_url, image_mime_type, created_at, updated_at")
    .single();

  if (error) return errorResponse(error.message, 500);

  return jsonResponse(location);
}

// DELETE /api/stories/[id]/locations/[locationId] - Delete location
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id: storyId, locationId } = await params;

  const storyValidation = validateUUID(storyId, "id");
  if (storyValidation) return errorResponse(storyValidation);

  const locValidation = validateUUID(locationId, "locationId");
  if (locValidation) return errorResponse(locValidation);

  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const supabase = await createClient();

  const { data: story } = await supabase
    .from("stories")
    .select("id, creator_id")
    .eq("id", storyId)
    .single();

  if (!story) return notFoundResponse("Story");
  if (story.creator_id !== user.id) {
    return forbiddenResponse("You can only delete locations from your own stories");
  }

  const { error } = await supabase
    .from("story_locations")
    .delete()
    .eq("id", locationId)
    .eq("story_id", storyId);

  if (error) return errorResponse(error.message, 500);

  return jsonResponse({ success: true });
}
