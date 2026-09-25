'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'

import { ConfirmDialog } from '@/components/ui/modal'
import { Alert } from '@/components/ui/surfaces'
import { deletePastDeal } from '@/lib/actions/past-deals'

/**
 * Per-row actions in the past-deals list.
 *
 * Two actions rather than `VehicleRowActions`'s menu of six: there is no
 * publish/unpublish toggle here (that lives on the edit form, since it needs
 * no confirmation either way) and nothing to duplicate.
 */
export function PastDealRowActions({ dealId, title }: { dealId: string; title: string }) {
  const router = useRouter()
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)

  function handleDelete() {
    setConfirmDelete(false)
    startTransition(async () => {
      const result = await deletePastDeal(dealId)
      if (!result.ok) {
        setError(result.message)
        return
      }
      router.refresh()
    })
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <Link
          href={`/admin/sold-vehicles/${dealId}`}
          aria-label={`Edit ${title}`}
          className="inline-flex size-9 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
        >
          <Pencil className="size-4" aria-hidden="true" />
        </Link>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          disabled={isPending}
          aria-label={`Delete ${title}`}
          className="inline-flex size-9 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-danger-50 hover:text-danger-700 disabled:opacity-40"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </div>

      {error ? (
        <Alert tone="danger" className="mt-2">
          {error}
        </Alert>
      ) : null}

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete this entry?"
        message={`"${title}" and all of its photos will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete"
        isPending={isPending}
      />
    </>
  )
}
