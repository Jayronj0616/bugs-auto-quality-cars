import { NextResponse } from 'next/server'

import { AuthorizationError, authorizeAction } from '@/lib/auth'
import { ALLOWED_IMAGE_TYPES, MEDIA_BUCKET, checkImageFile } from '@/lib/media'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Branding image upload (logo, hero image).
 *
 * Returns a public URL for the settings form to store; it does not write to the
 * database itself, so an admin can preview an upload and still cancel without
 * changing the live site.
 *
 * Requires the `settings` capability rather than `inventory` - this is
 * dealership identity, not stock.
 */

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    await authorizeAction('settings')
  } catch (error) {
    const status = error instanceof AuthorizationError ? 403 : 500
    return NextResponse.json(
      { error: error instanceof AuthorizationError ? error.message : 'Upload failed.' },
      { status },
    )
  }

  const storage = createServiceRoleClient()
  if (!storage) {
    console.error('[branding.upload] SUPABASE_SERVICE_ROLE_KEY is not configured')
    return NextResponse.json(
      { error: 'File uploads are not configured on this server.' },
      { status: 503 },
    )
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Could not read the uploaded file.' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Choose an image to upload.' }, { status: 400 })
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const check = checkImageFile(file, bytes, ALLOWED_IMAGE_TYPES)
  if (!check.ok) {
    return NextResponse.json({ error: `That file could not be used: ${check.reason}.` }, { status: 400 })
  }

  const storagePath = `branding/${crypto.randomUUID()}.${check.extension}`

  const { error: uploadError } = await storage.storage
    .from(MEDIA_BUCKET)
    .upload(storagePath, bytes, { contentType: file.type, upsert: false })

  if (uploadError) {
    console.error('[branding.upload] storage:', uploadError.message)
    return NextResponse.json({ error: 'The upload failed. Please try again.' }, { status: 500 })
  }

  const {
    data: { publicUrl },
  } = storage.storage.from(MEDIA_BUCKET).getPublicUrl(storagePath)

  return NextResponse.json({ url: publicUrl, storagePath })
}
