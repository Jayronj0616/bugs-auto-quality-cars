import 'server-only'

import { cache } from 'react'
import { redirect } from 'next/navigation'
import type { SupabaseClient, User } from '@supabase/supabase-js'

import { ROLE_CAPABILITIES } from '@/lib/constants'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { AdminCapability, AdminUserRow, Database } from '@/types/database'

/**
 * Admin authentication and authorization.
 *
 * Authentication (who are you?) comes from Supabase Auth. Authorization (what
 * may you do?) comes from the `admin_users` row: a signed-in Supabase user with
 * no active profile is *not* an admin, which is what stops a self-service
 * signup from becoming dashboard access.
 *
 * This layer decides what to render. The database enforces the same matrix in
 * RLS, so a UI mistake cannot become a data breach.
 */

export type AdminSession = {
  user: User
  profile: AdminUserRow
  supabase: SupabaseClient<Database>
}

export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  // getUser() verifies the JWT with Supabase rather than trusting the cookie.
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return null

  const { data: profile, error: profileError } = await supabase
    .from('admin_users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('[auth] failed to load admin profile:', profileError.message)
    return null
  }

  if (!profile || !profile.is_active) return null

  return { user, profile, supabase }
})

export function can(profile: AdminUserRow | null, capability: AdminCapability): boolean {
  if (!profile?.is_active) return false
  return ROLE_CAPABILITIES[profile.role]?.includes(capability) ?? false
}

/** For pages: redirects to the login screen instead of throwing. */
export async function requireAdmin(nextPath?: string): Promise<AdminSession> {
  const session = await getAdminSession()
  if (!session) {
    const target = nextPath ? `/admin/login?next=${encodeURIComponent(nextPath)}` : '/admin/login'
    redirect(target)
  }
  return session
}

export async function requireCapability(
  capability: AdminCapability,
  nextPath?: string,
): Promise<AdminSession> {
  const session = await requireAdmin(nextPath)
  if (!can(session.profile, capability)) {
    redirect('/admin?denied=' + capability)
  }
  return session
}

export class AuthorizationError extends Error {
  constructor(message = 'You do not have permission to do that.') {
    super(message)
    this.name = 'AuthorizationError'
  }
}

/**
 * For Server Actions: returns an authorized session or throws, so an action can
 * never accidentally continue with an unauthenticated client.
 */
export async function authorizeAction(capability: AdminCapability): Promise<AdminSession> {
  const session = await getAdminSession()
  if (!session) throw new AuthorizationError('Your session has expired. Please sign in again.')
  if (!can(session.profile, capability)) throw new AuthorizationError()
  return session
}

/* -------------------------------------------------------------------------- */
/* Activity log                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Records an admin action. Best-effort: a logging failure must never roll back
 * or block the operation the admin actually asked for.
 */
export async function recordActivity(
  session: AdminSession,
  entry: {
    action: string
    entityType?: string
    entityId?: string | null
    entityLabel?: string | null
    metadata?: Record<string, unknown>
  },
): Promise<void> {
  try {
    const { error } = await session.supabase.from('activity_logs').insert({
      admin_user_id: session.profile.id,
      actor_name: session.profile.name,
      action: entry.action,
      entity_type: entry.entityType ?? null,
      entity_id: entry.entityId ?? null,
      entity_label: entry.entityLabel ?? null,
      metadata: entry.metadata ?? {},
    })
    if (error) console.error('[activity] insert failed:', error.message)
  } catch (error) {
    console.error('[activity] insert threw:', error)
  }
}
