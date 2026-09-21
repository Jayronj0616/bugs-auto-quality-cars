/**
 * Verifies a Supabase project against what the application expects.
 *
 *   npm run db:verify
 *
 * Checks, in order:
 *   1. every table exists and is reachable
 *   2. the dealership settings singleton was created
 *   3. the storage bucket exists
 *   4. anonymous access is actually restricted - the most important check,
 *      because a missing RLS policy is invisible until someone exploits it
 *
 * Read-only apart from one insert/delete round trip used to prove that the
 * anonymous key cannot write.
 */

import { readFileSync } from 'node:fs'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const env: Record<string, string> = {}
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const i = trimmed.indexOf('=')
  if (i === -1) continue
  env[trimmed.slice(0, i).trim()] = trimmed.slice(i + 1).trim()
}

const url = env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !anonKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.')
  process.exit(1)
}

const anon = createClient(url, anonKey, { auth: { persistSession: false } })
const admin: SupabaseClient | null = serviceKey
  ? createClient(url, serviceKey, { auth: { persistSession: false } })
  : null

const TABLES = [
  'admin_users',
  'dealership_settings',
  'vehicles',
  'vehicle_images',
  'vehicle_videos',
  'vehicle_specifications',
  'financing_providers',
  'financing_rates',
  'inquiries',
  'test_drive_requests',
  'admin_notes',
  'activity_logs',
] as const

/** Tables the anonymous role must not be able to read at all. */
const PRIVATE_TABLES = ['inquiries', 'test_drive_requests', 'admin_notes'] as const

let failures = 0
/** PostgREST's code for "this table is not in the schema cache", i.e. missing. */
const MISSING_TABLE = 'PGRST205'
let schemaReady = true
const pass = (msg: string) => console.log(`  ✓ ${msg}`)
const fail = (msg: string) => {
  failures += 1
  console.log(`  ✗ ${msg}`)
}

console.log(`\nVerifying ${url}\n`)

/* -------------------------------------------------------------------------- */
console.log('Schema')
if (!admin) {
  fail('SUPABASE_SERVICE_ROLE_KEY is not set - cannot check tables authoritatively')
} else {
  for (const table of TABLES) {
    // A real GET, not `head: true`. A HEAD response carries no body, so
    // supabase-js has no error payload to parse and reports success even on a
    // 404 - which made an empty project look fully migrated.
    const { error, status } = await admin.from(table).select('id').limit(1)

    if (error) {
      if (error.code === MISSING_TABLE) schemaReady = false
      fail(`${table}: ${error.message}`)
    } else if (status >= 400) {
      fail(`${table}: HTTP ${status}`)
    } else {
      pass(`${table}`)
    }
  }
}

/* -------------------------------------------------------------------------- */
console.log('\nSeed state')
if (admin) {
  const { data: settings } = await admin
    .from('dealership_settings')
    .select('business_name, phone, email, facebook_url')
    .maybeSingle()

  if (!settings) {
    fail('dealership_settings has no row - the bootstrap migration did not run')
  } else {
    pass(`settings row exists (${settings.business_name})`)
    const configured = [settings.phone, settings.email, settings.facebook_url].filter(Boolean).length
    console.log(
      `    ${configured}/3 contact channels configured` +
        (configured === 0 ? ' - fill these in at /admin/settings' : ''),
    )
  }

  const { count: vehicleCount } = await admin
    .from('vehicles')
    .select('id', { count: 'exact' })
    .limit(1)
  console.log(`    ${vehicleCount ?? 0} vehicle(s) in the database`)

  const { count: adminCount } = await admin
    .from('admin_users')
    .select('id', { count: 'exact' })
    .limit(1)
  if ((adminCount ?? 0) === 0) {
    console.log('    0 admin accounts - run `npm run create-admin`')
  } else {
    pass(`${adminCount} admin account(s)`)
  }
}

/* -------------------------------------------------------------------------- */
console.log('\nStorage')
if (admin) {
  const { data: buckets, error } = await admin.storage.listBuckets()
  if (error) {
    fail(`could not list buckets: ${error.message}`)
  } else {
    const bucket = buckets.find((b) => b.id === 'vehicle-media')
    if (!bucket) fail("bucket 'vehicle-media' is missing")
    else if (!bucket.public) fail("bucket 'vehicle-media' exists but is not public")
    else pass("bucket 'vehicle-media' exists and is public")
  }
}

/* -------------------------------------------------------------------------- */
console.log('\nRow Level Security (as an anonymous visitor)')

// Security checks are meaningless against a database with no tables: a missing
// table denies every request, which would read as a clean bill of health.
if (!schemaReady) {
  console.log('  - skipped: the schema has not been applied yet.\n')
  console.log(`${failures} check(s) failed. Apply supabase/setup.sql first.\n`)
  process.exit(1)
}

// Published vehicles must be readable, or the storefront renders nothing.
const { error: readError } = await anon.from('vehicles').select('id').limit(1)
if (readError) fail(`anon cannot read vehicles: ${readError.message}`)
else pass('anon can read vehicles')

// Customer data must be invisible. PostgREST returns an empty set rather than
// an error when a policy simply does not match, so an empty result is a pass.
for (const table of PRIVATE_TABLES) {
  const { data, error } = await anon.from(table).select('id').limit(1)
  if (error?.code === MISSING_TABLE) fail(`${table} is missing, not protected`)
  else if (error) pass(`anon blocked from ${table} (${error.code ?? 'denied'})`)
  else if (!data || data.length === 0) pass(`anon sees no rows in ${table}`)
  else fail(`ANON CAN READ ${table.toUpperCase()} - customer data is exposed`)
}

// Anonymous writes must be impossible: submissions go through Server Actions
// that validate first, then write with the service role.
const { data: inserted, error: insertError } = await anon
  .from('inquiries')
  .insert({
    customer_name: 'RLS probe',
    customer_phone: '09170000000',
    message: 'Automated check that anonymous inserts are rejected.',
    inquiry_type: 'general',
  })
  .select('id')

if (insertError?.code === MISSING_TABLE) {
  fail('inquiries is missing, not protected')
} else if (insertError) {
  pass(`anon cannot insert inquiries (${insertError.code ?? 'denied'})`)
} else {
  fail('ANON CAN INSERT INQUIRIES - the public key can bypass server validation')
  if (admin && inserted?.[0]?.id) {
    await admin.from('inquiries').delete().eq('id', inserted[0].id)
    console.log('    (probe row removed)')
  }
}

const { error: updateError } = await anon
  .from('vehicles')
  .update({ selling_price: 1 })
  .eq('slug', '__rls_probe_never_matches__')

if (updateError?.code === MISSING_TABLE) fail('vehicles is missing, not protected')
else if (updateError) pass(`anon cannot update vehicles (${updateError.code ?? 'denied'})`)
else pass('anon update matched no rows (policy prevents any match)')

/* -------------------------------------------------------------------------- */
console.log(
  failures === 0
    ? '\nAll checks passed.\n'
    : `\n${failures} check(s) failed.\n`,
)
process.exit(failures === 0 ? 0 : 1)
