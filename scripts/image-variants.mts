/**
 * Creates the resized copies the site's image loader serves (see
 * src/lib/image-variants.ts) for every photo already in the bucket.
 *
 *   npm run images:variants
 *
 * Safe to re-run: photos that already have all their copies are skipped. The
 * import scripts call `makeVariants` themselves for the photos they upload.
 */

import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import sharp from 'sharp'

import {
  IMAGE_VARIANT_PATTERN,
  IMAGE_VARIANT_WIDTHS,
  MEDIA_BUCKET,
  variantPath,
} from '../src/lib/image-variants.ts'

const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|avif)$/i

/** Same output as the app's upload routes (src/lib/media-variants.ts). */
export async function makeVariants(
  supabase: SupabaseClient,
  path: string,
  bytes: Uint8Array,
  widths: readonly number[] = IMAGE_VARIANT_WIDTHS,
): Promise<void> {
  const base = sharp(bytes).rotate()
  await Promise.all(
    widths.map(async (width) => {
      const output = await base
        .clone()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 76 })
        .toBuffer()
      const { error } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(variantPath(path, width), output, {
          contentType: 'image/webp',
          upsert: true,
          cacheControl: '31536000',
        })
      if (error) throw new Error(`${variantPath(path, width)}: ${error.message}`)
    }),
  )
}

async function listAll(supabase: SupabaseClient, prefix = ''): Promise<string[]> {
  const files: string[] = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage
      .from(MEDIA_BUCKET)
      .list(prefix, { limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } })
    if (error) throw new Error(`list ${prefix || '/'}: ${error.message}`)
    for (const entry of data ?? []) {
      const full = prefix ? `${prefix}/${entry.name}` : entry.name
      // Folders come back without an id.
      if (entry.id === null) files.push(...(await listAll(supabase, full)))
      else files.push(full)
    }
    if (!data || data.length < 1000) break
  }
  return files
}

async function backfill() {
  const env: Record<string, string> = {}
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const i = trimmed.indexOf('=')
    if (i === -1) continue
    env[trimmed.slice(0, i).trim()] = trimmed.slice(i + 1).trim()
  }
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.')
    process.exit(1)
  }
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  const all = await listAll(supabase)
  const existing = new Set(all)
  const originals = all.filter((path) => IMAGE_EXTENSIONS.test(path) && !IMAGE_VARIANT_PATTERN.test(path))
  const todo = originals
    .map((path) => ({ path, missing: IMAGE_VARIANT_WIDTHS.filter((w) => !existing.has(variantPath(path, w))) }))
    .filter((item) => item.missing.length > 0)

  console.log(`${originals.length} photos in the bucket, ${todo.length} need copies.\n`)

  let done = 0
  let failed = 0
  const queue = [...todo]
  const worker = async () => {
    for (let item = queue.shift(); item; item = queue.shift()) {
      try {
        const { data, error } = await supabase.storage.from(MEDIA_BUCKET).download(item.path)
        if (error || !data) throw new Error(error?.message ?? 'empty download')
        await makeVariants(supabase, item.path, new Uint8Array(await data.arrayBuffer()), item.missing)
        done += 1
        if (done % 25 === 0) console.log(`  ${done}/${todo.length}`)
      } catch (error) {
        failed += 1
        console.log(`  ! ${item.path}: ${error instanceof Error ? error.message : error}`)
      }
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker))

  console.log(`\nDone: ${done} photo(s) given copies, ${failed} failed.`)
  if (failed > 0) process.exit(1)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await backfill()
