import { z } from 'zod'

import {
  BODY_TYPES,
  DRIVE_TYPES,
  FUEL_TYPES,
  IMAGE_CATEGORIES,
  TRANSMISSIONS,
  VEHICLE_CONDITIONS,
  VEHICLE_STATUSES,
  VIDEO_TYPES,
} from '@/lib/constants'
import { slugify } from '@/lib/utils'
import {
  enumFromOptions,
  formBoolean,
  optionalDecimal,
  optionalInteger,
  optionalMoney,
  optionalText,
  optionalUrl,
  requiredMoney,
  requiredText,
  uuidSchema,
} from '@/lib/validation/shared'

const CURRENT_YEAR = new Date().getFullYear()

/**
 * Admin vehicle form.
 *
 * Mirrors the CHECK constraints on public.vehicles so a mistake surfaces as a
 * field-level message rather than a raw Postgres error.
 */
export const vehicleSchema = z
  .object({
    brand: requiredText('Brand', { min: 1, max: 60 }),
    model: requiredText('Model', { min: 1, max: 80 }),
    variant: optionalText(80),
    slug: z
      .string()
      .trim()
      .max(160)
      .transform((value) => (value === '' ? '' : slugify(value)))
      .refine(
        (value) => value === '' || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value),
        'Use lowercase letters, numbers and hyphens only.',
      ),
    year: z
      .union([z.string(), z.number()])
      .transform((value) => (typeof value === 'number' ? value : Number(value)))
      .refine((value) => Number.isInteger(value), 'Enter a valid year.')
      .refine(
        (value) => value >= 1950 && value <= CURRENT_YEAR + 2,
        `Year must be between 1950 and ${CURRENT_YEAR + 2}.`,
      ),

    condition: enumFromOptions(VEHICLE_CONDITIONS).default('brand_new'),
    bodyType: enumFromOptions(BODY_TYPES).nullable().catch(null),
    fuelType: enumFromOptions(FUEL_TYPES).nullable().catch(null),
    transmission: enumFromOptions(TRANSMISSIONS).nullable().catch(null),
    driveType: enumFromOptions(DRIVE_TYPES).nullable().catch(null),

    seatingCapacity: optionalInteger(1, 60, 'seating capacity'),
    mileage: optionalInteger(0, 2_000_000, 'mileage'),
    exteriorColor: optionalText(60),
    interiorColor: optionalText(60),
    plateEnding: optionalText(10),

    engine: optionalText(120),
    powerHp: optionalDecimal(0, 99_999, 'power'),
    torqueNm: optionalDecimal(0, 99_999, 'torque'),

    description: optionalText(6000),
    // Textarea, one feature per line.
    features: z
      .union([z.string(), z.array(z.string())])
      .transform((value) => (Array.isArray(value) ? value : value.split('\n')))
      .transform((list) =>
        list
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 60),
      ),

    srp: optionalMoney,
    sellingPrice: requiredMoney,
    promoPrice: optionalMoney,
    promoLabel: optionalText(80),
    promoStartsAt: optionalText(40),
    promoEndsAt: optionalText(40),

    defaultDownPaymentPercent: optionalDecimal(0, 99.99, 'down payment percentage'),
    defaultTermMonths: optionalInteger(1, 120, 'loan term'),

    status: enumFromOptions(VEHICLE_STATUSES).default('draft'),
    isFeatured: formBoolean,
    isPromoted: formBoolean,

    metaTitle: optionalText(160),
    metaDescription: optionalText(320),
  })
  .superRefine((value, ctx) => {
    if (value.promoPrice !== null && value.promoPrice > value.sellingPrice) {
      ctx.addIssue({
        code: 'custom',
        path: ['promoPrice'],
        message: 'Promo price cannot be higher than the selling price.',
      })
    }

    if (value.srp !== null && value.srp < value.sellingPrice) {
      ctx.addIssue({
        code: 'custom',
        path: ['srp'],
        message: 'SRP should be at least the selling price.',
      })
    }

    if (value.promoStartsAt && value.promoEndsAt && value.promoEndsAt <= value.promoStartsAt) {
      ctx.addIssue({
        code: 'custom',
        path: ['promoEndsAt'],
        message: 'Promo end must come after the promo start.',
      })
    }

    // A published listing with no price context is worse than no listing.
    if (value.status === 'published' && value.sellingPrice <= 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['sellingPrice'],
        message: 'Set a selling price before publishing.',
      })
    }
  })

export type VehicleFormInput = z.input<typeof vehicleSchema>
export type VehicleFormValues = z.output<typeof vehicleSchema>

/* -------------------------------------------------------------------------- */
/* Media                                                                       */
/* -------------------------------------------------------------------------- */

export const vehicleImageMetaSchema = z.object({
  imageId: uuidSchema,
  altText: optionalText(200),
  category: enumFromOptions(IMAGE_CATEGORIES),
})

export const imageOrderSchema = z.object({
  vehicleId: uuidSchema,
  orderedIds: z.array(uuidSchema).min(1, 'Nothing to reorder.').max(60),
})

export const vehicleVideoSchema = z.object({
  vehicleId: uuidSchema,
  videoId: z
    .string()
    .trim()
    .transform((value) => (value === '' ? null : value))
    .nullable(),
  title: requiredText('Video title', { min: 2, max: 140 }),
  videoUrl: z
    .string()
    .trim()
    .min(1, 'Video URL is required.')
    .refine((value) => /^https?:\/\/.+/i.test(value), 'Enter a full URL starting with https://'),
  videoType: enumFromOptions(VIDEO_TYPES).default('walkaround'),
  thumbnailUrl: optionalUrl,
})

/* -------------------------------------------------------------------------- */
/* Specifications                                                              */
/* -------------------------------------------------------------------------- */

export const specificationSchema = z.object({
  vehicleId: uuidSchema,
  specifications: z
    .array(
      z.object({
        groupName: z.string().trim().max(60).default('General'),
        name: requiredText('Specification name', { min: 1, max: 80 }),
        value: requiredText('Specification value', { min: 1, max: 160 }),
      }),
    )
    .max(80, 'That is more specifications than a listing can usefully show.'),
})

/* -------------------------------------------------------------------------- */
/* Status transitions                                                          */
/* -------------------------------------------------------------------------- */

export const vehicleStatusSchema = z.object({
  vehicleId: uuidSchema,
  status: enumFromOptions(VEHICLE_STATUSES),
})
