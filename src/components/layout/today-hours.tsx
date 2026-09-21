'use client'

import * as React from 'react'
import { Clock } from 'lucide-react'

import { formatTime } from '@/lib/format'
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
 * Computed in the browser on purpose. Storefront pages are statically rendered
 * with ISR, so "today" resolved on the server would be frozen at build time and
 * could tell a Sunday visitor the Friday hours.
 */
export function TodayHours({
  hours,
  className,
}: {
  hours: BusinessHour[]
  className?: string
}) {
  const [label, setLabel] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (hours.length === 0) return

    const today = DAY_KEYS[new Date().getDay()]
    const entry = hours.find((hour) => hour.day === today)
    if (!entry) return

    setLabel(entry.closed ? 'Closed today' : `Open today ${formatTime(entry.open)} – ${formatTime(entry.close)}`)
  }, [hours])

  // Renders nothing on the server and until the effect runs, so there is no
  // hydration mismatch and no layout jump beyond one short line.
  if (!label) return null

  return (
    <span className={className}>
      <Clock className="size-3.5" aria-hidden="true" />
      {label}
    </span>
  )
}
