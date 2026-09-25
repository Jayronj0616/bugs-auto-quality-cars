import { NextResponse } from 'next/server'
import { z } from 'zod'

import { AuthorizationError, authorizeAction, recordActivity } from '@/lib/auth'
import { revalidatePastDeals } from '@/lib/actions/revalidate'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { PastDealImageRow } from '@/types/database'
import { ALLOWED_IMAGE_TYPES, MEDIA_BUCKET, checkImageFile } from '@/lib/media'

/**
 * Past-deal photo upload. Mirrors `media/upload/route.ts` (a Route Handler
 * because Server Action bodies are capped at 1MB and a single photo routinely
 * exceeds that) with the vehicle-only fields - category, dimensions - dropped,
 * since a past deal's photos have neither.
 */

export const dynamic = 'force-dynamic'

const MAX_FILES_PER_REQUEST = 20

const requestSchema = z.object({
  dealId: z.uuid('That entry could not be found.'),
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
    console.error('[past-deal-media.upload] SUPABASE_SERVICE_ROLE_KEY is not configured')
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

  const parsed = requestSchema.safeParse({ dealId: formData.get('dealId') })
  if (!parsed.success) {
    return NextResponse.json({ error: 'That entry could not be found.' }, { status: 400 })
  }

  const { dealId } = parsed.data

  const { data: deal } = await session.supabase
    .from('past_deals')
    .select('id, slug, title')
    .eq('id', dealId)
    .maybeSingle()

  if (!deal) {
    return NextResponse.json({ error: 'That entry could not be found.' }, { status: 404 })
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

  const { count: existingCount } = await session.supabase
    .from('past_deal_images')
    .select('id', { count: 'exact', head: true })
    .eq('past_deal_id', dealId)

  let sortOrder = existingCount ?? 0
  const uploaded: PastDealImageRow[] = []
  const failures: string[] = []

  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer())

    const check = checkImageFile(file, bytes, ALLOWED_IMAGE_TYPES)
    if (!check.ok) {
      failures.push(`${file.name}: ${check.reason}.`)
      continue
    }

    const storagePath = `past-deals/${dealId}/${crypto.randomUUID()}.${check.extension}`

    const { error: uploadError } = await storage.storage
      .from(MEDIA_BUCKET)
      .upload(storagePath, bytes, { contentType: file.type, upsert: false })

    if (uploadError) {
      console.error('[past-deal-media.upload] storage:', uploadError.message)
      failures.push(`${file.name}: upload failed.`)
      continue
    }

    const {
      data: { publicUrl },
    } = storage.storage.from(MEDIA_BUCKET).getPublicUrl(storagePath)

    const { data: row, error: insertError } = await session.supabase
      .from('past_deal_images')
      .insert({
        past_deal_id: dealId,
        storage_path: storagePath,
        url: publicUrl,
        alt_text: `${deal.title} photo`,
        sort_order: sortOrder,
        // The first photo a deal ever gets becomes its cover photo.
        is_primary: sortOrder === 0,
        file_size: file.size,
      })
      .select('*')
      .single()

    if (insertError || !row) {
      await storage.storage.from(MEDIA_BUCKET).remove([storagePath])
      console.error('[past-deal-media.upload] insert:', insertError?.message)
      failures.push(`${file.name}: could not be saved.`)
      continue
    }

    uploaded.push(row)
    sortOrder += 1
  }

  if (uploaded.length > 0) {
    await recordActivity(session, {
      action: 'past_deal.uploaded',
      entityType: 'past_deal',
      entityId: dealId,
      entityLabel: deal.title,
      metadata: { photos: uploaded.length },
    })
    revalidatePastDeals(deal.slug)
  }

  if (uploaded.length === 0) {
    return NextResponse.json(
      { error: failures[0] ?? 'No photos could be uploaded.', failures },
      { status: 400 },
    )
  }

  return NextResponse.json({ uploaded, failures })
}
