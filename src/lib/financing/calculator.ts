/**
 * Amortised loan maths for the installment calculator.
 *
 * Pure functions with no I/O: they run identically in the browser (so the
 * estimate updates as the customer drags a slider) and on the server (so a
 * submitted financing inquiry is recomputed rather than trusted).
 */

import { clamp, round } from '@/lib/utils'

export const MAX_TERM_MONTHS = 120
export const MAX_INTEREST_RATE = 100

export type FinancingIssueCode =
  | 'invalid_price'
  | 'invalid_term'
  | 'invalid_rate'
  | 'negative_down_payment'
  | 'down_payment_exceeds_price'
  | 'below_minimum_down_payment'

export type FinancingIssue = {
  code: FinancingIssueCode
  field: 'vehiclePrice' | 'downPayment' | 'termMonths' | 'interestRate'
  message: string
}

export type FinancingInput = {
  /** Cash price of the vehicle, in pesos. */
  vehiclePrice: number
  /** Down payment as an absolute peso amount. */
  downPayment: number
  termMonths: number
  /** Annual nominal interest rate, as a percentage (7.5 means 7.5%). */
  annualInterestRate: number
  /** Optional provider floor, as a percentage of the vehicle price. */
  minimumDownPaymentPercent?: number | null
}

export type FinancingResult = {
  vehiclePrice: number
  downPayment: number
  downPaymentPercent: number
  amountFinanced: number
  termMonths: number
  annualInterestRate: number
  monthlyPayment: number
  totalOfPayments: number
  totalInterest: number
  totalCost: number
  /** False when any issue would make the numbers meaningless. */
  isValid: boolean
  issues: FinancingIssue[]
}

/**
 * Standard amortisation:
 *
 *            P × r × (1 + r)ⁿ
 *   payment = ────────────────     r = annual rate / 12,  n = term in months
 *             (1 + r)ⁿ − 1
 *
 * With a zero rate the formula divides by zero, so that case is handled
 * separately as a straight division of the principal across the term.
 */
export function monthlyPaymentFor(
  principal: number,
  annualInterestRate: number,
  termMonths: number,
): number {
  if (!Number.isFinite(principal) || principal <= 0) return 0
  if (!Number.isFinite(termMonths) || termMonths <= 0) return 0

  const monthlyRate = annualInterestRate / 100 / 12

  if (!Number.isFinite(monthlyRate) || monthlyRate <= 0) {
    return round(principal / termMonths, 2)
  }

  const growth = (1 + monthlyRate) ** termMonths
  const payment = (principal * monthlyRate * growth) / (growth - 1)

  return Number.isFinite(payment) ? round(payment, 2) : 0
}

/**
 * Full breakdown for the calculator UI. Always returns a usable object: invalid
 * input produces zeroed figures plus the issues that explain why, rather than
 * throwing, so the component can keep rendering while the customer types.
 */
