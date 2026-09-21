import { z } from 'zod'

import { LOAN_TERMS } from '@/lib/constants'
import { slugify } from '@/lib/utils'
import {
  formBoolean,
  optionalDecimal,
  optionalIsoDateSchema,
  optionalText,
  optionalUrl,
  requiredText,
  uuidSchema,
} from '@/lib/validation/shared'

const businessHourSchema = z.object({
  day: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
  open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use a 24-hour time such as 09:00.'),
  close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use a 24-hour time such as 18:00.'),
  closed: formBoolean,
})

/**
 * Dealership settings.
 *
 * Contact fields are all optional: the dealership fills them in when the real
 * values are available, and the public site omits whatever is still blank
 * rather than displaying a placeholder that reads as real.
 */
export const dealershipSettingsSchema = z
  .object({
    businessName: requiredText('Business name', { min: 2, max: 120 }),
    tagline: optionalText(160),
    about: optionalText(4000),

    phone: optionalText(32),
    phoneSecondary: optionalText(32),
    email: z
      .string()
      .trim()
      .transform((value) => (value === '' ? null : value))
      .nullable()
      .refine(
        (value) => value === null || z.email().safeParse(value).success,
        'Enter a valid email address.',
      ),
    facebookUrl: optionalUrl,
    messengerUrl: optionalUrl,
    instagramUrl: optionalUrl,
    tiktokUrl: optionalUrl,
    viberNumber: optionalText(32),

    addressLine1: optionalText(160),
    addressLine2: optionalText(160),
    city: optionalText(80),
    province: optionalText(80),
    postalCode: optionalText(16),
    country: optionalText(80),
    googleMapsUrl: optionalUrl,
    googleMapsEmbedUrl: optionalUrl,

    businessHours: z.array(businessHourSchema).max(7),

    logoUrl: optionalUrl,
    heroImageUrl: optionalUrl,
    responseTimeNote: optionalText(200),

    defaultInterestRate: z
      .union([z.string(), z.number()])
      .transform((value) => (typeof value === 'number' ? value : Number(value)))
      .refine((value) => Number.isFinite(value), 'Enter a valid interest rate.')
      .refine((value) => value >= 0 && value <= 100, 'Interest rate must be between 0% and 100%.'),
    defaultDownPaymentPercent: z
      .union([z.string(), z.number()])
      .transform((value) => (typeof value === 'number' ? value : Number(value)))
      .refine((value) => Number.isFinite(value), 'Enter a valid down payment percentage.')
      .refine((value) => value >= 0 && value < 100, 'Down payment must be between 0% and 99%.'),
    defaultTermMonths: z
      .union([z.string(), z.number()])
      .transform((value) => (typeof value === 'number' ? value : Number(value)))
      .refine((value) => Number.isInteger(value), 'Choose a valid loan term.')
      .refine((value) => LOAN_TERMS.includes(value as (typeof LOAN_TERMS)[number]), 'Choose a supported loan term.'),
    financingDisclaimer: requiredText('Financing disclaimer', { min: 10, max: 600 }),
  })
  .superRefine((value, ctx) => {
    for (const [index, entry] of value.businessHours.entries()) {
      if (!entry.closed && entry.close <= entry.open) {
        ctx.addIssue({
          code: 'custom',
          path: ['businessHours', index, 'close'],
          message: 'Closing time must be after opening time.',
        })
      }
    }
  })

export type DealershipSettingsInput = z.input<typeof dealershipSettingsSchema>
export type DealershipSettingsValues = z.output<typeof dealershipSettingsSchema>

/* -------------------------------------------------------------------------- */
/* Financing configuration                                                     */
/* -------------------------------------------------------------------------- */

export const financingProviderSchema = z.object({
  providerId: z
    .string()
    .trim()
    .transform((value) => (value === '' ? null : value))
    .nullable(),
  name: requiredText('Provider name', { min: 2, max: 80 }),
  slug: z
    .string()
    .trim()
    .transform((value) => (value === '' ? '' : slugify(value)))
    .refine(
      (value) => value === '' || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value),
      'Use lowercase letters, numbers and hyphens only.',
    ),
  description: optionalText(600),
  logoUrl: optionalUrl,
  isActive: formBoolean,
  sortOrder: z
    .union([z.string(), z.number()])
    .transform((value) => (typeof value === 'number' ? value : Number(value || 0)))
    .refine((value) => Number.isInteger(value) && value >= 0 && value <= 999, 'Enter a valid order.'),
})

export const financingRateSchema = z
  .object({
    rateId: z
      .string()
      .trim()
      .transform((value) => (value === '' ? null : value))
      .nullable(),
    providerId: uuidSchema,
    vehicleId: z
      .string()
      .trim()
      .transform((value) => (value === '' ? null : value))
      .nullable()
      .refine((value) => value === null || z.uuid().safeParse(value).success, 'Invalid vehicle.'),
    termMonths: z
      .union([z.string(), z.number()])
      .transform((value) => (typeof value === 'number' ? value : Number(value)))
      .refine((value) => Number.isInteger(value) && value >= 1 && value <= 120, 'Choose a valid term.'),
    interestRate: z
      .union([z.string(), z.number()])
      .transform((value) => (typeof value === 'number' ? value : Number(value)))
      .refine((value) => Number.isFinite(value), 'Enter a valid interest rate.')
      .refine((value) => value >= 0 && value <= 100, 'Interest rate must be between 0% and 100%.'),
    minimumDownPaymentPercent: z
      .union([z.string(), z.number()])
      .transform((value) => (typeof value === 'number' ? value : Number(value)))
      .refine((value) => Number.isFinite(value), 'Enter a valid down payment percentage.')
      .refine((value) => value >= 0 && value < 100, 'Minimum down payment must be between 0% and 99%.'),
    isActive: formBoolean,
    validFrom: optionalIsoDateSchema,
    validUntil: optionalIsoDateSchema,
  })
  .superRefine((value, ctx) => {
    if (value.validFrom && value.validUntil && value.validUntil < value.validFrom) {
      ctx.addIssue({
        code: 'custom',
        path: ['validUntil'],
        message: 'End date must be on or after the start date.',
      })
    }
  })

export const providerDeleteSchema = z.object({ providerId: uuidSchema })
export const rateDeleteSchema = z.object({ rateId: uuidSchema })

/* -------------------------------------------------------------------------- */
/* Financing estimate percentages used by the public calculator                */
/* -------------------------------------------------------------------------- */

export const calculatorSnapshotSchema = z.object({
  vehiclePrice: z.number().nonnegative(),
  downPaymentAmount: z.number().nonnegative(),
  downPaymentPercent: optionalDecimal(0, 99.99, 'down payment percentage'),
  termMonths: z.number().int().min(1).max(120),
  interestRate: z.number().min(0).max(100),
})
