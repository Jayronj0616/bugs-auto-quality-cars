import { z } from 'zod'

import { CONTACT_METHODS, FINANCING_INQUIRY_TYPES, INQUIRY_STATUSES, INQUIRY_TYPES } from '@/lib/constants'
import {
  enumFromOptions,
  optionalDecimal,
  optionalEmailSchema,
  optionalInteger,
  optionalIsoDateSchema,
  optionalMoney,
  optionalText,
  optionalUuidSchema,
  phoneSchema,
  requiredText,
  uuidSchema,
} from '@/lib/validation/shared'

/**
 * Public inquiry form.
 *
 * The same schema runs in the browser for instant feedback and again inside the
 * Server Action, which is the copy that actually decides whether a row is
 * written. Client validation here is a convenience, never a control.
 */
export const inquirySchema = z
  .object({
    customerName: requiredText('Full name', { min: 2, max: 120 }),
    customerPhone: phoneSchema,
    customerEmail: optionalEmailSchema,

    vehicleId: optionalUuidSchema,
    inquiryType: enumFromOptions(INQUIRY_TYPES).default('general'),
    message: requiredText('Message', { min: 10, max: 4000 }),

    preferredContactMethod: enumFromOptions(CONTACT_METHODS).default('any'),
    preferredContactDate: optionalIsoDateSchema,

    // Financing snapshot. Optional in general, required in substance once the
    // customer has actually chosen an installment plan (see superRefine below).
    financingProviderId: optionalUuidSchema,
    downPaymentAmount: optionalMoney,
    downPaymentPercent: optionalDecimal(0, 99.99, 'down payment percentage'),
    loanTermMonths: optionalInteger(1, 120, 'loan term'),
    interestRate: optionalDecimal(0, 100, 'interest rate'),

    sourcePath: optionalText(255),

    /** Honeypot: a real person never fills a field they cannot see. */
    website: z.string().max(0).optional().or(z.literal('')),
  })
  .superRefine((value, ctx) => {
    const wantsFinancing = FINANCING_INQUIRY_TYPES.includes(value.inquiryType)

    if (wantsFinancing && value.loanTermMonths === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['loanTermMonths'],
        message: 'Choose a loan term for an installment inquiry.',
      })
    }

    if (value.preferredContactMethod === 'email' && !value.customerEmail) {
      ctx.addIssue({
        code: 'custom',
        path: ['customerEmail'],
        message: 'Add an email address so we can reply by email.',
      })
    }
  })

export type InquiryInput = z.input<typeof inquirySchema>
export type InquiryValues = z.output<typeof inquirySchema>

/* -------------------------------------------------------------------------- */
/* Admin-side mutations                                                        */
/* -------------------------------------------------------------------------- */

export const inquiryStatusSchema = z.object({
  inquiryId: uuidSchema,
  status: enumFromOptions(INQUIRY_STATUSES),
})

export const adminNoteSchema = z.object({
  inquiryId: optionalUuidSchema,
  testDriveRequestId: optionalUuidSchema,
  note: requiredText('Note', { min: 1, max: 4000 }),
})
