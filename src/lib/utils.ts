import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Conditional class names with later Tailwind utilities winning conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * URL-safe slug. Used for vehicle URLs, so it must stay in step with the
 * `slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'` CHECK constraint on public.vehicles.
 */
export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

/** Builds the canonical slug for a vehicle: brand + model + variant + year. */
export function buildVehicleSlug(input: {
  brand: string
  model: string
  variant?: string | null
  year: number
}): string {
  return slugify(
    [input.brand, input.model, input.variant ?? '', String(input.year)].filter(Boolean).join(' '),
  )
}

/** Clamps a number into a range, treating NaN as the lower bound. */
export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(Math.max(value, min), max)
}

/** Rounds to a fixed number of decimal places without float drift artefacts. */
export function round(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0
  const factor = 10 ** decimals
  return Math.round((value + Number.EPSILON) * factor) / factor
}

/** Parses user or query-string input that should be a number. */
export function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string') return null
  const cleaned = value.replace(/[,\s₱]/g, '')
  if (cleaned === '') return null
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : null
}

/** Removes null/undefined/empty values so they never reach a query string. */
export function compact<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== null && value !== undefined && value !== ''),
  ) as Partial<T>
}

/** Splits a list into chunks, used for paging through bulk operations. */
export function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size))
  }
  return result
}
