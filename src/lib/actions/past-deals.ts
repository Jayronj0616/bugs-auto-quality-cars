'use server'

import { z } from 'zod'

import { AuthorizationError, authorizeAction, recordActivity, type AdminSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils'
import {
  pastDealImageOrderSchema,
  pastDealSchema,
  type PastDealFormInput,
} from '@/lib/validation/past-deal'
import { MEDIA_BUCKET } from '@/lib/media'

import { revalidatePastDeals } from './revalidate'
import { actionError, actionSuccess, internalError, zodErrors, type ActionResult } from './result'

/**
 * Past-deal management.
 *
 * Same shape as `vehicles.ts`: every action re-checks the `inventory`
 * capability with `authorizeAction`, writes go through the admin's own
 * Supabase client so RLS has the final say, and a Postgres error is translated
 * into something an administrator can act on rather than shown raw.
 */

const uuid = z.uuid()

export async function savePastDeal(
  input: PastDealFormInput & { dealId?: string | null },
): Promise<ActionResult<{ dealId: string; slug: string }>> {
  let session: AdminSession
  try {
    session = await authorizeAction('inventory')
  } catch (error) {
    return authError(error)
  }

  const parsed = pastDealSchema.safeParse(input)
  if (!parsed.success) {
    return actionError('Please correct the highlighted fields.', zodErrors(parsed.error))
  }

  const dealId = input.dealId?.trim() || null
  if (dealId && !uuid.safeParse(dealId).success) {
    return actionError('That entry could not be found.')
  }

  const values = parsed.data

  try {
    const slug = await resolveSlug(session, values.slug || slugify(values.title), dealId)

    const row = {
      title: values.title,
      slug,
      note: values.note,
      sold_around: values.soldAround,
      is_published: values.isPublished,
    }

    if (dealId) {
      const { data, error } = await session.supabase
        .from('past_deals')
        .update(row)
        .eq('id', dealId)
        .select('id, slug')
        .single()

      if (error) return handleWriteError('past_deal.update', error)

      await recordActivity(session, {
        action: 'past_deal.updated',
        entityType: 'past_deal',
        entityId: data.id,
        entityLabel: values.title,
      })

      revalidatePastDeals(data.slug)
      return actionSuccess('Saved.', { dealId: data.id, slug: data.slug })
    }

    const { data, error } = await session.supabase
      .from('past_deals')
      .insert({ ...row, created_by: session.profile.id })
      .select('id, slug')
      .single()

    if (error) return handleWriteError('past_deal.create', error)

    await recordActivity(session, {
      action: 'past_deal.created',
      entityType: 'past_deal',
      entityId: data.id,
      entityLabel: values.title,
    })

    revalidatePastDeals(data.slug)
    return actionSuccess('Created.', { dealId: data.id, slug: data.slug })
  } catch (error) {
    return internalError('past_deal.save', error)
  }
}

export async function deletePastDeal(dealId: string): Promise<ActionResult> {
  let session: AdminSession
  try {
    session = await authorizeAction('inventory')
  } catch (error) {
    return authError(error)
  }

  if (!uuid.safeParse(dealId).success) return actionError('That entry could not be found.')

  try {
    // Photos first, so their storage objects can be cleaned up before the row
    // (and its FK-cascaded image rows) disappear.
    const { data: images } = await session.supabase
      .from('past_deal_images')
      .select('storage_path')
      .eq('past_deal_id', dealId)

    const { data, error } = await session.supabase
      .from('past_deals')
      .delete()
      .eq('id', dealId)
      .select('slug, title')
      .maybeSingle()

    if (error) return handleWriteError('past_deal.delete', error)
    if (!data) return actionError('That entry could not be found.')

    const paths = (images ?? []).map((image) => image.storage_path).filter((path) => path != null)
    if (paths.length > 0) {
      const storage = createServiceRoleClient()
      if (storage) {
        const { error: storageError } = await storage.storage.from(MEDIA_BUCKET).remove(paths)
        // The rows are already gone; a failed object delete is a cleanup
        // problem, not a reason to tell the admin their action failed.
        if (storageError) console.error('[past_deal.delete] storage:', storageError.message)
      }
    }

    await recordActivity(session, {
      action: 'past_deal.deleted',
      entityType: 'past_deal',
      entityId: dealId,
      entityLabel: data.title,
    })

    revalidatePastDeals(data.slug)
    return actionSuccess('Removed.')
  } catch (error) {
    return internalError('past_deal.delete', error)
  }
}

export async function setPastDealPrimaryImage(imageId: string): Promise<ActionResult> {
  let session: AdminSession
  try {
    session = await authorizeAction('inventory')
  } catch (error) {
    return authError(error)
  }

  if (!uuid.safeParse(imageId).success) return actionError('That photo could not be found.')

  try {
    const { data, error } = await session.supabase
      .from('past_deal_images')
      .update({ is_primary: true })
      .eq('id', imageId)
      .select('past_deal_id')
      .single()

    if (error) return handleWriteError('past_deal_image.primary', error)

    await revalidateDealById(session, data.past_deal_id)
    return actionSuccess('Cover photo updated.')
  } catch (error) {
    return internalError('past_deal_image.primary', error)
  }
}

export async function reorderPastDealImages(input: {
  pastDealId: string
  orderedIds: string[]
}): Promise<ActionResult> {
  let session: AdminSession
  try {
    session = await authorizeAction('inventory')
  } catch (error) {
    return authError(error)
  }

  const parsed = pastDealImageOrderSchema.safeParse(input)
  if (!parsed.success) return actionError('That ordering is not valid.')

  try {
    const updates = parsed.data.orderedIds.map((id, index) =>
      session.supabase
        .from('past_deal_images')
        .update({ sort_order: index })
        .eq('id', id)
        .eq('past_deal_id', parsed.data.pastDealId),
    )

    const results = await Promise.all(updates)
    const failed = results.find((result) => result.error)
    if (failed?.error) return handleWriteError('past_deal_image.reorder', failed.error)

    await revalidateDealById(session, parsed.data.pastDealId)
    return actionSuccess('Photo order saved.')
  } catch (error) {
    return internalError('past_deal_image.reorder', error)
  }
}

export async function deletePastDealImage(imageId: string): Promise<ActionResult> {
  let session: AdminSession
  try {
    session = await authorizeAction('inventory')
  } catch (error) {
    return authError(error)
  }

  if (!uuid.safeParse(imageId).success) return actionError('That photo could not be found.')

  try {
    const { data, error } = await session.supabase
      .from('past_deal_images')
      .delete()
      .eq('id', imageId)
      .select('storage_path, past_deal_id')
      .maybeSingle()

    if (error) return handleWriteError('past_deal_image.delete', error)
    if (!data) return actionError('That photo could not be found.')

    if (data.storage_path) {
      const storage = createServiceRoleClient()
      if (storage) {
        const { error: storageError } = await storage.storage
          .from(MEDIA_BUCKET)
          .remove([data.storage_path])
        if (storageError) console.error('[past_deal_image.delete] storage:', storageError.message)
      }
    }

    await revalidateDealById(session, data.past_deal_id)
    return actionSuccess('Photo removed.')
  } catch (error) {
    return internalError('past_deal_image.delete', error)
  }
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function authError(error: unknown): ActionResult<never> {
  if (error instanceof AuthorizationError) return actionError(error.message)
  return internalError('past_deal.authorize', error)
}

function handleWriteError(context: string, error: { code?: string; message: string }) {
  if (error.code === '23505') {
    return actionError('An entry with that URL slug already exists. Try a different title.')
  }
  if (error.code === '42501') {
    return actionError('You do not have permission to change this entry.')
  }
  return internalError(context, error)
}

async function revalidateDealById(session: AdminSession, dealId: string) {
  const { data } = await session.supabase
    .from('past_deals')
    .select('slug')
    .eq('id', dealId)
    .maybeSingle()

  revalidatePastDeals(data?.slug ?? null)
}

/** Appends `-2`, `-3`… until the slug is free, scoped to past_deals. */
async function resolveSlug(
  session: AdminSession,
  base: string,
  dealId: string | null,
): Promise<string> {
  const safeBase = base || 'sold-vehicle'

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = attempt === 0 ? safeBase : `${safeBase}-${attempt + 1}`

    let query = session.supabase.from('past_deals').select('id').eq('slug', candidate)
    if (dealId) query = query.neq('id', dealId)

    const { data } = await query.maybeSingle()
    if (!data) return candidate
  }

  return `${safeBase}-${Date.now()}`
}
