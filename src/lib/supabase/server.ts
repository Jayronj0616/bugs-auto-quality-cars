import 'server-only'

import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import { SUPABASE_ANON_KEY, SUPABASE_URL, getServiceRoleKey, isSupabaseConfigured } from '@/lib/env'
import type { Database } from '@/types/database'

/**
 * Anonymous, cookie-free client for the public website.
 *
 * Deliberately does not read cookies: that keeps storefront pages statically
 * renderable with ISR instead of forcing every request to be dynamic. It sees
 * exactly what an anonymous visitor is allowed to see under RLS, which is
 * precisely the data the public pages should be built from.
 */
export function createPublicSupabaseClient() {
  if (!isSupabaseConfigured) return null

  return createSupabaseClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

/**
 * Request-scoped client using the anon key plus the visitor's session cookie.
 *
 * Every query made through it is subject to Row Level Security, which is the
 * point: the admin dashboard reads and writes as the signed-in admin, so the
 * database - not the UI - decides what that person may touch.
 */
export async function createServerSupabaseClient() {
  if (!isSupabaseConfigured) return null

  const cookieStore = await cookies()

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // `updateSession` in middleware.ts refreshes the session instead.
        }
      },
    },
  })
}

/**
 * Privileged client that bypasses Row Level Security.
 *
 * Only two things are allowed to use it, and both run on the server after the
 * request has already been validated:
 *
 *   1. Writing customer submissions (inquiries, test drives). The anon role has
 *      no INSERT policy at all, so the public key cannot be used to write
 *      straight into those tables, bypassing our Zod validation and rate limit.
 *   2. Uploading and deleting vehicle media on behalf of an authenticated admin,
 *      so no storage credential is ever handed to the browser.
 *
 * Callers must perform their own authorization check first.
 */
export function createServiceRoleClient() {
  const serviceRoleKey = getServiceRoleKey()
  if (!isSupabaseConfigured || !serviceRoleKey) return null

  return createServerClient<Database>(SUPABASE_URL, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    cookies: {
      getAll: () => [],
      setAll: () => {},
    },
  })
}
