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

// DELETE /api/cart/[id] - Remove item from cart
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

  // Verify cart item exists and belongs to user
  const { data: cartItem } = await supabase
    .from("cart_items")
    .select("id, user_id")
    .eq("id", id)
    .single();

  if (!cartItem) {
    return notFoundResponse("Cart item");
  }

  if (cartItem.user_id !== user.id) {
    return forbiddenResponse("You can only remove items from your own cart");
  }

  const { error } = await supabase.from("cart_items").delete().eq("id", id);

  if (error) {
    return errorResponse(error.message, 500);
  }

  return jsonResponse({ success: true });
}
