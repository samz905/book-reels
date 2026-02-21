import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  jsonResponse,
  errorResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  getAuthUser,
  validateUUID,
} from "@/lib/api/helpers";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/subscriptions/[id] - Get subscription by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const validationError = validateUUID(id);
  if (validationError) {
    return errorResponse(validationError);
  }

  const user = await getAuthUser(request);
  if (!user) {
    return unauthorizedResponse();
  }

  const supabase = await createClient();

  const { data: subscription, error } = await supabase
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
    .eq("id", id)
    .single();

  if (error || !subscription) {
    return notFoundResponse("Subscription");
  }

  // Only allow viewing own subscriptions
  if (subscription.user_id !== user.id && subscription.creator_id !== user.id) {
    return forbiddenResponse();
  }

  return jsonResponse(subscription);
}

// DELETE /api/subscriptions/[id] - Cancel subscription
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const validationError = validateUUID(id);
  if (validationError) {
    return errorResponse(validationError);
  }

  const user = await getAuthUser(request);
  if (!user) {
    return unauthorizedResponse();
  }

  const supabase = await createClient();

  // Verify subscription exists and belongs to user
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("id, user_id, status")
    .eq("id", id)
    .single();

  if (!subscription) {
    return notFoundResponse("Subscription");
  }

  if (subscription.user_id !== user.id) {
    return forbiddenResponse("You can only cancel your own subscriptions");
  }

  // If already canceled, hard-delete (remove from list)
  if (subscription.status === "canceled") {
    const { error: deleteError } = await supabase
      .from("subscriptions")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return errorResponse(deleteError.message, 500);
    }

    return jsonResponse({ deleted: true });
  }

  // Otherwise, soft-cancel (keep record but mark inactive)
  const { data: updated, error } = await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
      canceled_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return errorResponse(error.message, 500);
  }

  return jsonResponse(updated);
}
