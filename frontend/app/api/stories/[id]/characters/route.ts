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
  validateRequired,
} from "@/lib/api/helpers";
import { StoryCharacterInsert } from "@/types/database";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/stories/[id]/characters - List characters for a story
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: storyId } = await params;

  const validationError = validateUUID(storyId, "id");
  if (validationError) {
    return errorResponse(validationError);
  }

  const supabase = await createClient();

  const { data: story } = await supabase
    .from("stories")
    .select("id")
    .eq("id", storyId)
    .single();

  if (!story) {
    return notFoundResponse("Story");
  }

  const { data: characters, error } = await supabase
    .from("story_characters")
    .select("id, story_id, name, age, gender, description, role, visual_style, image_url, image_mime_type, created_at, updated_at")
    .eq("story_id", storyId)
    .order("created_at", { ascending: true });

  if (error) {
    return errorResponse(error.message, 500);
  }

  return jsonResponse(characters || []);
}

// POST /api/stories/[id]/characters - Create character
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: storyId } = await params;

  const validationError = validateUUID(storyId, "id");
  if (validationError) {
    return errorResponse(validationError);
  }

  const user = await getAuthUser(request);
  if (!user) {
    return unauthorizedResponse();
  }

  const supabase = await createClient();

  const { data: story } = await supabase
    .from("stories")
    .select("id, creator_id")
    .eq("id", storyId)
    .single();

  if (!story) {
    return notFoundResponse("Story");
  }

  if (story.creator_id !== user.id) {
    return forbiddenResponse("You can only add characters to your own stories");
  }

  const body = await parseBody<StoryCharacterInsert>(request);
  if (!body) {
    return errorResponse("Invalid request body");
  }

  const requiredError = validateRequired(body as Record<string, unknown>, ["name"]);
  if (requiredError) {
    return errorResponse(requiredError);
  }

  const characterData: StoryCharacterInsert = {
    story_id: storyId,
    name: body.name,
    age: body.age || "",
    gender: body.gender || "",
    description: body.description || "",
    role: body.role || "supporting",
    visual_style: body.visual_style || null,
    image_base64: null, // Never store base64 in DB — use image_url (Storage) only
    image_url: body.image_url || null,
    image_mime_type: body.image_mime_type || "image/png",
  };

  const { data: character, error } = await supabase
    .from("story_characters")
    .insert(characterData)
    .select("id, story_id, name, age, gender, description, role, visual_style, image_url, image_mime_type, created_at, updated_at")
    .single();

  if (error) {
    return errorResponse(error.message, 500);
  }

  return jsonResponse(character, 201);
}
