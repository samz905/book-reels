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
import { EbookPurchaseInsert } from "@/types/database";

// GET /api/purchases - Get user's ebook purchases
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return unauthorizedResponse();
  }

  const supabase = await createClient();

  const { data: purchases, error } = await supabase
    .from("ebook_purchases")
    .select(`
      *,
      ebook:ebooks (
        id,
        title,
        description,
        cover_url,
        price,
        story:stories (
          id,
          title,
          creator:profiles!creator_id (
            id,
            username,
            name
          )
        )
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return errorResponse(error.message, 500);
  }

  return jsonResponse(purchases || []);
}

// POST /api/purchases - Purchase ebook
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    return unauthorizedResponse();
  }

  const body = await parseBody<{ ebook_id: string }>(request);
  if (!body) {
    return errorResponse("Invalid request body");
  }

  const requiredError = validateRequired(body as Record<string, unknown>, ["ebook_id"]);
  if (requiredError) {
    return errorResponse(requiredError);
  }

  const uuidError = validateUUID(body.ebook_id, "ebook_id");
  if (uuidError) {
    return errorResponse(uuidError);
  }

  const supabase = await createClient();

  // Get ebook details
  const { data: ebook } = await supabase
    .from("ebooks")
    .select("id, price")
    .eq("id", body.ebook_id)
    .single();

  if (!ebook) {
    return errorResponse("Ebook not found");
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

  const purchaseData: EbookPurchaseInsert = {
    user_id: user.id,
    ebook_id: body.ebook_id,
    price_paid: ebook.price,
  };

  const { data: purchase, error } = await supabase
    .from("ebook_purchases")
    .insert(purchaseData)
    .select(`
      *,
      ebook:ebooks (
        id,
        title,
        description,
        cover_url,
        price,
        story:stories (
          id,
          title
        )
      )
    `)
    .single();

  if (error) {
    return errorResponse(error.message, 500);
  }

  return jsonResponse(purchase, 201);
}
