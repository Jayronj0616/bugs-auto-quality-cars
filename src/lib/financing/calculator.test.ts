import { describe, expect, it } from 'vitest'

import {
  calculateFinancing,
  downPaymentFromPercent,
  estimateMonthlyPayment,
  monthlyPaymentFor,
  percentFromDownPayment,
} from './calculator'

/**
 * The calculator is the one piece of business logic a customer makes a real
 * financial decision on, so its edge cases are pinned down here rather than
 * discovered on the lot.
 */
describe('monthlyPaymentFor', () => {
  it('amortises a standard loan', () => {
    // ₱758,400 over 60 months at 7.5% p.a.
    // Cross-checked against the standard annuity formula.
    expect(monthlyPaymentFor(758_400, 7.5, 60)).toBeCloseTo(15_196.78, 1)
  })

  it('divides the principal evenly at zero interest', () => {
    expect(monthlyPaymentFor(600_000, 0, 60)).toBe(10_000)
  })

  it('treats a negative rate as zero interest rather than inverting the loan', () => {
    expect(monthlyPaymentFor(600_000, -5, 60)).toBe(10_000)
  })

  it('returns zero for a non-positive principal or term', () => {
    expect(monthlyPaymentFor(0, 7.5, 60)).toBe(0)
    expect(monthlyPaymentFor(-1000, 7.5, 60)).toBe(0)
    expect(monthlyPaymentFor(500_000, 7.5, 0)).toBe(0)
  })

  it('never returns NaN or Infinity for non-finite input', () => {
    expect(monthlyPaymentFor(Number.NaN, 7.5, 60)).toBe(0)
    expect(monthlyPaymentFor(500_000, Number.NaN, 60)).toBeGreaterThan(0)
    expect(Number.isFinite(monthlyPaymentFor(500_000, 7.5, Number.POSITIVE_INFINITY))).toBe(true)
  })

  it('charges more per month over a shorter term', () => {
    const short = monthlyPaymentFor(750_000, 7.5, 24)
    const long = monthlyPaymentFor(750_000, 7.5, 72)
    expect(short).toBeGreaterThan(long)
  })
})

