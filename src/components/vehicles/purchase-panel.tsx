'use client'

import * as React from 'react'
import { CalendarClock, MessageSquare, Phone, Tag } from 'lucide-react'

import { FinancingCalculator, type CalculatorState } from '@/components/financing/financing-calculator'
import { InquiryForm } from '@/components/forms/inquiry-form'
import { TestDriveForm } from '@/components/forms/test-drive-form'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import type { FinancingConfiguration } from '@/lib/data/financing'
import type { VehiclePricing } from '@/lib/pricing'
import { formatPeso, formatPesoPrecise } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { FinancingProviderRow, VehicleStatus } from '@/types/database'

type PurchaseMode = 'cash' | 'installment'

/**
 * Cash / installment panel on the vehicle page.
 *
 * The switcher changes how the price is framed, not what the customer can do:
 * both modes lead to an inquiry, and whichever numbers the calculator is
 * showing travel with it so the salesperson opens a request that already has
 * the customer's assumptions in it.
 */
export function PurchasePanel({
  vehicleId,
  vehicleTitle,
  pricing,
  status,
  configuration,
  providers,
  phone,
  telHref,
  sourcePath,
}: {
  vehicleId: string
  vehicleTitle: string
  pricing: VehiclePricing
  status: VehicleStatus
  configuration: FinancingConfiguration
  providers: FinancingProviderRow[]
  phone: string | null
  telHref: string | null
  sourcePath: string
}) {
  const [mode, setMode] = React.useState<PurchaseMode>('cash')
  const [calculator, setCalculator] = React.useState<CalculatorState | null>(null)
  const [monthly, setMonthly] = React.useState<number | null>(null)
  const [inquiryOpen, setInquiryOpen] = React.useState(false)
  const [testDriveOpen, setTestDriveOpen] = React.useState(false)

  const isSold = status === 'sold'
  const isReserved = status === 'reserved'

  const financingDefaults =
    calculator && mode === 'installment'
      ? {
          downPaymentAmount: calculator.downPayment,
          downPaymentPercent: calculator.downPaymentPercent,
          loanTermMonths: calculator.termMonths,
          interestRate: calculator.interestRate,
          providerId: calculator.providerId,
        }
      : null

  return (
    <div className="rounded-card border border-ink-200 bg-white p-5 shadow-card sm:p-6">
      <div
        role="tablist"
        aria-label="Purchase options"
        className="grid grid-cols-2 gap-1 rounded-md bg-ink-100 p-1"
      >
        {(['cash', 'installment'] as const).map((option) => (
          <button
            key={option}
            role="tab"
            type="button"
            id={`tab-${option}`}
            aria-selected={mode === option}
            aria-controls={`panel-${option}`}
            onClick={() => setMode(option)}
            className={cn(
              'h-10 rounded-[0.3rem] text-sm font-semibold tracking-wide uppercase transition-all',
              mode === option
                ? 'bg-white text-ink-900 shadow-xs'
                : 'text-ink-500 hover:text-ink-800',
            )}
          >
            {option === 'cash' ? 'Cash' : 'Installment'}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {mode === 'cash' ? (
          <div role="tabpanel" id="panel-cash" aria-labelledby="tab-cash" className="animate-fade-in">
            <p className="text-sm text-ink-600">Cash price</p>
            <p className="tabular mt-1 text-4xl font-bold text-ink-900">
              {formatPeso(pricing.price)}
            </p>

            {pricing.compareAtPrice ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="tabular text-sm text-ink-400 line-through">
                  {formatPeso(pricing.compareAtPrice)}
                </span>
                {pricing.savings ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent-50 px-2.5 py-1 text-xs font-semibold text-accent-800">
                    <Tag className="size-3" aria-hidden="true" />
                    Save {formatPeso(pricing.savings)}
                  </span>
                ) : null}
              </div>
            ) : null}

            <p className="mt-4 text-xs leading-relaxed text-ink-500">
              Price shown is the vehicle price. Registration, insurance and other charges are quoted
              separately and confirmed before any payment.
            </p>
          </div>
        ) : (
          <div
            role="tabpanel"
            id="panel-installment"
            aria-labelledby="tab-installment"
            className="animate-fade-in"
          >
            <FinancingCalculator
              configuration={configuration}
              initialPrice={pricing.price}
              compact
              onChange={(state, result) => {
                setCalculator(state)
                setMonthly(result.isValid ? result.monthlyPayment : null)
              }}
            />
          </div>
        )}
      </div>

      <div className="mt-6 space-y-2 border-t border-ink-200 pt-5">
        {isSold ? (
          <p className="rounded-md bg-ink-100 px-4 py-3 text-sm text-ink-700">
            This unit has been sold. Send us an inquiry and we will let you know when a similar
            vehicle arrives.
          </p>
        ) : isReserved ? (
          <p className="rounded-md bg-warning-50 px-4 py-3 text-sm text-warning-700">
            This unit is currently reserved. You can still inquire — reservations sometimes fall
            through.
          </p>
        ) : null}

        <Button fullWidth size="lg" onClick={() => setInquiryOpen(true)}>
          <MessageSquare className="size-4" aria-hidden="true" />
          {mode === 'cash' ? 'Inquire about this vehicle' : 'Ask about financing'}
        </Button>

        {!isSold ? (
          <Button fullWidth size="lg" variant="outline" onClick={() => setTestDriveOpen(true)}>
            <CalendarClock className="size-4" aria-hidden="true" />
            Book a test drive
          </Button>
        ) : null}

        {telHref ? (
          <a
            href={telHref}
            className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-md border border-ink-300 bg-white text-base font-medium text-ink-800 transition-colors hover:border-ink-400 hover:bg-ink-50"
          >
            <Phone className="size-4" aria-hidden="true" />
            {phone}
          </a>
        ) : null}
      </div>

      {mode === 'installment' && monthly ? (
        <p className="tabular mt-4 text-center text-sm text-ink-600">
          Estimated <span className="font-semibold text-ink-900">{formatPesoPrecise(monthly)}</span>
          /month
        </p>
      ) : null}

      <Modal
        open={inquiryOpen}
        onClose={() => setInquiryOpen(false)}
        title="Inquire about this vehicle"
        description={vehicleTitle}
        size="lg"
      >
        <InquiryForm
          vehicle={{ id: vehicleId, label: vehicleTitle, price: pricing.price }}
          providers={providers}
          defaultType={mode === 'cash' ? 'cash_purchase' : 'installment'}
          defaultFinancing={financingDefaults}
          sourcePath={sourcePath}
          compact
        />
      </Modal>

      <Modal
        open={testDriveOpen}
        onClose={() => setTestDriveOpen(false)}
        title="Book a test drive"
        description="Tell us when works and we will confirm the schedule."
        size="md"
      >
        <TestDriveForm
          vehicleId={vehicleId}
          vehicleLabel={vehicleTitle}
          sourcePath={sourcePath}
        />
      </Modal>
    </div>
  )
}
