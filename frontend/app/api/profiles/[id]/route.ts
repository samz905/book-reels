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
import { ProfileUpdate } from "@/types/database";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/profiles/[id] - Get profile by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  // Validate UUID
  const validationError = validateUUID(id);
  if (validationError) {
    return errorResponse(validationError);
  }

  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !profile) {
    return notFoundResponse("Profile");
  }

  return jsonResponse(profile);
}

// PUT /api/profiles/[id] - Update profile
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  // Validate UUID
  const validationError = validateUUID(id);
  if (validationError) {
    return errorResponse(validationError);
  }

  // Require authentication
  const user = await getAuthUser(request);
  if (!user) {
    return unauthorizedResponse();
  }

  // Users can only update their own profile
  if (user.id !== id) {
    return forbiddenResponse("You can only update your own profile");
  }

  // Parse body
  const body = await parseBody<ProfileUpdate>(request);
  if (!body) {
    return errorResponse("Invalid request body");
  }

  // Filter allowed fields
  const allowedFields: (keyof ProfileUpdate)[] = [
    "username",
    "name",
    "bio",
    "avatar_url",
    "is_creator",
  ];
  const updateData: ProfileUpdate = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      (updateData as Record<string, unknown>)[field] = body[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return errorResponse("No valid fields to update");
  }

  const supabase = await createClient();

  // First check if profile exists
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", id)
    .single();

  let profile;
  let error;

  if (existingProfile) {
    // Update existing profile
    const result = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();
    profile = result.data;
    error = result.error;
  } else {
    // Create new profile (upsert)
    const result = await supabase
      .from("profiles")
      .insert({
        id,
        username: updateData.username || `user-${id.slice(0, 8)}`,
        name: updateData.name || "New User",
        bio: updateData.bio || "",
        avatar_url: updateData.avatar_url || null,
        is_creator: updateData.is_creator || false,
      })
      .select()
      .single();
    profile = result.data;
    error = result.error;
  }

  if (error) {
    if (error.code === "23505") {
      return errorResponse("Username already taken", 409);
    }
    return errorResponse(error.message, 500);
  }

  return jsonResponse(profile);
}