export function calculateFinancing(input: FinancingInput): FinancingResult {
  const issues: FinancingIssue[] = []

  const vehiclePrice = Number.isFinite(input.vehiclePrice) ? input.vehiclePrice : 0
  const termMonths = Number.isFinite(input.termMonths) ? Math.trunc(input.termMonths) : 0
  const annualInterestRate = Number.isFinite(input.annualInterestRate) ? input.annualInterestRate : 0
  const requestedDownPayment = Number.isFinite(input.downPayment) ? input.downPayment : 0

  if (vehiclePrice <= 0) {
    issues.push({
      code: 'invalid_price',
      field: 'vehiclePrice',
      message: 'Enter a vehicle price greater than zero.',
    })
  }

  if (termMonths <= 0 || termMonths > MAX_TERM_MONTHS) {
    issues.push({
      code: 'invalid_term',
      field: 'termMonths',
      message: `Choose a loan term between 1 and ${MAX_TERM_MONTHS} months.`,
    })
  }

  if (annualInterestRate < 0 || annualInterestRate > MAX_INTEREST_RATE) {
    issues.push({
      code: 'invalid_rate',
      field: 'interestRate',
      message: `Enter an interest rate between 0% and ${MAX_INTEREST_RATE}%.`,
    })
  }

  if (requestedDownPayment < 0) {
    issues.push({
      code: 'negative_down_payment',
      field: 'downPayment',
      message: 'Down payment cannot be negative.',
    })
  }

  // A down payment at or above the price means there is nothing to finance.
  // Report it, then clamp so the rest of the breakdown stays coherent.
  if (vehiclePrice > 0 && requestedDownPayment >= vehiclePrice) {
    issues.push({
      code: 'down_payment_exceeds_price',
      field: 'downPayment',
      message: 'Down payment must be less than the vehicle price.',
    })
  }

  const downPayment = round(clamp(requestedDownPayment, 0, Math.max(vehiclePrice, 0)), 2)
  const downPaymentPercent = vehiclePrice > 0 ? round((downPayment / vehiclePrice) * 100, 2) : 0

  const minimumPercent = input.minimumDownPaymentPercent ?? null
  if (
    minimumPercent !== null &&
    Number.isFinite(minimumPercent) &&
    vehiclePrice > 0 &&
    downPaymentPercent + 0.005 < minimumPercent
  ) {
    issues.push({
      code: 'below_minimum_down_payment',
      field: 'downPayment',
      message: `This provider requires at least ${round(minimumPercent, 2)}% down.`,
    })
  }

  const amountFinanced = round(Math.max(vehiclePrice - downPayment, 0), 2)

  // `below_minimum_down_payment` is advisory: the figures are still correct, the
  // customer simply would not qualify, so it does not zero out the estimate.
  const blocking = issues.filter((issue) => issue.code !== 'below_minimum_down_payment')
  const isValid = blocking.length === 0 && amountFinanced > 0

  const monthlyPayment = isValid ? monthlyPaymentFor(amountFinanced, annualInterestRate, termMonths) : 0
  const totalOfPayments = isValid ? round(monthlyPayment * termMonths, 2) : 0
  const totalInterest = isValid ? round(Math.max(totalOfPayments - amountFinanced, 0), 2) : 0
  const totalCost = isValid ? round(totalOfPayments + downPayment, 2) : 0

  return {
    vehiclePrice: round(vehiclePrice, 2),
    downPayment,
    downPaymentPercent,
    amountFinanced,
    termMonths,
    annualInterestRate: round(annualInterestRate, 2),
    monthlyPayment,
    totalOfPayments,
    totalInterest,
    totalCost,
    isValid,
    issues,
  }
}

/** Converts a percentage of the price into a peso down payment. */
export function downPaymentFromPercent(vehiclePrice: number, percent: number): number {
  if (!Number.isFinite(vehiclePrice) || vehiclePrice <= 0) return 0
  const safePercent = clamp(Number.isFinite(percent) ? percent : 0, 0, 100)
  return round((vehiclePrice * safePercent) / 100, 2)
}

/** Converts a peso down payment back into a percentage of the price. */
export function percentFromDownPayment(vehiclePrice: number, downPayment: number): number {
  if (!Number.isFinite(vehiclePrice) || vehiclePrice <= 0) return 0
  const safeAmount = clamp(Number.isFinite(downPayment) ? downPayment : 0, 0, vehiclePrice)
  return round((safeAmount / vehiclePrice) * 100, 2)
}

/**
 * "From ₱15,196/month" figure shown on vehicle cards, using whichever defaults
 * apply to that vehicle.
 */
export function estimateMonthlyPayment(params: {
  vehiclePrice: number
  downPaymentPercent: number
  termMonths: number
  annualInterestRate: number
}): number {
  const downPayment = downPaymentFromPercent(params.vehiclePrice, params.downPaymentPercent)
  const principal = Math.max(params.vehiclePrice - downPayment, 0)
  return monthlyPaymentFor(principal, params.annualInterestRate, params.termMonths)
}
