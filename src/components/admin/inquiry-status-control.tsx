'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'

import { Alert } from '@/components/ui/surfaces'
import { INQUIRY_STATUSES } from '@/lib/constants'
import { updateInquiryStatus } from '@/lib/actions/crm'
import { cn } from '@/lib/utils'
import type { InquiryStatus } from '@/types/database'

/**
 * Inquiry status control.
 *
 * Rendered as a pipeline rather than a dropdown: an inquiry moves through the
 * same stages every time, and seeing where it sits is more useful to a
 * salesperson than picking from a list.
 */
export function InquiryStatusControl({
  inquiryId,
  status,
}: {
  inquiryId: string
  status: InquiryStatus
}) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)
  // Optimistic: the pipeline highlights the new stage immediately, and reverts
  // if the write fails.
  const [optimistic, setOptimistic] = React.useState<InquiryStatus | null>(null)

  const current = optimistic ?? status

  function change(next: InquiryStatus) {
    if (next === current) return
    setError(null)
    setOptimistic(next)

    startTransition(async () => {
      const result = await updateInquiryStatus({ inquiryId, status: next })
      if (result.ok) {
        router.refresh()
      } else {
        setOptimistic(null)
        setError(result.message)
      }
    })
  }

  return (
    <div className="space-y-3">
      {error ? (
        <Alert tone="danger" title="Could not update the status">
          {error}
        </Alert>
      ) : null}

      <div
        role="group"
        aria-label="Inquiry status"
        className="flex flex-wrap gap-1.5"
      >
        {INQUIRY_STATUSES.map((option) => {
          const active = option.value === current
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => change(option.value)}
              disabled={isPending}
              aria-pressed={active}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60',
                active
                  ? 'bg-brand-800 text-white'
                  : 'border border-ink-300 bg-white text-ink-600 hover:border-ink-400 hover:text-ink-900',
              )}
            >
              {active ? <Check className="size-3" aria-hidden="true" /> : null}
              {option.label}
            </button>
          )
        })}
      </div>

      <p className="sr-only" aria-live="polite">
        {isPending ? 'Saving status' : `Status is ${current}`}
      </p>
    </div>
  )
}
