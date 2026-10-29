import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import sharp from 'sharp'

import { IMAGE_VARIANT_WIDTHS, MEDIA_BUCKET, variantPath } from './image-variants'

/**
 * Writes the resized copies the image loader serves. Returns false if any
 * failed, so the caller can treat the upload as failed - an original without
 * its copies would show as a broken image.
 */
export async function uploadImageVariants(
  storage: SupabaseClient,
  path: string,
  bytes: Uint8Array,
): Promise<boolean> {
  try {
    // Decode once; rotate() bakes in the EXIF orientation phone photos rely on.
    const base = sharp(bytes).rotate()
    await Promise.all(
      IMAGE_VARIANT_WIDTHS.map(async (width) => {
        const output = await base
          .clone()
          .resize({ width, withoutEnlargement: true })
          .webp({ quality: 76 })
          .toBuffer()
        const { error } = await storage.storage
          .from(MEDIA_BUCKET)
          .upload(variantPath(path, width), output, {
            contentType: 'image/webp',
            upsert: true,
            // Paths are unique per upload, so a copy never changes.
            cacheControl: '31536000',
          })
        if (error) throw new Error(error.message)
      }),
    )
    return true
  } catch (error) {
    console.error('[media.variants]', path, error instanceof Error ? error.message : error)
    return false
  }
}
