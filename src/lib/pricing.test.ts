import { describe, expect, it } from 'vitest'

import { resolvePricing, type PricingInput } from './pricing'

const vehicle = (overrides: Partial<PricingInput> = {}): PricingInput => ({
  srp: null,
  selling_price: 948_000,
  promo_price: null,
  promo_label: null,
  promo_starts_at: null,
  promo_ends_at: null,
  ...overrides,
})

/**
 * Every surface that shows a price reads this function, so "which number does
 * the customer see?" only has to be correct in one place.
 */
describe('resolvePricing', () => {
  it('shows the selling price when nothing else applies', () => {
    const pricing = resolvePricing(vehicle())

    expect(pricing.price).toBe(948_000)
    expect(pricing.compareAtPrice).toBeNull()
    expect(pricing.isPromoActive).toBe(false)
  })

  it('shows SRP as the comparison when it is genuinely higher', () => {
    const pricing = resolvePricing(vehicle({ srp: 998_000 }))

    expect(pricing.price).toBe(948_000)
    expect(pricing.compareAtPrice).toBe(998_000)
    expect(pricing.savings).toBe(50_000)
    expect(pricing.savingsPercent).toBeCloseTo(5, 1)
  })

  it('ignores an SRP that is not actually higher', () => {
    expect(resolvePricing(vehicle({ srp: 948_000 })).compareAtPrice).toBeNull()
    expect(resolvePricing(vehicle({ srp: 900_000 })).compareAtPrice).toBeNull()
  })

  it('applies an unscheduled promo price immediately', () => {
    const pricing = resolvePricing(
      vehicle({ promo_price: 898_000, promo_label: 'Year-end promo', srp: 998_000 }),
    )

    expect(pricing.isPromoActive).toBe(true)
    expect(pricing.price).toBe(898_000)
    // The promo compares against the selling price, not the SRP.
    expect(pricing.compareAtPrice).toBe(948_000)
    expect(pricing.savings).toBe(50_000)
    expect(pricing.promoLabel).toBe('Year-end promo')
  })

  it('falls back to a default label when the promo has no name', () => {
    expect(resolvePricing(vehicle({ promo_price: 898_000 })).promoLabel).toBe('Promo price')
  })

  it('ignores a promo price that is not a discount', () => {
    expect(resolvePricing(vehicle({ promo_price: 948_000 })).isPromoActive).toBe(false)
    expect(resolvePricing(vehicle({ promo_price: 0 })).isPromoActive).toBe(false)
  })

  it('respects a promo that has not started', () => {
    const now = new Date('2026-09-21T00:00:00Z')
    const pricing = resolvePricing(
      vehicle({ promo_price: 898_000, promo_starts_at: '2026-10-01T00:00:00Z' }),
      now,
    )

    expect(pricing.isPromoActive).toBe(false)
    expect(pricing.price).toBe(948_000)
  })

  it('respects a promo that has expired', () => {
    const now = new Date('2026-09-21T00:00:00Z')
    const pricing = resolvePricing(
      vehicle({ promo_price: 898_000, promo_ends_at: '2026-09-01T00:00:00Z' }),
      now,
    )

    expect(pricing.isPromoActive).toBe(false)
    expect(pricing.price).toBe(948_000)
  })

  it('applies a promo inside its window', () => {
    const now = new Date('2026-09-21T00:00:00Z')
    const pricing = resolvePricing(
      vehicle({
        promo_price: 898_000,
        promo_starts_at: '2026-09-01T00:00:00Z',
        promo_ends_at: '2026-10-01T00:00:00Z',
      }),
      now,
    )

    expect(pricing.isPromoActive).toBe(true)
    expect(pricing.price).toBe(898_000)
    expect(pricing.promoEndsAt).toBe('2026-10-01T00:00:00Z')
  })

  it('coerces numeric strings, which is how Postgres numerics can arrive', () => {
    const pricing = resolvePricing({
      ...vehicle(),
      selling_price: '948000' as unknown as number,
      promo_price: '898000' as unknown as number,
    })

    expect(pricing.price).toBe(898_000)
    expect(pricing.savings).toBe(50_000)
  })
})
