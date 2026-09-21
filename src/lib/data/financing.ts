import 'server-only'

import { cache } from 'react'

import { LOAN_TERMS } from '@/lib/constants'
import { createPublicSupabaseClient } from '@/lib/supabase/server'
import type { FinancingProviderRow, FinancingRateRow } from '@/types/database'

import type { FinancingDefaults } from './vehicles'
import type { DealershipSettings } from './settings'

/**
 * Financing configuration for the public calculator.
 *
 * A "rate" is one row per provider and term. Rows with a vehicle_id override the
 * provider's general rate for that vehicle, which is how a manufacturer promo
 * ("0% for 24 months on the Seal 5") is expressed without a second table.
 */

export type FinancingTerm = {
  termMonths: number
  interestRate: number
  minimumDownPaymentPercent: number
  /** True when this rate was configured specifically for the vehicle. */
  isVehicleSpecific: boolean
}

export type FinancingOption = {
  provider: FinancingProviderRow
  terms: FinancingTerm[]
}

export type FinancingConfiguration = {
  options: FinancingOption[]
  defaults: FinancingDefaults
  disclaimer: string
  /** Terms offered across all providers, for the generic calculator page. */
  availableTerms: number[]
}

export const getFinancingProviders = cache(async (): Promise<FinancingProviderRow[]> => {
  const supabase = createPublicSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('financing_providers')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    console.error('[financing] providers failed:', error.message)
    return []
  }
  return data ?? []
})

const getFinancingRates = cache(async (vehicleId: string | null): Promise<FinancingRateRow[]> => {
  const supabase = createPublicSupabaseClient()
  if (!supabase) return []

  // Grab the general rates plus this vehicle's overrides in one round trip.
  const filter = vehicleId ? `vehicle_id.is.null,vehicle_id.eq.${vehicleId}` : 'vehicle_id.is.null'

  const { data, error } = await supabase
    .from('financing_rates')
    .select('*')
    .eq('is_active', true)
    .or(filter)
    .order('term_months', { ascending: true })

  if (error) {
    console.error('[financing] rates failed:', error.message)
    return []
  }
  return data ?? []
})

/**
 * Resolves what the calculator should offer for a given vehicle (or, with a
 * null vehicle, for the standalone financing page).
 */
export async function getFinancingConfiguration(
  settings: DealershipSettings,
  vehicle: { id: string; default_down_payment_percent: number | null; default_term_months: number | null } | null = null,
): Promise<FinancingConfiguration> {
  const [providers, rates] = await Promise.all([
    getFinancingProviders(),
    getFinancingRates(vehicle?.id ?? null),
  ])

  const byProvider = new Map<string, Map<number, FinancingTerm>>()

  for (const rate of rates) {
    const terms = byProvider.get(rate.provider_id) ?? new Map<number, FinancingTerm>()
    const existing = terms.get(rate.term_months)
    const isVehicleSpecific = rate.vehicle_id !== null

    // A vehicle-specific rate always wins over the provider's general rate.
    if (!existing || (isVehicleSpecific && !existing.isVehicleSpecific)) {
      terms.set(rate.term_months, {
        termMonths: rate.term_months,
        interestRate: Number(rate.interest_rate),
        minimumDownPaymentPercent: Number(rate.minimum_down_payment_percent),
        isVehicleSpecific,
      })
    }
    byProvider.set(rate.provider_id, terms)
  }

  const options: FinancingOption[] = providers
    .map((provider) => ({
      provider,
      terms: [...(byProvider.get(provider.id)?.values() ?? [])].sort(
        (a, b) => a.termMonths - b.termMonths,
      ),
    }))
    .filter((option) => option.terms.length > 0)

  const availableTerms = [...new Set(options.flatMap((o) => o.terms.map((t) => t.termMonths)))].sort(
    (a, b) => a - b,
  )

  return {
    options,
    defaults: resolveFinancingDefaults(settings, vehicle, options),
    disclaimer: settings.financing_disclaimer,
    availableTerms: availableTerms.length > 0 ? availableTerms : [...LOAN_TERMS],
  }
}

/**
 * The starting values the calculator opens on.
 *
 * Precedence: the vehicle's own defaults, then the dealership defaults, and the
 * interest rate from whichever configured provider actually offers that term.
 */
export function resolveFinancingDefaults(
  settings: DealershipSettings,
  vehicle: { default_down_payment_percent: number | null; default_term_months: number | null } | null,
  options: FinancingOption[] = [],
): FinancingDefaults {
  const downPaymentPercent = Number(
    vehicle?.default_down_payment_percent ?? settings.default_down_payment_percent,
  )
  const termMonths = Number(vehicle?.default_term_months ?? settings.default_term_months)

  const matchingRates = options
    .flatMap((option) => option.terms)
    .filter((term) => term.termMonths === termMonths)

  // Lead with the most competitive configured rate; fall back to the dealership
  // default when nothing is configured for that term yet.
  const interestRate =
    matchingRates.length > 0
      ? Math.min(...matchingRates.map((term) => term.interestRate))
      : Number(settings.default_interest_rate)

  return { downPaymentPercent, termMonths, interestRate }
}

/**
 * Lightweight defaults for pages that only need an indicative monthly figure
 * (vehicle cards, homepage) and should not pay for the full rate query.
 */
export function defaultsFromSettings(settings: DealershipSettings): FinancingDefaults {
  return {
    downPaymentPercent: Number(settings.default_down_payment_percent),
    termMonths: Number(settings.default_term_months),
    interestRate: Number(settings.default_interest_rate),
  }
}
