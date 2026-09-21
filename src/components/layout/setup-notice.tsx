import Link from 'next/link'
import { TriangleAlert } from 'lucide-react'

import { isSupabaseConfigured } from '@/lib/env'

/**
 * Shown only when Supabase is not configured.
 *
 * A fresh clone should explain itself rather than silently rendering an empty
 * dealership, so this states plainly that there is no backend yet and points at
 * the setup steps. It disappears the moment the environment is configured.
 */
export function SetupNotice() {
  if (isSupabaseConfigured) return null

  return (
    <div className="border-b border-warning-500/25 bg-warning-50">
      <div className="container-page flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm text-warning-700">
        <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
        <span className="font-semibold">Backend not configured.</span>
        <span className="text-warning-700/90">
          Set <code className="rounded bg-warning-500/10 px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_URL</code>{' '}
          and{' '}
          <code className="rounded bg-warning-500/10 px-1 py-0.5 text-xs">
            NEXT_PUBLIC_SUPABASE_ANON_KEY
          </code>{' '}
          in <code className="rounded bg-warning-500/10 px-1 py-0.5 text-xs">.env.local</code> to load
          inventory.
        </span>
        <Link href="/admin" className="font-semibold underline underline-offset-2">
          Setup guide
        </Link>
      </div>
    </div>
  )
}
