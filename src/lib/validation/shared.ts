import { z } from 'zod'

import type { Option } from '@/lib/constants'

/**
 * Builds a Zod enum from the option lists in `src/lib/constants`, so the values
 * a form accepts can never drift from the values the UI offers.
 */
export function enumFromOptions<T extends string>(options: readonly Option<T>[]) {
  const values = options.map((option) => option.value) as [T, ...T[]]
  return z.enum(values)
}

/** Trims, then treats an empty string as "not provided". */
export const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer.`)
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .catch(null)

export const requiredText = (label: string, { min = 1, max = 255 } = {}) =>
  z
    .string()
    .trim()
    .min(min, min === 1 ? `${label} is required.` : `${label} must be at least ${min} characters.`)
    .max(max, `${label} must be ${max} characters or fewer.`)

export const optionalUrl = z
  .string()
  .trim()
  .transform((value) => (value === '' ? null : value))
  .nullable()
  .refine(
    (value) => value === null || /^https?:\/\/.+/i.test(value),
    'Enter a full URL starting with http:// or https://',
  )

/**
 * Philippine mobile and landline numbers arrive in many shapes
 * (0917 123 4567, +63 917 123 4567, (02) 8123 4567), so the rule is "enough
 * digits to be dialable" rather than a single strict pattern.
 */
export const phoneSchema = z
  .string()
  .trim()
  .min(7, 'Enter a valid contact number.')
  .max(32, 'Contact number is too long.')
  .refine((value) => /^[+]?[\d\s()\-.]+$/.test(value), 'Contact number contains invalid characters.')
  .refine((value) => value.replace(/\D/g, '').length >= 7, 'Enter a valid contact number.')

export const emailSchema = z.email('Enter a valid email address.').trim().max(255)

export const optionalEmailSchema = z
  .string()
  .trim()
  .transform((value) => (value === '' ? null : value))
  .nullable()
  .refine(
    (value) => value === null || z.email().safeParse(value).success,
    'Enter a valid email address.',
  )

/** Peso amount coming from a form field, where `""` means "leave it unset". */
export const optionalMoney = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined || value === '') return null
    const parsed = typeof value === 'number' ? value : Number(String(value).replace(/[,\s₱]/g, ''))
    return Number.isFinite(parsed) ? parsed : Number.NaN
  })
  .refine((value) => value === null || !Number.isNaN(value), 'Enter a valid amount.')
  .refine((value) => value === null || value >= 0, 'Amount cannot be negative.')
  .refine((value) => value === null || value <= 999_999_999, 'Amount is too large.')

export const requiredMoney = z
  .union([z.string(), z.number()])
  .transform((value) =>
    typeof value === 'number' ? value : Number(String(value).replace(/[,\s₱]/g, '')),
  )
  .refine((value) => Number.isFinite(value), 'Enter a valid amount.')
  .refine((value) => value > 0, 'Enter an amount greater than zero.')
  .refine((value) => value <= 999_999_999, 'Amount is too large.')

export const optionalInteger = (min: number, max: number, label: string) =>
  z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((value) => {
      if (value === null || value === undefined || value === '') return null
      const parsed = typeof value === 'number' ? value : Number(value)
      return Number.isFinite(parsed) ? Math.trunc(parsed) : Number.NaN
    })
    .refine((value) => value === null || !Number.isNaN(value), `Enter a valid ${label}.`)
    .refine(
      (value) => value === null || (value >= min && value <= max),
      `${label} must be between ${min} and ${max}.`,
    )

export const optionalDecimal = (min: number, max: number, label: string) =>
  z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((value) => {
      if (value === null || value === undefined || value === '') return null
      const parsed = typeof value === 'number' ? value : Number(value)
      return Number.isFinite(parsed) ? parsed : Number.NaN
    })
    .refine((value) => value === null || !Number.isNaN(value), `Enter a valid ${label}.`)
    .refine(
      (value) => value === null || (value >= min && value <= max),
      `${label} must be between ${min} and ${max}.`,
    )

/** Checkbox values arrive as "on" / "true" / missing from a FormData post. */
export const formBoolean = z
  .union([z.boolean(), z.string(), z.undefined(), z.null()])
  .transform((value) => value === true || value === 'true' || value === 'on' || value === '1')

export const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a valid date.')

export const optionalIsoDateSchema = z
  .string()
  .trim()
  .transform((value) => (value === '' ? null : value))
  .nullable()
  .refine((value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value), 'Choose a valid date.')

export const timeSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Choose a valid time.')

export const uuidSchema = z.uuid('Invalid identifier.')

export const optionalUuidSchema = z
  .string()
  .trim()
  .transform((value) => (value === '' ? null : value))
  .nullable()
  .refine((value) => value === null || z.uuid().safeParse(value).success, 'Invalid identifier.')
