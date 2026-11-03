'use server'

import { z } from 'zod'

import { AuthorizationError, authorizeAction, recordActivity, type AdminSession } from '@/lib/auth'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { adminNoteSchema, inquiryStatusSchema } from '@/lib/validation/inquiry'
import { testDriveStatusSchema } from '@/lib/validation/test-drive'
import type { InquiryStatus, TestDriveStatus } from '@/types/database'

import { revalidateCrm } from './revalidate'
import { actionError, actionSuccess, internalError, zodErrors, type ActionResult } from './result'

/**
 * Inquiry and test-drive management.
 *
 * Everything here touches customer contact details, so each action requires the
 * `crm` capability. The normal workflow ends in a status (`closed`,
 * `cancelled`, `completed`) rather than a delete, since a customer conversation
 * is history the dealership may need later. The one exception is a customer's
 * own request to delete their data (/data-deletion): `deleteCustomerRecord`,
 * admins only.
 */

export async function updateInquiryStatus(input: {
  inquiryId: string
  status: InquiryStatus
}): Promise<ActionResult> {
  let session: AdminSession
  try {
    session = await authorizeAction('crm')
  } catch (error) {
    return authError(error)
  }

  const parsed = inquiryStatusSchema.safeParse(input)
  if (!parsed.success) return actionError('That status is not valid.')

  try {
    const { data, error } = await session.supabase
      .from('inquiries')
      .update({ status: parsed.data.status })
      .eq('id', parsed.data.inquiryId)
      .select('id, reference, customer_name')
      .single()

    if (error) return handleWriteError('inquiry.status', error)

    await recordActivity(session, {
      action: 'inquiry.status_changed',
      entityType: 'inquiry',
      entityId: data.id,
      entityLabel: `${data.reference} · ${data.customer_name}`,
      metadata: { status: parsed.data.status },
    })

    revalidateCrm()
    return actionSuccess('Status updated.')
  } catch (error) {
    return internalError('inquiry.status', error)
  }
}

export async function updateTestDriveStatus(input: {
  testDriveId: string
  status: TestDriveStatus
  confirmedDate: string
  confirmedTime: string
}): Promise<ActionResult> {
  let session: AdminSession
  try {
    session = await authorizeAction('crm')
  } catch (error) {
    return authError(error)
  }

  const parsed = testDriveStatusSchema.safeParse(input)
  if (!parsed.success) {
    return actionError('Please correct the highlighted fields.', zodErrors(parsed.error))
  }

  const values = parsed.data

  try {
    const { data, error } = await session.supabase
      .from('test_drive_requests')
      .update({
        status: values.status,
        confirmed_date: values.confirmedDate,
        confirmed_time: values.confirmedTime,
      })
      .eq('id', values.testDriveId)
      .select('id, reference, customer_name')
      .single()

    if (error) return handleWriteError('test-drive.status', error)

    await recordActivity(session, {
      action: 'test_drive.status_changed',
      entityType: 'test_drive',
      entityId: data.id,
      entityLabel: `${data.reference} · ${data.customer_name}`,
      metadata: {
        status: values.status,
        confirmedDate: values.confirmedDate,
        confirmedTime: values.confirmedTime,
      },
    })

    revalidateCrm()
    return actionSuccess(testDriveMessage(values.status))
  } catch (error) {
    return internalError('test-drive.status', error)
  }
}

/**
 * Adds an internal note.
 *
 * Notes are staff-only: RLS gives anon no read access to `admin_notes` at all,
 * and nothing on the public site ever queries them.
 */
