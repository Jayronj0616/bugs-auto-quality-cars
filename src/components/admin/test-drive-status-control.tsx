'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { CalendarCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/field'
import { Alert } from '@/components/ui/surfaces'
import { TEST_DRIVE_STATUSES, TEST_DRIVE_TIME_SLOTS } from '@/lib/constants'
import { updateTestDriveStatus } from '@/lib/actions/crm'
import type { FieldErrors } from '@/lib/actions/result'
import { toDateInputValue } from '@/lib/format'
import type { TestDriveStatus } from '@/types/database'

/**
 * Test drive scheduling.
 *
 * Confirming or rescheduling requires an actual date and time - those statuses
 * are a promise to the customer, so the form asks for the slot rather than
 * letting someone mark an appointment "confirmed" with nothing behind it. The
 * same rule is enforced again in the Zod schema on the server.
 */
export function TestDriveStatusControl({
  testDriveId,
  status,
  preferredDate,
  preferredTime,
  confirmedDate,
  confirmedTime,
}: {
  testDriveId: string
  status: TestDriveStatus
  preferredDate: string
  preferredTime: string
  confirmedDate: string | null
  confirmedTime: string | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({})
  const [error, setError] = React.useState<string | null>(null)
  const [notice, setNotice] = React.useState<string | null>(null)

  const [nextStatus, setNextStatus] = React.useState<TestDriveStatus>(status)
  // Default the schedule to what the customer asked for, so confirming as
  // requested is one click.
  const [date, setDate] = React.useState(
    toDateInputValue(confirmedDate) || toDateInputValue(preferredDate),
  )
  const [time, setTime] = React.useState(
    (confirmedTime ?? preferredTime ?? '10:00').slice(0, 5),
  )

  const needsSchedule = nextStatus === 'confirmed' || nextStatus === 'rescheduled'

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setNotice(null)
    setFieldErrors({})

    startTransition(async () => {
      const result = await updateTestDriveStatus({
        testDriveId,
        status: nextStatus,
        confirmedDate: needsSchedule ? date : '',
        confirmedTime: needsSchedule ? time : '',
      })

      if (result.ok) {
        setNotice(result.message ?? 'Saved.')
        router.refresh()
      } else {
        setError(result.message)
        setFieldErrors(result.fieldErrors ?? {})
      }
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error ? (
        <Alert tone="danger" title="Could not update this request">
          {error}
        </Alert>
      ) : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <Field label="Status">
        <Select
          value={nextStatus}
          onChange={(event) => setNextStatus(event.target.value as TestDriveStatus)}
        >
          {TEST_DRIVE_STATUSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>

      {needsSchedule ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Confirmed date" required error={fieldErrors.confirmedDate}>
            <Input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </Field>

          <Field label="Confirmed time" required error={fieldErrors.confirmedTime}>
            <Select value={time} onChange={(event) => setTime(event.target.value)}>
              {TEST_DRIVE_TIME_SLOTS.map((slot) => (
                <option key={slot.value} value={slot.value}>
                  {slot.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      ) : null}

      <Button type="submit" isLoading={isPending} loadingText="Saving…" fullWidth>
        <CalendarCheck className="size-4" aria-hidden="true" />
        Update request
      </Button>

      {needsSchedule ? (
        <p className="text-xs text-ink-500">
          Updating the schedule here does not notify the customer — call or message them to confirm.
        </p>
      ) : null}
    </form>
  )
}
