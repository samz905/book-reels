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
  validateEnum,
} from "@/lib/api/helpers";
import { CartItemInsert, CartItemType } from "@/types/database";

// GET /api/cart - Get user's cart
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return unauthorizedResponse();
  }

  const supabase = await createClient();

  const { data: cartItems, error } = await supabase
    .from("cart_items")
    .select(`
      *,
      creator:profiles!cart_items_creator_id_fkey (
        id,
        username,
        name,
        avatar_url
      ),
      ebook:ebooks (
        id,
        title,
        cover_url,
        price
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return errorResponse(error.message, 500);
  }

  // Separate subscriptions and ebooks
  const subscriptions = (cartItems || []).filter((item) => item.item_type === "subscription");
  const ebooks = (cartItems || []).filter((item) => item.item_type === "ebook");

  return jsonResponse({
    items: cartItems || [],
    subscriptions,
    ebooks,
    totals: {
      subscriptions: subscriptions.reduce((sum, item) => sum + Number(item.price), 0),
      ebooks: ebooks.reduce((sum, item) => sum + Number(item.price), 0),
      total: (cartItems || []).reduce((sum, item) => sum + Number(item.price), 0),
    },
  });
}

// POST /api/cart - Add item to cart
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return unauthorizedResponse();
  }

  const body = await parseBody<{
    item_type: CartItemType;
    creator_id?: string;
    ebook_id?: string;
    price: number;
  }>(request);
  if (!body) {
    return errorResponse("Invalid request body");
  }

  const requiredError = validateRequired(body as Record<string, unknown>, ["item_type", "price"]);
  if (requiredError) {
    return errorResponse(requiredError);
  }

  const typeError = validateEnum(body.item_type, ["subscription", "ebook"], "item_type");
  if (typeError) {
    return errorResponse(typeError);
  }

  const supabase = await createClient();

  // Validate based on item type
  if (body.item_type === "subscription") {
    if (!body.creator_id) {
      return errorResponse("creator_id is required for subscription items");
    }
    const uuidError = validateUUID(body.creator_id, "creator_id");
    if (uuidError) {
      return errorResponse(uuidError);
    }

    // Check if creator exists
    const { data: creator } = await supabase
      .from("profiles")
      .select("id, is_creator")
      .eq("id", body.creator_id)
      .single();

    if (!creator || !creator.is_creator) {
      return errorResponse("Creator not found");
    }

    // Check if already in cart
    const { data: existing } = await supabase
      .from("cart_items")
      .select("id")
      .eq("user_id", user.id)
      .eq("item_type", "subscription")
      .eq("creator_id", body.creator_id)
      .single();

    if (existing) {
      return errorResponse("Creator subscription already in cart", 409);
    }

    // Check if already subscribed
    const { data: existingSubscription } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("creator_id", body.creator_id)
      .eq("status", "active")
      .single();

    if (existingSubscription) {
      return errorResponse("You are already subscribed to this creator", 409);
    }
  } else if (body.item_type === "ebook") {
    if (!body.ebook_id) {
      return errorResponse("ebook_id is required for ebook items");
    }
    const uuidError = validateUUID(body.ebook_id, "ebook_id");
    if (uuidError) {
      return errorResponse(uuidError);
    }

    // Check if ebook exists
    const { data: ebook } = await supabase
      .from("ebooks")
      .select("id")
      .eq("id", body.ebook_id)
      .single();

    if (!ebook) {
      return errorResponse("Ebook not found");
    }

    // Check if already in cart
    const { data: existing } = await supabase
      .from("cart_items")
      .select("id")
      .eq("user_id", user.id)
      .eq("item_type", "ebook")
      .eq("ebook_id", body.ebook_id)
      .single();

    if (existing) {
      return errorResponse("Ebook already in cart", 409);
    }

    // Check if already purchased
    const { data: existingPurchase } = await supabase
      .from("ebook_purchases")
      .select("id")
      .eq("user_id", user.id)
      .eq("ebook_id", body.ebook_id)
      .single();

    if (existingPurchase) {
      return errorResponse("You have already purchased this ebook", 409);
    }
  }

  const cartItemData: CartItemInsert = {
    user_id: user.id,
    item_type: body.item_type,
    creator_id: body.item_type === "subscription" ? body.creator_id : null,
    ebook_id: body.item_type === "ebook" ? body.ebook_id : null,
    price: body.price,
  };

  const { data: cartItem, error } = await supabase
    .from("cart_items")
    .insert(cartItemData)
    .select(`
      *,
      creator:profiles!cart_items_creator_id_fkey (
        id,
        username,
        name,
        avatar_url
      ),
      ebook:ebooks (
        id,
        title,
        cover_url,
        price
      )
    `)
    .single();

  if (error) {
    return errorResponse(error.message, 500);
  }

  return jsonResponse(cartItem, 201);
}
