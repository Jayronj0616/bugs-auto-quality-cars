/**
 * Imports the dealership's historical sold-unit photos into the Sold Archive
 * (`past_deals` / `past_deal_images`) - the units that predate this system
 * and have nothing on record but a photo and, where the file's own EXIF data
 * allowed it, an approximate sold date.
 *
 *   npm run import:sold-archive [-- path/to/manifest.json]
 *
 * The manifest is produced separately (grouping photos by EXIF timestamp
 * proximity, with a title guessed by looking at each photo) - this script
 * only does the mechanical part: create a `past_deals` row per unit, upload
 * its photo(s), and link them.
 *
 * Not idempotent: re-running creates a second set of entries rather than
 * skipping ones already imported (`uniqueSlug` just appends -2, -3… on a
 * collision, it doesn't detect "this is the same unit as before"). Re-run
 * only against an empty archive, or after deleting the previous run's rows.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
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
const BUCKET = 'vehicle-media'
const IMAGES_ROOT = 'images/sold'

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

type ManifestUnit = {
  photos: string[]
  sold_around: string | null
  /** One of `PAST_DEAL_BRANDS` in src/lib/constants.ts, or null if no legible badge. */
  brand: string | null
  note: string | null
}

// Mirrors PAST_DEAL_BRANDS in src/lib/constants.ts - kept in sync by hand,
// the same way this script already duplicates rather than imports the app's
// slugify() below (a standalone script, no path aliases to resolve).
const BRAND_LABELS: Record<string, string> = {
  toyota: 'Toyota',
  mitsubishi: 'Mitsubishi',
  honda: 'Honda',
  ford: 'Ford',
  nissan: 'Nissan',
  hyundai: 'Hyundai',
  mazda: 'Mazda',
  suzuki: 'Suzuki',
  kia: 'Kia',
  chevrolet: 'Chevrolet',
  isuzu: 'Isuzu',
  lexus: 'Lexus',
  subaru: 'Subaru',
  volkswagen: 'Volkswagen',
  bmw: 'BMW',
  mercedes_benz: 'Mercedes-Benz',
  volvo: 'Volvo',
  peugeot: 'Peugeot',
  mg: 'MG',
  byd: 'BYD',
  geely: 'Geely',
  foton: 'Foton',
  jeep: 'Jeep',
  other: 'Other',
}
const UNCLEAR_TITLE = 'Sold vehicle'
const titleFor = (brand: string | null) => (brand ? (BRAND_LABELS[brand] ?? brand) : UNCLEAR_TITLE)

const manifestPath = process.argv[2] ?? 'scripts/sold-archive-manifest.json'
const units: ManifestUnit[] = JSON.parse(readFileSync(manifestPath, 'utf8'))

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Fetches every slug that could collide in one query rather than probing
 * candidates one at a time - brand is now the title, and a brand like Toyota
 * has 100+ entries, so probing sequentially needs a cap well past what used
 * to be enough and is far slower besides.
 */
async function uniqueSlug(base: string): Promise<string> {
  const safeBase = base || 'sold-vehicle'
  const { data } = await supabase
    .from('past_deals')
    .select('slug')
    .or(`slug.eq.${safeBase},slug.like.${safeBase}-%`)
    .limit(10000)
  const taken = new Set((data ?? []).map((row) => row.slug as string))

  if (!taken.has(safeBase)) return safeBase
  for (let n = 2; n < 100000; n += 1) {
    const candidate = `${safeBase}-${n}`
    if (!taken.has(candidate)) return candidate
  }
  return `${safeBase}-${Date.now()}`
}

async function main() {
  console.log(`Importing ${units.length} sold-archive units from ${manifestPath}\n`)

  let created = 0
  let skipped = 0
  let photosUploaded = 0

  for (const [index, unit] of units.entries()) {
    const title = titleFor(unit.brand)
    const label = `[${index + 1}/${units.length}] ${title}`
    const slug = await uniqueSlug(slugify(title))

    const { data: deal, error: dealError } = await supabase
      .from('past_deals')
      .insert({
        title,
        brand: unit.brand,
        slug,
        note: unit.note,
        sold_around: unit.sold_around,
        is_published: true,
      })
      .select('id, slug')
      .single()

    if (dealError || !deal) {
      console.log(`  ! ${label}: ${dealError?.message ?? 'insert failed'}`)
      skipped += 1
      continue
    }

    let order = 0
    for (const file of unit.photos) {
      const path = join(IMAGES_ROOT, file)
      let bytes: Buffer
      try {
        bytes = readFileSync(path)
      } catch {
        console.log(`  ! ${label}: missing file ${file}`)
        continue
      }

      const ext = ('.' + file.split('.').pop()!.toLowerCase()) as keyof typeof MIME
      const contentType = MIME[ext] ?? 'image/jpeg'
      const storagePath = `past-deals/${deal.id}/${crypto.randomUUID()}${ext}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, bytes, { contentType, upsert: false })

      if (uploadError) {
        console.log(`  ! ${label} (${file}): ${uploadError.message}`)
        continue
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)

      const { error: imageError } = await supabase.from('past_deal_images').insert({
        past_deal_id: deal.id,
        storage_path: storagePath,
        url: publicUrl,
        alt_text: `${title} photo`,
        sort_order: order,
        is_primary: order === 0,
        file_size: bytes.byteLength,
      })

      if (imageError) {
        await supabase.storage.from(BUCKET).remove([storagePath])
        console.log(`  ! ${label} (${file}): ${imageError.message}`)
        continue
      }

      order += 1
      photosUploaded += 1
    }

    console.log(`  ${label} -> /sold/${deal.slug} (${order} photo${order === 1 ? '' : 's'})`)
    created += 1
  }

  console.log(`\nDone: ${created} entries created, ${skipped} skipped, ${photosUploaded} photos uploaded.`)
}

main()
