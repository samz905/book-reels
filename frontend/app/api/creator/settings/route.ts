import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  jsonResponse,
  errorResponse,
  notFoundResponse,
  unauthorizedResponse,
  getAuthUser,
  parseBody,
} from "@/lib/api/helpers";
import { CreatorSettingsUpdate } from "@/types/database";

// GET /api/creator/settings - Get creator settings
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return unauthorizedResponse();
  }

  const supabase = await createClient();

  // Check if user is a creator (return defaults if not - they can become one later)
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_creator")
    .eq("id", user.id)
    .single();

  // If not a creator yet, return default settings
  if (!profile?.is_creator) {
    return jsonResponse({
      id: null,
      user_id: user.id,
      subscription_enabled: false,
      monthly_price: 0,
      min_price: 4.99,
      created_at: null,
      updated_at: null,
    });
  }

  // Get settings
  const { data: settings, error } = await supabase
    .from("creator_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows returned
    return errorResponse(error.message, 500);
  }

  // Return settings or default values
  if (!settings) {
    return jsonResponse({
      id: null,
      user_id: user.id,
      subscription_enabled: false,
      monthly_price: 0,
      min_price: 0,
      created_at: null,
      updated_at: null,
    });
  }

  return jsonResponse(settings);
}

// PUT /api/creator/settings - Update creator settings
export async function PUT(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return unauthorizedResponse();
  }

  const supabase = await createClient();

  // Check if user is a creator (or make them one)
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_creator")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return notFoundResponse("Profile");
  }

  // If not a creator, upgrade them
  if (!profile.is_creator) {
    await supabase
      .from("profiles")
      .update({ is_creator: true })
      .eq("id", user.id);
  }

  // Parse body
  const body = await parseBody<CreatorSettingsUpdate>(request);
  if (!body) {
    return errorResponse("Invalid request body");
  }

  // Validate price fields
  if (body.monthly_price !== undefined && (typeof body.monthly_price !== "number" || body.monthly_price < 0)) {
    return errorResponse("monthly_price must be a positive number");
  }
  if (body.min_price !== undefined && (typeof body.min_price !== "number" || body.min_price < 0)) {
    return errorResponse("min_price must be a positive number");
  }

  // Check if settings exist
  const { data: existingSettings } = await supabase
    .from("creator_settings")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (existingSettings) {
    // Update existing settings
    const updateData: CreatorSettingsUpdate = {};
    if (body.subscription_enabled !== undefined) {
      updateData.subscription_enabled = body.subscription_enabled;
    }
    if (body.monthly_price !== undefined) {
      updateData.monthly_price = body.monthly_price;
    }
    if (body.min_price !== undefined) {
      updateData.min_price = body.min_price;
    }

    const { data: settings, error } = await supabase
      .from("creator_settings")
      .update(updateData)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return errorResponse(error.message, 500);
    }

    return jsonResponse(settings);
  } else {
    // Create new settings
    const { data: settings, error } = await supabase
      .from("creator_settings")
      .insert({
        user_id: user.id,
        subscription_enabled: body.subscription_enabled ?? false,
        monthly_price: body.monthly_price ?? 0,
        min_price: body.min_price ?? 0,
      })
      .select()
      .single();

    if (error) {
      return errorResponse(error.message, 500);
    }

    return jsonResponse(settings, 201);
  }
}
