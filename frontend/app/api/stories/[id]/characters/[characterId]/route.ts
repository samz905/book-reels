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
import { StoryCharacterUpdate } from "@/types/database";

interface RouteParams {
  params: Promise<{ id: string; characterId: string }>;
}

// PUT /api/stories/[id]/characters/[characterId] - Update character
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id: storyId, characterId } = await params;

  const storyValidation = validateUUID(storyId, "id");
  if (storyValidation) return errorResponse(storyValidation);

  const charValidation = validateUUID(characterId, "characterId");
  if (charValidation) return errorResponse(charValidation);

  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const supabase = await createClient();

  // Verify story ownership
  const { data: story } = await supabase
    .from("stories")
    .select("id, creator_id")
    .eq("id", storyId)
    .single();

  if (!story) return notFoundResponse("Story");
  if (story.creator_id !== user.id) {
    return forbiddenResponse("You can only update characters in your own stories");
  }

  // Verify character exists and belongs to this story
  const { data: existing } = await supabase
    .from("story_characters")
    .select("id")
    .eq("id", characterId)
    .eq("story_id", storyId)
    .single();

  if (!existing) return notFoundResponse("Character");

  const body = await parseBody<StoryCharacterUpdate>(request);
  if (!body) return errorResponse("Invalid request body");

  const allowedFields: (keyof StoryCharacterUpdate)[] = [
    "name", "age", "gender", "description", "role",
    "visual_style", "image_url", "image_mime_type",
  ];
  const updateData: StoryCharacterUpdate = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      (updateData as Record<string, unknown>)[field] = body[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return errorResponse("No valid fields to update");
  }

  const { data: character, error } = await supabase
    .from("story_characters")
    .update(updateData)
    .eq("id", characterId)
    .select("id, story_id, name, age, gender, description, role, visual_style, image_url, image_mime_type, created_at, updated_at")
    .single();

  if (error) return errorResponse(error.message, 500);

  return jsonResponse(character);
}

// DELETE /api/stories/[id]/characters/[characterId] - Delete character
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id: storyId, characterId } = await params;

  const storyValidation = validateUUID(storyId, "id");
  if (storyValidation) return errorResponse(storyValidation);

  const charValidation = validateUUID(characterId, "characterId");
  if (charValidation) return errorResponse(charValidation);

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
    return forbiddenResponse("You can only delete characters from your own stories");
  }

  const { error } = await supabase
    .from("story_characters")
    .delete()
    .eq("id", characterId)
    .eq("story_id", storyId);

  if (error) return errorResponse(error.message, 500);

  return jsonResponse({ success: true });
}
