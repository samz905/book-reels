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

interface RouteParams {
  params: Promise<{ id: string; characterId: string; lookId: string }>;
}

// PUT /api/stories/[id]/characters/[characterId]/looks/[lookId] — set default
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id: storyId, characterId, lookId } = await params;

  for (const [val, name] of [[storyId, "id"], [characterId, "characterId"], [lookId, "lookId"]] as const) {
    const v = validateUUID(val, name);
    if (v) return errorResponse(v);
  }

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
    return forbiddenResponse("You can only update looks on your own characters");
  }

  // Verify look exists
  const { data: look } = await supabase
    .from("character_looks")
    .select("id, image_url, image_mime_type")
    .eq("id", lookId)
    .eq("character_id", characterId)
    .single();

  if (!look) return notFoundResponse("Look");

  const body = await parseBody<{ is_default?: boolean }>(request);

  if (body?.is_default) {
    // Unset all defaults for this character, then set chosen one
    await supabase
      .from("character_looks")
      .update({ is_default: false })
      .eq("character_id", characterId);

    await supabase
      .from("character_looks")
      .update({ is_default: true })
      .eq("id", lookId);

    // Update the parent character's image_url to match the new default
    await supabase
      .from("story_characters")
      .update({ image_url: look.image_url, image_mime_type: look.image_mime_type })
      .eq("id", characterId);
  }

  return jsonResponse({ success: true });
}

// DELETE /api/stories/[id]/characters/[characterId]/looks/[lookId]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id: storyId, characterId, lookId } = await params;

  for (const [val, name] of [[storyId, "id"], [characterId, "characterId"], [lookId, "lookId"]] as const) {
    const v = validateUUID(val, name);
    if (v) return errorResponse(v);
  }

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
    return forbiddenResponse("You can only delete looks from your own characters");
  }

  // Check if it's the default — don't allow deleting the default look
  const { data: look } = await supabase
    .from("character_looks")
    .select("id, is_default")
    .eq("id", lookId)
    .eq("character_id", characterId)
    .single();

  if (!look) return notFoundResponse("Look");
  if (look.is_default) {
    return errorResponse("Cannot delete the default look. Set another look as default first.", 400);
  }

  const { error } = await supabase
    .from("character_looks")
    .delete()
    .eq("id", lookId);

  if (error) return errorResponse(error.message, 500);

  return jsonResponse({ success: true });
}
