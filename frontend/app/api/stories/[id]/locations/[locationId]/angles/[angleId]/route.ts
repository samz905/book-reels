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
  params: Promise<{ id: string; locationId: string; angleId: string }>;
}

// PUT /api/stories/[id]/locations/[locationId]/angles/[angleId] — set default
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id: storyId, locationId, angleId } = await params;

  for (const [val, name] of [[storyId, "id"], [locationId, "locationId"], [angleId, "angleId"]] as const) {
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
    return forbiddenResponse("You can only update angles on your own locations");
  }

  const { data: angle } = await supabase
    .from("location_angles")
    .select("id, image_url, image_mime_type")
    .eq("id", angleId)
    .eq("location_id", locationId)
    .single();

  if (!angle) return notFoundResponse("Angle");

  const body = await parseBody<{ is_default?: boolean }>(request);

  if (body?.is_default) {
    await supabase
      .from("location_angles")
      .update({ is_default: false })
      .eq("location_id", locationId);

    await supabase
      .from("location_angles")
      .update({ is_default: true })
      .eq("id", angleId);

    // Update parent location's image_url to match the new default
    await supabase
      .from("story_locations")
      .update({ image_url: angle.image_url, image_mime_type: angle.image_mime_type })
      .eq("id", locationId);
  }

  return jsonResponse({ success: true });
}

// DELETE /api/stories/[id]/locations/[locationId]/angles/[angleId]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id: storyId, locationId, angleId } = await params;

  for (const [val, name] of [[storyId, "id"], [locationId, "locationId"], [angleId, "angleId"]] as const) {
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
    return forbiddenResponse("You can only delete angles from your own locations");
  }

  const { data: angle } = await supabase
    .from("location_angles")
    .select("id, is_default")
    .eq("id", angleId)
    .eq("location_id", locationId)
    .single();

  if (!angle) return notFoundResponse("Angle");
  if (angle.is_default) {
    return errorResponse("Cannot delete the default angle. Set another angle as default first.", 400);
  }

  const { error } = await supabase
    .from("location_angles")
    .delete()
    .eq("id", angleId);

  if (error) return errorResponse(error.message, 500);

  return jsonResponse({ success: true });
}
