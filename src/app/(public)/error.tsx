'use client'

import * as React from 'react'
import { RotateCcw, ServerCrash } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ButtonLink, EmptyState } from '@/components/ui/surfaces'

/**
 * Public error boundary.
 *
 * Shows a plain apology and a way forward. The underlying error is logged
 * server-side; customers never see a database message or stack trace.
 */
export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    console.error('[public] unhandled error:', error)
  }, [error])

  return (
    <div className="container-page py-20">
      <EmptyState
        icon={<ServerCrash className="size-6" aria-hidden="true" />}
        title="Something went wrong"
        description="We hit a problem loading this page. Please try again - if it keeps happening, get in touch and we will help you directly."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={reset} variant="primary">
              <RotateCcw className="size-4" aria-hidden="true" />
              Try again
            </Button>
            <ButtonLink href="/cars" variant="outline">
              Browse cars
            </ButtonLink>
            <ButtonLink href="/contact" variant="ghost">
              Contact us
            </ButtonLink>
          </div>
        }
      />
      {error.digest ? (
        <p className="mt-4 text-center text-xs text-ink-400">Reference: {error.digest}</p>
      ) : null}
    </div>
  )
}