export async function addAdminNote(input: {
  inquiryId?: string | null
  testDriveRequestId?: string | null
  note: string
}): Promise<ActionResult> {
  let session: AdminSession
  try {
    session = await authorizeAction('crm')
  } catch (error) {
    return authError(error)
  }

  const parsed = adminNoteSchema.safeParse({
    inquiryId: input.inquiryId ?? '',
    testDriveRequestId: input.testDriveRequestId ?? '',
    note: input.note,
  })

  if (!parsed.success) {
    return actionError('Please correct the highlighted fields.', zodErrors(parsed.error))
  }

  const { inquiryId, testDriveRequestId, note } = parsed.data

  // The database enforces this too (admin_notes_single_parent), but catching it
  // here produces a sentence instead of a constraint violation.
  if (Boolean(inquiryId) === Boolean(testDriveRequestId)) {
    return actionError('A note must belong to exactly one inquiry or test drive.')
  }

  try {
    const { error } = await session.supabase.from('admin_notes').insert({
      inquiry_id: inquiryId,
      test_drive_request_id: testDriveRequestId,
      admin_user_id: session.profile.id,
      author_name: session.profile.name,
      note,
    })

    if (error) return handleWriteError('note.insert', error)

    await recordActivity(session, {
      action: inquiryId ? 'inquiry.note_added' : 'test_drive.note_added',
      entityType: inquiryId ? 'inquiry' : 'test_drive',
      entityId: inquiryId ?? testDriveRequestId,
    })

    revalidateCrm()
    return actionSuccess('Note added.')
  } catch (error) {
    return internalError('note.insert', error)
  }
}

const RECORD_TABLES = { inquiry: 'inquiries', test_drive: 'test_drive_requests' } as const
type RecordKind = keyof typeof RECORD_TABLES

/**
 * Deletes an inquiry or test-drive request when the customer asks us to delete
 * their data. Its staff notes go with it (ON DELETE CASCADE). The activity log
 * is otherwise append-only, so the customer's name is removed from earlier
 * entries with the service role; what stays is who did what, and when.
 */
export async function deleteCustomerRecord(input: { kind: RecordKind; id: string }): Promise<ActionResult> {
  let session: AdminSession
  try {
    session = await authorizeAction('crm')
  } catch (error) {
    return authError(error)
  }
  // Sales staff work these records day to day; deleting one for good is for admins.
  if (session.profile.role !== 'admin' && session.profile.role !== 'super_admin') {
    return actionError('Only an admin can delete customer records.')
  }

  const parsed = z
    .object({ kind: z.enum(['inquiry', 'test_drive']), id: z.uuid() })
    .safeParse(input)
  if (!parsed.success) return actionError('That record could not be found.')
  const { kind, id } = parsed.data

  try {
    const { data, error } = await session.supabase
      .from(RECORD_TABLES[kind])
      .delete()
      .eq('id', id)
      .select('reference')
      .maybeSingle()

    if (error) return handleWriteError(`${kind}.delete`, error)
    if (!data) return actionError('That record could not be found.')

    const storage = createServiceRoleClient()
    if (storage) {
      const { error: scrubError } = await storage
        .from('activity_logs')
        .update({ entity_label: `${data.reference} (deleted)`, metadata: {} })
        .eq('entity_type', kind)
        .eq('entity_id', id)
      if (scrubError) console.error(`[${kind}.delete] activity scrub:`, scrubError.message)
    }

    await recordActivity(session, {
      action: `${kind}.deleted`,
      entityType: kind,
      entityId: id,
      entityLabel: `${data.reference} (deleted)`,
    })

    revalidateCrm()
    return actionSuccess('Deleted.')
  } catch (error) {
    return internalError(`${kind}.delete`, error)
  }
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function authError(error: unknown): ActionResult<never> {
  if (error instanceof AuthorizationError) return actionError(error.message)
  return internalError('crm.authorize', error)
}

function handleWriteError(context: string, error: { code?: string; message: string }) {
  if (error.code === '42501') {
    return actionError('You do not have permission to change this record.')
  }
  if (error.code === '23514') {
    return actionError('One of the values is outside the allowed range.')
  }
  return internalError(context, error)
}

function testDriveMessage(status: TestDriveStatus): string {
  switch (status) {
    case 'confirmed':
      return 'Test drive confirmed. Let the customer know the schedule.'
    case 'rescheduled':
      return 'Test drive rescheduled.'
    case 'cancelled':
      return 'Test drive cancelled.'
    case 'completed':
      return 'Test drive marked as completed.'
    case 'contacted':
      return 'Marked as contacted.'
    case 'pending':
      return 'Moved back to pending.'
  }
}
