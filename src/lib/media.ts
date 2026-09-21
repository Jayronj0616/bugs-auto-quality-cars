import 'server-only'

/**
 * Upload validation shared by the vehicle photo and branding endpoints.
 *
 * Both write into a publicly readable bucket, so both apply the same rule: the
 * declared content type must be one we accept *and* the actual bytes have to
 * agree with it.
 */

export const MEDIA_BUCKET = 'vehicle-media'
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024

/**
 * Accepted formats, for photography and for the logo alike.
 *
 * SVG is deliberately excluded: it is XML that can carry script, and the bucket
 * is publicly readable. Next.js also refuses to optimize SVG without
 * `dangerouslyAllowSVG`, so accepting it would produce broken images as well as
 * a needless risk. A PNG logo with transparency covers the real use case.
 */
export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
}

export type FileCheckResult = { ok: true; extension: string } | { ok: false; reason: string }

export function checkImageFile(
  file: File,
  bytes: Uint8Array,
  allowed: Record<string, string> = ALLOWED_IMAGE_TYPES,
): FileCheckResult {
  if (file.size === 0) return { ok: false, reason: 'the file is empty' }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, reason: `larger than ${MAX_IMAGE_BYTES / 1024 / 1024}MB` }
  }

  const extension = allowed[file.type]
  if (!extension) {
    const names = [...new Set(Object.values(allowed))].join(', ').toUpperCase()
    return { ok: false, reason: `only ${names} images are accepted` }
  }

  if (!bytesMatchType(bytes, file.type)) {
    return { ok: false, reason: 'the file contents do not match its type' }
  }

  return { ok: true, extension }
}

/**
 * Magic-byte sniff.
 *
 * Not a full parse - just enough that a renamed executable cannot be written
 * into a public bucket because its `Content-Type` header claimed otherwise.
 */
function bytesMatchType(bytes: Uint8Array, contentType: string): boolean {
  if (bytes.length < 12) return false

  const startsWith = (signature: number[], offset = 0) =>
    signature.every((byte, index) => bytes[offset + index] === byte)

  const ascii = (offset: number, length: number) =>
    String.fromCharCode(...bytes.slice(offset, offset + length))

  switch (contentType) {
    case 'image/jpeg':
      return startsWith([0xff, 0xd8, 0xff])
    case 'image/png':
      return startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    case 'image/webp':
      return ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP'
    case 'image/avif':
      return ascii(4, 4) === 'ftyp' && ascii(8, 4).toLowerCase().startsWith('avi')
    default:
      return false
  }
}
