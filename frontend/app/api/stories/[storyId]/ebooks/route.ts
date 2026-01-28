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
import { EbookInsert } from "@/types/database";

interface RouteParams {
  params: Promise<{ storyId: string }>;
}

// GET /api/stories/[storyId]/ebooks - List ebooks for a story
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { storyId } = await params;

  const validationError = validateUUID(storyId, "storyId");
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

  const { data: ebooks, error } = await supabase
    .from("ebooks")
    .select("*")
    .eq("story_id", storyId)
    .order("created_at", { ascending: false });

  if (error) {
    return errorResponse(error.message, 500);
  }

  return jsonResponse(ebooks || []);
}

// POST /api/stories/[storyId]/ebooks - Create ebook
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { storyId } = await params;

  const validationError = validateUUID(storyId, "storyId");
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
    return forbiddenResponse("You can only add ebooks to your own stories");
  }

  // Parse body
  const body = await parseBody<EbookInsert>(request);
  if (!body) {
    return errorResponse("Invalid request body");
  }

  // Validate required fields
  const requiredError = validateRequired(body as Record<string, unknown>, ["title", "price"]);
  if (requiredError) {
    return errorResponse(requiredError);
  }

  if (typeof body.price !== "number" || body.price < 0) {
    return errorResponse("Price must be a positive number");
  }

  // Create ebook
  const ebookData: EbookInsert = {
    story_id: storyId,
    title: body.title,
    description: body.description || "",
    cover_url: body.cover_url || null,
    price: body.price,
  };

  const { data: ebook, error } = await supabase
    .from("ebooks")
    .insert(ebookData)
    .select()
    .single();

  if (error) {
    return errorResponse(error.message, 500);
  }

  return jsonResponse(ebook, 201);
}
