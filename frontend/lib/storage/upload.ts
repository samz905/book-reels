import { createClient } from "@/lib/supabase/client";

const EBOOKS_BUCKET = "ebooks";
const MAX_EPUB_SIZE = 50 * 1024 * 1024; // 50MB

export interface UploadResult {
  path: string;
  fullPath: string;
}

export class UploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadError";
  }
}

/**
 * Validates an EPUB file before upload
 */
export function validateEpubFile(file: File): void {
  // Check file type
  const validTypes = ["application/epub+zip"];
  const validExtensions = [".epub"];

  const hasValidType = validTypes.includes(file.type);
  const hasValidExtension = validExtensions.some(ext =>
    file.name.toLowerCase().endsWith(ext)
  );

  if (!hasValidType && !hasValidExtension) {
    throw new UploadError("Invalid file type. Please select an EPUB file.");
  }

  // Check file size
  if (file.size > MAX_EPUB_SIZE) {
    throw new UploadError(`File too large. Maximum size is ${MAX_EPUB_SIZE / (1024 * 1024)}MB.`);
  }

  if (file.size === 0) {
    throw new UploadError("File is empty.");
  }
}

/**
 * Uploads an EPUB file to Supabase Storage
 * @param file The EPUB file to upload
 * @param storyId The story ID (used for organizing files)
 * @returns The storage path of the uploaded file
 */
export async function uploadEpubFile(
  file: File,
  storyId: string
): Promise<UploadResult> {
  validateEpubFile(file);

  const supabase = createClient();
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const filePath = `${storyId}/${timestamp}-${sanitizedName}`;

  const { data, error } = await supabase.storage
    .from(EBOOKS_BUCKET)
    .upload(filePath, file, {
      contentType: "application/epub+zip",
      upsert: false,
    });

  if (error) {
    throw new UploadError(`Upload failed: ${error.message}`);
  }

  return {
    path: data.path,
    fullPath: `${EBOOKS_BUCKET}/${data.path}`,
  };
}

/**
 * Uploads a cover image for an ebook
 * @param file The image file to upload
 * @param storyId The story ID
 * @returns The public URL of the uploaded image
 */
export async function uploadEbookCover(
  file: File,
  storyId: string
): Promise<string> {
  // Validate image
  if (!file.type.startsWith("image/")) {
    throw new UploadError("Invalid file type. Please select an image file.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new UploadError("Image too large. Maximum size is 5MB.");
  }

  const supabase = createClient();
  const timestamp = Date.now();
  const ext = file.name.split(".").pop() || "jpg";
  const filePath = `covers/${storyId}/${timestamp}.${ext}`;

  const { data, error } = await supabase.storage
    .from(EBOOKS_BUCKET)
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new UploadError(`Cover upload failed: ${error.message}`);
  }

  // Get public URL for cover images
  const { data: urlData } = supabase.storage
    .from(EBOOKS_BUCKET)
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

/**
 * Gets a signed URL for reading an ebook (server-side only)
 * This should be called from an API route, not client-side
 * @param filePath The storage path of the ebook
 * @param expiresIn Expiration time in seconds (default 1 hour)
 * @returns The signed URL
 */
export async function getSignedEpubUrl(
  filePath: string,
  expiresIn: number = 3600
): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase.storage
    .from(EBOOKS_BUCKET)
    .createSignedUrl(filePath, expiresIn);

  if (error) {
    throw new UploadError(`Failed to get signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Deletes an ebook file from storage
 * @param filePath The storage path of the ebook
 */
export async function deleteEbookFile(filePath: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.storage
    .from(EBOOKS_BUCKET)
    .remove([filePath]);

  if (error) {
    throw new UploadError(`Failed to delete file: ${error.message}`);
  }
}
