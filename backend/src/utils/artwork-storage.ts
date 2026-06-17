/**
 * Remove artwork objects from Supabase Storage when metadata is deleted.
 */

import { supabase } from '../lib/supabase.js';

const ARTWORKS_BUCKET = 'artworks';

export function storagePathFromUrl(fileUrl: string): string | null {
  const marker = `/${ARTWORKS_BUCKET}/`;
  const idx = fileUrl.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(fileUrl.slice(idx + marker.length));
}

export async function removeArtworkStorage(storagePath: string | null | undefined): Promise<void> {
  if (!storagePath) return;

  const { error } = await supabase.storage.from(ARTWORKS_BUCKET).remove([storagePath]);
  if (error) {
    console.warn(`Failed to remove artwork storage object ${storagePath}:`, error.message);
  }
}

export async function removeArtworkStorageByUrl(fileUrl: string): Promise<void> {
  await removeArtworkStorage(storagePathFromUrl(fileUrl));
}
