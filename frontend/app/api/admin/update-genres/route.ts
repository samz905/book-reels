import { createServiceClient } from "@/lib/supabase/api";
import { jsonResponse, errorResponse } from "@/lib/api/helpers";

// POST /api/admin/update-genres - Update story genres based on titles
export async function POST() {
  try {
    const supabase = createServiceClient();

    // First, get all stories
    const { data: stories, error: fetchError } = await supabase
      .from("stories")
      .select("id, title, description");

    if (fetchError) {
      return errorResponse(fetchError.message, 500);
    }

    const updates: { id: string; genres: string[] }[] = [];

    for (const story of stories || []) {
      const title = story.title.toLowerCase();
      const desc = (story.description || "").toLowerCase();
      let genres: string[] = [];

      // Match based on title/description keywords
      if (title.includes("synthetic") || title.includes("dream") || desc.includes("2150") || desc.includes("upload") || desc.includes("ai")) {
        genres = ["SCI-FI"];
      } else if (title.includes("shadow") || title.includes("protocol") || desc.includes("spy") || desc.includes("agent")) {
        genres = ["THRILLER", "ACTION"];
      } else if (title.includes("midnight") || title.includes("whisper") || desc.includes("therapist") || desc.includes("psychological")) {
        genres = ["THRILLER", "MYSTERY"];
      } else if (title.includes("paris") || title.includes("letter") || desc.includes("love letter")) {
        genres = ["ROMANCE", "DRAMA"];
      } else if (title.includes("voice") || title.includes("journey") || desc.includes("journey")) {
        genres = ["DRAMA", "SLICE OF LIFE"];
      } else if (desc.includes("love") || desc.includes("romance") || desc.includes("heart")) {
        genres = ["ROMANCE"];
      } else if (desc.includes("fantasy") || desc.includes("magic") || desc.includes("dragon") || desc.includes("kingdom")) {
        genres = ["FANTASY"];
      } else if (desc.includes("horror") || desc.includes("scary") || desc.includes("ghost") || desc.includes("haunted")) {
        genres = ["HORROR"];
      } else if (desc.includes("funny") || desc.includes("comedy") || desc.includes("laugh")) {
        genres = ["COMEDY"];
      } else if (desc.includes("mystery") || desc.includes("detective") || desc.includes("solve")) {
        genres = ["MYSTERY"];
      } else if (desc.includes("action") || desc.includes("fight") || desc.includes("battle")) {
        genres = ["ACTION"];
      } else {
        genres = ["OTHER"];
      }

      updates.push({ id: story.id, genres });
    }

    // Update each story
    let successCount = 0;
    for (const update of updates) {
      const { error } = await supabase
        .from("stories")
        .update({ genres: update.genres })
        .eq("id", update.id);

      if (!error) {
        successCount++;
      }
    }

    return jsonResponse({
      message: `Updated ${successCount} of ${updates.length} stories with genres`,
      updates: updates.map(u => ({ id: u.id, genres: u.genres })),
    });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Unknown error", 500);
  }
}
