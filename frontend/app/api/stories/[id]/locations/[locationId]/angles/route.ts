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
import { LocationAngleInsert } from "@/types/database";

const MAX_ANGLES = 10;

interface RouteParams {
  params: Promise<{ id: string; locationId: string }>;
}

// GET /api/stories/[id]/locations/[locationId]/angles
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: storyId, locationId } = await params;

  const storyValidation = validateUUID(storyId, "id");
  if (storyValidation) return errorResponse(storyValidation);
  const locValidation = validateUUID(locationId, "locationId");
  if (locValidation) return errorResponse(locValidation);

  const supabase = await createClient();

  const { data: angles, error } = await supabase
    .from("location_angles")
    .select("*")
    .eq("story_id", storyId)
    .eq("location_id", locationId)
    .order("sort_order", { ascending: true });

  if (error) return errorResponse(error.message, 500);

  return jsonResponse(angles || []);
}

// POST /api/stories/[id]/locations/[locationId]/angles
export async function POST(request: NextRequest, { params }: RouteParams) {
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
    return forbiddenResponse("You can only add angles to your own locations");
  }

  const { data: location } = await supabase
    .from("story_locations")
    .select("id")
    .eq("id", locationId)
    .eq("story_id", storyId)
    .single();

  if (!location) return notFoundResponse("Location");

  const { count } = await supabase
    .from("location_angles")
    .select("id", { count: "exact", head: true })
    .eq("location_id", locationId);

  if ((count || 0) >= MAX_ANGLES) {
    return errorResponse(`Maximum ${MAX_ANGLES} angles per location`, 400);
  }

  const body = await parseBody<LocationAngleInsert>(request);
  if (!body || !body.image_url) {
    return errorResponse("image_url is required");
  }

  const isFirst = (count || 0) === 0;

  const angleData: LocationAngleInsert = {
    location_id: locationId,
    story_id: storyId,
    image_url: body.image_url,
    image_mime_type: body.image_mime_type || "image/png",
    is_default: body.is_default ?? isFirst,
    sort_order: (count || 0),
  };

  const { data: angle, error } = await supabase
    .from("location_angles")
    .insert(angleData)
    .select("*")
    .single();

  if (error) return errorResponse(error.message, 500);

  return jsonResponse(angle, 201);
}
