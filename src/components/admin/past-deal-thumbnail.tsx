'use client'

import * as React from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, ImageOff, Save } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Field, Select } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { Alert } from '@/components/ui/surfaces'
import { setPastDealFeaturedRank, updatePastDealBrand } from '@/lib/actions/past-deals'
import { FEATURED_PAST_DEAL_SLOTS, PAST_DEAL_BRANDS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { PastDealBrand } from '@/types/database'

type ThumbnailImage = { id: string; url: string; alt_text: string | null; is_primary: boolean }

/** A homepage spot and who holds it now. */
export type FeaturedSlot = { id: string; title: string; featured_rank: number }

function sortByPrimaryFirst(images: ThumbnailImage[]): ThumbnailImage[] {
  return [...images].sort((a, b) => Number(b.is_primary) - Number(a.is_primary))
}

/**
 * Clickable thumbnail for the Sold Archive list.
 *
 * Opens a modal showing the photo much larger, with the brand dropdown and
 * homepage spot right next to it - fixing a wrong brand, featuring a unit
 * (or just taking a proper look at the photo) never has to leave the list for
 * the full edit page or open the photo in another tab.
 */
export function PastDealThumbnail({
  dealId,
  title,
  brand,
  featuredRank,
  featuredSlots,
  images,
}: {
  dealId: string
  title: string
  brand: PastDealBrand | null
  featuredRank: number | null
  featuredSlots: FeaturedSlot[]
  images: ThumbnailImage[]
}) {
  const [open, setOpen] = React.useState(false)

  if (images.length === 0) {
    return (
      <div className="flex size-14 shrink-0 items-center justify-center rounded-md bg-ink-100 text-ink-400">
        <ImageOff className="size-5" aria-hidden="true" />
      </div>
    )
  }

  const sorted = sortByPrimaryFirst(images)
  const cover = sorted[0]

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`View photo and edit brand for ${title}`}
        className="relative size-14 shrink-0 overflow-hidden rounded-md bg-ink-100 outline-none ring-accent-600 ring-offset-2 transition-transform hover:scale-105 focus-visible:ring-2"
      >
        <Image src={cover.url} alt={cover.alt_text ?? title} fill sizes="56px" className="object-cover" />
      </button>

      {open ? (
        <PastDealQuickEditModal
          dealId={dealId}
          title={title}
          brand={brand}
          featuredRank={featuredRank}
          featuredSlots={featuredSlots}
          images={sorted}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  )
}

function PastDealQuickEditModal({
  dealId,
  title,
  brand,
  featuredRank,
  featuredSlots,
  images,
  onClose,
}: {
  dealId: string
  title: string
  brand: PastDealBrand | null
  featuredRank: number | null
  featuredSlots: FeaturedSlot[]
  images: ThumbnailImage[]
  onClose: () => void
}) {
  const router = useRouter()
  const [index, setIndex] = React.useState(0)
  const [selectedBrand, setSelectedBrand] = React.useState<PastDealBrand | ''>(brand ?? '')
  const [selectedRank, setSelectedRank] = React.useState<string>(featuredRank ? String(featuredRank) : '')
  const [isPending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)

  const total = images.length
  const active = images[Math.min(index, total - 1)]
  const go = (delta: number) => setIndex((current) => (current + delta + total) % total)

  function handleSave() {
    setError(null)
    startTransition(async () => {
      // Only call what actually changed, so a rank-only edit can't rewrite the
      // title/slug and a brand-only edit can't disturb the homepage spots.
      if ((selectedBrand || null) !== brand) {
        const result = await updatePastDealBrand({ dealId, brand: selectedBrand || null })
        if (!result.ok) {
          setError(result.message)
          return
        }
      }
      const nextRank = selectedRank ? Number(selectedRank) : null
      if (nextRank !== featuredRank) {
        const result = await setPastDealFeaturedRank({ dealId, rank: nextRank })
        if (!result.ok) {
          setError(result.message)
          return
        }
      }
      router.refresh()
      onClose()
    })
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="inline-flex h-9 items-center rounded-md border border-ink-300 bg-white px-3.5 text-sm font-medium text-ink-800 hover:bg-ink-50 disabled:opacity-55"
          >
            Cancel
          </button>
          <Button size="sm" onClick={handleSave} isLoading={isPending} loadingText="Saving…">
            <Save className="size-4" aria-hidden="true" />
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error ? <Alert tone="danger">{error}</Alert> : null}

        <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-brand-900">
          <Image
            key={active.id}
            src={active.url}
            alt={active.alt_text ?? title}
            fill
            sizes="(min-width: 1024px) 48rem, 92vw"
            className="animate-fade-in object-contain"
          />

          {total > 1 ? (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Previous photo"
                className="absolute top-1/2 left-3 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-brand-900/60 text-white backdrop-blur transition-colors hover:bg-brand-900/80"
              >
                <ChevronLeft className="size-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Next photo"
                className="absolute top-1/2 right-3 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-brand-900/60 text-white backdrop-blur transition-colors hover:bg-brand-900/80"
              >
                <ChevronRight className="size-5" aria-hidden="true" />
              </button>
              <div className="absolute bottom-3 left-3 rounded-md bg-brand-900/70 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur">
                {index + 1} / {total}
              </div>
            </>
          ) : null}
        </div>

        {total > 1 ? (
          <ul className="flex gap-2 overflow-x-auto">
            {images.map((image, i) => (
              <li key={image.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Show photo ${i + 1}`}
                  aria-current={i === index}
                  className={cn(
                    'relative block size-14 overflow-hidden rounded-md ring-offset-2 transition-all',
                    i === index ? 'ring-2 ring-accent-600' : 'opacity-70 hover:opacity-100',
                  )}
                >
                  <Image src={image.url} alt="" fill sizes="56px" className="object-cover" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Brand" description="Picked from the photo's badge.">
            <Select
              value={selectedBrand}
              onChange={(event) => setSelectedBrand(event.target.value as PastDealBrand | '')}
            >
              <option value="">Not sure / no badge visible</option>
              {PAST_DEAL_BRANDS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Homepage top 5"
            description="Choosing a taken spot swaps places with that unit."
          >
            <Select value={selectedRank} onChange={(event) => setSelectedRank(event.target.value)}>
              <option value="">Not featured</option>
              {Array.from({ length: FEATURED_PAST_DEAL_SLOTS }, (_, i) => i + 1).map((spot) => {
                const holder = featuredSlots.find((slot) => slot.featured_rank === spot)
                const taken = holder && holder.id !== dealId
                return (
                  <option key={spot} value={spot}>
                    {`#${spot}`}
                    {taken ? ` - now ${holder.title}` : ''}
                  </option>
                )
              })}
            </Select>
          </Field>
        </div>
      </div>
    </Modal>
  )
}
