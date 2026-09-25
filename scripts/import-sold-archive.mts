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
 * its photo(s), and link them. Idempotent by slug: re-running skips any unit
 * whose slug already has photos attached, so it's safe to re-run after fixing
 * a typo in the manifest without re-uploading everything.
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
  title: string
  note: string | null
}

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

async function uniqueSlug(base: string): Promise<string> {
  const safeBase = base || 'sold-vehicle'
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const candidate = attempt === 0 ? safeBase : `${safeBase}-${attempt + 1}`
    const { data } = await supabase.from('past_deals').select('id').eq('slug', candidate).maybeSingle()
    if (!data) return candidate
  }
  return `${safeBase}-${Date.now()}`
}

async function main() {
  console.log(`Importing ${units.length} sold-archive units from ${manifestPath}\n`)

  let created = 0
  let skipped = 0
  let photosUploaded = 0

  for (const [index, unit] of units.entries()) {
    const label = `[${index + 1}/${units.length}] ${unit.title}`
    const slug = await uniqueSlug(slugify(unit.title))

    const { data: deal, error: dealError } = await supabase
      .from('past_deals')
      .insert({
        title: unit.title,
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
        alt_text: `${unit.title} photo`,
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
