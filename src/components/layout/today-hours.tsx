'use client'

import { Clock } from 'lucide-react'

import { formatTime } from '@/lib/format'
import { useIsHydrated } from '@/lib/hooks'
import type { BusinessHour } from '@/types/database'

const DAY_KEYS: BusinessHour['day'][] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

/**
 * "Open today 8:00 AM – 6:00 PM".
 *
 * Resolved in the browser on purpose. Storefront pages are statically rendered
 * with ISR, so a "today" computed on the server would be frozen at build time
 * and could show a Sunday visitor the Friday hours.
 */
export function TodayHours({
  hours,
  className,
}: {
  hours: BusinessHour[]
  className?: string
}) {
  const hydrated = useIsHydrated()

  if (!hydrated || hours.length === 0) return null

  const today = DAY_KEYS[new Date().getDay()]
  const entry = hours.find((hour) => hour.day === today)
  if (!entry) return null

  const label = entry.closed
    ? 'Closed today'
    : `Open today ${formatTime(entry.open)} – ${formatTime(entry.close)}`

  return (
    <span className={className}>
      <Clock className="size-3.5" aria-hidden="true" />
      {label}
    </span>
  )
}