describe('calculateFinancing', () => {
  const base = {
    vehiclePrice: 948_000,
    downPayment: 189_600,
    termMonths: 60,
    annualInterestRate: 7.5,
  }

  it('produces a complete, consistent breakdown', () => {
    const result = calculateFinancing(base)

    expect(result.isValid).toBe(true)
    expect(result.amountFinanced).toBe(758_400)
    expect(result.downPaymentPercent).toBe(20)
    expect(result.monthlyPayment).toBeCloseTo(15_196.78, 1)
    expect(result.totalOfPayments).toBeCloseTo(result.monthlyPayment * 60, 1)
    expect(result.totalInterest).toBeCloseTo(result.totalOfPayments - result.amountFinanced, 1)
    expect(result.totalCost).toBeCloseTo(result.totalOfPayments + result.downPayment, 1)
    expect(result.issues).toHaveLength(0)
  })

  it('handles zero interest', () => {
    const result = calculateFinancing({ ...base, annualInterestRate: 0 })

    expect(result.isValid).toBe(true)
    expect(result.monthlyPayment).toBeCloseTo(758_400 / 60, 2)
    expect(result.totalInterest).toBe(0)
  })

  it('rejects a down payment at or above the vehicle price', () => {
    const result = calculateFinancing({ ...base, downPayment: 948_000 })

    expect(result.isValid).toBe(false)
    expect(result.issues.map((issue) => issue.code)).toContain('down_payment_exceeds_price')
    expect(result.monthlyPayment).toBe(0)
    // Clamped, not left as an impossible figure.
    expect(result.amountFinanced).toBe(0)
  })

  it('rejects a down payment above the vehicle price', () => {
    const result = calculateFinancing({ ...base, downPayment: 2_000_000 })

    expect(result.isValid).toBe(false)
    expect(result.downPayment).toBe(948_000)
    expect(result.issues.map((issue) => issue.code)).toContain('down_payment_exceeds_price')
  })

  it('rejects a negative down payment', () => {
    const result = calculateFinancing({ ...base, downPayment: -5000 })

    expect(result.isValid).toBe(false)
    expect(result.downPayment).toBe(0)
    expect(result.issues.map((issue) => issue.code)).toContain('negative_down_payment')
  })

  it('rejects an invalid price, term or rate', () => {
    expect(calculateFinancing({ ...base, vehiclePrice: 0 }).issues.map((i) => i.code)).toContain(
      'invalid_price',
    )
    expect(calculateFinancing({ ...base, termMonths: 0 }).issues.map((i) => i.code)).toContain(
      'invalid_term',
    )
    expect(calculateFinancing({ ...base, termMonths: 500 }).issues.map((i) => i.code)).toContain(
      'invalid_term',
    )
    expect(
      calculateFinancing({ ...base, annualInterestRate: 250 }).issues.map((i) => i.code),
    ).toContain('invalid_rate')
  })

  it('survives NaN input without producing NaN output', () => {
    const result = calculateFinancing({
      vehiclePrice: Number.NaN,
      downPayment: Number.NaN,
      termMonths: Number.NaN,
      annualInterestRate: Number.NaN,
    })

    expect(result.isValid).toBe(false)
    expect(Number.isNaN(result.monthlyPayment)).toBe(false)
    expect(Number.isNaN(result.amountFinanced)).toBe(false)
  })

  it('flags a down payment below the provider minimum but still shows the figures', () => {
    const result = calculateFinancing({
      ...base,
      downPayment: 94_800, // 10%
      minimumDownPaymentPercent: 20,
    })

    // Advisory, not blocking: the customer can see what 10% would cost.
    expect(result.isValid).toBe(true)
    expect(result.monthlyPayment).toBeGreaterThan(0)
    expect(result.issues.map((issue) => issue.code)).toContain('below_minimum_down_payment')
  })

  it('does not flag a down payment exactly on the minimum', () => {
    const result = calculateFinancing({ ...base, minimumDownPaymentPercent: 20 })
    expect(result.issues).toHaveLength(0)
  })

  it('rounds money to two decimal places', () => {
    const result = calculateFinancing({
      vehiclePrice: 999_999,
      downPayment: 123_456.789,
      termMonths: 37,
      annualInterestRate: 6.33,
    })

    for (const value of [
      result.downPayment,
      result.amountFinanced,
      result.monthlyPayment,
      result.totalInterest,
    ]) {
      expect(value).toBe(Math.round(value * 100) / 100)
    }
  })

  it('treats a 100% down payment as nothing left to finance', () => {
    const result = calculateFinancing({ ...base, downPayment: base.vehiclePrice })
    expect(result.amountFinanced).toBe(0)
    expect(result.isValid).toBe(false)
  })
})

describe('down payment conversions', () => {
  it('round-trips a percentage through an amount', () => {
    const amount = downPaymentFromPercent(948_000, 20)
    expect(amount).toBe(189_600)
    expect(percentFromDownPayment(948_000, amount)).toBe(20)
  })

  it('clamps percentages into 0-100', () => {
    expect(downPaymentFromPercent(1_000_000, -10)).toBe(0)
    expect(downPaymentFromPercent(1_000_000, 150)).toBe(1_000_000)
  })

  it('clamps amounts to the vehicle price', () => {
    expect(percentFromDownPayment(1_000_000, 5_000_000)).toBe(100)
    expect(percentFromDownPayment(1_000_000, -5000)).toBe(0)
  })

  it('returns zero when there is no price to take a percentage of', () => {
    expect(downPaymentFromPercent(0, 20)).toBe(0)
    expect(percentFromDownPayment(0, 50_000)).toBe(0)
  })
})

describe('estimateMonthlyPayment', () => {
  it('matches a full calculation for the same inputs', () => {
    const estimate = estimateMonthlyPayment({
      vehiclePrice: 948_000,
      downPaymentPercent: 20,
      termMonths: 60,
      annualInterestRate: 7.5,
    })

    const full = calculateFinancing({
      vehiclePrice: 948_000,
      downPayment: 189_600,
      termMonths: 60,
      annualInterestRate: 7.5,
    })

    expect(estimate).toBeCloseTo(full.monthlyPayment, 2)
  })

  it('returns zero when the whole price is paid up front', () => {
    expect(
      estimateMonthlyPayment({
        vehiclePrice: 500_000,
        downPaymentPercent: 100,
        termMonths: 60,
        annualInterestRate: 7.5,
      }),
    ).toBe(0)
  })
})
