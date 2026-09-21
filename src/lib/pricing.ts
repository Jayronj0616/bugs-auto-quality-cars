/**
 * One rule for which price a vehicle shows.
 *
 * Three numbers are stored (`srp`, `selling_price`, `promo_price`) and a promo
 * can be scheduled, so "what does this car cost?" is a real decision. It is
 * made here and nowhere else - cards, detail pages, the calculator and inquiry
 * snapshots all read the same answer.
 */

import { round } from '@/lib/utils'

export type PricingInput = {
  srp: number | null
  selling_price: number
  promo_price: number | null
  promo_label: string | null
  promo_starts_at: string | null
  promo_ends_at: string | null
}

export type VehiclePricing = {
  /** The price the customer actually pays, and the basis for every estimate. */
  price: number
  /** Higher struck-through price, when there is a genuine saving to show. */
  compareAtPrice: number | null
  savings: number | null
  savingsPercent: number | null
  isPromoActive: boolean
  promoLabel: string | null
  promoEndsAt: string | null
}

export function resolvePricing(vehicle: PricingInput, now: Date = new Date()): VehiclePricing {
  const sellingPrice = Number(vehicle.selling_price) || 0
  const promoPrice = vehicle.promo_price === null ? null : Number(vehicle.promo_price)
  const srp = vehicle.srp === null ? null : Number(vehicle.srp)

  const startsAt = vehicle.promo_starts_at ? new Date(vehicle.promo_starts_at) : null
  const endsAt = vehicle.promo_ends_at ? new Date(vehicle.promo_ends_at) : null

  // An unscheduled promo price is simply always on; a scheduled one only counts
  // inside its window.
  const isPromoActive =
    promoPrice !== null &&
    promoPrice > 0 &&
    promoPrice < sellingPrice &&
    (!startsAt || startsAt <= now) &&
    (!endsAt || endsAt > now)

  const price = isPromoActive && promoPrice !== null ? promoPrice : sellingPrice

  // Prefer the promo comparison; otherwise fall back to SRP when it is a real
  // discount rather than the same figure repeated.
  const compareAtPrice = isPromoActive
    ? sellingPrice
    : srp !== null && srp > sellingPrice
      ? srp
      : null

  const savings = compareAtPrice !== null ? round(compareAtPrice - price, 2) : null
  const savingsPercent =
    compareAtPrice !== null && compareAtPrice > 0 ? round((1 - price / compareAtPrice) * 100, 1) : null

  return {
    price,
    compareAtPrice,
    savings,
    savingsPercent,
    isPromoActive,
    promoLabel: isPromoActive ? (vehicle.promo_label?.trim() || 'Promo price') : null,
    promoEndsAt: isPromoActive ? vehicle.promo_ends_at : null,
  }
}
