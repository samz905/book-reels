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

// GET /api/profiles/[id]/stats - Get creator stats
export async function GET(request: NextRequest, { params }: RouteParams) {
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

  // Users can only view their own stats
  if (user.id !== id) {
    return forbiddenResponse("You can only view your own stats");
  }

  const supabase = await createClient();

  // Verify profile exists and is a creator
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, is_creator")
    .eq("id", id)
    .single();

  if (profileError || !profile) {
    return notFoundResponse("Profile");
  }

  if (!profile.is_creator) {
    return errorResponse("User is not a creator");
  }

  // Get active subscribers count
  const { count: activeSubscribers } = await supabase
    .from("subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("creator_id", id)
    .eq("status", "active");

  // Get total subscriptions revenue (lifetime)
  const { data: subscriptionRevenue } = await supabase
    .from("subscriptions")
    .select("price")
    .eq("creator_id", id);

  const subscriptionsTotal = (subscriptionRevenue || []).reduce(
    (sum, s) => sum + Number(s.price),
    0
  );

  // Get ebook purchases
  const { data: ebookPurchases } = await supabase
    .from("ebook_purchases")
    .select(`
      price_paid,
      ebook:ebooks!inner (
        story:stories!inner (
          creator_id
        )
      )
    `)
    .eq("ebook.story.creator_id", id);

  const ebooksTotal = (ebookPurchases || []).reduce(
    (sum, p) => sum + Number(p.price_paid),
    0
  );

  // Get this month's revenue
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: thisMonthSubscriptions } = await supabase
    .from("subscriptions")
    .select("price")
    .eq("creator_id", id)
    .gte("created_at", startOfMonth.toISOString());

  const thisMonthSubscriptionsTotal = (thisMonthSubscriptions || []).reduce(
    (sum, s) => sum + Number(s.price),
    0
  );

  const { data: thisMonthEbooks } = await supabase
    .from("ebook_purchases")
    .select(`
      price_paid,
      ebook:ebooks!inner (
        story:stories!inner (
          creator_id
        )
      )
    `)
    .eq("ebook.story.creator_id", id)
    .gte("created_at", startOfMonth.toISOString());

  const thisMonthEbooksTotal = (thisMonthEbooks || []).reduce(
    (sum, p) => sum + Number(p.price_paid),
    0
  );

  const stats = {
    thisMonth: thisMonthSubscriptionsTotal + thisMonthEbooksTotal,
    lifetime: subscriptionsTotal + ebooksTotal,
    subscriptions: subscriptionsTotal,
    ebooks: ebooksTotal,
    activeSubscribers: activeSubscribers || 0,
  };

  return jsonResponse(stats);
}
