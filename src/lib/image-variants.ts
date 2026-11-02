/**
 * Pre-resized copies of every stored photo.
 *
 * Each image in the bucket gets a WebP copy at each width below, saved next to
 * the original as `<path>.w<width>.webp`. The site's image loader requests
 * those directly instead of going through Vercel's image optimizer, whose free
 * monthly allowance an archive this size runs through.
 *
 * Kept free of server-only imports: the image loader runs in the browser too,
 * and the import scripts read it from plain Node.
 */

export const MEDIA_BUCKET = 'vehicle-media'

export const IMAGE_VARIANT_WIDTHS = [192, 384, 768, 1280, 1920] as const

export const IMAGE_VARIANT_PATTERN = /\.w\d+\.webp$/

export function variantPath(path: string, width: number): string {
  return `${path}.w${width}.webp`
}

export function variantPaths(path: string): string[] {
  return IMAGE_VARIANT_WIDTHS.map((width) => variantPath(path, width))
}

/** The original plus all of its copies - what to remove when a photo is deleted. */
export function withVariants(paths: string[]): string[] {
  return paths.flatMap((path) => [path, ...variantPaths(path)])
}

/** Smallest copy at least as wide as requested, or the largest there is. */
export function pickVariantWidth(width: number): number {
  return (
    IMAGE_VARIANT_WIDTHS.find((candidate) => candidate >= width) ??
    IMAGE_VARIANT_WIDTHS[IMAGE_VARIANT_WIDTHS.length - 1]
  )
}
