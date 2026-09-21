'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Send } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/field'
import { Alert, Card, CardBody, CardHeader } from '@/components/ui/surfaces'
import { addAdminNote } from '@/lib/actions/crm'
import { formatDateTime, formatRelativeTime } from '@/lib/format'
import type { AdminNoteRow } from '@/types/database'

/**
 * Internal notes on an inquiry or test drive.
 *
 * Append-only by design: a note is a record of what someone did or was told, so
 * editing or deleting one would undermine the point of keeping it. Nothing here
 * is ever exposed publicly - `admin_notes` has no policy for anonymous readers.
 */
export function NotesPanel({
  notes,
  inquiryId,
  testDriveRequestId,
}: {
  notes: AdminNoteRow[]
  inquiryId?: string
  testDriveRequestId?: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)
  const [note, setNote] = React.useState('')

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!note.trim()) return
    setError(null)

    startTransition(async () => {
      const result = await addAdminNote({
        inquiryId: inquiryId ?? null,
        testDriveRequestId: testDriveRequestId ?? null,
        note,
      })

      if (result.ok) {
        setNote('')
        router.refresh()
      } else {
        setError(result.message)
      }
    })
  }

  return (
    <Card>
      <CardHeader
        title="Internal notes"
        description="Only visible to dealership staff. Customers never see these."
      />

      <CardBody className="space-y-4">
        {error ? (
          <Alert tone="danger" title="Could not add that note">
            {error}
          </Alert>
        ) : null}

        <form onSubmit={submit} className="space-y-2">
          <label htmlFor="new-note" className="sr-only">
            Add an internal note
          </label>
          <Textarea
            id="new-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            maxLength={4000}
            placeholder="Called at 2pm — asked us to follow up after payday on the 15th."
          />
          <div className="flex items-center justify-between gap-3">
            <p className="inline-flex items-center gap-1.5 text-xs text-ink-500">
              <Lock className="size-3" aria-hidden="true" />
              Staff only
            </p>
            <Button
              type="submit"
              size="sm"
              disabled={!note.trim()}
              isLoading={isPending}
              loadingText="Adding…"
            >
              <Send className="size-3.5" aria-hidden="true" />
              Add note
            </Button>
          </div>
        </form>

        {notes.length === 0 ? (
          <p className="border-t border-ink-100 pt-4 text-sm text-ink-500">
            No notes yet. Record what was discussed so whoever picks this up next has the context.
          </p>
        ) : (
          <ol className="space-y-3 border-t border-ink-100 pt-4">
            {notes.map((entry) => (
              <li key={entry.id} className="rounded-md bg-ink-50 px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <p className="text-sm font-medium text-ink-900">
                    {entry.author_name ?? 'Staff'}
                  </p>
                  <time
                    dateTime={entry.created_at}
                    title={formatDateTime(entry.created_at)}
                    className="text-xs text-ink-500"
                  >
                    {formatRelativeTime(entry.created_at)}
                  </time>
                </div>
                <p className="mt-1.5 text-sm whitespace-pre-wrap text-ink-700">{entry.note}</p>
              </li>
            ))}
          </ol>
        )}
      </CardBody>
    </Card>
  )
}
