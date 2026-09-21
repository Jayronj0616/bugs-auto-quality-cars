'use server'

import { AuthorizationError, authorizeAction, recordActivity, type AdminSession } from '@/lib/auth'
import { slugify } from '@/lib/utils'
import {
  dealershipSettingsSchema,
  financingProviderSchema,
  financingRateSchema,
  providerDeleteSchema,
  rateDeleteSchema,
  type DealershipSettingsInput,
} from '@/lib/validation/settings'

import { revalidateFinancing, revalidateSiteWide } from './revalidate'
import { actionError, actionSuccess, internalError, zodErrors, type ActionResult } from './result'

/**
 * Dealership settings and financing configuration.
 *
 * Both are single points of truth for the whole public site, so both require
 * elevated capabilities and both revalidate broadly: a changed phone number has
 * to reach the header, footer, contact page and every vehicle CTA at once.
 */

export async function saveDealershipSettings(
  input: DealershipSettingsInput,
): Promise<ActionResult> {
  let session: AdminSession
  try {
    session = await authorizeAction('settings')
  } catch (error) {
    return authError(error)
  }

  const parsed = dealershipSettingsSchema.safeParse(input)
  if (!parsed.success) {
    return actionError('Please correct the highlighted fields.', zodErrors(parsed.error))
  }

  const values = parsed.data

  try {
    // The table is constrained to exactly one row, so the update is unqualified
    // by design rather than by accident.
    const { error } = await session.supabase
      .from('dealership_settings')
      .update({
        business_name: values.businessName,
        tagline: values.tagline,
        about: values.about,
        phone: values.phone,
        phone_secondary: values.phoneSecondary,
        email: values.email,
        facebook_url: values.facebookUrl,
        messenger_url: values.messengerUrl,
        instagram_url: values.instagramUrl,
        tiktok_url: values.tiktokUrl,
        viber_number: values.viberNumber,
        address_line1: values.addressLine1,
        address_line2: values.addressLine2,
        city: values.city,
        province: values.province,
        postal_code: values.postalCode,
        country: values.country,
        google_maps_url: values.googleMapsUrl,
        google_maps_embed_url: values.googleMapsEmbedUrl,
        business_hours: values.businessHours,
        logo_url: values.logoUrl,
        hero_image_url: values.heroImageUrl,
        response_time_note: values.responseTimeNote,
        default_interest_rate: values.defaultInterestRate,
        default_down_payment_percent: values.defaultDownPaymentPercent,
        default_term_months: values.defaultTermMonths,
        financing_disclaimer: values.financingDisclaimer,
      })
      .eq('singleton', true)

    if (error) return handleWriteError('settings.update', error)

    await recordActivity(session, {
      action: 'settings.updated',
      entityType: 'settings',
      entityLabel: values.businessName,
    })

    revalidateSiteWide()
    return actionSuccess('Dealership settings saved.')
  } catch (error) {
    return internalError('settings.save', error)
  }
}

/* -------------------------------------------------------------------------- */
/* Financing providers                                                         */
/* -------------------------------------------------------------------------- */

export async function saveFinancingProvider(input: {
  providerId: string | null
  name: string
  slug: string
  description: string
  logoUrl: string
  isActive: boolean
  sortOrder: string | number
}): Promise<ActionResult> {
  let session: AdminSession
  try {
    session = await authorizeAction('financing')
  } catch (error) {
    return authError(error)
  }

  const parsed = financingProviderSchema.safeParse(input)
  if (!parsed.success) {
    return actionError('Please correct the highlighted fields.', zodErrors(parsed.error))
  }

  const values = parsed.data
  const slug = values.slug || slugify(values.name)

  try {
    const row = {
      name: values.name,
      slug,
      description: values.description,
      logo_url: values.logoUrl,
      is_active: values.isActive,
      sort_order: values.sortOrder,
    }

    const { error } = values.providerId
      ? await session.supabase
          .from('financing_providers')
          .update(row)
          .eq('id', values.providerId)
      : await session.supabase.from('financing_providers').insert(row)

    if (error) return handleWriteError('provider.save', error)

    await recordActivity(session, {
      action: values.providerId ? 'financing_provider.updated' : 'financing_provider.created',
      entityType: 'financing_provider',
      entityId: values.providerId,
      entityLabel: values.name,
    })

    revalidateFinancing()
    return actionSuccess(values.providerId ? 'Provider updated.' : 'Provider added.')
  } catch (error) {
    return internalError('provider.save', error)
  }
}

