import 'server-only'

import type { AdminSession } from '@/lib/auth'
import type {
  AdminNoteRow,
  InquiryRow,
  InquiryStatus,
  InquiryType,
  TestDriveRequestRow,
  TestDriveStatus,
} from '@/types/database'

/**
 * Reads for the inquiry and test-drive screens.
 *
 * Every query runs through the signed-in admin's client, so a role without the
 * `crm` capability gets nothing back - the RLS policy, not this module, is what
 * keeps customer contact details away from a content manager.
 */

const PER_PAGE = 25

/* -------------------------------------------------------------------------- */
/* Inquiries                                                                   */
/* -------------------------------------------------------------------------- */

export type InquiryListItem = Pick<
  InquiryRow,
  | 'id'
  | 'reference'
  | 'customer_name'
  | 'customer_phone'
  | 'customer_email'
  | 'vehicle_label'
  | 'inquiry_type'
  | 'status'
  | 'created_at'
  | 'estimated_monthly_payment'
>

export type InquiryListResult = {
  inquiries: InquiryListItem[]
  total: number
  page: number
  totalPages: number
  counts: Record<InquiryStatus | 'all', number>
}

export async function listInquiries(
  session: AdminSession,
  filters: { q?: string; status?: InquiryStatus | 'all'; type?: InquiryType | 'all'; page?: number },
): Promise<InquiryListResult> {
  const page = Math.max(1, filters.page ?? 1)

  let query = session.supabase
    .from('inquiries')
    .select(
      'id, reference, customer_name, customer_phone, customer_email, vehicle_label, inquiry_type, status, created_at, estimated_monthly_payment',
      { count: 'exact' },
    )

  if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status)
  if (filters.type && filters.type !== 'all') query = query.eq('inquiry_type', filters.type)

  const term = filters.q?.trim()
  if (term) {
    // Matches whichever identifier the salesperson has to hand: a name, a phone
    // number read off a missed call, an email, or the reference from a receipt.
    const pattern = `%${term}%`
    query = query.or(
      `customer_name.ilike.${pattern},customer_phone.ilike.${pattern},customer_email.ilike.${pattern},reference.ilike.${pattern},vehicle_label.ilike.${pattern}`,
    )
  }

  const from = (page - 1) * PER_PAGE
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, from + PER_PAGE - 1)

  if (error) console.error('[admin-crm] inquiries list failed:', error.message)

  const total = count ?? 0

  return {
    inquiries: data ?? [],
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / PER_PAGE)),
    counts: await inquiryCounts(session),
  }
}

async function inquiryCounts(
  session: AdminSession,
): Promise<Record<InquiryStatus | 'all', number>> {
  const counts: Record<InquiryStatus | 'all', number> = {
    all: 0,
    new: 0,
    contacted: 0,
    qualified: 0,
    negotiating: 0,
    converted: 0,
    closed: 0,
    cancelled: 0,
  }

  const { data, error } = await session.supabase.from('inquiries').select('status')
  if (error || !data) return counts

  for (const row of data) {
    counts.all += 1
    counts[row.status] += 1
  }
  return counts
}

export type InquiryDetail = InquiryRow & {
  notes: AdminNoteRow[]
  vehicle: {
    id: string
    slug: string
    brand: string
    model: string
    variant: string | null
    year: number
    status: string
    selling_price: number
    promo_price: number | null
  } | null
  provider: { id: string; name: string } | null
}

export async function getInquiry(
  session: AdminSession,
  inquiryId: string,
): Promise<InquiryDetail | null> {
  const { data, error } = await session.supabase
    .from('inquiries')
    .select(
      '*, notes:admin_notes(*), vehicle:vehicles(id, slug, brand, model, variant, year, status, selling_price, promo_price), provider:financing_providers(id, name)',
    )
    .eq('id', inquiryId)
    .maybeSingle()

  if (error) {
    console.error('[admin-crm] inquiry detail failed:', error.message)
    return null
  }
  if (!data) return null

  const inquiry = data as unknown as InquiryDetail

  return {
    ...inquiry,
    notes: [...(inquiry.notes ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at)),
  }
}

/* -------------------------------------------------------------------------- */
/* Test drives                                                                 */
/* -------------------------------------------------------------------------- */

export type TestDriveListItem = Pick<
  TestDriveRequestRow,
  | 'id'
  | 'reference'
  | 'customer_name'
  | 'customer_phone'
  | 'vehicle_label'
  | 'preferred_date'
  | 'preferred_time'
  | 'confirmed_date'
  | 'confirmed_time'
  | 'status'
  | 'created_at'
>

export type TestDriveListResult = {
  requests: TestDriveListItem[]
  total: number
  page: number
  totalPages: number
  counts: Record<TestDriveStatus | 'all', number>
}

export async function listTestDrives(
  session: AdminSession,
  filters: { q?: string; status?: TestDriveStatus | 'all'; page?: number },
): Promise<TestDriveListResult> {
  const page = Math.max(1, filters.page ?? 1)

  let query = session.supabase
    .from('test_drive_requests')
    .select(
      'id, reference, customer_name, customer_phone, vehicle_label, preferred_date, preferred_time, confirmed_date, confirmed_time, status, created_at',
      { count: 'exact' },
    )

  if (filters.status && filters.status !== 'all') query = query.eq('status', filters.status)

  const term = filters.q?.trim()
  if (term) {
    const pattern = `%${term}%`
    query = query.or(
      `customer_name.ilike.${pattern},customer_phone.ilike.${pattern},reference.ilike.${pattern},vehicle_label.ilike.${pattern}`,
    )
  }

  const from = (page - 1) * PER_PAGE
  const { data, error, count } = await query
    // Soonest appointment first: this screen exists to answer "who is coming in".
    .order('preferred_date', { ascending: true })
    .order('preferred_time', { ascending: true })
    .range(from, from + PER_PAGE - 1)

  if (error) console.error('[admin-crm] test drives list failed:', error.message)

  const total = count ?? 0

  return {
    requests: data ?? [],
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / PER_PAGE)),
    counts: await testDriveCounts(session),
  }
}

async function testDriveCounts(
  session: AdminSession,
): Promise<Record<TestDriveStatus | 'all', number>> {
  const counts: Record<TestDriveStatus | 'all', number> = {
    all: 0,
    pending: 0,
    contacted: 0,
    confirmed: 0,
    rescheduled: 0,
    completed: 0,
    cancelled: 0,
  }

  const { data, error } = await session.supabase.from('test_drive_requests').select('status')
  if (error || !data) return counts

  for (const row of data) {
    counts.all += 1
    counts[row.status] += 1
  }
  return counts
}

export type TestDriveDetail = TestDriveRequestRow & {
  notes: AdminNoteRow[]
  vehicle: {
    id: string
    slug: string
    brand: string
    model: string
    variant: string | null
    year: number
    status: string
  } | null
}

export async function getTestDrive(
  session: AdminSession,
  testDriveId: string,
): Promise<TestDriveDetail | null> {
  const { data, error } = await session.supabase
    .from('test_drive_requests')
    .select(
      '*, notes:admin_notes(*), vehicle:vehicles(id, slug, brand, model, variant, year, status)',
    )
    .eq('id', testDriveId)
    .maybeSingle()

  if (error) {
    console.error('[admin-crm] test drive detail failed:', error.message)
    return null
  }
  if (!data) return null

  const request = data as unknown as TestDriveDetail

  return {
    ...request,
    notes: [...(request.notes ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at)),
  }
}
