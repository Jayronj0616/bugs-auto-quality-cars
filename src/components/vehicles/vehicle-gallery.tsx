'use client'

import * as React from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Expand, ImageOff, X } from 'lucide-react'

import { IMAGE_CATEGORIES, labelFor } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { ImageCategory, VehicleImageRow } from '@/types/database'

/**
 * Vehicle gallery.
 *
 * Large primary image, category chips, a thumbnail strip and a fullscreen
 * viewer. Arrow keys move between photos, Escape leaves fullscreen, and a
 * horizontal swipe advances on touch devices.
 *
 * Only the first photo is eager: the rest are lazy so opening a listing does
 * not pull twenty full-size images over a mobile connection.
 */
export function VehicleGallery({
  images,
  vehicleTitle,
}: {
  images: VehicleImageRow[]
  vehicleTitle: string
}) {
  const [category, setCategory] = React.useState<ImageCategory | 'all'>('all')
  const [activeIndex, setActiveIndex] = React.useState(0)
  const [isFullscreen, setFullscreen] = React.useState(false)
  const dialogRef = React.useRef<HTMLDialogElement>(null)
  const touchStartX = React.useRef<number | null>(null)

  const categories = React.useMemo(() => {
    const present = new Set(images.map((image) => image.category))
    return IMAGE_CATEGORIES.filter((option) => present.has(option.value))
  }, [images])

  const visible = React.useMemo(
    () => (category === 'all' ? images : images.filter((image) => image.category === category)),
    [images, category],
  )

  // Changing the category can leave the pointer past the end of the new list,
  // so the selection resets. Adjusting during render (rather than in an effect)
  // means the gallery never paints a frame pointing at the wrong photo.
  const [lastCategory, setLastCategory] = React.useState(category)
  if (lastCategory !== category) {
    setLastCategory(category)
    setActiveIndex(0)
  }

  const total = visible.length
  const active = visible[Math.min(activeIndex, Math.max(total - 1, 0))]

  const go = React.useCallback(
    (delta: number) => {
      if (total === 0) return
      setActiveIndex((current) => (current + delta + total) % total)
    },
    [total],
  )

  React.useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isFullscreen && !dialog.open) {
      dialog.showModal()
      document.body.style.overflow = 'hidden'
    } else if (!isFullscreen && dialog.open) {
      dialog.close()
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isFullscreen])

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      go(-1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      go(1)
    }
  }

  const handleTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null
  }

  const handleTouchEnd = (event: React.TouchEvent) => {
    const start = touchStartX.current
    const end = event.changedTouches[0]?.clientX
    touchStartX.current = null
    if (start === null || end === undefined) return

    const delta = end - start
    // 48px keeps a vertical scroll from registering as a swipe.
    if (Math.abs(delta) > 48) go(delta < 0 ? 1 : -1)
  }

  if (images.length === 0) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center rounded-card border border-dashed border-ink-300 bg-ink-100 text-ink-400">
        <div className="text-center">
          <ImageOff className="mx-auto size-8" aria-hidden="true" />
          <p className="mt-2 text-sm">Photos coming soon</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {categories.length > 1 ? (
        <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter photos by area">
          <CategoryChip
            active={category === 'all'}
            onClick={() => setCategory('all')}
            label={`All (${images.length})`}
          />
          {categories.map((option) => (
            <CategoryChip
              key={option.value}
              active={category === option.value}
              onClick={() => setCategory(option.value)}
              label={option.label}
            />
          ))}
        </div>
      ) : null}

      <div
        className="group relative aspect-[16/10] overflow-hidden rounded-card bg-ink-900 outline-none"
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label={`${vehicleTitle} photos`}
        onKeyDown={handleKeyDown}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {active ? (
          <Image
            key={active.id}
            src={active.url}
            alt={active.alt_text ?? `${vehicleTitle} — ${labelFor('imageCategory', active.category)}`}
            fill
            priority={activeIndex === 0 && category === 'all'}
            sizes="(min-width: 1024px) 60vw, 100vw"
            className="animate-fade-in object-cover"
          />
        ) : null}

        {total > 1 ? (
          <>
            <GalleryArrow side="left" onClick={() => go(-1)} />
            <GalleryArrow side="right" onClick={() => go(1)} />
          </>
        ) : null}

        <button
          type="button"
          onClick={() => setFullscreen(true)}
          className="absolute right-3 bottom-3 inline-flex h-9 items-center gap-1.5 rounded-md bg-ink-950/70 px-3 text-xs font-medium text-white backdrop-blur transition-colors hover:bg-ink-950/90"
        >
          <Expand className="size-3.5" aria-hidden="true" />
          View fullscreen
        </button>

        {total > 1 ? (
          <div className="absolute bottom-3 left-3 rounded-md bg-ink-950/70 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur">
            <span aria-live="polite">
              {Math.min(activeIndex, total - 1) + 1} / {total}
            </span>
          </div>
        ) : null}
      </div>

      {total > 1 ? (
        <ul className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
          {visible.map((image, index) => (
            <li key={image.id}>
              <button
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Show photo ${index + 1}`}
                aria-current={index === activeIndex}
                className={cn(
                  'relative block aspect-[4/3] w-full overflow-hidden rounded-md ring-offset-2 transition-all',
                  index === activeIndex
                    ? 'ring-2 ring-accent-600'
                    : 'opacity-70 hover:opacity-100',
                )}
              >
                <Image
                  src={image.url}
                  alt=""
                  fill
                  loading="lazy"
                  sizes="(min-width: 1024px) 10vw, 25vw"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {/* Fullscreen viewer */}
      <dialog
        ref={dialogRef}
        onCancel={(event) => {
          event.preventDefault()
          setFullscreen(false)
        }}
        onClose={() => setFullscreen(false)}
        onKeyDown={handleKeyDown}
        aria-label={`${vehicleTitle} photo viewer`}
        className="h-full max-h-none w-full max-w-none bg-ink-950/98 p-0 backdrop:bg-ink-950"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <p className="text-sm font-medium">
              {vehicleTitle}
              {active ? (
                <span className="ml-2 text-white/50">
                  {labelFor('imageCategory', active.category)}
                </span>
              ) : null}
            </p>
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              className="-m-1.5 rounded-md p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close photo viewer"
            >
              <X className="size-6" aria-hidden="true" />
            </button>
          </div>

          <div
            className="relative min-h-0 flex-1"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {active ? (
              <Image
                key={`full-${active.id}`}
                src={active.url}
                alt={active.alt_text ?? vehicleTitle}
                fill
                sizes="100vw"
                className="animate-fade-in object-contain"
              />
            ) : null}

            {total > 1 ? (
              <>
                <GalleryArrow side="left" onClick={() => go(-1)} variant="fullscreen" />
                <GalleryArrow side="right" onClick={() => go(1)} variant="fullscreen" />
              </>
            ) : null}
          </div>

          {total > 1 ? (
            <p className="py-3 text-center text-sm text-white/60">
              {Math.min(activeIndex, total - 1) + 1} of {total}
            </p>
          ) : null}
        </div>
      </dialog>
    </div>
  )
}

function CategoryChip({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'bg-ink-900 text-white'
          : 'border border-ink-300 bg-white text-ink-600 hover:border-ink-400 hover:text-ink-900',
      )}
    >
      {label}
    </button>
  )
}

function GalleryArrow({
  side,
  onClick,
  variant = 'inline',
}: {
  side: 'left' | 'right'
  onClick: () => void
  variant?: 'inline' | 'fullscreen'
}) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === 'left' ? 'Previous photo' : 'Next photo'}
      className={cn(
        'absolute top-1/2 z-10 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-white transition-all',
        side === 'left' ? 'left-3' : 'right-3',
        variant === 'inline'
          ? 'bg-ink-950/60 opacity-0 backdrop-blur group-hover:opacity-100 focus-visible:opacity-100 max-md:opacity-100'
          : 'bg-white/10 hover:bg-white/20',
      )}
    >
      <Icon className="size-5" aria-hidden="true" />
    </button>
  )
}
