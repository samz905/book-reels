import { createClient } from "@/lib/supabase/client";

const AI_ASSETS_BUCKET = "ai-assets";

/**
 * Upload a base64-encoded asset to Supabase Storage and return its public URL.
 */
export async function uploadGenerationAsset(
  generationId: string,
  assetPath: string,
  base64Data: string,
  mimeType: string
): Promise<string | null> {
  const supabase = createClient();

  // Convert base64 to Uint8Array
  const binaryStr = atob(base64Data);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  const ext = mimeType.includes("png")
    ? "png"
    : mimeType.includes("jpeg") || mimeType.includes("jpg")
      ? "jpg"
      : "png";
  const fullPath = `${generationId}/${assetPath}.${ext}`;

  const { data, error } = await supabase.storage
    .from(AI_ASSETS_BUCKET)
    .upload(fullPath, bytes, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    console.warn("Asset upload failed (using base64 fallback):", error.message);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from(AI_ASSETS_BUCKET)
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

/**
 * Delete all assets for a generation (recursive folder delete).
 */
export async function deleteGenerationAssets(
  generationId: string
): Promise<void> {
  const supabase = createClient();

  // Recursively list and delete all files under the generation prefix
  const allPaths = await listAllFiles(supabase, generationId, "");
  if (allPaths.length > 0) {
    await supabase.storage.from(AI_ASSETS_BUCKET).remove(allPaths);
  }
}

/**
 * Recursively list all file paths under a generation prefix.
 */
async function listAllFiles(
  supabase: ReturnType<typeof createClient>,
  generationId: string,
  subfolder: string
): Promise<string[]> {
  const prefix = subfolder
    ? `${generationId}/${subfolder}`
    : generationId;

  const { data, error } = await supabase.storage
    .from(AI_ASSETS_BUCKET)
    .list(prefix, { limit: 1000 });

  if (error || !data) return [];

  const paths: string[] = [];
  for (const item of data) {
    const itemPath = `${prefix}/${item.name}`;
    if (item.id) {
      // It's a file
      paths.push(itemPath);
    } else {
      // It's a folder — recurse
      const nested = await listAllFiles(
        supabase,
        generationId,
        subfolder ? `${subfolder}/${item.name}` : item.name
      );
      paths.push(...nested);
    }
  }

  return paths;
}
