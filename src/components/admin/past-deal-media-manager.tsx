'use client'

import * as React from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { GripVertical, ImagePlus, Loader2, Star, Trash2, Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/modal'
import { Alert, Card, CardBody, CardHeader, EmptyState } from '@/components/ui/surfaces'
import {
  deletePastDealImage,
  reorderPastDealImages,
  setPastDealPrimaryImage,
} from '@/lib/actions/past-deals'
import { cn } from '@/lib/utils'
import type { PastDealImageRow } from '@/types/database'

/**
 * Past-deal photo manager. A trimmed `MediaManager`: same upload / drag
 * reorder / cover-photo / delete flow, minus alt text and category editing -
 * a past deal's photos don't have either, so there's nothing there to edit.
 */
export function PastDealMediaManager({
  dealId,
  images: initialImages,
}: {
  dealId: string
  images: PastDealImageRow[]
}) {
  const router = useRouter()
  const [images, setImages] = React.useState(initialImages)
  const [uploading, setUploading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [notice, setNotice] = React.useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = React.useState<PastDealImageRow | null>(null)
  const [isPending, startTransition] = React.useTransition()
  const [dragIndex, setDragIndex] = React.useState<number | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const serverKey = initialImages.map((image) => `${image.id}:${image.sort_order}:${image.is_primary}`).join('|')
  const [lastServerKey, setLastServerKey] = React.useState(serverKey)
  if (lastServerKey !== serverKey) {
    setLastServerKey(serverKey)
    setImages(initialImages)
  }

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return

    setError(null)
    setNotice(null)
    setUploading(true)

    const body = new FormData()
    body.set('dealId', dealId)
    for (const file of Array.from(files)) body.append('files', file)

    try {
      const response = await fetch('/api/admin/media/past-deal-upload', { method: 'POST', body })
      const payload = (await response.json()) as {
        uploaded?: PastDealImageRow[]
        failures?: string[]
        error?: string
      }

      if (!response.ok) {
        setError(payload.error ?? 'Those photos could not be uploaded.')
        return
      }

      const count = payload.uploaded?.length ?? 0
      setNotice(
        payload.failures?.length
          ? `${count} photo(s) uploaded. ${payload.failures.join(' ')}`
          : `${count} photo(s) uploaded.`,
      )
      router.refresh()
    } catch {
      setError('Upload failed. Check your connection and try again.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function commitOrder(next: PastDealImageRow[]) {
    setImages(next)
    startTransition(async () => {
      const result = await reorderPastDealImages({
        pastDealId: dealId,
        orderedIds: next.map((image) => image.id),
      })
      if (!result.ok) {
        setError(result.message)
        router.refresh()
      }
    })
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= images.length || from === to) return
    const next = [...images]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    commitOrder(next)
  }

  const run = (action: () => Promise<{ ok: boolean; message?: string }>) => {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (result.ok) {
        setNotice(result.message ?? null)
        router.refresh()
      } else {
        setError(result.message ?? 'That did not work.')
      }
    })
  }

  return (
    <Card>
      <CardHeader
        title="Photos"
        description="The first photo is the cover shown on the /sold grid. Drag to reorder."
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            isLoading={uploading}
            loadingText="Uploading…"
          >
            <Upload className="size-4" aria-hidden="true" />
            Upload photos
          </Button>
        }
      />

      <CardBody className="space-y-4">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          className="sr-only"
          onChange={(event) => upload(event.target.files)}
        />

        {error ? (
          <Alert tone="danger" title="Photo problem">
            {error}
          </Alert>
        ) : null}
        {notice ? <Alert tone="success">{notice}</Alert> : null}

        {images.length === 0 ? (
          <EmptyState
            icon={<ImagePlus className="size-6" aria-hidden="true" />}
            title="No photos yet"
            description="JPG, PNG, WebP or AVIF, up to 10MB each."
            action={
              <Button type="button" onClick={() => inputRef.current?.click()} isLoading={uploading}>
                <Upload className="size-4" aria-hidden="true" />
                Upload photos
              </Button>
            }
          />
        ) : (
          <ul className="space-y-2">
            {images.map((image, index) => (
              <li
                key={image.id}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragEnd={() => setDragIndex(null)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault()
                  if (dragIndex !== null) move(dragIndex, index)
                  setDragIndex(null)
                }}
                className={cn(
                  'flex flex-col gap-3 rounded-md border border-ink-200 bg-white p-3 transition-colors sm:flex-row sm:items-center',
                  dragIndex === index && 'border-accent-600 opacity-60',
                )}
              >
                <div className="flex flex-1 items-center gap-3">
                  <span
                    className="cursor-grab text-ink-400 active:cursor-grabbing"
                    aria-hidden="true"
                  >
                    <GripVertical className="size-4" />
                  </span>

                  <div className="relative size-20 shrink-0 overflow-hidden rounded-md bg-ink-100">
                    <Image
                      src={image.url}
                      alt={image.alt_text ?? ''}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                    {image.is_primary ? (
                      <span className="absolute inset-x-0 bottom-0 bg-accent-600 py-0.5 text-center text-[10px] font-semibold tracking-wide text-white uppercase">
                        Cover
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <IconAction
                    label="Move up"
                    disabled={index === 0 || isPending}
                    onClick={() => move(index, index - 1)}
                  >
                    ↑
                  </IconAction>
                  <IconAction
                    label="Move down"
                    disabled={index === images.length - 1 || isPending}
                    onClick={() => move(index, index + 1)}
                  >
                    ↓
                  </IconAction>

                  <button
                    type="button"
                    onClick={() => run(() => setPastDealPrimaryImage(image.id))}
                    disabled={image.is_primary || isPending}
                    aria-label={image.is_primary ? 'This is the cover photo' : 'Set as cover photo'}
                    title={image.is_primary ? 'Cover photo' : 'Set as cover photo'}
                    className={cn(
                      'inline-flex size-9 items-center justify-center rounded-md transition-colors disabled:opacity-40',
                      image.is_primary
                        ? 'text-accent-700'
                        : 'text-ink-400 hover:bg-ink-100 hover:text-ink-700',
                    )}
                  >
                    <Star
                      className={cn('size-4', image.is_primary && 'fill-current')}
                      aria-hidden="true"
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => setPendingDelete(image)}
                    disabled={isPending}
                    aria-label="Delete photo"
                    className="inline-flex size-9 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-danger-50 hover:text-danger-700 disabled:opacity-40"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {isPending ? (
          <p className="flex items-center gap-2 text-xs text-ink-500" aria-live="polite">
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            Saving…
          </p>
        ) : null}
      </CardBody>

      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          const target = pendingDelete
          setPendingDelete(null)
          if (target) run(() => deletePastDealImage(target.id))
        }}
        title="Delete this photo?"
        message="The photo will be removed and permanently deleted from storage. This cannot be undone."
        confirmLabel="Delete photo"
        isPending={isPending}
      />
    </Card>
  )
}

function IconAction({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="inline-flex size-9 items-center justify-center rounded-md text-sm text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700 disabled:opacity-30"
    >
      {children}
    </button>
  )
}
