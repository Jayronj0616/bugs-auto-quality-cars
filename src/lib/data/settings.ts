import 'server-only'

import { cache } from 'react'

import { createPublicSupabaseClient } from '@/lib/supabase/server'
import type { BusinessHour, DealershipSettingsRow } from '@/types/database'

/**
 * Dealership settings: the one place contact information comes from.
 *
 * Header, footer, contact page, vehicle CTAs and the mobile action bar all read
 * this, so changing the phone number in /admin/settings changes it everywhere.
 */

export type DealershipSettings = DealershipSettingsRow

/** Used before a database exists, and as a floor if the settings row is missing. */
const FALLBACK_SETTINGS: DealershipSettings = {
  id: 'fallback',
  singleton: true,
  business_name: 'BUGS Auto Quality Cars',
  tagline: 'Quality cars. Transparent deals.',
  about: null,
  phone: null,
  phone_secondary: null,
  email: null,
  facebook_url: null,
  messenger_url: null,
  instagram_url: null,
  tiktok_url: null,
  viber_number: null,
  address_line1: null,
  address_line2: null,
  city: null,
  province: null,
  postal_code: null,
  country: 'Philippines',
  google_maps_url: null,
  google_maps_embed_url: null,
  business_hours: [],
  logo_url: null,
  hero_image_url: null,
  response_time_note: null,
  default_interest_rate: 7.5,
  default_down_payment_percent: 20,
  default_term_months: 60,
  financing_disclaimer:
    'Estimated monthly payment only. Actual financing rates, terms, fees, and approval depend on the financing provider and applicant qualifications.',
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
}

/**
 * `cache()` dedupes this within a single render pass - the header, footer and
 * page body all ask for settings, and only one query is issued.
 */
export const getDealershipSettings = cache(async (): Promise<DealershipSettings> => {
  const supabase = createPublicSupabaseClient()
  if (!supabase) return FALLBACK_SETTINGS

  const { data, error } = await supabase.from('dealership_settings').select('*').limit(1).maybeSingle()

  if (error || !data) {
    if (error) console.error('[settings] failed to load dealership settings:', error.message)
    return FALLBACK_SETTINGS
  }

  return { ...data, business_hours: normaliseHours(data.business_hours) }
})

function normaliseHours(value: unknown): BusinessHour[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (entry): entry is BusinessHour =>
      typeof entry === 'object' && entry !== null && 'day' in entry && 'open' in entry,
  )
}

/* -------------------------------------------------------------------------- */
/* Derived views of the settings, so components stay presentational            */
/* -------------------------------------------------------------------------- */

export function formatAddress(settings: DealershipSettings): string | null {
  const parts = [
    settings.address_line1,
    settings.address_line2,
    settings.city,
    settings.province,
    settings.postal_code,
    settings.country,
  ].filter((part): part is string => Boolean(part?.trim()))

  return parts.length > 0 ? parts.join(', ') : null
}

export function formatShortAddress(settings: DealershipSettings): string | null {
  const parts = [settings.city, settings.province].filter((part): part is string =>
    Boolean(part?.trim()),
  )
  return parts.length > 0 ? parts.join(', ') : null
}

const DAY_ORDER: BusinessHour['day'][] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

export function sortedBusinessHours(settings: DealershipSettings): BusinessHour[] {
  return [...settings.business_hours].sort(
    (a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day),
  )
}

/**
 * Whether the dealership has enough information configured to be contactable at
 * all. Drives the "finish setting up" prompts in the admin dashboard.
 */
export function hasContactDetails(settings: DealershipSettings): boolean {
  return Boolean(settings.phone || settings.email || settings.facebook_url)
}
