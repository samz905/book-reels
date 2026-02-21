import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  jsonResponse,
  errorResponse,
  unauthorizedResponse,
  getAuthUser,
} from "@/lib/api/helpers";
import { getPostHogClient } from "@/lib/posthog-server";

// POST /api/cart/checkout - Process checkout
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return unauthorizedResponse();
  }

  const supabase = await createClient();

  // Get all cart items
  const { data: cartItems, error: cartError } = await supabase
    .from("cart_items")
    .select(`
      *,
      creator:profiles!cart_items_creator_id_fkey (
        id,
        username,
        name
      ),
      ebook:ebooks (
        id,
        title,
        price
      )
    `)
    .eq("user_id", user.id);

  if (cartError) {
    return errorResponse(cartError.message, 500);
  }

  if (!cartItems || cartItems.length === 0) {
    return errorResponse("Cart is empty");
  }

  const results = {
    subscriptions: [] as { id: string; creator_id: string; status: string }[],
    purchases: [] as { id: string; ebook_id: string; status: string }[],
    errors: [] as string[],
  };

  // Process each cart item
  for (const item of cartItems) {
    if (item.item_type === "subscription" && item.creator_id) {
      // Create subscription
      const nextBilling = new Date();
      nextBilling.setMonth(nextBilling.getMonth() + 1);

      const { data: subscription, error } = await supabase
        .from("subscriptions")
        .insert({
          user_id: user.id,
          creator_id: item.creator_id,
          price: item.price,
          status: "active",
          next_billing: nextBilling.toISOString(),
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          results.errors.push(`Already subscribed to ${item.creator?.name || "creator"}`);
        } else {
          results.errors.push(`Failed to subscribe to ${item.creator?.name || "creator"}: ${error.message}`);
        }
      } else if (subscription) {
        results.subscriptions.push({
          id: subscription.id,
          creator_id: item.creator_id,
          status: "success",
        });
      }
    } else if (item.item_type === "ebook" && item.ebook_id) {
      // Create ebook purchase
      const ebook = item.ebook as { id: string; price: number } | null;
      const { data: purchase, error } = await supabase
        .from("ebook_purchases")
        .insert({
          user_id: user.id,
          ebook_id: item.ebook_id,
          price_paid: ebook?.price || item.price,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          results.errors.push(`Already purchased ${item.ebook?.title || "ebook"}`);
        } else {
          results.errors.push(`Failed to purchase ${item.ebook?.title || "ebook"}: ${error.message}`);
        }
      } else if (purchase) {
        results.purchases.push({
          id: purchase.id,
          ebook_id: item.ebook_id,
          status: "success",
        });
      }
    }
  }

  // Clear the cart (even if some items failed)
  await supabase.from("cart_items").delete().eq("user_id", user.id);

  const totalProcessed = results.subscriptions.length + results.purchases.length;
  const totalErrors = results.errors.length;

  if (totalProcessed === 0 && totalErrors > 0) {
    return errorResponse(`Checkout failed: ${results.errors.join(", ")}`, 400);
  }

  // Track checkout completion server-side
  const posthog = getPostHogClient();
  posthog.capture({
    distinctId: user.id,
    event: "checkout_completed",
    properties: {
      subscriptions_count: results.subscriptions.length,
      ebooks_count: results.purchases.length,
      total_items: totalProcessed,
      has_errors: totalErrors > 0,
      error_count: totalErrors,
    },
  });

  return jsonResponse({
    success: true,
    message: `Checkout completed. ${totalProcessed} items processed.`,
    results,
    hasErrors: totalErrors > 0,
  });
}
