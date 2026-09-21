import { NextResponse } from 'next/server'
import { z } from 'zod'

import { AuthorizationError, authorizeAction, recordActivity } from '@/lib/auth'
import { revalidateInventory } from '@/lib/actions/revalidate'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { ImageCategory, VehicleImageRow } from '@/types/database'
import { IMAGE_CATEGORIES } from '@/lib/constants'

/**
 * Vehicle photo upload.
 *
 * A Route Handler rather than a Server Action because Server Action bodies are
 * capped at 1MB by default, and a single vehicle photo routinely exceeds that.
 *
 * Uploads run server-side with the service-role key, so no storage credential
 * is ever handed to the browser, and the caller is authorized first - this
 * endpoint is reachable by direct POST like any other route.
 */

export const dynamic = 'force-dynamic'

const BUCKET = 'vehicle-media'
const MAX_FILE_BYTES = 10 * 1024 * 1024
const MAX_FILES_PER_REQUEST = 20

/** Only formats the Next.js image optimizer can actually process. */
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
}

const requestSchema = z.object({
  vehicleId: z.uuid('That vehicle could not be found.'),
  category: z.enum(IMAGE_CATEGORIES.map((option) => option.value) as [ImageCategory]).optional(),
})

export async function POST(request: Request) {
  let session
  try {
    session = await authorizeAction('inventory')
  } catch (error) {
    const status = error instanceof AuthorizationError ? 403 : 500
    return NextResponse.json(
      { error: error instanceof AuthorizationError ? error.message : 'Upload failed.' },
      { status },
    )
  }

  const storage = createServiceRoleClient()
  if (!storage) {
    console.error('[media.upload] SUPABASE_SERVICE_ROLE_KEY is not configured')
    return NextResponse.json(
      { error: 'File uploads are not configured on this server.' },
      { status: 503 },
    )
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Could not read the uploaded files.' }, { status: 400 })
  }

  const parsed = requestSchema.safeParse({
    vehicleId: formData.get('vehicleId'),
    category: formData.get('category') || undefined,
  })
  if (!parsed.success) {
    return NextResponse.json({ error: 'That vehicle could not be found.' }, { status: 400 })
  }

  const { vehicleId, category = 'exterior' } = parsed.data

  // Confirm the vehicle exists and is visible to this admin before writing
  // anything into its storage folder.
  const { data: vehicle } = await session.supabase
    .from('vehicles')
    .select('id, slug, brand, model, year')
    .eq('id', vehicleId)
    .maybeSingle()

  if (!vehicle) {
    return NextResponse.json({ error: 'That vehicle could not be found.' }, { status: 404 })
  }

  const files = formData.getAll('files').filter((entry): entry is File => entry instanceof File)

  if (files.length === 0) {
    return NextResponse.json({ error: 'Choose at least one photo to upload.' }, { status: 400 })
  }
  if (files.length > MAX_FILES_PER_REQUEST) {
    return NextResponse.json(
      { error: `Upload up to ${MAX_FILES_PER_REQUEST} photos at a time.` },
      { status: 400 },
    )
  }

  // Continue numbering after whatever is already attached.
  const { count: existingCount } = await session.supabase
    .from('vehicle_images')
    .select('id', { count: 'exact', head: true })
    .eq('vehicle_id', vehicleId)

  let sortOrder = existingCount ?? 0
  const uploaded: VehicleImageRow[] = []
  const failures: string[] = []
  const vehicleLabel = `${vehicle.year} ${vehicle.brand} ${vehicle.model}`

  for (const file of files) {
    if (file.size === 0) {
      failures.push(`${file.name}: the file is empty.`)
      continue
    }
    if (file.size > MAX_FILE_BYTES) {
      failures.push(`${file.name}: larger than ${MAX_FILE_BYTES / 1024 / 1024}MB.`)
      continue
    }

    const extension = ALLOWED_TYPES[file.type]
    if (!extension) {
      failures.push(`${file.name}: only JPG, PNG, WebP and AVIF images are accepted.`)
      continue
    }

    const bytes = new Uint8Array(await file.arrayBuffer())

    // The declared content type is attacker-controlled, so the actual bytes are
    // checked too - a .exe renamed to .jpg does not get into the bucket.
    if (!looksLikeImage(bytes)) {
      failures.push(`${file.name}: does not look like a real image file.`)
      continue
    }

    const storagePath = `vehicles/${vehicleId}/images/${crypto.randomUUID()}.${extension}`

    const { error: uploadError } = await storage.storage
      .from(BUCKET)
      .upload(storagePath, bytes, { contentType: file.type, upsert: false })

    if (uploadError) {
      console.error('[media.upload] storage:', uploadError.message)
      failures.push(`${file.name}: upload failed.`)
      continue
    }

    const {
      data: { publicUrl },
    } = storage.storage.from(BUCKET).getPublicUrl(storagePath)

    const { data: row, error: insertError } = await session.supabase
      .from('vehicle_images')
      .insert({
        vehicle_id: vehicleId,
        storage_path: storagePath,
        url: publicUrl,
        alt_text: `${vehicleLabel} photo`,
        category,
        sort_order: sortOrder,
        // The first photo a vehicle ever gets becomes its primary one.
        is_primary: sortOrder === 0,
        file_size: file.size,
      })
      .select('*')
      .single()

    if (insertError || !row) {
      // Roll the object back so storage does not accumulate files no row
      // references.
      await storage.storage.from(BUCKET).remove([storagePath])
      console.error('[media.upload] insert:', insertError?.message)
      failures.push(`${file.name}: could not be saved.`)
      continue
    }

    uploaded.push(row)
    sortOrder += 1
  }

  if (uploaded.length > 0) {
    await recordActivity(session, {
      action: 'vehicle.uploaded',
      entityType: 'vehicle',
      entityId: vehicleId,
      entityLabel: vehicleLabel,
      metadata: { photos: uploaded.length },
    })
    revalidateInventory(vehicle.slug)
  }

  if (uploaded.length === 0) {
    return NextResponse.json(
      { error: failures[0] ?? 'No photos could be uploaded.', failures },
      { status: 400 },
    )
  }

  return NextResponse.json({ uploaded, failures })
}

/**
 * Magic-byte sniff for the formats we accept.
 *
 * Not a full parse - just enough that the bytes have to agree with the declared
 * type before anything is written to a publicly readable bucket.
 */
function looksLikeImage(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false

  const startsWith = (signature: number[], offset = 0) =>
    signature.every((byte, index) => bytes[offset + index] === byte)

  // JPEG: FF D8 FF
  if (startsWith([0xff, 0xd8, 0xff])) return true

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return true

  const ascii = (offset: number, length: number) =>
    String.fromCharCode(...bytes.slice(offset, offset + length))

  // WebP: "RIFF" .... "WEBP"
  if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') return true

  // AVIF / HEIF: box type "ftyp" at offset 4, brand contains "avif"
  if (ascii(4, 4) === 'ftyp' && ascii(8, 4).toLowerCase().startsWith('avi')) return true

  return false
}
