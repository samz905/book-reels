import { NextRequest, NextResponse } from "next/server";
import { createApiClient } from "@/lib/supabase/api";

// POST /api/ai-generations/[id]/save
// Used by sendBeacon on page unload — must be POST, fire-and-forget
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const supabase = createApiClient();
    const updates: Record<string, unknown> = {};

    if (body.title !== undefined) updates.title = body.title;
    if (body.status !== undefined) updates.status = body.status;
    if (body.state !== undefined) updates.state = body.state;
    if (body.film_id !== undefined) updates.film_id = body.film_id;
    if (body.thumbnail_base64 !== undefined) updates.thumbnail_base64 = body.thumbnail_base64;
    if (body.cost_total !== undefined) updates.cost_total = body.cost_total;

    if (Object.keys(updates).length > 0) {
      await supabase.from("ai_generations").update(updates).eq("id", id);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
