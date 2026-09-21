'use client'

import * as React from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  GripVertical,
  ImagePlus,
  Loader2,
  Star,
  Trash2,
  Upload,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/field'
import { ConfirmDialog } from '@/components/ui/modal'
import { Alert, Card, CardBody, CardHeader, EmptyState } from '@/components/ui/surfaces'
import { IMAGE_CATEGORIES, labelFor } from '@/lib/constants'
import {
  deleteImage,
  reorderImages,
  setPrimaryImage,
  updateImageMeta,
} from '@/lib/actions/vehicles'
import { cn } from '@/lib/utils'
import type { ImageCategory, VehicleImageRow } from '@/types/database'

/**
 * Vehicle photo manager.
 *
 * Upload, reorder, categorise, set the main photo and delete. Reordering uses
 * the native HTML5 drag events plus keyboard move buttons - a drag-and-drop
 * library would be a large dependency for one screen, and drag alone is not
 * operable by keyboard.
 */
export function MediaManager({
  vehicleId,
  images: initialImages,
}: {
  vehicleId: string
  images: VehicleImageRow[]
}) {
  const router = useRouter()
  const [images, setImages] = React.useState(initialImages)
  const [uploading, setUploading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [notice, setNotice] = React.useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = React.useState<VehicleImageRow | null>(null)
  const [isPending, startTransition] = React.useTransition()
  const [dragIndex, setDragIndex] = React.useState<number | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Resync when the server sends a different set (after a save or a refresh).
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
    body.set('vehicleId', vehicleId)
    for (const file of Array.from(files)) body.append('files', file)

    try {
      const response = await fetch('/api/admin/media/upload', { method: 'POST', body })
      const payload = (await response.json()) as {
        uploaded?: VehicleImageRow[]
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

  /** Reorders optimistically, then persists; a failure re-reads from the server. */
  function commitOrder(next: VehicleImageRow[]) {
    setImages(next)
    startTransition(async () => {
      const result = await reorderImages({
        vehicleId,
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
        description="The first photo is the main image used across the website. Drag to reorder."
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
            description="Vehicles with photos get far more inquiries. JPG, PNG, WebP or AVIF, up to 10MB each."
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
                <div className="flex items-center gap-3">
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
                        Main
                      </span>
                    ) : null}
                  </div>
                </div>

                <ImageFields
                  image={image}
                  disabled={isPending}
                  onSave={(altText, category) =>
                    run(() => updateImageMeta({ imageId: image.id, altText, category }))
                  }
                />

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
                    onClick={() => run(() => setPrimaryImage(image.id))}
                    disabled={image.is_primary || isPending}
                    aria-label={image.is_primary ? 'This is the main photo' : 'Set as main photo'}
                    title={image.is_primary ? 'Main photo' : 'Set as main photo'}
                    className={cn(
                      'inline-flex size-9 items-center justify-center rounded-md transition-colors disabled:opacity-40',
                      image.is_primary
                        ? 'text-accent-600'
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
          if (target) run(() => deleteImage(target.id))
        }}
        title="Delete this photo?"
        message="The photo will be removed from the listing and permanently deleted from storage. This cannot be undone."
        confirmLabel="Delete photo"
        isPending={isPending}
      />
    </Card>
  )
}

/**
 * Alt text and category for one photo.
 *
 * Kept as local state with an explicit Save so editing a caption does not fire
 * a request per keystroke.
 */
function ImageFields({
  image,
  disabled,
  onSave,
}: {
  image: VehicleImageRow
  disabled: boolean
  onSave: (altText: string, category: ImageCategory) => void
}) {
  const [altText, setAltText] = React.useState(image.alt_text ?? '')
  const [category, setCategory] = React.useState<ImageCategory>(image.category)

  const dirty = altText !== (image.alt_text ?? '') || category !== image.category

  return (
    <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[1fr_9rem_auto] sm:items-end">
      <Field label="Alt text" className="min-w-0">
        <Input
          value={altText}
          onChange={(event) => setAltText(event.target.value)}
          placeholder="Describe the photo for screen readers"
          maxLength={200}
        />
      </Field>

      <Field label="Category">
        <Select
          value={category}
          onChange={(event) => setCategory(event.target.value as ImageCategory)}
        >
          {IMAGE_CATEGORIES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>

      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={!dirty || disabled}
        onClick={() => onSave(altText, category)}
      >
        Save
      </Button>

      <p className="sr-only">{labelFor('imageCategory', image.category)}</p>
    </div>
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
