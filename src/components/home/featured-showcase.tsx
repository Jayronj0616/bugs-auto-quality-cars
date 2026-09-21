'use client'

import * as React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import type { VehicleSummary } from '@/lib/data/vehicles'
import { formatPeso, formatPesoPrecise } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Featured car showcase in the hero.
 *
 * A compact switcher: thumbnails on the right select which featured vehicle the
 * card describes. It gives the hero a real car with a real price rather than a
 * stock photograph, and gives featured stock a second, more prominent placement
 * than the grid further down the page.
 */
export function FeaturedShowcase({ vehicles }: { vehicles: VehicleSummary[] }) {
  const [activeIndex, setActiveIndex] = React.useState(0)

  if (vehicles.length === 0) return null

  const active = vehicles[Math.min(activeIndex, vehicles.length - 1)]
  const image = active.images[0]

  return (
    <div className="rounded-card border border-white/15 bg-brand-950/70 p-4 backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow text-accent-400">Featured</p>
        {vehicles.length > 1 ? (
          <p className="text-[11px] text-white/45" aria-live="polite">
            {activeIndex + 1} / {vehicles.length}
          </p>
        ) : null}
      </div>

      <Link href={`/cars/${active.slug}`} className="group mt-3 block">
        <div className="relative aspect-[16/10] overflow-hidden rounded-md bg-brand-800">
          {image ? (
            <Image
              key={image.id}
              src={image.url}
              alt={image.alt_text ?? active.title}
              fill
              sizes="(min-width: 1024px) 20rem, 90vw"
              className="animate-fade-in object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <span className="flex size-full items-center justify-center text-xs text-white/40">
              Photo coming soon
            </span>
          )}
        </div>

        <p className="mt-3 text-sm leading-snug font-semibold text-white">
          {active.year} {active.brand} {active.model}
        </p>
        {active.variant ? <p className="text-xs text-white/55">{active.variant}</p> : null}

        <div className="mt-3 flex items-end justify-between gap-3 border-t border-white/10 pt-3">
          <div>
            <p className="text-[11px] tracking-wide text-white/45 uppercase">Cash price</p>
            <p className="tabular text-lg font-bold text-white">{formatPeso(active.pricing.price)}</p>
          </div>
          {active.monthlyFrom ? (
            <div className="text-right">
              <p className="text-[11px] tracking-wide text-white/45 uppercase">From</p>
              <p className="tabular text-sm font-semibold text-white">
                {formatPesoPrecise(active.monthlyFrom)}
                <span className="font-normal text-white/50">/mo</span>
              </p>
            </div>
          ) : null}
        </div>

        <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-400">
          View this vehicle
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </p>
      </Link>

      {vehicles.length > 1 ? (
        <div
          role="group"
          aria-label="Choose a featured vehicle"
          className="mt-4 flex gap-2 border-t border-white/10 pt-3"
        >
          {vehicles.map((vehicle, index) => {
            const thumb = vehicle.images[0]
            return (
              <button
                key={vehicle.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Show ${vehicle.title}`}
                aria-current={index === activeIndex}
                className={cn(
                  'relative size-12 shrink-0 overflow-hidden rounded-md ring-offset-2 ring-offset-brand-950 transition-all',
                  index === activeIndex
                    ? 'ring-2 ring-accent-500'
                    : 'opacity-55 hover:opacity-90',
                )}
              >
                {thumb ? (
                  <Image src={thumb.url} alt="" fill sizes="48px" className="object-cover" />
                ) : (
                  <span className="flex size-full items-center justify-center bg-brand-800 text-[9px] text-white/40">
                    {vehicle.brand.slice(0, 3)}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