/**
 * Removes a provider.
 *
 * Its rates cascade, and any inquiry that referenced it keeps its record with
 * `financing_provider_id` set to null - the customer's conversation is never
 * destroyed to tidy up configuration.
 */
export async function deleteFinancingProvider(providerId: string): Promise<ActionResult> {
  let session: AdminSession
  try {
    session = await authorizeAction('financing')
  } catch (error) {
    return authError(error)
  }

  const parsed = providerDeleteSchema.safeParse({ providerId })
  if (!parsed.success) return actionError('That provider could not be found.')

  try {
    const { data, error } = await session.supabase
      .from('financing_providers')
      .delete()
      .eq('id', parsed.data.providerId)
      .select('name')
      .maybeSingle()

    if (error) return handleWriteError('provider.delete', error)

    await recordActivity(session, {
      action: 'financing_provider.deleted',
      entityType: 'financing_provider',
      entityLabel: data?.name ?? null,
    })

    revalidateFinancing()
    return actionSuccess('Provider removed.')
  } catch (error) {
    return internalError('provider.delete', error)
  }
}

/* -------------------------------------------------------------------------- */
/* Financing rates                                                             */
/* -------------------------------------------------------------------------- */

export async function saveFinancingRate(input: {
  rateId: string | null
  providerId: string
  vehicleId: string
  termMonths: string | number
  interestRate: string | number
  minimumDownPaymentPercent: string | number
  isActive: boolean
  validFrom: string
  validUntil: string
}): Promise<ActionResult> {
  let session: AdminSession
  try {
    session = await authorizeAction('financing')
  } catch (error) {
    return authError(error)
  }

  const parsed = financingRateSchema.safeParse(input)
  if (!parsed.success) {
    return actionError('Please correct the highlighted fields.', zodErrors(parsed.error))
  }

  const values = parsed.data

  try {
    const row = {
      provider_id: values.providerId,
      vehicle_id: values.vehicleId,
      term_months: values.termMonths,
      interest_rate: values.interestRate,
      minimum_down_payment_percent: values.minimumDownPaymentPercent,
      is_active: values.isActive,
      valid_from: values.validFrom,
      valid_until: values.validUntil,
    }

    const { error } = values.rateId
      ? await session.supabase.from('financing_rates').update(row).eq('id', values.rateId)
      : await session.supabase.from('financing_rates').insert(row)

    if (error) return handleWriteError('rate.save', error)

    await recordActivity(session, {
      action: values.rateId ? 'financing_rate.updated' : 'financing_rate.created',
      entityType: 'financing_rate',
      entityId: values.rateId,
      metadata: { termMonths: values.termMonths, interestRate: values.interestRate },
    })

    revalidateFinancing()
    return actionSuccess(values.rateId ? 'Rate updated.' : 'Rate added.')
  } catch (error) {
    return internalError('rate.save', error)
  }
}

export async function deleteFinancingRate(rateId: string): Promise<ActionResult> {
  let session: AdminSession
  try {
    session = await authorizeAction('financing')
  } catch (error) {
    return authError(error)
  }

  const parsed = rateDeleteSchema.safeParse({ rateId })
  if (!parsed.success) return actionError('That rate could not be found.')

  try {
    const { error } = await session.supabase
      .from('financing_rates')
      .delete()
      .eq('id', parsed.data.rateId)

    if (error) return handleWriteError('rate.delete', error)

    await recordActivity(session, {
      action: 'financing_rate.deleted',
      entityType: 'financing_rate',
      entityId: parsed.data.rateId,
    })

    revalidateFinancing()
    return actionSuccess('Rate removed.')
  } catch (error) {
    return internalError('rate.delete', error)
  }
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function authError(error: unknown): ActionResult<never> {
  if (error instanceof AuthorizationError) return actionError(error.message)
  return internalError('settings.authorize', error)
}

function handleWriteError(context: string, error: { code?: string; message: string }) {
  if (error.code === '23505') {
    return actionError(
      'That already exists. A provider name must be unique, and each provider can have only one rate per term and vehicle.',
    )
  }
  if (error.code === '42501') {
    return actionError('You do not have permission to change this.')
  }
  if (error.code === '23514') {
    return actionError('One of the values is outside the allowed range.')
  }
  return internalError(context, error)
}
