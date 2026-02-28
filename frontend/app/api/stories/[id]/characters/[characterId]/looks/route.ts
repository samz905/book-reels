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
import { CharacterLookInsert } from "@/types/database";

const MAX_LOOKS = 10;

interface RouteParams {
  params: Promise<{ id: string; characterId: string }>;
}

// GET /api/stories/[id]/characters/[characterId]/looks
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: storyId, characterId } = await params;

  const storyValidation = validateUUID(storyId, "id");
  if (storyValidation) return errorResponse(storyValidation);
  const charValidation = validateUUID(characterId, "characterId");
  if (charValidation) return errorResponse(charValidation);

  const supabase = await createClient();

  const { data: looks, error } = await supabase
    .from("character_looks")
    .select("*")
    .eq("story_id", storyId)
    .eq("character_id", characterId)
    .order("sort_order", { ascending: true });

  if (error) return errorResponse(error.message, 500);

  return jsonResponse(looks || []);
}

// POST /api/stories/[id]/characters/[characterId]/looks
export async function POST(request: NextRequest, { params }: RouteParams) {
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
    return forbiddenResponse("You can only add looks to your own characters");
  }

  // Verify character exists
  const { data: character } = await supabase
    .from("story_characters")
    .select("id")
    .eq("id", characterId)
    .eq("story_id", storyId)
    .single();

  if (!character) return notFoundResponse("Character");

  // Check max looks
  const { count } = await supabase
    .from("character_looks")
    .select("id", { count: "exact", head: true })
    .eq("character_id", characterId);

  if ((count || 0) >= MAX_LOOKS) {
    return errorResponse(`Maximum ${MAX_LOOKS} looks per character`, 400);
  }

  const body = await parseBody<CharacterLookInsert>(request);
  if (!body || !body.image_url) {
    return errorResponse("image_url is required");
  }

  // If this is the first look, make it default
  const isFirst = (count || 0) === 0;

  const lookData: CharacterLookInsert = {
    character_id: characterId,
    story_id: storyId,
    image_url: body.image_url,
    image_mime_type: body.image_mime_type || "image/png",
    is_default: body.is_default ?? isFirst,
    sort_order: (count || 0),
  };

  const { data: look, error } = await supabase
    .from("character_looks")
    .insert(lookData)
    .select("*")
    .single();

  if (error) return errorResponse(error.message, 500);

  return jsonResponse(look, 201);
}
