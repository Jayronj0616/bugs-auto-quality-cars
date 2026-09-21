'use client'

import { createBrowserClient } from '@supabase/ssr'

import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from '@/lib/env'
import type { Database } from '@/types/database'

/**
 * Browser client. Only ever carries the anon key, so everything it can reach is
 * governed by Row Level Security.
 *
 * Used for the admin sign-in form (Supabase Auth needs to set the session
 * cookie from the browser); all data reads and writes go through Server
 * Components and Server Actions.
 */
export function createClient() {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.',
    )
  }

  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
}
