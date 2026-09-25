import { z } from 'zod'

import { slugify } from '@/lib/utils'
import { formBoolean, optionalIsoDateSchema, optionalText, requiredText } from '@/lib/validation/shared'

/**
 * Past deal form.
 *
 * Deliberately small next to `vehicleSchema` - a past deal is a title and some
 * photos, not a listing. The one thing worth validating carefully is the slug,
 * for the same reason vehicles validate it: it becomes a public URL.
 */
export const pastDealSchema = z.object({
  title: requiredText('Title', { min: 1, max: 160 }),
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
