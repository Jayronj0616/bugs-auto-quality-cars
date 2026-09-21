/**
 * Applies the dealership's real contact details and uploads the logo.
 *
 *   npm run import:settings
 *
 * Everything here came from the dealership's own listings. Fields they have not
 * supplied - email, Facebook page, exact street address - are deliberately left
 * untouched so the site keeps omitting them rather than showing a guess.
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
  console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

console.log('\nApplying dealership settings\n')

/* -------------------------------------------------------------------------- */
/* Logo                                                                        */
/* -------------------------------------------------------------------------- */

let logoUrl: string | null = null
try {
  const bytes = readFileSync('images/logo.jpg')
  const storagePath = 'branding/logo.jpg'

  const { error } = await supabase.storage
    .from('vehicle-media')
    .upload(storagePath, bytes, { contentType: 'image/jpeg', upsert: true })

  if (error) {
    console.log(`  logo upload failed: ${error.message}`)
  } else {
    const {
      data: { publicUrl },
    } = supabase.storage.from('vehicle-media').getPublicUrl(storagePath)
    // Cache-bust so a replaced logo is picked up rather than served stale.
    logoUrl = `${publicUrl}?v=${Date.now()}`
    console.log('  logo uploaded')
  }
} catch {
  console.log('  no images/logo.jpg found — skipping logo')
}

/* -------------------------------------------------------------------------- */
/* Contact details                                                             */
/* -------------------------------------------------------------------------- */

const update: Record<string, unknown> = {
  business_name: 'BUGS Auto Quality Cars',
  tagline: 'Quality cars. Transparent deals.',
  // Both numbers appear in the dealership's own listings. The second is the
  // direct line given for the motorcycle unit.
  phone: '0917 117 8559',
  phone_secondary: '0933 827 9839',
  // Stated in the Ford Ranger listing.
  address_line1: 'Near Sta. Rita Exit from NLEX',
  city: 'Plaridel',
  province: 'Bulacan',
  country: 'Philippines',
  about: `BUGS Auto Quality Cars sells quality pre-owned vehicles in Plaridel, Bulacan, just off the Sta. Rita exit from NLEX.

Every unit is listed with its cash price, the financing figures we can actually arrange, real photographs and a walkaround video. Units are open to unlimited scan — bring your own mechanic.

We accept cash, financing, trade-in and swap, and we back our units with a money back guarantee against tampering, flooding, accident history and illegal documents.`,
  response_time_note: 'Call or message us and a representative will get back to you.',
}

if (logoUrl) update.logo_url = logoUrl

const { error } = await supabase.from('dealership_settings').update(update).eq('singleton', true)

if (error) {
  console.error(`  settings update failed: ${error.message}`)
  process.exit(1)
}

console.log('  contact details applied')
console.log('\nStill unset (add them at /admin/settings):')
console.log('  - email address')
console.log('  - Facebook page URL')
console.log('  - exact street address and Google Maps link')
console.log('  - business hours (currently the defaults)\n')
