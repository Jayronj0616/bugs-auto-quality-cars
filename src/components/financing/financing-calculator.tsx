'use client'

import * as React from 'react'
import { Info } from 'lucide-react'

import { Field, Input, Select } from '@/components/ui/field'
import { DOWN_PAYMENT_PRESETS } from '@/lib/constants'
import type { FinancingConfiguration } from '@/lib/data/financing'
import { formatPeso, formatPesoPrecise, formatPercent } from '@/lib/format'
import {
  calculateFinancing,
  downPaymentFromPercent,
  percentFromDownPayment,
  type FinancingResult,
} from '@/lib/financing/calculator'
import { cn, round, toNumber } from '@/lib/utils'

export type CalculatorState = {
  vehiclePrice: number
  downPayment: number
  downPaymentPercent: number
  termMonths: number
  interestRate: number
  providerId: string | null
}

/**
 * Installment calculator.
 *
 * Runs entirely on the client because it is arithmetic, not data access - the
 * estimate updates as fast as the customer can type. When those numbers are
 * attached to an inquiry they are revalidated and recomputed on the server; the
 * figures posted from the browser are never trusted.
 *
 * Down payment is editable as either a percentage or a peso amount, and the two
 * stay in step.
 */
export function FinancingCalculator({
  configuration,
  initialPrice,
  priceEditable = false,
  onChange,
  className,
  compact = false,
}: {
  configuration: FinancingConfiguration
  initialPrice: number
  /** True on the standalone /financing page, where there is no fixed vehicle. */
  priceEditable?: boolean
  onChange?: (state: CalculatorState, result: FinancingResult) => void
  className?: string
  compact?: boolean
}) {
  const { options, defaults, availableTerms, disclaimer } = configuration

  const [providerId, setProviderId] = React.useState<string | null>(
    options[0]?.provider.id ?? null,
  )
  const [vehiclePrice, setVehiclePrice] = React.useState(initialPrice)
  const [termMonths, setTermMonths] = React.useState(defaults.termMonths)
  const [downPaymentPercent, setDownPaymentPercent] = React.useState(defaults.downPaymentPercent)
  const [downPayment, setDownPayment] = React.useState(() =>
    downPaymentFromPercent(initialPrice, defaults.downPaymentPercent),
  )
  /** Null means "follow the configured rate"; a number is the customer's own. */
  const [rateOverride, setRateOverride] = React.useState<number | null>(null)

  const selectedProvider = options.find((option) => option.provider.id === providerId) ?? null
  const selectedTerm = selectedProvider?.terms.find((term) => term.termMonths === termMonths) ?? null

  // Derived rather than synced: the rate follows the chosen provider and term
  // automatically, and only an explicit edit takes it over. No effect, and no
  // frame where the displayed rate belongs to the previous provider.
  const rateOverridden = rateOverride !== null
  const interestRate = rateOverride ?? selectedTerm?.interestRate ?? defaults.interestRate

  // A parent that swaps the vehicle price (switching units without unmounting)
  // resets the amounts, keeping the customer's chosen percentage.
  const [lastInitialPrice, setLastInitialPrice] = React.useState(initialPrice)
  if (lastInitialPrice !== initialPrice) {
    setLastInitialPrice(initialPrice)
    setVehiclePrice(initialPrice)
    setDownPayment(downPaymentFromPercent(initialPrice, downPaymentPercent))
  }

  const minimumDownPaymentPercent = selectedTerm?.minimumDownPaymentPercent ?? null

  const result = calculateFinancing({
    vehiclePrice,
    downPayment,
    termMonths,
    annualInterestRate: interestRate,
    minimumDownPaymentPercent,
  })

  // Report upward after paint. The callback lives in a ref updated in its own
  // effect (never during render) so a parent passing an inline arrow function
  // does not retrigger the notification on every render, and the figures are
  // recomputed here from the same pure function rather than captured in a ref.
  const onChangeRef = React.useRef(onChange)
  React.useEffect(() => {
    onChangeRef.current = onChange
  })

  React.useEffect(() => {
    onChangeRef.current?.(
      { vehiclePrice, downPayment, downPaymentPercent, termMonths, interestRate, providerId },
      calculateFinancing({
        vehiclePrice,
        downPayment,
        termMonths,
        annualInterestRate: interestRate,
        minimumDownPaymentPercent,
      }),
    )
  }, [
    vehiclePrice,
    downPayment,
    downPaymentPercent,
    termMonths,
    interestRate,
    providerId,
    minimumDownPaymentPercent,
  ])

  function applyPercent(percent: number) {
    const safePercent = round(Math.min(Math.max(percent, 0), 99.99), 2)
    setDownPaymentPercent(safePercent)
    setDownPayment(downPaymentFromPercent(vehiclePrice, safePercent))
  }

  function applyAmount(amount: number) {
    const safeAmount = Math.max(amount, 0)
    setDownPayment(safeAmount)
    setDownPaymentPercent(percentFromDownPayment(vehiclePrice, safeAmount))
  }

  function applyPrice(price: number) {
    const safePrice = Math.max(price, 0)
    setVehiclePrice(safePrice)
    // Holding the percentage steady is what a shopper expects when they change
    // the price they are considering.
    setDownPayment(downPaymentFromPercent(safePrice, downPaymentPercent))
  }

  const terms = selectedProvider ? selectedProvider.terms.map((term) => term.termMonths) : availableTerms
  const downPaymentIssue = result.issues.find((issue) => issue.field === 'downPayment')

  return (
    <div className={cn('space-y-5', className)}>
      {options.length > 0 ? (
        <Field label="Financing provider">
          <Select
            value={providerId ?? ''}
            onChange={(event) => {
              setProviderId(event.target.value || null)
              setRateOverride(null)
            }}
          >
            {options.map((option) => (
              <option key={option.provider.id} value={option.provider.id}>
                {option.provider.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      {priceEditable ? (
        <Field label="Vehicle price" description="Enter the cash price of the vehicle.">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            step={10000}
            value={vehiclePrice || ''}
            onChange={(event) => applyPrice(toNumber(event.target.value) ?? 0)}
          />
        </Field>
      ) : (
        <div className="flex items-baseline justify-between gap-4 border-b border-ink-200 pb-4">
          <span className="text-sm text-ink-600">Vehicle price</span>
          <span className="tabular text-lg font-semibold text-ink-900">
            {formatPeso(vehiclePrice)}
          </span>
        </div>
      )}

      <Field
        label="Down payment"
        error={downPaymentIssue?.message}
        description={
          selectedTerm
            ? `Minimum ${formatPercent(selectedTerm.minimumDownPaymentPercent)} for this provider and term.`
            : undefined
        }
      >
        <div className="grid grid-cols-[5.5rem_1fr] gap-2">
          <div className="relative">
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              max={99}
              step={1}
              aria-label="Down payment percentage"
              value={downPaymentPercent || ''}
              onChange={(event) => applyPercent(toNumber(event.target.value) ?? 0)}
              className="pr-7"
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-ink-500">
              %
            </span>
          </div>

          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-ink-500">
              ₱
            </span>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              step={5000}
              aria-label="Down payment amount"
              value={downPayment || ''}
              onChange={(event) => applyAmount(toNumber(event.target.value) ?? 0)}
              className="pl-7"
            />
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {DOWN_PAYMENT_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => applyPercent(preset)}
              aria-pressed={Math.round(downPaymentPercent) === preset}
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                Math.round(downPaymentPercent) === preset
                  ? 'bg-brand-800 text-white'
                  : 'border border-ink-300 bg-white text-ink-600 hover:border-ink-400 hover:text-ink-900',
              )}
            >
              {preset}%
            </button>
          ))}
        </div>
      </Field>

      <div className={cn('grid gap-4', compact ? 'grid-cols-1' : 'sm:grid-cols-2')}>
        <Field label="Loan term">
          <Select
            value={termMonths}
            onChange={(event) => {
              setTermMonths(Number(event.target.value))
              setRateOverride(null)
            }}
          >
            {terms.map((term) => (
              <option key={term} value={term}>
                {term} months
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Interest rate"
          description={rateOverridden ? 'Using your rate instead of the configured one.' : undefined}
        >
          <div className="relative">
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              step={0.25}
              value={interestRate}
              onChange={(event) => setRateOverride(toNumber(event.target.value) ?? 0)}
              className="pr-7"
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-ink-500">
              %
            </span>
          </div>
        </Field>
      </div>

      <CalculationSummary result={result} />

      <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-500">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        {disclaimer}
      </p>
    </div>
  )
}

function CalculationSummary({ result }: { result: FinancingResult }) {
  const rows = [
    { label: 'Amount financed', value: formatPeso(result.amountFinanced) },
    { label: 'Total interest', value: formatPeso(result.totalInterest) },
    { label: 'Total of payments', value: formatPeso(result.totalOfPayments) },
  ]

  return (
    <div className="rounded-card border border-ink-200 bg-ink-50 p-5">
      <p className="text-xs font-medium tracking-wide text-ink-500 uppercase">
        Estimated monthly payment
      </p>

      {/* aria-live so the figure is announced as the inputs change, without the
          customer having to hunt for it. */}
      <p className="tabular mt-1 text-3xl font-bold text-ink-900 sm:text-4xl" aria-live="polite">
        {result.isValid ? (
          <>
            {formatPesoPrecise(result.monthlyPayment)}
            <span className="ml-1 text-base font-medium text-ink-500">/month</span>
          </>
        ) : (
          <span className="text-xl font-semibold text-ink-400">Enter valid values</span>
        )}
      </p>

      {result.isValid ? (
        <dl className="mt-4 space-y-2 border-t border-ink-200 pt-4 text-sm">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between gap-4">
              <dt className="text-ink-600">{row.label}</dt>
              <dd className="tabular font-medium text-ink-900">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <ul className="mt-3 space-y-1 text-sm text-danger-700">
          {result.issues.map((issue) => (
            <li key={issue.code}>{issue.message}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
