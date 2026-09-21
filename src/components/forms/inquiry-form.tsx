'use client'

import * as React from 'react'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Field, Fieldset, Input, Select, Textarea } from '@/components/ui/field'
import { Alert } from '@/components/ui/surfaces'
import { CONTACT_METHODS, FINANCING_INQUIRY_TYPES, INQUIRY_TYPES, LOAN_TERMS } from '@/lib/constants'
import { submitInquiry } from '@/lib/actions/public-submissions'
import type { FieldErrors } from '@/lib/actions/result'
import type { FinancingProviderRow, InquiryType } from '@/types/database'
import { formatPeso } from '@/lib/format'
import { toNumber } from '@/lib/utils'

export type InquiryFormVehicle = {
  id: string
  label: string
  price: number
}

/**
 * Customer inquiry form.
 *
 * Financing fields only appear once the customer picks an installment or
 * financing inquiry, which keeps a "do you have this in white?" question down
 * to four fields. On success the whole form is replaced by a confirmation with
 * the reference number, so there is no way to double-submit by reflex.
 */
export function InquiryForm({
  vehicle,
  vehicleOptions,
  providers,
  defaultType = 'general',
  defaultFinancing,
  sourcePath,
  compact = false,
  onSuccess,
}: {
  /** Pre-selected vehicle: the inquiry is attached to it automatically. */
  vehicle?: InquiryFormVehicle | null
  /** Picker for pages without a fixed vehicle (the contact page). */
  vehicleOptions?: { id: string; label: string }[]
  providers?: FinancingProviderRow[]
  defaultType?: InquiryType
  defaultFinancing?: {
    downPaymentAmount: number
    downPaymentPercent: number
    loanTermMonths: number
    interestRate: number
    providerId: string | null
  } | null
  sourcePath?: string
  compact?: boolean
  onSuccess?: () => void
}) {
  const [isPending, startTransition] = React.useTransition()
  const [inquiryType, setInquiryType] = React.useState<InquiryType>(defaultType)
  const [selectedVehicleId, setSelectedVehicleId] = React.useState(vehicle?.id ?? '')
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({})
  const [formError, setFormError] = React.useState<string | null>(null)
  const [reference, setReference] = React.useState<string | null>(null)
  const formRef = React.useRef<HTMLFormElement>(null)
  const statusRef = React.useRef<HTMLDivElement>(null)

  const showFinancing = FINANCING_INQUIRY_TYPES.includes(inquiryType)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setFieldErrors({})
    setFormError(null)

    const payload = {
      customerName: String(form.get('customerName') ?? ''),
      customerPhone: String(form.get('customerPhone') ?? ''),
      customerEmail: String(form.get('customerEmail') ?? ''),
      vehicleId: String(form.get('vehicleId') ?? ''),
      inquiryType,
      message: String(form.get('message') ?? ''),
      preferredContactMethod: String(form.get('preferredContactMethod') ?? 'any'),
      preferredContactDate: String(form.get('preferredContactDate') ?? ''),
      financingProviderId: showFinancing ? String(form.get('financingProviderId') ?? '') : '',
      downPaymentAmount: showFinancing ? String(form.get('downPaymentAmount') ?? '') : '',
      downPaymentPercent: showFinancing ? String(form.get('downPaymentPercent') ?? '') : '',
      loanTermMonths: showFinancing ? String(form.get('loanTermMonths') ?? '') : '',
      interestRate: showFinancing ? String(form.get('interestRate') ?? '') : '',
      sourcePath: sourcePath ?? '',
      website: String(form.get('website') ?? ''),
    }

    startTransition(async () => {
      const result = await submitInquiry(payload as Parameters<typeof submitInquiry>[0])

      if (result.ok) {
        setReference(result.data.reference)
        formRef.current?.reset()
        onSuccess?.()
      } else {
        setFormError(result.message)
        setFieldErrors(result.fieldErrors ?? {})
        // Move focus to the summary so the failure is announced rather than
        // silently appearing above the fold.
        statusRef.current?.focus()
      }
    })
  }

  if (reference) {
    return (
      <div className="rounded-card border border-success-500/25 bg-success-50 p-6 text-center sm:p-8">
        <CheckCircle2 className="mx-auto size-10 text-success-500" aria-hidden="true" />
        <h3 className="mt-4 text-xl font-semibold text-ink-900">Thank you!</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-700">
          Your inquiry has been received. A representative will contact you regarding your inquiry.
        </p>
        <p className="mt-4 inline-block rounded-md bg-white px-3 py-2 text-sm">
          Reference <span className="font-semibold">{reference}</span>
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            href="/cars"
            className="inline-flex h-11 items-center rounded-md bg-ink-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-ink-800"
          >
            Continue browsing cars
          </Link>
          <button
            type="button"
            onClick={() => setReference(null)}
            className="inline-flex h-11 items-center rounded-md border border-ink-300 bg-white px-5 text-sm font-medium text-ink-800 transition-colors hover:bg-ink-50"
          >
            Send another inquiry
          </button>
        </div>
      </div>
    )
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-6">
      <div ref={statusRef} tabIndex={-1} className="outline-none">
        {formError ? (
          <Alert tone="danger" title="We could not send your inquiry">
            {formError}
          </Alert>
        ) : null}
      </div>

      <Fieldset legend="Your details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" required error={fieldErrors.customerName} className="sm:col-span-2">
            <Input
              name="customerName"
              autoComplete="name"
              required
              placeholder="Juan dela Cruz"
            />
          </Field>

          <Field label="Mobile number" required error={fieldErrors.customerPhone}>
            <Input
              name="customerPhone"
              type="tel"
              autoComplete="tel"
              required
              placeholder="0917 123 4567"
            />
          </Field>

          <Field label="Email address" error={fieldErrors.customerEmail}>
            <Input
              name="customerEmail"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
            />
          </Field>
        </div>
      </Fieldset>

      <Fieldset legend="Your inquiry">
        <div className="grid gap-4 sm:grid-cols-2">
          {vehicle ? (
            <div className="sm:col-span-2">
              <input type="hidden" name="vehicleId" value={vehicle.id} />
              <div className="rounded-md border border-ink-200 bg-ink-50 px-4 py-3">
                <p className="text-xs font-medium tracking-wide text-ink-500 uppercase">
                  About this vehicle
                </p>
                <p className="mt-0.5 text-sm font-semibold text-ink-900">{vehicle.label}</p>
                <p className="tabular text-sm text-ink-600">{formatPeso(vehicle.price)}</p>
              </div>
            </div>
          ) : vehicleOptions && vehicleOptions.length > 0 ? (
            <Field label="Vehicle" error={fieldErrors.vehicleId} className="sm:col-span-2">
              <Select
                name="vehicleId"
                value={selectedVehicleId}
                onChange={(event) => setSelectedVehicleId(event.target.value)}
              >
                <option value="">Not about a specific vehicle</option>
                {vehicleOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <input type="hidden" name="vehicleId" value="" />
          )}

          <Field label="Inquiry type" required error={fieldErrors.inquiryType}>
            <Select
              name="inquiryType"
              value={inquiryType}
              onChange={(event) => setInquiryType(event.target.value as InquiryType)}
            >
              {INQUIRY_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Preferred contact method" error={fieldErrors.preferredContactMethod}>
            <Select name="preferredContactMethod" defaultValue="any">
              {CONTACT_METHODS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          {!compact ? (
            <Field
              label="Preferred contact date"
              error={fieldErrors.preferredContactDate}
              description="Optional — when it is most convenient for us to reach you."
            >
              <Input name="preferredContactDate" type="date" />
            </Field>
          ) : null}

          <Field
            label="Message"
            required
            error={fieldErrors.message}
            className={compact ? 'sm:col-span-2' : 'sm:col-span-2'}
          >
            <Textarea
              name="message"
              required
              minLength={10}
              rows={compact ? 3 : 4}
              placeholder="Tell us what you would like to know — availability, colour options, requirements, trade-in, anything."
            />
          </Field>
        </div>
      </Fieldset>

      {showFinancing ? (
        <Fieldset
          legend="Financing details"
          description="Optional, but it helps us prepare a realistic quotation before we call."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {providers && providers.length > 0 ? (
              <Field label="Preferred provider" error={fieldErrors.financingProviderId}>
                <Select name="financingProviderId" defaultValue={defaultFinancing?.providerId ?? ''}>
                  <option value="">No preference</option>
                  {providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}

            <Field label="Loan term" required error={fieldErrors.loanTermMonths}>
              <Select name="loanTermMonths" defaultValue={defaultFinancing?.loanTermMonths ?? 60}>
                {LOAN_TERMS.map((term) => (
                  <option key={term} value={term}>
                    {term} months
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Down payment (%)" error={fieldErrors.downPaymentPercent}>
              <Input
                name="downPaymentPercent"
                type="number"
                inputMode="decimal"
                min={0}
                max={99}
                step={1}
                defaultValue={defaultFinancing?.downPaymentPercent ?? ''}
              />
            </Field>

            <Field label="Down payment (₱)" error={fieldErrors.downPaymentAmount}>
              <Input
                name="downPaymentAmount"
                type="number"
                inputMode="numeric"
                min={0}
                step={5000}
                defaultValue={
                  defaultFinancing ? Math.round(defaultFinancing.downPaymentAmount) : ''
                }
              />
            </Field>

            <Field
              label="Interest rate (%)"
              error={fieldErrors.interestRate}
              className="sm:col-span-2"
            >
              <Input
                name="interestRate"
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step={0.25}
                defaultValue={defaultFinancing?.interestRate ?? ''}
              />
            </Field>
          </div>
        </Fieldset>
      ) : (
        // Keep the inputs out of the DOM entirely when hidden, so a stale
        // financing figure cannot ride along with a general inquiry.
        null
      )}

      {/* Honeypot. Hidden from sight and from assistive technology; only a bot
          fills it in, and a submission that does is silently discarded. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website-field">Leave this field empty</label>
        <input id="website-field" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" size="lg" isLoading={isPending} loadingText="Sending…">
          Send inquiry
        </Button>
        <p className="text-xs text-ink-500">
          We use your details only to respond to this inquiry.
        </p>
      </div>
    </form>
  )
}

/** Turns calculator state into the form's financing defaults. */
export function financingDefaultsFrom(state: {
  downPayment: number
  downPaymentPercent: number
  termMonths: number
  interestRate: number
  providerId: string | null
}) {
  return {
    downPaymentAmount: toNumber(state.downPayment) ?? 0,
    downPaymentPercent: state.downPaymentPercent,
    loanTermMonths: state.termMonths,
    interestRate: state.interestRate,
    providerId: state.providerId,
  }
}
