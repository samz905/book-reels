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

const EBOOKS_BUCKET = "ebooks";
const SIGNED_URL_EXPIRY = 3600; // 1 hour

// GET /api/ebooks/[id]/read - Get signed URL to read ebook
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

  // Get ebook with story info and check if user has purchased
  const { data: ebook, error: ebookError } = await supabase
    .from("ebooks")
    .select(`
      id,
      title,
      file_url,
      story:stories (
        id,
        title,
        creator_id
      )
    `)
    .eq("id", id)
    .single();

  if (ebookError || !ebook) {
    return notFoundResponse("Ebook");
  }

  // Handle Supabase returning story as array or single object
  const storyData = ebook.story;
  const story = Array.isArray(storyData) ? storyData[0] : storyData;

  if (!story) {
    return notFoundResponse("Ebook");
  }

  const creatorId = (story as { creator_id: string }).creator_id;
  const isCreator = creatorId === user.id;

  // Check if user has purchased this ebook (if not creator)
  let hasPurchased = false;
  if (!isCreator) {
    const { data: purchase } = await supabase
      .from("ebook_purchases")
      .select("id")
      .eq("user_id", user.id)
      .eq("ebook_id", id)
      .single();

    hasPurchased = !!purchase;
  }

  // Verify access
  if (!isCreator && !hasPurchased) {
    return forbiddenResponse("You must purchase this ebook to read it");
  }

  // Check if ebook has a file
  if (!ebook.file_url) {
    return errorResponse("This ebook does not have a file uploaded yet", 404);
  }

  // Generate signed URL for the EPUB file
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from(EBOOKS_BUCKET)
    .createSignedUrl(ebook.file_url, SIGNED_URL_EXPIRY);

  if (signedUrlError || !signedUrlData) {
    console.error("Failed to create signed URL:", signedUrlError);
    return errorResponse("Failed to generate read URL", 500);
  }

  return jsonResponse({
    url: signedUrlData.signedUrl,
    title: ebook.title,
    storyTitle: (story as { title: string }).title,
    expiresIn: SIGNED_URL_EXPIRY,
  });
}
