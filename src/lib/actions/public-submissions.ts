'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'

import { calculateFinancing } from '@/lib/financing/calculator'
import { clientKey, rateLimit } from '@/lib/rate-limit'
import { createPublicSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { inquirySchema, type InquiryInput } from '@/lib/validation/inquiry'
import { testDriveSchema, type TestDriveInput } from '@/lib/validation/test-drive'
import { PUBLICLY_VISIBLE_STATUSES } from '@/lib/constants'
import { vehicleTitle } from '@/lib/data/vehicles'
import { resolvePricing } from '@/lib/pricing'

import { actionError, actionSuccess, internalError, zodErrors, type ActionResult } from './result'

/**
 * Public form submissions.
 *
 * These are the only write paths open to anonymous visitors, so each one:
 *
 *   1. rate limits by client IP,
 *   2. drops honeypot hits silently (a bot gets a success page, not a hint),
 *   3. revalidates with Zod on the server, ignoring whatever the browser
 *      already checked,
 *   4. re-reads the vehicle and recomputes financing figures from the database
 *      rather than trusting the prices posted from the client,
 *   5. writes with the service-role client, because the anon role has no INSERT
 *      policy at all - the public key cannot reach these tables directly.
 */

const RATE_LIMIT = { limit: 5, windowMs: 10 * 60 * 1000 }

export type SubmissionSuccess = { reference: string }

export async function submitInquiry(
  input: InquiryInput,
): Promise<ActionResult<SubmissionSuccess>> {
  const requestHeaders = await headers()
  const limit = rateLimit(clientKey(requestHeaders, 'inquiry'), RATE_LIMIT)

  if (!limit.allowed) {
    return actionError(
      `You have sent several inquiries already. Please try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s), or call us directly.`,
    )
  }

  const parsed = inquirySchema.safeParse(input)
  if (!parsed.success) {
    return actionError('Please correct the highlighted fields.', zodErrors(parsed.error))
  }

  const values = parsed.data

  // Honeypot: report success so an automated submitter learns nothing, but
  // write nothing.
  if (values.website) {
    return actionSuccess('Thank you for your inquiry.', { reference: 'INQ-RECEIVED' })
  }

  const supabase = createServiceRoleClient()
  if (!supabase) {
    console.error('[inquiry] SUPABASE_SERVICE_ROLE_KEY is not configured')
    return actionError(
      'We cannot receive inquiries right now. Please call or message us instead - we are sorry for the trouble.',
    )
  }

  try {
    const vehicle = values.vehicleId ? await loadPublicVehicle(values.vehicleId) : null

    // A vehicle id that does not resolve to a publicly visible vehicle is
    // dropped rather than stored, so an inquiry can never be attached to a
    // draft or archived listing by editing the form.
    const vehicleId = vehicle?.id ?? null
    const price = vehicle ? resolvePricing(vehicle).price : null

    const financing = buildFinancingSnapshot(values, price)

    const { data, error } = await supabase
      .from('inquiries')
      .insert({
        customer_name: values.customerName,
        customer_email: values.customerEmail,
        customer_phone: values.customerPhone,
        vehicle_id: vehicleId,
        vehicle_label: vehicle ? vehicleTitle(vehicle) : null,
        inquiry_type: values.inquiryType,
        message: values.message,
        preferred_contact_method: values.preferredContactMethod,
        preferred_contact_date: values.preferredContactDate,
        vehicle_price_at_inquiry: price,
        down_payment_amount: financing.downPaymentAmount,
        down_payment_percent: financing.downPaymentPercent,
        loan_term_months: financing.loanTermMonths,
        interest_rate: financing.interestRate,
        estimated_monthly_payment: financing.estimatedMonthlyPayment,
        financing_provider_id: await resolveProviderId(values.financingProviderId),
        status: 'new',
        source_path: values.sourcePath,
      })
      .select('reference')
      .single()

    if (error) return internalError('inquiry.insert', error)

    revalidateAdminViews()
    return actionSuccess('Your inquiry has been received.', { reference: data.reference })
  } catch (error) {
    return internalError('inquiry.submit', error)
  }
}

export async function submitTestDrive(
  input: TestDriveInput,
): Promise<ActionResult<SubmissionSuccess>> {
  const requestHeaders = await headers()
  const limit = rateLimit(clientKey(requestHeaders, 'test-drive'), RATE_LIMIT)

  if (!limit.allowed) {
    return actionError(
      `You have sent several requests already. Please try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s), or call us directly.`,
    )
  }

  const parsed = testDriveSchema.safeParse(input)
  if (!parsed.success) {
    return actionError('Please correct the highlighted fields.', zodErrors(parsed.error))
  }

  const values = parsed.data

  if (values.website) {
    return actionSuccess('Thank you, your request has been received.', { reference: 'TD-RECEIVED' })
  }

  const supabase = createServiceRoleClient()
  if (!supabase) {
    console.error('[test-drive] SUPABASE_SERVICE_ROLE_KEY is not configured')
    return actionError(
      'We cannot receive test drive requests right now. Please call or message us instead.',
    )
  }

  try {
    const vehicle = await loadPublicVehicle(values.vehicleId)
    if (!vehicle) {
      return actionError('That vehicle is no longer available for test drives.', {
        vehicleId: ['Choose an available vehicle.'],
      })
    }

    const { data, error } = await supabase
      .from('test_drive_requests')
      .insert({
        vehicle_id: vehicle.id,
        vehicle_label: vehicleTitle(vehicle),
        customer_name: values.customerName,
        customer_email: values.customerEmail,
        customer_phone: values.customerPhone,
        preferred_date: values.preferredDate,
        preferred_time: values.preferredTime,
        message: values.message,
        status: 'pending',
      })
      .select('reference')
      .single()

    if (error) return internalError('test-drive.insert', error)

    revalidateAdminViews()
    return actionSuccess('Your test drive request has been received.', {
      reference: data.reference,
    })
  } catch (error) {
    return internalError('test-drive.submit', error)
  }
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

type PublicVehicle = {
  id: string
  brand: string
  model: string
  variant: string | null
  year: number
  srp: number | null
  selling_price: number
  promo_price: number | null
  promo_label: string | null
  promo_starts_at: string | null
  promo_ends_at: string | null
}

/**
 * Reads through the anon client on purpose: it can only see publicly visible
 * vehicles, so "is this vehicle inquirable?" is answered by the same RLS policy
 * that governs the storefront rather than by a second rule in application code.
 */
async function loadPublicVehicle(vehicleId: string): Promise<PublicVehicle | null> {
  const supabase = createPublicSupabaseClient()
  if (!supabase) return null

  const { data } = await supabase
    .from('vehicles')
    .select(
      'id, brand, model, variant, year, srp, selling_price, promo_price, promo_label, promo_starts_at, promo_ends_at',
    )
    .eq('id', vehicleId)
    .in('status', PUBLICLY_VISIBLE_STATUSES)
    .maybeSingle()

  return data ?? null
}

/** Only stores a provider that actually exists and is active. */
async function resolveProviderId(providerId: string | null): Promise<string | null> {
  if (!providerId) return null

  const supabase = createPublicSupabaseClient()
  if (!supabase) return null

  const { data } = await supabase
    .from('financing_providers')
    .select('id')
    .eq('id', providerId)
    .eq('is_active', true)
    .maybeSingle()

  return data?.id ?? null
}

/**
 * Rebuilds the financing snapshot from the authoritative vehicle price.
 *
 * The customer's down payment and term are their choice, but the monthly
 * payment stored against the inquiry is recomputed here - so the figure a
 * salesperson sees in the dashboard is one the system actually stands behind.
 */
function buildFinancingSnapshot(
  values: {
    downPaymentAmount: number | null
    downPaymentPercent: number | null
    loanTermMonths: number | null
    interestRate: number | null
  },
  price: number | null,
) {
  const empty = {
    downPaymentAmount: null,
    downPaymentPercent: null,
    loanTermMonths: null,
    interestRate: null,
    estimatedMonthlyPayment: null,
  }

  if (!price || price <= 0 || !values.loanTermMonths) return empty

  // Percent wins when both are present: it is what the UI slider actually sets.
  const downPayment =
    values.downPaymentPercent !== null
      ? (price * values.downPaymentPercent) / 100
      : (values.downPaymentAmount ?? 0)

  const result = calculateFinancing({
    vehiclePrice: price,
    downPayment,
    termMonths: values.loanTermMonths,
    annualInterestRate: values.interestRate ?? 0,
  })

  if (!result.isValid) {
    // Keep the customer's stated inputs for context, but do not record a
    // monthly payment the maths does not support.
    return {
      downPaymentAmount: result.downPayment,
      downPaymentPercent: result.downPaymentPercent,
      loanTermMonths: values.loanTermMonths,
      interestRate: values.interestRate,
      estimatedMonthlyPayment: null,
    }
  }

  return {
    downPaymentAmount: result.downPayment,
    downPaymentPercent: result.downPaymentPercent,
    loanTermMonths: result.termMonths,
    interestRate: result.annualInterestRate,
    estimatedMonthlyPayment: result.monthlyPayment,
  }
}

/** A new submission should show up in the dashboard without a hard refresh. */
function revalidateAdminViews() {
  revalidatePath('/admin')
  revalidatePath('/admin/inquiries')
  revalidatePath('/admin/test-drives')
}
