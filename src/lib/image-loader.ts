import { IMAGE_VARIANT_PATTERN, MEDIA_BUCKET, pickVariantWidth, variantPath } from './image-variants'

const STORAGE_PREFIX = `${(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '')}/storage/v1/object/public/${MEDIA_BUCKET}/`

/**
 * next/image loader: photos from our bucket are served as the pre-resized copy
 * nearest the requested width, straight from Supabase. Anything else (YouTube
 * thumbnails) is small already and is returned as-is.
 */
export default function imageLoader({ src, width }: { src: string; width: number; quality?: number }) {
  if (!src.startsWith(STORAGE_PREFIX)) return src

  // The logo URL carries a cache-busting `?v=`; the size goes on the path, the
  // query stays at the end.
  const queryAt = src.indexOf('?')
  const path = queryAt === -1 ? src : src.slice(0, queryAt)
  const query = queryAt === -1 ? '' : src.slice(queryAt)

  if (IMAGE_VARIANT_PATTERN.test(path)) return src
  return `${variantPath(path, pickVariantWidth(width))}${query}`
}
