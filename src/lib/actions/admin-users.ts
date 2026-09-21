'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'

import { AuthorizationError, authorizeAction, recordActivity, type AdminSession } from '@/lib/auth'
import { ADMIN_ROLES } from '@/lib/constants'
import { enumFromOptions, requiredText } from '@/lib/validation/shared'

import { actionError, actionSuccess, internalError, zodErrors, type ActionResult } from './result'

/**
 * Admin account administration.
 *
 * Restricted to `super_admin`. Accounts themselves are created out of band with
 * `npm run create-admin`, because creating a Supabase Auth user requires the
 * service-role key and a password the new person chooses - what can be managed
 * here is the application-side profile: name, role and whether the account is
 * still allowed in.
 */

const profileSchema = z.object({
  adminUserId: z.uuid('That account could not be found.'),
  name: requiredText('Name', { min: 1, max: 120 }),
  role: enumFromOptions(ADMIN_ROLES),
  isActive: z.boolean(),
})

export async function updateAdminUser(input: {
  adminUserId: string
  name: string
  role: string
  isActive: boolean
}): Promise<ActionResult> {
  let session: AdminSession
  try {
    session = await authorizeAction('users')
  } catch (error) {
    if (error instanceof AuthorizationError) return actionError(error.message)
    return internalError('admin-users.authorize', error)
  }

  const parsed = profileSchema.safeParse(input)
  if (!parsed.success) {
    return actionError('Please correct the highlighted fields.', zodErrors(parsed.error))
  }

  const values = parsed.data

  // Locking yourself out is a one-way door with no self-service recovery, so it
  // is refused rather than confirmed.
  if (values.adminUserId === session.profile.id) {
    if (!values.isActive) {
      return actionError('You cannot deactivate your own account.')
    }
    if (values.role !== 'super_admin') {
      return actionError(
        'You cannot remove your own super admin role — ask another super admin to do it.',
      )
    }
  }

  try {
    const { data, error } = await session.supabase
      .from('admin_users')
      .update({ name: values.name, role: values.role, is_active: values.isActive })
      .eq('id', values.adminUserId)
      .select('id, email')
      .single()

    if (error) {
      if (error.code === '42501') {
        return actionError('You do not have permission to change this account.')
      }
      return internalError('admin-users.update', error)
    }

    await recordActivity(session, {
      action: 'admin_user.updated',
      entityType: 'admin_user',
      entityId: data.id,
      entityLabel: data.email,
      metadata: { role: values.role, isActive: values.isActive },
    })

    revalidatePath('/admin/users')
    return actionSuccess('Account updated.')
  } catch (error) {
    return internalError('admin-users.update', error)
  }
}
