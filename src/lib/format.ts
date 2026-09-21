/**
 * Display formatting. Fixed to en-PH / PHP so a server in one timezone and a
 * browser in another render the same string - locale drift between the two is
 * a classic source of hydration mismatches.
 */

const LOCALE = 'en-PH'
const CURRENCY = 'PHP'

const pesoWhole = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: CURRENCY,
  maximumFractionDigits: 0,
})

const pesoPrecise = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const plainNumber = new Intl.NumberFormat(LOCALE)

/** ₱948,000 - the default for prices, which are always quoted whole. */
export function formatPeso(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return pesoWhole.format(value)
}

/** ₱15,196.38 - for monthly payments, where the centavos matter. */
export function formatPesoPrecise(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return pesoPrecise.format(value)
}

/** Compact price for tight spaces: ₱948K, ₱2.4M. */
export function formatPesoCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  if (value >= 1_000_000) return `₱${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`
  if (value >= 1_000) return `₱${Math.round(value / 1_000)}K`
  return formatPeso(value)
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return plainNumber.format(value)
}

export function formatPercent(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  const fixed = value.toFixed(decimals)
  return `${fixed.replace(/\.?0+$/, '')}%`
}

export function formatMileage(km: number | null | undefined): string {
  if (km === null || km === undefined || !Number.isFinite(km)) return '—'
  return `${plainNumber.format(km)} km`
}

/** 21 September 2026 */
export function formatDate(value: string | Date | null | undefined): string {
  const date = toDate(value)
  if (!date) return '—'
  return new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Manila',
  }).format(date)
}

/** 21 Sep 2026, 3:45 PM */
export function formatDateTime(value: string | Date | null | undefined): string {
  const date = toDate(value)
  if (!date) return '—'
  return new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Manila',
  }).format(date)
}

/** "09:00" (a Postgres `time` value) -> "9:00 AM" */
export function formatTime(value: string | null | undefined): string {
  if (!value) return '—'
  const [hoursRaw, minutesRaw] = value.split(':')
  const hours = Number(hoursRaw)
  const minutes = Number(minutesRaw ?? '0')
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value

  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 === 0 ? 12 : hours % 12
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`
}

/** "3 days ago" - used for admin list views where exact times add noise. */
export function formatRelativeTime(value: string | Date | null | undefined): string {
  const date = toDate(value)
  if (!date) return '—'

  const formatter = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' })
  const seconds = Math.round((date.getTime() - Date.now()) / 1000)
  const thresholds: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['week', 604_800],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ]

  for (const [unit, secondsPerUnit] of thresholds) {
    if (Math.abs(seconds) >= secondsPerUnit) {
      return formatter.format(Math.round(seconds / secondsPerUnit), unit)
    }
  }
  return formatter.format(seconds, 'second')
}

/** ISO date (yyyy-mm-dd) for `<input type="date">` values. */
export function toDateInputValue(value: string | Date | null | undefined): string {
  const date = toDate(value)
  if (!date) return ''
  return date.toISOString().slice(0, 10)
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Strips a phone number down to what `tel:` accepts, keeping a leading `+`.
 */
export function toTelHref(phone: string | null | undefined): string | null {
  if (!phone) return null
  const cleaned = phone.replace(/[^\d+]/g, '')
  return cleaned.length >= 7 ? `tel:${cleaned}` : null
}

export function toMailtoHref(email: string | null | undefined): string | null {
  if (!email) return null
  const trimmed = email.trim()
  return trimmed.includes('@') ? `mailto:${trimmed}` : null
}

/** Truncates on a word boundary, for meta descriptions and card copy. */
export function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  const cut = value.slice(0, maxLength)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}
