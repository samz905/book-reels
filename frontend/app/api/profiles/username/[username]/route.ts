import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { jsonResponse, notFoundResponse, errorResponse } from "@/lib/api/helpers";

interface RouteParams {
  params: Promise<{ username: string }>;
}

// GET /api/profiles/username/[username] - Get profile by username with full creator data
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { username } = await params;

  if (!username || username.length < 1) {
    return errorResponse("Username is required");
  }

  const supabase = await createClient();

  // Get profile with creator settings
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(`
      *,
      creator_settings (*)
    `)
    .eq("username", username)
    .single();

  if (profileError || !profile) {
    return notFoundResponse("Creator");
  }

  // If this is a creator, also get their stories with episodes and ebooks
  if (profile.is_creator) {
    const { data: stories, error: storiesError } = await supabase
      .from("stories")
      .select(`
        *,
        episodes (*),
        ebooks (*)
      `)
      .eq("creator_id", profile.id)
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (storiesError) {
      return errorResponse(storiesError.message, 500);
    }

    // Sort episodes by number within each story
    const storiesWithSortedEpisodes = (stories || []).map((story) => ({
      ...story,
      episodes: (story.episodes || []).sort(
        (a: { number: number }, b: { number: number }) => a.number - b.number
      ),
    }));

    return jsonResponse({
      ...profile,
      stories: storiesWithSortedEpisodes,
    });
  }

  return jsonResponse(profile);
}
