'use client'

import * as React from 'react'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Accessible modal built on the native <dialog> element.
 *
 * Using the platform dialog means focus trapping, Escape-to-close, inertness of
 * the page behind it and the `aria-modal` semantics all come from the browser
 * rather than from hand-rolled key handlers - less code and fewer ways to get
 * accessibility subtly wrong.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: React.ReactNode
  description?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'full'
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  const dialogRef = React.useRef<HTMLDialogElement>(null)
  const titleId = React.useId()
  const descriptionId = React.useId()

  React.useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) {
      dialog.showModal()
      document.body.style.overflow = 'hidden'
    } else if (!open && dialog.open) {
      dialog.close()
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  // Escape fires the dialog's own `cancel` event; route it through onClose so
  // React state stays in step with the DOM.
  const handleCancel = (event: React.SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault()
    onClose()
  }

  const sizeClass = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-3xl',
    full: 'max-w-[min(96rem,95vw)]',
  }[size]

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      onClose={() => open && onClose()}
      onClick={(event) => {
        // A click that lands on the dialog element itself (not its content box)
        // is a backdrop click.
        if (event.target === dialogRef.current) onClose()
      }}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={cn(
        'm-auto w-[calc(100vw-2rem)] rounded-card bg-white p-0 text-ink-900 shadow-panel',
        'backdrop:bg-ink-950/55 backdrop:backdrop-blur-[2px]',
        'open:animate-scale-in',
        sizeClass,
      )}
    >
      <div className="flex max-h-[min(85vh,52rem)] flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-ink-200 px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-1 text-sm text-ink-600">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-m-1.5 rounded-md p-1.5 text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
            aria-label="Close dialog"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>

        {footer ? (
          <div className="flex flex-wrap justify-end gap-2 border-t border-ink-200 bg-ink-50 px-5 py-3.5">
            {footer}
          </div>
        ) : null}
      </div>
    </dialog>
  )
}

/**
 * Confirmation prompt for destructive or irreversible admin actions
 * (archiving a vehicle, deleting an image, deactivating a provider).
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  isPending = false,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'primary'
  isPending?: boolean
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="inline-flex h-9 items-center rounded-md border border-ink-300 bg-white px-3.5 text-sm font-medium text-ink-800 hover:bg-ink-50 disabled:opacity-55"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={cn(
              'inline-flex h-9 items-center rounded-md px-3.5 text-sm font-medium text-white disabled:opacity-55',
              tone === 'danger' ? 'bg-danger-500 hover:bg-danger-700' : 'bg-accent-600 hover:bg-accent-700',
            )}
          >
            {isPending ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-ink-700">{message}</p>
    </Modal>
  )
}
