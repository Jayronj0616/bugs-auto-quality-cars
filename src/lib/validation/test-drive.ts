import { z } from 'zod'

import { TEST_DRIVE_STATUSES } from '@/lib/constants'
import {
  enumFromOptions,
  isoDateSchema,
  optionalEmailSchema,
  optionalIsoDateSchema,
  optionalText,
  optionalUuidSchema,
  phoneSchema,
  requiredText,
  timeSchema,
  uuidSchema,
} from '@/lib/validation/shared'

/** Bookings are only accepted this far ahead - beyond that, stock has moved on. */
const MAX_DAYS_AHEAD = 90

function startOfToday(): Date {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

export const testDriveSchema = z
  .object({
    vehicleId: uuidSchema,
    customerName: requiredText('Full name', { min: 2, max: 120 }),
    customerPhone: phoneSchema,
    customerEmail: optionalEmailSchema,
    preferredDate: isoDateSchema,
    preferredTime: timeSchema,
    message: optionalText(2000),
    sourcePath: optionalText(255),
    website: z.string().max(0).optional().or(z.literal('')),
  })
  .superRefine((value, ctx) => {
    // Parsed as local midnight so "today" means today in the dealership's own
    // timezone, not UTC.
    const [year, month, day] = value.preferredDate.split('-').map(Number)
    const requested = new Date(year, month - 1, day)

    if (Number.isNaN(requested.getTime())) {
      ctx.addIssue({ code: 'custom', path: ['preferredDate'], message: 'Choose a valid date.' })
      return
    }

    if (requested < startOfToday()) {
      ctx.addIssue({
        code: 'custom',
        path: ['preferredDate'],
        message: 'Choose today or a later date.',
      })
    }

    const latest = startOfToday()
    latest.setDate(latest.getDate() + MAX_DAYS_AHEAD)
    if (requested > latest) {
      ctx.addIssue({
        code: 'custom',
        path: ['preferredDate'],
        message: `Choose a date within the next ${MAX_DAYS_AHEAD} days.`,
      })
    }
  })

export type TestDriveInput = z.input<typeof testDriveSchema>
export type TestDriveValues = z.output<typeof testDriveSchema>

/* -------------------------------------------------------------------------- */
/* Admin-side mutations                                                        */
/* -------------------------------------------------------------------------- */

export const testDriveStatusSchema = z
  .object({
    testDriveId: uuidSchema,
    status: enumFromOptions(TEST_DRIVE_STATUSES),
    confirmedDate: optionalIsoDateSchema,
    confirmedTime: z
      .string()
      .trim()
      .transform((value) => (value === '' ? null : value))
      .nullable()
      .refine(
        (value) => value === null || /^([01]\d|2[0-3]):[0-5]\d$/.test(value),
        'Choose a valid time.',
      ),
  })
  .superRefine((value, ctx) => {
    // Confirming or rescheduling is a promise to the customer, so it has to name
    // a specific slot.
    if ((value.status === 'confirmed' || value.status === 'rescheduled') && !value.confirmedDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['confirmedDate'],
        message: 'Set the confirmed date for this appointment.',
      })
    }

    if (value.confirmedDate && !value.confirmedTime) {
      ctx.addIssue({
        code: 'custom',
        path: ['confirmedTime'],
        message: 'Set the confirmed time for this appointment.',
      })
    }
  })

export const optionalVehicleRef = optionalUuidSchema
