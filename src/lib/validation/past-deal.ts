import { z } from 'zod'

import { PAST_DEAL_BRANDS } from '@/lib/constants'
import { slugify } from '@/lib/utils'
import { enumFromOptions, formBoolean, optionalIsoDateSchema, optionalText } from '@/lib/validation/shared'

/**
 * Past deal form.
 *
 * Deliberately small next to `vehicleSchema` - a past deal is a brand and
 * some photos, not a listing. `brand` is a fixed list rather than free text:
 * a badge is legible in a photo far more reliably than an exact model is,
 * and a fixed list is what makes filtering /sold by brand possible. `title`
 * is derived from it server-side, not collected here.
 */
/** Shared with the quick-edit action - a bad or empty value just means "not set". */
export const pastDealBrandSchema = enumFromOptions(PAST_DEAL_BRANDS).nullable().catch(null)

export const pastDealSchema = z.object({
  brand: pastDealBrandSchema,
  slug: z
    .string()
    .trim()
    .max(160)
    .transform((value) => (value === '' ? '' : slugify(value)))
    .refine(
      (value) => value === '' || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value),
      'Use lowercase letters, numbers and hyphens only.',
    ),
  note: optionalText(2000),
  soldAround: optionalIsoDateSchema,
  isPublished: formBoolean,
})

export type PastDealFormInput = z.input<typeof pastDealSchema>

export const pastDealImageOrderSchema = z.object({
  pastDealId: z.uuid(),
  orderedIds: z.array(z.uuid()).min(1),
})
