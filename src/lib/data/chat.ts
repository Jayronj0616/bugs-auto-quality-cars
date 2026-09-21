import 'server-only'

import { cache } from 'react'

import {
  defaultsFromSettings,
  getFinancingProviders,
  getVehicleRates,
  pickVehicleRate,
} from '@/lib/data/financing'
import { formatAddress, getDealershipSettings } from '@/lib/data/settings'
import { estimateMonthlyPayment } from '@/lib/financing/calculator'
import { resolvePricing } from '@/lib/pricing'
import { PUBLICLY_VISIBLE_STATUSES } from '@/lib/constants'
import { createPublicSupabaseClient } from '@/lib/supabase/server'
import type { ChatContext, ChatVehicle } from '@/lib/chat/script'
import type { VehicleStatus } from '@/types/database'

/**
 * Knowledge the scripted assistant answers from.
 *
 * Read through the anonymous client, so the assistant can only ever talk about
 * vehicles the public site already shows - a draft or archived listing is
 * invisible to it for the same reason it is invisible on /cars.
 *
 * Capped deliberately: this payload ships to the browser, so it stays a summary
 * rather than the full inventory.
 */

const MAX_VEHICLES = 40

export const getChatContext = cache(async (): Promise<ChatContext> => {
  const settings = await getDealershipSettings()
  const defaults = defaultsFromSettings(settings)

  const base: ChatContext = {
    businessName: settings.business_name,
    phone: settings.phone,
    email: settings.email,
    facebookUrl: settings.facebook_url,
    address: formatAddress(settings),
    mapsUrl: settings.google_maps_url,
    hours: settings.business_hours,
    financingDisclaimer: settings.financing_disclaimer,
    responseTimeNote: settings.response_time_note,
    vehicles: [],
    financing: defaults,
    providers: [],
  }

  const supabase = createPublicSupabaseClient()
  if (!supabase) return base

  const [{ data, error }, providers] = await Promise.all([
    supabase
      .from('vehicles')
      .select(
        'id, slug, brand, model, variant, year, status, condition, body_type, fuel_type, transmission, mileage, seating_capacity, engine, srp, selling_price, promo_price, promo_label, promo_starts_at, promo_ends_at, default_down_payment_percent, default_term_months, vehicle_images(id)',
      )
      .in('status', PUBLICLY_VISIBLE_STATUSES)
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(MAX_VEHICLES),
    getFinancingProviders(),
  ])

  if (error) {
    console.error('[chat] failed to load vehicles:', error.message)
    return base
  }

  const rows = (data ?? []) as unknown as (Record<string, unknown> & {
    vehicle_images: { id: string }[] | null
  })[]

  const vehicleRates = await getVehicleRates(rows.map((row) => row.id as string))

  const vehicles: ChatVehicle[] = rows.map((row) => {
    const pricing = resolvePricing({
      srp: row.srp as number | null,
      selling_price: row.selling_price as number,
      promo_price: row.promo_price as number | null,
      promo_label: row.promo_label as string | null,
      promo_starts_at: row.promo_starts_at as string | null,
      promo_ends_at: row.promo_ends_at as string | null,
    })

    // Quote the rate configured for this unit, not the dealership's generic
    // default - the assistant must not undercut the real financing offer.
    const termMonths = (row.default_term_months as number | null) ?? defaults.termMonths
    const vehicleRate = pickVehicleRate(vehicleRates.get(row.id as string), termMonths)
    const downPaymentPercent =
      (row.default_down_payment_percent as number | null) ??
      vehicleRate?.minimumDownPaymentPercent ??
      defaults.downPaymentPercent

    const monthly = estimateMonthlyPayment({
      vehiclePrice: pricing.price,
      downPaymentPercent,
      termMonths,
      annualInterestRate: vehicleRate?.interestRate ?? defaults.interestRate,
    })

    return {
      id: row.id as string,
      slug: row.slug as string,
      title: [row.year, row.brand, row.model, row.variant].filter(Boolean).join(' '),
      price: pricing.price,
      compareAtPrice: pricing.compareAtPrice,
      monthly: monthly > 0 ? monthly : null,
      status: row.status as Extract<VehicleStatus, 'published' | 'reserved' | 'sold'>,
      condition: row.condition as string,
      bodyType: (row.body_type as string | null) ?? null,
      fuelType: (row.fuel_type as string | null) ?? null,
      transmission: (row.transmission as string | null) ?? null,
      year: row.year as number,
      mileage: (row.mileage as number | null) ?? null,
      seatingCapacity: (row.seating_capacity as number | null) ?? null,
      engine: (row.engine as string | null) ?? null,
      hasPhotos: (row.vehicle_images?.length ?? 0) > 0,
      downPaymentPercent,
      termMonths,
    }
  })

  return {
    ...base,
    vehicles,
    providers: providers.map((provider) => provider.name),
  }
})
