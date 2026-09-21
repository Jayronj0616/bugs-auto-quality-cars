'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Archive,
  Copy,
  Eye,
  EyeOff,
  MoreHorizontal,
  Pencil,
  Tag,
} from 'lucide-react'

import { ConfirmDialog } from '@/components/ui/modal'
import { Alert } from '@/components/ui/surfaces'
import { duplicateVehicle, setVehicleStatus } from '@/lib/actions/vehicles'
import { cn } from '@/lib/utils'
import type { VehicleStatus } from '@/types/database'

/**
 * Per-row actions in the vehicle list.
 *
 * Archiving is confirmed rather than instant. Publishing and unpublishing are
 * not: both are immediately reversible with the same menu, so a confirmation
 * dialog would be friction without benefit.
 */
export function VehicleRowActions({
  vehicleId,
  slug,
  label,
  status,
}: {
  vehicleId: string
  slug: string
  label: string
  status: VehicleStatus
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [confirmArchive, setConfirmArchive] = React.useState(false)
  const [isPending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)
  const menuRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const run = (action: () => Promise<{ ok: boolean; message?: string }>) => {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        setError(result.message ?? 'That did not work.')
        return
      }
      setOpen(false)
      setConfirmArchive(false)
      router.refresh()
    })
  }

  const changeStatus = (next: VehicleStatus) =>
    run(() => setVehicleStatus({ vehicleId, status: next }))

  return (
    <div className="relative flex items-center justify-end gap-1" ref={menuRef}>
      {error ? (
        <Alert tone="danger" className="absolute right-0 bottom-full z-20 mb-2 w-64 text-xs">
          {error}
        </Alert>
      ) : null}

      <Link
        href={`/admin/vehicles/${vehicleId}`}
        className="inline-flex size-9 items-center justify-center rounded-md text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
        aria-label={`Edit ${label}`}
      >
        <Pencil className="size-4" aria-hidden="true" />
      </Link>

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`More actions for ${label}`}
        className="inline-flex size-9 items-center justify-center rounded-md text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
      >
        <MoreHorizontal className="size-4" aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute top-full right-0 z-20 mt-1 w-56 animate-scale-in overflow-hidden rounded-md border border-ink-200 bg-white py-1 shadow-panel"
        >
          {status !== 'draft' && status !== 'archived' ? (
            <MenuLink
              href={`/cars/${slug}`}
              icon={Eye}
              label="View on website"
              external
            />
          ) : null}

          {status === 'published' ? (
            <MenuButton
              icon={EyeOff}
              label="Unpublish"
              disabled={isPending}
              onClick={() => changeStatus('draft')}
            />
          ) : status !== 'archived' ? (
            <MenuButton
              icon={Eye}
              label="Publish"
              disabled={isPending}
              onClick={() => changeStatus('published')}
            />
          ) : null}

          {status === 'published' || status === 'reserved' ? (
            <MenuButton
              icon={Tag}
              label={status === 'reserved' ? 'Mark as available' : 'Mark as reserved'}
              disabled={isPending}
              onClick={() => changeStatus(status === 'reserved' ? 'published' : 'reserved')}
            />
          ) : null}

          {status !== 'sold' && status !== 'archived' ? (
            <MenuButton
              icon={Tag}
              label="Mark as sold"
              disabled={isPending}
              onClick={() => changeStatus('sold')}
            />
          ) : null}

          <MenuButton
            icon={Copy}
            label="Duplicate as draft"
            disabled={isPending}
            onClick={() =>
              run(async () => {
                const result = await duplicateVehicle(vehicleId)
                if (result.ok) router.push(`/admin/vehicles/${result.data.vehicleId}`)
                return result
              })
            }
          />

          <div className="my-1 border-t border-ink-100" />

          {status === 'archived' ? (
            <MenuButton
              icon={Archive}
              label="Restore as draft"
              disabled={isPending}
              onClick={() => changeStatus('draft')}
            />
          ) : (
            <MenuButton
              icon={Archive}
              label="Archive"
              tone="danger"
              disabled={isPending}
              onClick={() => {
                setOpen(false)
                setConfirmArchive(true)
              }}
            />
          )}
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmArchive}
        onClose={() => setConfirmArchive(false)}
        onConfirm={() => changeStatus('archived')}
        title="Archive this vehicle?"
        message={
          <>
            <strong>{label}</strong> will be removed from the website. Nothing is deleted — its
            inquiries and test drive history are kept, and you can restore it from the Archived tab
            at any time.
          </>
        }
        confirmLabel="Archive vehicle"
        isPending={isPending}
      />
    </div>
  )
}

function MenuButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  tone = 'default',
}: {
  icon: typeof Eye
  label: string
  onClick: () => void
  disabled?: boolean
  tone?: 'default' | 'danger'
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors disabled:opacity-50',
        tone === 'danger'
          ? 'text-danger-700 hover:bg-danger-50'
          : 'text-ink-700 hover:bg-ink-50 hover:text-ink-900',
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {label}
    </button>
  )
}

function MenuLink({
  href,
  icon: Icon,
  label,
  external,
}: {
  href: string
  icon: typeof Eye
  label: string
  external?: boolean
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-ink-700 transition-colors hover:bg-ink-50 hover:text-ink-900"
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {label}
    </Link>
  )
}
