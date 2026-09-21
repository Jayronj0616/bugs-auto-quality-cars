'use client'

import * as React from 'react'
import { CalendarCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { Alert } from '@/components/ui/surfaces'
import { TEST_DRIVE_TIME_SLOTS } from '@/lib/constants'
import { useIsHydrated } from '@/lib/hooks'
import { submitTestDrive } from '@/lib/actions/public-submissions'
import type { FieldErrors } from '@/lib/actions/result'

/**
 * Bookings are accepted from today up to 90 days out (matches the validation
 * schema). Formatted from local date parts rather than `toISOString()`, which
 * would return the UTC day and show a Manila visitor yesterday's date all
 * morning.
 */
function localIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function dateBounds() {
  const today = new Date()
  const latest = new Date(today)
  latest.setDate(latest.getDate() + 90)
  return { min: localIsoDate(today), max: localIsoDate(latest) }
}

export function TestDriveForm({
  vehicleId,
  vehicleLabel,
  sourcePath,
  onSuccess,
}: {
  vehicleId: string
  vehicleLabel: string
  sourcePath?: string
  onSuccess?: () => void
}) {
  const [isPending, startTransition] = React.useTransition()
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({})
  const [formError, setFormError] = React.useState<string | null>(null)
  const [reference, setReference] = React.useState<string | null>(null)

  // Resolved after hydration so a statically rendered page never ships a
  // "today" that was only correct at build time.
  const hydrated = useIsHydrated()
  const bounds = hydrated ? dateBounds() : null

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setFieldErrors({})
    setFormError(null)

    const payload = {
      vehicleId,
      customerName: String(form.get('customerName') ?? ''),
      customerPhone: String(form.get('customerPhone') ?? ''),
      customerEmail: String(form.get('customerEmail') ?? ''),
      preferredDate: String(form.get('preferredDate') ?? ''),
      preferredTime: String(form.get('preferredTime') ?? ''),
      message: String(form.get('message') ?? ''),
      sourcePath: sourcePath ?? '',
      website: String(form.get('website') ?? ''),
    }

    startTransition(async () => {
      const result = await submitTestDrive(payload as Parameters<typeof submitTestDrive>[0])
      if (result.ok) {
        setReference(result.data.reference)
        onSuccess?.()
      } else {
        setFormError(result.message)
        setFieldErrors(result.fieldErrors ?? {})
      }
    })
  }

  if (reference) {
    return (
      <div className="rounded-md border border-success-500/25 bg-success-50 p-6 text-center">
        <CalendarCheck className="mx-auto size-9 text-success-500" aria-hidden="true" />
        <h3 className="mt-3 text-lg font-semibold text-ink-900">Request received</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-700">
          We will confirm your test drive for the <strong>{vehicleLabel}</strong> and contact you
          about the schedule.
        </p>
        <p className="mt-4 inline-block rounded-md bg-white px-3 py-2 text-sm">
          Reference <span className="font-semibold">{reference}</span>
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {formError ? (
        <Alert tone="danger" title="We could not send your request">
          {formError}
        </Alert>
      ) : null}

      <div className="rounded-md border border-ink-200 bg-ink-50 px-4 py-3">
        <p className="text-xs font-medium tracking-wide text-ink-500 uppercase">Test driving</p>
        <p className="mt-0.5 text-sm font-semibold text-ink-900">{vehicleLabel}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" required error={fieldErrors.customerName} className="sm:col-span-2">
          <Input name="customerName" autoComplete="name" required />
        </Field>

        <Field label="Mobile number" required error={fieldErrors.customerPhone}>
          <Input name="customerPhone" type="tel" autoComplete="tel" required placeholder="0917 123 4567" />
        </Field>

        <Field label="Email address" error={fieldErrors.customerEmail}>
          <Input name="customerEmail" type="email" autoComplete="email" />
        </Field>

        <Field label="Preferred date" required error={fieldErrors.preferredDate}>
          <Input
            // Remounts once the bounds resolve after hydration, so the
            // uncontrolled input actually picks up today as its default.
            key={bounds?.min ?? 'pending'}
            name="preferredDate"
            type="date"
            required
            min={bounds?.min}
            max={bounds?.max}
            defaultValue={bounds?.min}
          />
        </Field>

        <Field label="Preferred time" required error={fieldErrors.preferredTime}>
          <Select name="preferredTime" defaultValue="10:00">
            {TEST_DRIVE_TIME_SLOTS.map((slot) => (
              <option key={slot.value} value={slot.value}>
                {slot.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Notes" error={fieldErrors.message} className="sm:col-span-2">
          <Textarea
            name="message"
            rows={3}
            placeholder="Anything we should prepare? A preferred branch, a second driver, a specific variant to compare."
          />
        </Field>
      </div>

      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="td-website-field">Leave this field empty</label>
        <input id="td-website-field" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <Button type="submit" fullWidth size="lg" isLoading={isPending} loadingText="Sending…">
        Request test drive
      </Button>

      <p className="text-xs text-ink-500">
        A request is not a confirmed booking — we will contact you to confirm the schedule.
      </p>
    </form>
  )
}
