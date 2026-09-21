/**
 * Brings a Supabase project up to the state the application expects, for the
 * parts that do not require DDL.
 *
 *   npm run db:bootstrap
 *
 * Idempotent, and safe to run against an existing project:
 *   * creates the `vehicle-media` storage bucket if it is missing
 *   * creates the dealership settings singleton if it is missing
 *
 * This exists because applying the schema through the SQL editor can skip the
 * storage step (the current role may not be allowed to alter storage.objects),
 * which leaves those two pieces undone. Table grants still need SQL - see
 * supabase/finish-setup.sql.
 */

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env: Record<string, string> = {}
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const i = trimmed.indexOf('=')
  if (i === -1) continue
  env[trimmed.slice(0, i).trim()] = trimmed.slice(i + 1).trim()
}

const url = env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local.')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

console.log(`\nBootstrapping ${url}\n`)

/* -------------------------------------------------------------------------- */
/* Storage bucket                                                             */
/* -------------------------------------------------------------------------- */

const { data: buckets, error: listError } = await supabase.storage.listBuckets()

if (listError) {
  console.error('  Could not list storage buckets:', listError.message)
  process.exit(1)
}

const existing = buckets.find((bucket) => bucket.id === 'vehicle-media')

const bucketOptions = {
  public: true,
  fileSizeLimit: 60 * 1024 * 1024,
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'video/mp4',
    'video/webm',
  ],
}

if (!existing) {
  const { error } = await supabase.storage.createBucket('vehicle-media', bucketOptions)
  if (error) console.error('  Could not create the vehicle-media bucket:', error.message)
  else console.log('  Created the vehicle-media bucket (public).')
} else {
  const { error } = await supabase.storage.updateBucket('vehicle-media', bucketOptions)
  if (error) console.error('  Could not update the vehicle-media bucket:', error.message)
  else console.log('  vehicle-media bucket already exists; settings confirmed.')
}

/* -------------------------------------------------------------------------- */
/* Dealership settings singleton                                              */
/* -------------------------------------------------------------------------- */

const { data: settings, error: settingsReadError } = await supabase
  .from('dealership_settings')
  .select('id, business_name')
  .maybeSingle()

if (settingsReadError) {
  console.error('  Could not read dealership_settings:', settingsReadError.message)
  console.error('  Has the schema been applied? See supabase/setup.sql.')
  process.exit(1)
}

if (settings) {
  console.log(`  Dealership settings already present (${settings.business_name}).`)
} else {
  // Contact details are deliberately left null: the site omits whatever is not
  // configured rather than showing a placeholder that reads as real.
  const { error } = await supabase.from('dealership_settings').insert({
    business_name: 'BUGS Auto Quality Cars',
    tagline: 'Quality cars. Transparent deals.',
    business_hours: [
      { day: 'monday', open: '08:00', close: '18:00', closed: false },
      { day: 'tuesday', open: '08:00', close: '18:00', closed: false },
      { day: 'wednesday', open: '08:00', close: '18:00', closed: false },
      { day: 'thursday', open: '08:00', close: '18:00', closed: false },
      { day: 'friday', open: '08:00', close: '18:00', closed: false },
      { day: 'saturday', open: '09:00', close: '17:00', closed: false },
      { day: 'sunday', open: '09:00', close: '16:00', closed: true },
    ],
  })

  if (error) console.error('  Could not create the settings row:', error.message)
  else console.log('  Created the dealership settings row.')
}

console.log('\nDone. Run `npm run db:verify` to check the result.\n')
