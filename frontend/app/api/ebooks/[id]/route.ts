import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  jsonResponse,
  errorResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  getAuthUser,
  parseBody,
  validateUUID,
} from "@/lib/api/helpers";
import { EbookUpdate } from "@/types/database";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/ebooks/[id] - Get ebook by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const validationError = validateUUID(id);
  if (validationError) {
    return errorResponse(validationError);
  }

  const supabase = await createClient();

  const { data: ebook, error } = await supabase
    .from("ebooks")
    .select(`
      *,
      story:stories (
        id,
        title,
        creator_id,
        creator:profiles!creator_id (
          id,
          username,
          name
        )
      )
    `)
    .eq("id", id)
    .single();

  if (error || !ebook) {
    return notFoundResponse("Ebook");
  }

  return jsonResponse(ebook);
}

// PUT /api/ebooks/[id] - Update ebook
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

  // Get ebook with story to verify ownership
  const { data: ebook } = await supabase
    .from("ebooks")
    .select(`
      id,
      story:stories (
        creator_id
      )
    `)
    .eq("id", id)
    .single();

  if (!ebook) {
    return notFoundResponse("Ebook");
  }

  // Handle Supabase returning story as array or single object
  const storyData = ebook.story;
  const story = Array.isArray(storyData) ? storyData[0] : storyData;
  if (!story || (story as { creator_id: string }).creator_id !== user.id) {
    return forbiddenResponse("You can only update your own ebooks");
  }

  // Parse body
  const body = await parseBody<EbookUpdate>(request);
  if (!body) {
    return errorResponse("Invalid request body");
  }

  // Filter allowed fields
  const allowedFields: (keyof EbookUpdate)[] = [
    "title",
    "description",
    "cover_url",
    "file_url",
    "isbn",
    "price",
  ];
  const updateData: EbookUpdate = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      (updateData as Record<string, unknown>)[field] = body[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return errorResponse("No valid fields to update");
  }

  // Validate price if provided
  if (updateData.price !== undefined && (typeof updateData.price !== "number" || updateData.price < 4.99)) {
    return errorResponse("Price must be at least $4.99");
  }

  const { data: updated, error } = await supabase
    .from("ebooks")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return errorResponse(error.message, 500);
  }

  return jsonResponse(updated);
}

// DELETE /api/ebooks/[id] - Delete ebook
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

  // Get ebook with story to verify ownership
  const { data: ebook } = await supabase
    .from("ebooks")
    .select(`
      id,
      story:stories (
        creator_id
      )
    `)
    .eq("id", id)
    .single();

  if (!ebook) {
    return notFoundResponse("Ebook");
  }

  // Handle Supabase returning story as array or single object
  const storyData = ebook.story;
  const story = Array.isArray(storyData) ? storyData[0] : storyData;
  if (!story || (story as { creator_id: string }).creator_id !== user.id) {
    return forbiddenResponse("You can only delete your own ebooks");
  }

  const { error } = await supabase.from("ebooks").delete().eq("id", id);

  if (error) {
    return errorResponse(error.message, 500);
  }

  return jsonResponse({ success: true });
}
