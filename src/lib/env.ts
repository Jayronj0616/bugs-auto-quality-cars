/**
 * Environment access in one place.
 *
 * The app is deliberately tolerant of a missing Supabase configuration: it
 * builds, type-checks and renders a "setup required" state instead of crashing.
 * That keeps `next build` reproducible in CI and makes a fresh clone runnable
 * before anyone has created a Supabase project.
 */

const trim = (value: string | undefined) => value?.trim() ?? ''

export const SUPABASE_URL = trim(process.env.NEXT_PUBLIC_SUPABASE_URL)
export const SUPABASE_ANON_KEY = trim(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

/** True when the public site can talk to Supabase at all. */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

/**
 * Service-role key. Server-only: importing this module from a Client Component
 * would leak it, so every consumer lives behind `import 'server-only'`.
 */
export function getServiceRoleKey(): string {
  return trim(process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export function isServiceRoleConfigured(): boolean {
  return isSupabaseConfigured && Boolean(getServiceRoleKey())
}

/** Absolute site origin, used for canonical URLs, sitemap and Open Graph. */
export function getSiteUrl(): string {
  const explicit = trim(process.env.NEXT_PUBLIC_SITE_URL)
  if (explicit) return explicit.replace(/\/+$/, '')

  const vercel = trim(process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL)
  if (vercel) return `https://${vercel}`

  return 'http://localhost:3000'
}
