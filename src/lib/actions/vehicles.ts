'use server'

import { AuthorizationError, authorizeAction, recordActivity, type AdminSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { buildVehicleSlug } from '@/lib/utils'
import {
  imageOrderSchema,
  specificationSchema,
  vehicleImageMetaSchema,
  vehicleSchema,
  vehicleStatusSchema,
  vehicleVideoSchema,
  type VehicleFormInput,
} from '@/lib/validation/vehicle'
import { detectProvider } from '@/lib/video'
import type {
  VehicleRow,
  VehicleSpecificationRow,
  VehicleStatus,
  VehicleVideoRow,
} from '@/types/database'
import { z } from 'zod'

import { revalidateInventory } from './revalidate'
import { actionError, actionSuccess, internalError, zodErrors, type ActionResult } from './result'

/**
 * Vehicle management.
 *
 * Every action re-checks the `inventory` capability with `authorizeAction`:
 * Server Actions are reachable by direct POST, so the fact that the dashboard
 * only renders these forms for permitted roles is not a security boundary.
 * Writes then go through the admin's own Supabase client, so RLS gets the final
 * say even if this check were ever wrong.
 */

const uuid = z.uuid()

/**
 * Columns a duplicate must not inherit: identity, bookkeeping, Postgres
 * generated columns, and the embedded child collections that come back with a
 * `select('*, …')`.
 */
const NON_COPYABLE_COLUMNS = new Set([
  'id',
  'created_at',
  'updated_at',
  'published_at',
  'search_text',
  'filter_price',
  'view_count',
  'specifications',
  'videos',
  'images',
])

export async function saveVehicle(
  input: VehicleFormInput & { vehicleId?: string | null },
): Promise<ActionResult<{ vehicleId: string; slug: string }>> {
  let session: AdminSession
  try {
    session = await authorizeAction('inventory')
  } catch (error) {
    return authError(error)
  }

  const parsed = vehicleSchema.safeParse(input)
  if (!parsed.success) {
    return actionError('Please correct the highlighted fields.', zodErrors(parsed.error))
  }

  const vehicleId = input.vehicleId?.trim() || null
  if (vehicleId && !uuid.safeParse(vehicleId).success) {
    return actionError('That vehicle could not be found.')
  }

  const values = parsed.data

  try {
    const slug = await resolveSlug(session, values, vehicleId)

    const row = {
      brand: values.brand,
      model: values.model,
      variant: values.variant,
      slug,
      year: values.year,
      condition: values.condition,
      body_type: values.bodyType,
      fuel_type: values.fuelType,
      transmission: values.transmission,
      drive_type: values.driveType,
      seating_capacity: values.seatingCapacity,
      mileage: values.mileage,
      exterior_color: values.exteriorColor,
      interior_color: values.interiorColor,
      plate_ending: values.plateEnding,
      engine: values.engine,
      power_hp: values.powerHp,
      torque_nm: values.torqueNm,
      description: values.description,
      features: values.features,
      srp: values.srp,
      selling_price: values.sellingPrice,
      promo_price: values.promoPrice,
      promo_label: values.promoLabel,
      promo_starts_at: toTimestamp(values.promoStartsAt),
      promo_ends_at: toTimestamp(values.promoEndsAt),
      default_down_payment_percent: values.defaultDownPaymentPercent,
      default_term_months: values.defaultTermMonths,
      status: values.status,
      is_featured: values.isFeatured,
      is_promoted: values.isPromoted,
      meta_title: values.metaTitle,
      meta_description: values.metaDescription,
    }

    if (vehicleId) {
      const { data, error } = await session.supabase
        .from('vehicles')
        .update(row)
        .eq('id', vehicleId)
        .select('id, slug')
        .single()

      if (error) return handleWriteError('vehicle.update', error)

      await recordActivity(session, {
        action: 'vehicle.updated',
        entityType: 'vehicle',
        entityId: data.id,
        entityLabel: `${values.year} ${values.brand} ${values.model}`,
        metadata: { status: values.status },
      })

      revalidateInventory(data.slug)
      return actionSuccess('Vehicle saved.', { vehicleId: data.id, slug: data.slug })
    }

    const { data, error } = await session.supabase
      .from('vehicles')
      .insert({ ...row, created_by: session.profile.id })
      .select('id, slug')
      .single()

    if (error) return handleWriteError('vehicle.create', error)

    await recordActivity(session, {
      action: 'vehicle.created',
      entityType: 'vehicle',
      entityId: data.id,
      entityLabel: `${values.year} ${values.brand} ${values.model}`,
      metadata: { status: values.status },
    })

    revalidateInventory(data.slug)
    return actionSuccess('Vehicle created.', { vehicleId: data.id, slug: data.slug })
  } catch (error) {
    return internalError('vehicle.save', error)
  }
}

export async function setVehicleStatus(input: {
  vehicleId: string
  status: VehicleStatus
}): Promise<ActionResult> {
  let session: AdminSession
  try {
    session = await authorizeAction('inventory')
  } catch (error) {
    return authError(error)
  }

  const parsed = vehicleStatusSchema.safeParse(input)
  if (!parsed.success) return actionError('That status is not valid.')

  try {
    const { data, error } = await session.supabase
      .from('vehicles')
      .update({ status: parsed.data.status })
      .eq('id', parsed.data.vehicleId)
      .select('id, slug, brand, model, year')
      .single()

    if (error) return handleWriteError('vehicle.status', error)

    await recordActivity(session, {
      action: parsed.data.status === 'published' ? 'vehicle.published' : 'vehicle.status_changed',
      entityType: 'vehicle',
      entityId: data.id,
      entityLabel: `${data.year} ${data.brand} ${data.model}`,
      metadata: { status: parsed.data.status },
    })

    revalidateInventory(data.slug)
    return actionSuccess(statusMessage(parsed.data.status))
  } catch (error) {
    return internalError('vehicle.status', error)
  }
}

/**
 * Copies a vehicle as a draft, including its specifications and videos.
 *
 * Photography is deliberately *not* copied: two listings pointing at the same
 * storage objects means deleting a photo from one silently breaks the other.
 */
export async function duplicateVehicle(
  vehicleId: string,
): Promise<ActionResult<{ vehicleId: string }>> {
  let session: AdminSession
  try {
    session = await authorizeAction('inventory')
  } catch (error) {
    return authError(error)
  }

  if (!uuid.safeParse(vehicleId).success) return actionError('That vehicle could not be found.')

  try {
    const { data: original, error: readError } = await session.supabase
      .from('vehicles')
      .select('*, specifications:vehicle_specifications(*), videos:vehicle_videos(*)')
      .eq('id', vehicleId)
      .single()

    if (readError || !original) return actionError('That vehicle could not be found.')

    // PostgREST embeds are not modelled in the hand-written Database type, so
    // the shape is asserted once here rather than threaded through every field.
    const source = original as unknown as VehicleRow & {
      specifications: VehicleSpecificationRow[] | null
      videos: VehicleVideoRow[] | null
    }
    const { specifications, videos } = source

    // Copy by exclusion rather than by listing every column: a new descriptive
    // column added later should be carried over by default, and only the
    // database-owned ones need to be named.
    const copyable = Object.fromEntries(
      Object.entries(source).filter(([column]) => !NON_COPYABLE_COLUMNS.has(column)),
    ) as Partial<Omit<VehicleRow, 'search_text' | 'filter_price'>>

    const { data: created, error } = await session.supabase
      .from('vehicles')
      .insert({
        ...copyable,
        slug: await uniqueSlug(session, `${source.slug}-copy`, null),
        status: 'draft',
        is_featured: false,
        is_promoted: false,
        published_at: null,
        created_by: session.profile.id,
      })
      .select('id')
      .single()

    if (error) return handleWriteError('vehicle.duplicate', error)

    if (specifications?.length) {
      await session.supabase.from('vehicle_specifications').insert(
        specifications.map((spec) => ({
          vehicle_id: created.id,
          group_name: spec.group_name,
          name: spec.name,
          value: spec.value,
          sort_order: spec.sort_order,
        })),
      )
    }

    if (videos?.length) {
      await session.supabase.from('vehicle_videos').insert(
        videos.map((video) => ({
          vehicle_id: created.id,
          title: video.title,
          video_url: video.video_url,
          provider: video.provider,
          external_id: video.external_id,
          thumbnail_url: video.thumbnail_url,
          video_type: video.video_type,
          sort_order: video.sort_order,
        })),
      )
    }

    await recordActivity(session, {
      action: 'vehicle.duplicated',
      entityType: 'vehicle',
      entityId: created.id,
      entityLabel: `${source.year} ${source.brand} ${source.model}`,
    })

    revalidateInventory()
    return actionSuccess('Vehicle duplicated as a draft.', { vehicleId: created.id })
  } catch (error) {
    return internalError('vehicle.duplicate', error)
  }
}

/* -------------------------------------------------------------------------- */
/* Specifications                                                             */
/* -------------------------------------------------------------------------- */

export async function saveSpecifications(input: {
  vehicleId: string
  specifications: { groupName: string; name: string; value: string }[]
}): Promise<ActionResult> {
  let session: AdminSession
  try {
    session = await authorizeAction('inventory')
  } catch (error) {
    return authError(error)
  }

  const parsed = specificationSchema.safeParse(input)
  if (!parsed.success) {
    return actionError('Please correct the highlighted specifications.', zodErrors(parsed.error))
  }

  try {
    // Replace wholesale: the form submits the complete list, and reconciling
    // row by row would be more code for no behavioural difference.
    const { error: deleteError } = await session.supabase
      .from('vehicle_specifications')
      .delete()
      .eq('vehicle_id', parsed.data.vehicleId)

    if (deleteError) return handleWriteError('specifications.clear', deleteError)

    if (parsed.data.specifications.length > 0) {
      const { error } = await session.supabase.from('vehicle_specifications').insert(
        parsed.data.specifications.map((spec, index) => ({
          vehicle_id: parsed.data.vehicleId,
          group_name: spec.groupName || 'General',
          name: spec.name,
          value: spec.value,
          sort_order: index,
        })),
      )
      if (error) return handleWriteError('specifications.insert', error)
    }

    await recordActivity(session, {
      action: 'vehicle.updated',
      entityType: 'vehicle',
      entityId: parsed.data.vehicleId,
      metadata: { section: 'specifications', count: parsed.data.specifications.length },
    })

    await revalidateVehicleById(session, parsed.data.vehicleId)
    return actionSuccess('Specifications saved.')
  } catch (error) {
    return internalError('specifications.save', error)
  }
}

/* -------------------------------------------------------------------------- */
/* Videos                                                                     */
/* -------------------------------------------------------------------------- */

export async function saveVideo(input: {
  vehicleId: string
  videoId: string | null
  title: string
  videoUrl: string
  videoType: string
  thumbnailUrl: string
}): Promise<ActionResult> {
  let session: AdminSession
  try {
    session = await authorizeAction('inventory')
  } catch (error) {
    return authError(error)
  }

  const parsed = vehicleVideoSchema.safeParse(input)
  if (!parsed.success) {
    return actionError('Please correct the highlighted fields.', zodErrors(parsed.error))
  }

  const values = parsed.data
  const { provider, externalId } = detectProvider(values.videoUrl)

  try {
    const row = {
      vehicle_id: values.vehicleId,
      title: values.title,
      video_url: values.videoUrl,
      provider,
      external_id: externalId,
      // A YouTube thumbnail can be derived, so the admin does not have to find one.
      thumbnail_url:
        values.thumbnailUrl ??
        (provider === 'youtube' && externalId
          ? `https://i.ytimg.com/vi/${externalId}/hqdefault.jpg`
          : null),
      video_type: values.videoType,
    }

    if (values.videoId) {
      const { error } = await session.supabase
        .from('vehicle_videos')
        .update(row)
        .eq('id', values.videoId)
      if (error) return handleWriteError('video.update', error)
    } else {
      const { count } = await session.supabase
        .from('vehicle_videos')
        .select('id', { count: 'exact', head: true })
        .eq('vehicle_id', values.vehicleId)

      const { error } = await session.supabase
        .from('vehicle_videos')
        .insert({ ...row, sort_order: count ?? 0 })
      if (error) return handleWriteError('video.insert', error)
    }

    await revalidateVehicleById(session, values.vehicleId)
    return actionSuccess(values.videoId ? 'Video updated.' : 'Video added.')
  } catch (error) {
    return internalError('video.save', error)
  }
}

export async function deleteVideo(videoId: string): Promise<ActionResult> {
  let session: AdminSession
  try {
    session = await authorizeAction('inventory')
  } catch (error) {
    return authError(error)
  }

  if (!uuid.safeParse(videoId).success) return actionError('That video could not be found.')

  try {
    const { data, error } = await session.supabase
      .from('vehicle_videos')
      .delete()
      .eq('id', videoId)
      .select('vehicle_id')
      .maybeSingle()

    if (error) return handleWriteError('video.delete', error)
    if (data) await revalidateVehicleById(session, data.vehicle_id)

    return actionSuccess('Video removed.')
  } catch (error) {
    return internalError('video.delete', error)
  }
}

/* -------------------------------------------------------------------------- */
/* Images                                                                     */
/* -------------------------------------------------------------------------- */

export async function updateImageMeta(input: {
  imageId: string
  altText: string
  category: string
}): Promise<ActionResult> {
  let session: AdminSession
  try {
    session = await authorizeAction('inventory')
  } catch (error) {
    return authError(error)
  }

  const parsed = vehicleImageMetaSchema.safeParse(input)
  if (!parsed.success) {
    return actionError('Please correct the highlighted fields.', zodErrors(parsed.error))
  }

  try {
    const { data, error } = await session.supabase
      .from('vehicle_images')
      .update({ alt_text: parsed.data.altText, category: parsed.data.category })
      .eq('id', parsed.data.imageId)
      .select('vehicle_id')
      .single()

    if (error) return handleWriteError('image.update', error)

    await revalidateVehicleById(session, data.vehicle_id)
    return actionSuccess('Photo updated.')
  } catch (error) {
    return internalError('image.update', error)
  }
}

export async function setPrimaryImage(imageId: string): Promise<ActionResult> {
  let session: AdminSession
  try {
    session = await authorizeAction('inventory')
  } catch (error) {
    return authError(error)
  }

  if (!uuid.safeParse(imageId).success) return actionError('That photo could not be found.')

  try {
    // A database trigger demotes the previous primary, so this is a single
    // write and cannot leave a vehicle with two primary photos.
    const { data, error } = await session.supabase
      .from('vehicle_images')
      .update({ is_primary: true })
      .eq('id', imageId)
      .select('vehicle_id')
      .single()

    if (error) return handleWriteError('image.primary', error)

    await revalidateVehicleById(session, data.vehicle_id)
    return actionSuccess('Main photo updated.')
  } catch (error) {
    return internalError('image.primary', error)
  }
}

export async function reorderImages(input: {
  vehicleId: string
  orderedIds: string[]
}): Promise<ActionResult> {
  let session: AdminSession
  try {
    session = await authorizeAction('inventory')
  } catch (error) {
    return authError(error)
  }

  const parsed = imageOrderSchema.safeParse(input)
  if (!parsed.success) return actionError('That ordering is not valid.')

  try {
    // Scoped to the vehicle, so a forged id from another listing changes nothing.
    const updates = parsed.data.orderedIds.map((id, index) =>
      session.supabase
        .from('vehicle_images')
        .update({ sort_order: index })
        .eq('id', id)
        .eq('vehicle_id', parsed.data.vehicleId),
    )

    const results = await Promise.all(updates)
    const failed = results.find((result) => result.error)
    if (failed?.error) return handleWriteError('image.reorder', failed.error)

    await revalidateVehicleById(session, parsed.data.vehicleId)
    return actionSuccess('Photo order saved.')
  } catch (error) {
    return internalError('image.reorder', error)
  }
}

export async function deleteImage(imageId: string): Promise<ActionResult> {
  let session: AdminSession
  try {
    session = await authorizeAction('inventory')
  } catch (error) {
    return authError(error)
  }

  if (!uuid.safeParse(imageId).success) return actionError('That photo could not be found.')

  try {
    const { data, error } = await session.supabase
      .from('vehicle_images')
      .delete()
      .eq('id', imageId)
      .select('vehicle_id, storage_path')
      .maybeSingle()

    if (error) return handleWriteError('image.delete', error)
    if (!data) return actionError('That photo could not be found.')

    // Remove the stored object too, so deleting photos actually reclaims
    // storage instead of orphaning files nothing references.
    if (data.storage_path) {
      const storage = createServiceRoleClient()
      if (storage) {
        const { error: storageError } = await storage.storage
          .from('vehicle-media')
          .remove([data.storage_path])
        // The row is already gone; a failed object delete is a cleanup problem,
        // not a reason to tell the admin their action failed.
        if (storageError) console.error('[image.delete] storage:', storageError.message)
      }
    }

    await revalidateVehicleById(session, data.vehicle_id)
    return actionSuccess('Photo removed.')
  } catch (error) {
    return internalError('image.delete', error)
  }
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function authError(error: unknown): ActionResult<never> {
  if (error instanceof AuthorizationError) return actionError(error.message)
  return internalError('vehicle.authorize', error)
}

/**
 * Turns a Postgres error into something an administrator can act on.
 *
 * Only violations we can name are translated; anything else is logged and
 * replaced with a generic message rather than leaking constraint names.
 */
function handleWriteError(context: string, error: { code?: string; message: string }) {
  if (error.code === '23505') {
    return actionError('A vehicle with that URL slug already exists. Try a different variant name.')
  }
  if (error.code === '42501') {
    return actionError('You do not have permission to change this vehicle.')
  }
  if (error.code === '23514') {
    return actionError('One of the values is outside the allowed range. Please review the form.')
  }
  return internalError(context, error)
}

function statusMessage(status: VehicleStatus): string {
  switch (status) {
    case 'published':
      return 'Vehicle published and now live on the website.'
    case 'draft':
      return 'Vehicle unpublished and hidden from the website.'
    case 'archived':
      return 'Vehicle archived. Its inquiry history is preserved.'
    case 'sold':
      return 'Vehicle marked as sold.'
    case 'reserved':
      return 'Vehicle marked as reserved.'
  }
}

/** `2026-01-31` from a date input becomes a timestamp Postgres will accept. */
function toTimestamp(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

async function resolveSlug(
  session: AdminSession,
  values: { slug: string; brand: string; model: string; variant: string | null; year: number },
  vehicleId: string | null,
): Promise<string> {
  const base = values.slug || buildVehicleSlug(values)
  return uniqueSlug(session, base, vehicleId)
}

/**
 * Appends `-2`, `-3`… until the slug is free.
 *
 * The unique index is still the real guarantee - this just means the admin gets
 * a working URL instead of a constraint error for the common case of two
 * similar listings.
 */
async function uniqueSlug(
  session: AdminSession,
  base: string,
  vehicleId: string | null,
): Promise<string> {
  const safeBase = base || 'vehicle'

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = attempt === 0 ? safeBase : `${safeBase}-${attempt + 1}`

    let query = session.supabase.from('vehicles').select('id').eq('slug', candidate).limit(1)
    if (vehicleId) query = query.neq('id', vehicleId)

    const { data } = await query
    if (!data || data.length === 0) return candidate
  }

  return `${safeBase}-${Date.now().toString(36)}`
}

async function revalidateVehicleById(session: AdminSession, vehicleId: string) {
  const { data } = await session.supabase
    .from('vehicles')
    .select('slug')
    .eq('id', vehicleId)
    .maybeSingle()

  revalidateInventory(data?.slug ?? null)
}
