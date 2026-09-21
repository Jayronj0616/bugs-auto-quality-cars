'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { clientKey, rateLimit } from '@/lib/rate-limit'
import { headers } from 'next/headers'

import { actionError, type ActionResult } from './result'

/**
 * Admin sign-in and sign-out.
 *
 * Authentication is Supabase's job; *authorization* is ours. A successful
 * password check is not enough - the account must also have an active row in
 * `admin_users`. Anyone who authenticates without one is signed straight back
 * out, so a Supabase user created by any other means can never reach the
 * dashboard.
 */

const credentialsSchema = z.object({
  email: z.email('Enter a valid email address.').trim(),
  password: z.string().min(1, 'Enter your password.').max(200),
  next: z.string().optional(),
})

/** Slows down credential stuffing without locking a forgetful admin out for long. */
const SIGN_IN_LIMIT = { limit: 10, windowMs: 10 * 60 * 1000 }

export async function signIn(
  _previous: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    next: formData.get('next') ?? undefined,
  })

  if (!parsed.success) {
    return actionError('Enter your email address and password.')
  }

  const requestHeaders = await headers()
  const limit = rateLimit(clientKey(requestHeaders, 'admin-sign-in'), SIGN_IN_LIMIT)
  if (!limit.allowed) {
    return actionError(
      `Too many sign-in attempts. Please wait ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s) and try again.`,
    )
  }

  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    return actionError(
      'Authentication is not configured. Set the Supabase environment variables and restart the server.',
    )
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  // Deliberately vague: distinguishing "wrong password" from "no such account"
  // would let anyone enumerate which email addresses are admins.
  if (error || !data.user) {
    return actionError('Those credentials do not match an account.')
  }

  const { data: profile } = await supabase
    .from('admin_users')
    .select('id, is_active')
    .eq('id', data.user.id)
    .maybeSingle()

  if (!profile?.is_active) {
    await supabase.auth.signOut()
    return actionError(
      'This account does not have dashboard access. Contact an administrator if you believe that is wrong.',
    )
  }

  // Only ever redirect within this site - an attacker-supplied `next` must not
  // be able to bounce a freshly authenticated admin to another origin.
  const target = safeRedirectTarget(parsed.data.next)
  redirect(target)
}

export async function signOut(): Promise<void> {
  const supabase = await createServerSupabaseClient()
  if (supabase) await supabase.auth.signOut()
  redirect('/admin/login')
}

function safeRedirectTarget(next: string | undefined): string {
  if (!next) return '/admin'
  // A single leading slash only: "//evil.com" and "https://evil.com" are both
  // absolute URLs as far as the browser is concerned.
  if (!next.startsWith('/') || next.startsWith('//')) return '/admin'
  if (!next.startsWith('/admin')) return '/admin'
  return next
}
