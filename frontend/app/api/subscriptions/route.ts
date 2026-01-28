import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  jsonResponse,
  errorResponse,
  unauthorizedResponse,
  getAuthUser,
  parseBody,
  validateRequired,
  validateUUID,
} from "@/lib/api/helpers";
import { SubscriptionInsert } from "@/types/database";

// GET /api/subscriptions - Get user's subscriptions
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return unauthorizedResponse();
  }

  const supabase = await createClient();

  const { data: subscriptions, error } = await supabase
    .from("subscriptions")
    .select(`
      *,
      creator:profiles!creator_id (
        id,
        username,
        name,
        avatar_url
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return errorResponse(error.message, 500);
  }

  return jsonResponse(subscriptions || []);
}

// POST /api/subscriptions - Subscribe to creator
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return unauthorizedResponse();
  }

  const body = await parseBody<{ creator_id: string; price: number }>(request);
  if (!body) {
    return errorResponse("Invalid request body");
  }

  const requiredError = validateRequired(body as Record<string, unknown>, ["creator_id", "price"]);
  if (requiredError) {
    return errorResponse(requiredError);
  }

  const uuidError = validateUUID(body.creator_id, "creator_id");
  if (uuidError) {
    return errorResponse(uuidError);
  }

  if (body.creator_id === user.id) {
    return errorResponse("You cannot subscribe to yourself");
  }

  const supabase = await createClient();

  // Verify creator exists and has subscriptions enabled
  const { data: creator } = await supabase
    .from("profiles")
    .select(`
      id,
      is_creator,
      creator_settings (
        subscription_enabled
      )
    `)
    .eq("id", body.creator_id)
    .single();

  if (!creator || !creator.is_creator) {
    return errorResponse("Creator not found");
  }

  const settings = creator.creator_settings as { subscription_enabled: boolean }[] | null;
  if (!settings?.[0]?.subscription_enabled) {
    return errorResponse("Creator does not have subscriptions enabled");
  }

  // Calculate next billing date (1 month from now)
  const nextBilling = new Date();
  nextBilling.setMonth(nextBilling.getMonth() + 1);

  const subscriptionData: SubscriptionInsert = {
    user_id: user.id,
    creator_id: body.creator_id,
    price: body.price,
    status: "active",
    next_billing: nextBilling.toISOString(),
  };

  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .insert(subscriptionData)
    .select(`
      *,
      creator:profiles!creator_id (
        id,
        username,
        name,
        avatar_url
      )
    `)
    .single();

  if (error) {
    if (error.code === "23505") {
      return errorResponse("You are already subscribed to this creator", 409);
    }
    return errorResponse(error.message, 500);
  }

  return jsonResponse(subscription, 201);
}
