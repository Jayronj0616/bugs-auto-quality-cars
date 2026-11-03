'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

import { ConfirmDialog } from '@/components/ui/modal'
import { Alert, Card, CardBody, CardHeader } from '@/components/ui/surfaces'
import { deleteCustomerRecord } from '@/lib/actions/crm'

const LIST = { inquiry: '/admin/inquiries', test_drive: '/admin/test-drives' } as const

/**
 * Admin only. For a customer's request to delete their data (/data-deletion):
 * removes the record and its notes for good, then returns to the list.
 */
export function DeleteCustomerRecord({
  kind,
  id,
  customerName,
}: {
  kind: 'inquiry' | 'test_drive'
  id: string
  customerName: string
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)
  const noun = kind === 'inquiry' ? 'inquiry' : 'test drive request'

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      const result = await deleteCustomerRecord({ kind, id })
      if (!result.ok) {
        setOpen(false)
        setError(result.message)
        return
      }
      router.push(LIST[kind])
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader title="Delete customer data" description="Only when the customer asks us to delete their data." />
      <CardBody className="space-y-3">
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={isPending}
          className="inline-flex h-10 items-center gap-2 rounded-md border border-danger-500/40 px-3.5 text-sm font-semibold text-danger-700 transition-colors hover:bg-danger-50 disabled:opacity-55"
        >
          <Trash2 className="size-4" aria-hidden="true" />
          Delete this {noun}
        </button>
      </CardBody>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleDelete}
        title={`Delete this ${noun}?`}
        message={`${customerName}'s ${noun}, contact details and the staff notes on it will be deleted permanently. This cannot be undone.`}
        confirmLabel="Delete permanently"
        isPending={isPending}
      />
    </Card>
  )
}
