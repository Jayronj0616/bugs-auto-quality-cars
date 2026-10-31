'use client'

import * as React from 'react'
import { Info } from 'lucide-react'

import { Field, Input, Select } from '@/components/ui/field'
import type { FinancingConfiguration } from '@/lib/data/financing'
import { formatPeso, formatPesoPrecise, formatPercent } from '@/lib/format'
import {
  calculateFinancing,
  fixedDownPayment,
  percentFromDownPayment,
  type FinancingResult,
} from '@/lib/financing/calculator'
import { cn, toNumber } from '@/lib/utils'

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
 * The down payment and interest rate are fixed, not something the visitor
 * adjusts: on a vehicle they are the dealership's quote for the chosen provider
 * and term, elsewhere the defaults set under Financing in the admin. Letting a
 * visitor enter their own produced monthly figures the dealership could not
 * actually offer. The visitor picks the provider, the term, and on /financing
 * the price.
 */
export function FinancingCalculator({
  configuration,
  initialPrice,
  priceEditable = false,
  onChange,
  className,
}: {
  configuration: FinancingConfiguration
  initialPrice: number
  /** True on the standalone /financing page, where there is no fixed vehicle. */
  priceEditable?: boolean
  onChange?: (state: CalculatorState, result: FinancingResult) => void
  className?: string
}) {
  const { options, defaults, availableTerms, disclaimer } = configuration

  const [providerId, setProviderId] = React.useState<string | null>(
    options[0]?.provider.id ?? null,
  )
  const [vehiclePrice, setVehiclePrice] = React.useState(initialPrice)
  const [termMonths, setTermMonths] = React.useState(defaults.termMonths)
  const downPayment = fixedDownPayment(vehiclePrice, defaults.downPaymentPercent)
  const downPaymentPercent = percentFromDownPayment(vehiclePrice, downPayment)

  const selectedProvider = options.find((option) => option.provider.id === providerId) ?? null
  const selectedTerm = selectedProvider?.terms.find((term) => term.termMonths === termMonths) ?? null

  // Derived rather than synced: the rate follows the chosen provider and term,
  // with no frame where the displayed rate belongs to the previous provider.
  const interestRate = selectedTerm?.interestRate ?? defaults.interestRate

  // A parent that swaps the vehicle price (switching units without unmounting)
  // resets it; the down payment follows from the price.
  const [lastInitialPrice, setLastInitialPrice] = React.useState(initialPrice)
  if (lastInitialPrice !== initialPrice) {
    setLastInitialPrice(initialPrice)
    setVehiclePrice(initialPrice)
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

  function applyPrice(price: number) {
    setVehiclePrice(Math.max(price, 0))
  }

  const terms = selectedProvider ? selectedProvider.terms.map((term) => term.termMonths) : availableTerms
  const downPaymentIssue = result.issues.find((issue) => issue.field === 'downPayment')

  return (
    <div className={cn('space-y-5', className)}>
      {options.length > 0 ? (
        <Field label="Financing provider">
          <Select
            value={providerId ?? ''}
            onChange={(event) => setProviderId(event.target.value || null)}
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

      <div className="border-b border-ink-200 pb-4">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-sm text-ink-600">Down payment</span>
          <span className="tabular text-lg font-semibold text-ink-900">
            {formatPeso(downPayment)}
            <span className="ml-1.5 text-sm font-medium text-ink-500">
              ({formatPercent(downPaymentPercent)})
            </span>
          </span>
        </div>
        {downPaymentIssue ? (
          <p className="mt-1.5 text-sm text-danger-700">{downPaymentIssue.message}</p>
        ) : null}
      </div>

      <Field label="Loan term">
        <Select value={termMonths} onChange={(event) => setTermMonths(Number(event.target.value))}>
          {terms.map((term) => (
            <option key={term} value={term}>
              {term} months
            </option>
          ))}
        </Select>
      </Field>

      <div className="flex items-baseline justify-between gap-4 border-b border-ink-200 pb-4">
        <span className="text-sm text-ink-600">Interest rate</span>
        <span className="tabular text-lg font-semibold text-ink-900">
          {formatPercent(interestRate)}
          <span className="ml-1.5 text-sm font-medium text-ink-500">per year</span>
        </span>
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
