import Image from 'next/image'
import Link from 'next/link'
import { Fuel, Gauge, Settings2, Users } from 'lucide-react'

import { labelFor } from '@/lib/constants'
import type { VehicleSummary } from '@/lib/data/vehicles'
import { formatMileage, formatPeso, formatPesoPrecise } from '@/lib/format'
import { cn } from '@/lib/utils'

import { VehicleBadges } from './vehicle-badges'

/**
 * Inventory card.
 *
 * Follows the visual hierarchy in the UI spec: photo, then name, then price,
 * then monthly estimate, then a few specs. The whole card is one link, with the
 * image and heading sharing a single accessible name so a screen reader
 * announces "2026 BYD Seal 5 DM-i Dynamic, link" once, not three times.
 */
export function VehicleCard({
  vehicle,
  priority = false,
  className,
}: {
  vehicle: VehicleSummary
  /** Set on the first row above the fold so the LCP image is not lazy-loaded. */
  priority?: boolean
  className?: string
}) {
  const primaryImage = vehicle.images[0]
  const isUnavailable = vehicle.status === 'sold'

  const specs = [
    vehicle.fuel_type ? { icon: Fuel, label: labelFor('fuelType', vehicle.fuel_type) } : null,
    vehicle.transmission
      ? { icon: Settings2, label: labelFor('transmission', vehicle.transmission) }
      : null,
    vehicle.seating_capacity ? { icon: Users, label: `${vehicle.seating_capacity} seats` } : null,
    vehicle.condition !== 'brand_new' && vehicle.mileage !== null
      ? { icon: Gauge, label: formatMileage(vehicle.mileage) }
      : null,
  ].filter(Boolean) as { icon: typeof Fuel; label: string }[]

  return (
    <article
      className={cn(
        'group lift relative flex flex-col overflow-hidden rounded-card border border-ink-200 bg-white shadow-card hover:border-ink-300 hover:shadow-card-hover',
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-ink-100">
        {primaryImage ? (
          <Image
            src={primaryImage.url}
            alt={primaryImage.alt_text ?? vehicle.title}
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            priority={priority}
            loading={priority ? undefined : 'lazy'}
            className={cn(
              'object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.06]',
              isUnavailable && 'opacity-70 grayscale',
            )}
          />
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-ink-400">
            No photo yet
          </div>
        )}

        <VehicleBadges vehicle={vehicle} className="absolute top-3 left-3 flex flex-wrap gap-1.5" />
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <p className="text-xs font-medium text-ink-500">
          {vehicle.year} · {labelFor('bodyType', vehicle.body_type) || labelFor('condition', vehicle.condition)}
        </p>

        <h3 className="mt-1 text-base leading-snug font-semibold text-ink-900">
          {/* Stretched link: the whole card is clickable, but only one link
              exists in the accessibility tree. */}
          <Link href={`/cars/${vehicle.slug}`} className="before:absolute before:inset-0">
            {vehicle.brand} {vehicle.model}
            {vehicle.variant ? <span className="text-ink-600"> {vehicle.variant}</span> : null}
          </Link>
        </h3>

        <div className="mt-3">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="tabular text-xl font-bold text-ink-900">
              {formatPeso(vehicle.pricing.price)}
            </span>
            {vehicle.pricing.compareAtPrice ? (
              <span className="tabular text-sm text-ink-400 line-through">
                {formatPeso(vehicle.pricing.compareAtPrice)}
              </span>
            ) : null}
          </div>

          {vehicle.monthlyFrom ? (
            <p className="tabular mt-0.5 text-sm text-ink-600">
              From{' '}
              <span className="font-semibold text-ink-800">
                {formatPesoPrecise(vehicle.monthlyFrom)}
              </span>
              /month
            </p>
          ) : null}
        </div>

        {specs.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-ink-100 pt-3.5 text-xs text-ink-600">
            {specs.map((spec) => (
              <li key={spec.label} className="inline-flex items-center gap-1.5">
                <spec.icon className="size-3.5 text-ink-400" aria-hidden="true" />
                {spec.label}
              </li>
            ))}
          </ul>
        ) : null}

        <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-700 transition-colors group-hover:text-accent-800">
          View vehicle
          <span
            aria-hidden="true"
            className="transition-transform duration-300 group-hover:translate-x-1"
          >
            →
          </span>
        </p>
      </div>
    </article>
  )
}

export function VehicleCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-card border border-ink-200 bg-white shadow-card">
      <div className="shimmer aspect-[4/3]" />
      <div className="space-y-3 p-5">
        <div className="shimmer h-3 w-20 rounded" />
        <div className="shimmer h-5 w-3/4 rounded" />
        <div className="shimmer h-6 w-32 rounded" />
        <div className="shimmer h-3 w-40 rounded" />
      </div>
    </div>
  )
}
