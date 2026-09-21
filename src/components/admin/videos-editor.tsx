'use client'

import * as React from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Pencil, Plus, Trash2, Video } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/field'
import { ConfirmDialog, Modal } from '@/components/ui/modal'
import { Alert, Card, CardBody, CardHeader, EmptyState } from '@/components/ui/surfaces'
import { VIDEO_TYPES, labelFor } from '@/lib/constants'
import { deleteVideo, saveVideo } from '@/lib/actions/vehicles'
import type { FieldErrors } from '@/lib/actions/result'
import { detectProvider, youtubeThumbnail } from '@/lib/video'
import type { VehicleVideoRow, VideoType } from '@/types/database'

/**
 * Vehicle videos.
 *
 * Videos are stored as URLs to an external provider rather than uploaded:
 * hosting dealership walkarounds on Supabase Storage would mean paying egress
 * on every view, with no transcoding or adaptive bitrate. YouTube and Vimeo
 * already do that well.
 */
export function VideosEditor({
  vehicleId,
  videos,
}: {
  vehicleId: string
  videos: VehicleVideoRow[]
}) {
  const router = useRouter()
  const [editing, setEditing] = React.useState<VehicleVideoRow | 'new' | null>(null)
  const [pendingDelete, setPendingDelete] = React.useState<VehicleVideoRow | null>(null)
  const [isPending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)

  function removeVideo(video: VehicleVideoRow) {
    setError(null)
    startTransition(async () => {
      const result = await deleteVideo(video.id)
      if (result.ok) {
        setPendingDelete(null)
        router.refresh()
      } else {
        setError(result.message)
      }
    })
  }

  return (
    <Card>
      <CardHeader
        title="Videos"
        description="Paste a YouTube or Vimeo link. The player only loads when a visitor presses play."
        action={
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing('new')}>
            <Plus className="size-4" aria-hidden="true" />
            Add video
          </Button>
        }
      />

      <CardBody className="space-y-3">
        {error ? (
          <Alert tone="danger" title="Could not remove that video">
            {error}
          </Alert>
        ) : null}

        {videos.length === 0 ? (
          <EmptyState
            className="border-0 py-8"
            icon={<Video className="size-5" aria-hidden="true" />}
            title="No videos yet"
            description="A walkaround video is the next best thing to being on the lot."
            action={
              <Button type="button" onClick={() => setEditing('new')}>
                <Plus className="size-4" aria-hidden="true" />
                Add video
              </Button>
            }
          />
        ) : (
          <ul className="space-y-2">
            {videos.map((video) => {
              const thumbnail = video.thumbnail_url ?? youtubeThumbnail(video)
              return (
                <li
                  key={video.id}
                  className="flex items-center gap-3 rounded-md border border-ink-200 p-3"
                >
                  <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-md bg-brand-800">
                    {thumbnail ? (
                      <Image
                        src={thumbnail}
                        alt=""
                        fill
                        sizes="96px"
                        className="object-cover opacity-90"
                      />
                    ) : (
                      <span className="flex size-full items-center justify-center text-white/50">
                        <Video className="size-5" aria-hidden="true" />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-900">{video.title}</p>
                    <p className="truncate text-xs text-ink-500">
                      {labelFor('videoType', video.video_type)} · {video.provider}
                    </p>
                    <a
                      href={video.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-xs text-accent-700 hover:underline"
                    >
                      {video.video_url}
                    </a>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing(video)}
                      aria-label={`Edit ${video.title}`}
                      className="inline-flex size-9 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(video)}
                      aria-label={`Remove ${video.title}`}
                      className="inline-flex size-9 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-danger-50 hover:text-danger-700"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardBody>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Add a video' : 'Edit video'}
        size="md"
      >
        {editing !== null ? (
          <VideoForm
            vehicleId={vehicleId}
            video={editing === 'new' ? null : editing}
            onDone={() => {
              setEditing(null)
              router.refresh()
            }}
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => pendingDelete && removeVideo(pendingDelete)}
        title="Remove this video?"
        message={
          <>
            <strong>{pendingDelete?.title}</strong> will no longer appear on the listing. The video
            itself stays on its original platform.
          </>
        }
        confirmLabel="Remove video"
        isPending={isPending}
      />
    </Card>
  )
}

function VideoForm({
  vehicleId,
  video,
  onDone,
}: {
  vehicleId: string
  video: VehicleVideoRow | null
  onDone: () => void
}) {
  const [isPending, startTransition] = React.useTransition()
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({})
  const [formError, setFormError] = React.useState<string | null>(null)
  const [url, setUrl] = React.useState(video?.video_url ?? '')

  // Echo back what we detected, so a mistyped link is obvious before saving.
  const detected = url.trim() ? detectProvider(url.trim()) : null

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setFieldErrors({})
    setFormError(null)

    startTransition(async () => {
      const result = await saveVideo({
        vehicleId,
        videoId: video?.id ?? null,
        title: String(form.get('title') ?? ''),
        videoUrl: String(form.get('videoUrl') ?? ''),
        videoType: String(form.get('videoType') ?? 'walkaround') as VideoType,
        thumbnailUrl: String(form.get('thumbnailUrl') ?? ''),
      })

      if (result.ok) onDone()
      else {
        setFormError(result.message)
        setFieldErrors(result.fieldErrors ?? {})
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {formError ? (
        <Alert tone="danger" title="Could not save">
          {formError}
        </Alert>
      ) : null}

      <Field label="Title" required error={fieldErrors.title}>
        <Input
          name="title"
          required
          defaultValue={video?.title ?? ''}
          placeholder="Full walkaround"
        />
      </Field>

      <Field
        label="Video URL"
        required
        error={fieldErrors.videoUrl}
        description={
          detected
            ? detected.provider === 'other'
              ? 'We do not recognise this provider — the listing will link out instead of embedding it.'
              : `Detected: ${detected.provider}`
            : 'YouTube, Vimeo or a direct video link.'
        }
      >
        <Input
          name="videoUrl"
          required
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://www.youtube.com/watch?v=…"
        />
      </Field>

      <Field label="Type" error={fieldErrors.videoType}>
        <Select name="videoType" defaultValue={video?.video_type ?? 'walkaround'}>
          {VIDEO_TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Thumbnail URL"
        error={fieldErrors.thumbnailUrl}
        description="Optional. YouTube thumbnails are filled in automatically."
      >
        <Input name="thumbnailUrl" defaultValue={video?.thumbnail_url ?? ''} />
      </Field>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="submit" isLoading={isPending} loadingText="Saving…">
          {video ? 'Save video' : 'Add video'}
        </Button>
      </div>
    </form>
  )
}
