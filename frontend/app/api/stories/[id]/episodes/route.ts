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
import { EpisodeInsert } from "@/types/database";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/stories/[id]/episodes - List episodes for a story
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: storyId } = await params;

  const validationError = validateUUID(storyId, "id");
  if (validationError) {
    return errorResponse(validationError);
  }

  const supabase = await createClient();

  // Verify story exists
  const { data: story } = await supabase
    .from("stories")
    .select("id")
    .eq("id", storyId)
    .single();

  if (!story) {
    return notFoundResponse("Story");
  }

  const { data: episodes, error } = await supabase
    .from("episodes")
    .select("*")
    .eq("story_id", storyId)
    .order("number", { ascending: true });

  if (error) {
    return errorResponse(error.message, 500);
  }

  return jsonResponse(episodes || []);
}

// POST /api/stories/[id]/episodes - Create episode
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

  // Verify story exists and user owns it
  const { data: story } = await supabase
    .from("stories")
    .select("id, creator_id")
    .eq("id", storyId)
    .single();

  if (!story) {
    return notFoundResponse("Story");
  }

  if (story.creator_id !== user.id) {
    return forbiddenResponse("You can only add episodes to your own stories");
  }

  // Parse body
  const body = await parseBody<EpisodeInsert>(request);
  if (!body) {
    return errorResponse("Invalid request body");
  }

  // Validate required fields
  const requiredError = validateRequired(body as Record<string, unknown>, ["name"]);
  if (requiredError) {
    return errorResponse(requiredError);
  }

  // Get next episode number
  const { data: lastEpisode } = await supabase
    .from("episodes")
    .select("number")
    .eq("story_id", storyId)
    .order("number", { ascending: false })
    .limit(1)
    .single();

  const nextNumber = body.number || (lastEpisode ? lastEpisode.number + 1 : 1);

  // Create episode
  const episodeData: EpisodeInsert = {
    story_id: storyId,
    number: nextNumber,
    name: body.name,
    is_free: body.is_free ?? false,
    thumbnail_url: body.thumbnail_url || null,
    media_url: body.media_url || null,
    status: body.status || "draft",
  };

  const { data: episode, error } = await supabase
    .from("episodes")
    .insert(episodeData)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return errorResponse("Episode number already exists for this story", 409);
    }
    return errorResponse(error.message, 500);
  }

  return jsonResponse(episode, 201);
}
