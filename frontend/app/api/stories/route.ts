import { NextRequest } from "next/server";
import { createApiClient, createServiceClient } from "@/lib/supabase/api";
import { createClient } from "@/lib/supabase/server";
import {
  jsonResponse,
  errorResponse,
  unauthorizedResponse,
  getAuthUser,
  parseBody,
  getPaginationParams,
  paginatedResponse,
  validateRequired,
  validateEnum,
} from "@/lib/api/helpers";
import { StoryInsert, StoryType } from "@/types/database";

// GET /api/stories - List stories with filters
export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return errorResponse("Supabase configuration missing", 500);
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const type = searchParams.get("type") as StoryType | null;
    const creatorId = searchParams.get("creator_id");
    const status = searchParams.get("status") || "published";
    const include = searchParams.get("include")?.split(",") || [];

    const { page, limit, offset } = getPaginationParams(request);

    // Use service client when fetching creator's own stories (includes drafts)
    // Otherwise use anon client for public stories only
    const needsServiceClient = creatorId && status === "all";
    const supabase = needsServiceClient ? createServiceClient() : createApiClient();

    // Build select — include related tables if requested (avoids N+1)
    let selectParts = `*, creator:profiles!creator_id ( id, username, name, avatar_url )`;
    if (include.includes("episodes")) selectParts += `, episodes ( * )`;
    if (include.includes("ebooks")) selectParts += `, ebooks ( * )`;

    // Build query
    let query = supabase
      .from("stories")
      .select(selectParts, { count: "exact" });

    // Only filter by status if not "all"
    if (status !== "all") {
      query = query.eq("status", status);
    }

    // Apply filters
    if (type && type === "video") {
      query = query.eq("type", type);
    }

    if (creatorId) {
      query = query.eq("creator_id", creatorId);
    }

    if (category && category !== "ALL") {
      // Search in genres array (case-insensitive)
      query = query.contains("genres", [category]);
    }

    // Apply pagination and ordering
    query = query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: stories, error, count } = await query;

    if (error) {
      return errorResponse(error.message, 500);
    }

    return jsonResponse(paginatedResponse(stories || [], count || 0, { page, limit, offset }));
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Unknown error", 500);
  }
}

// POST /api/stories - Create story
export async function POST(request: NextRequest) {
  // Require authentication
  const user = await getAuthUser(request);
  if (!user) {
    return unauthorizedResponse();
  }

  // Parse body
  const body = await parseBody<StoryInsert>(request);
  if (!body) {
    return errorResponse("Invalid request body");
  }

  // Validate required fields
  const requiredError = validateRequired(body as Record<string, unknown>, ["title", "type"]);
  if (requiredError) {
    return errorResponse(requiredError);
  }

  // Validate type enum
  const typeError = validateEnum(body.type, ["video"], "type");
  if (typeError) {
    return errorResponse(typeError);
  }

  // Use service client for mutations (bypasses RLS since we've verified auth)
  const supabase = createServiceClient();

  // Verify user is a creator and auto-upgrade if needed
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_creator")
    .eq("id", user.id)
    .single();

  if (!profile?.is_creator) {
    // Auto-upgrade to creator
    await supabase
      .from("profiles")
      .update({ is_creator: true })
      .eq("id", user.id);
  }

  // Create story
  const storyData: StoryInsert = {
    creator_id: user.id,
    title: body.title,
    description: body.description || "",
    cover_url: body.cover_url || null,
    type: body.type,
    status: body.status || "draft",
    genres: body.genres || [],
  };

  const { data: story, error } = await supabase
    .from("stories")
    .insert(storyData)
    .select()
    .single();

  if (error) {
    return errorResponse(error.message, 500);
  }

  return jsonResponse(story, 201);
}
