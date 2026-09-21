import { Badge, type BadgeTone } from '@/components/ui/badge'
import { labelFor } from '@/lib/constants'
import type { VehicleSummary } from '@/lib/data/vehicles'

/**
 * Vehicle badges.
 *
 * The rules live here rather than in each card so the whole site agrees on what
 * a vehicle is currently "saying", and so a listing never ends up wearing five
 * badges at once - availability always wins, and at most two are shown.
 */
export function vehicleBadges(vehicle: VehicleSummary): { label: string; tone: BadgeTone }[] {
  const badges: { label: string; tone: BadgeTone }[] = []

  // Availability is the most important thing a shopper can know, so it leads
  // and suppresses the marketing badges entirely.
  if (vehicle.status === 'sold') return [{ label: 'Sold', tone: 'dark' }]
  if (vehicle.status === 'reserved') return [{ label: 'Reserved', tone: 'warning' }]

  if (vehicle.pricing.isPromoActive) {
    badges.push({ label: vehicle.pricing.promoLabel ?? 'Promo', tone: 'accent' })
  } else if (vehicle.condition === 'brand_new') {
    badges.push({ label: 'Brand New', tone: 'dark' })
  } else {
    badges.push({ label: labelFor('condition', vehicle.condition), tone: 'neutral' })
  }

  if (vehicle.is_featured && badges.length < 2) {
    badges.push({ label: 'Featured', tone: 'outline' })
  }

  return badges.slice(0, 2)
}

export function VehicleBadges({
  vehicle,
  className,
}: {
  vehicle: VehicleSummary
  className?: string
}) {
  const badges = vehicleBadges(vehicle)
  if (badges.length === 0) return null

  return (
    <div className={className}>
      {badges.map((badge) => (
        <Badge key={badge.label} tone={badge.tone}>
          {badge.label}
        </Badge>
      ))}
    </div>
  )
}
