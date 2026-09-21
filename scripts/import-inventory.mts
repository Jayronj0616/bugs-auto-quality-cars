/**
 * Imports the dealership's real inventory: vehicle records, photography,
 * walkaround videos, and the JACCS financing quotes.
 *
 *   npm run import:inventory
 *
 * Idempotent by slug - re-running updates the vehicle record and leaves
 * already-uploaded media alone, so it is safe to run after editing a
 * description without re-uploading 130MB of photographs.
 *
 * Financing note: the quotes below are fixed monthly figures from JACCS, not
 * interest rates. The script solves the amortisation formula backwards for each
 * term so the on-site calculator reproduces those exact monthlies, and the
 * original table is also stored verbatim as specifications so the customer can
 * see the dealership's own numbers rather than only a derived estimate.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'
import { createClient } from '@supabase/supabase-js'

/* -------------------------------------------------------------------------- */
/* Environment                                                                 */
/* -------------------------------------------------------------------------- */

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
const IMAGES_ROOT = 'images'

/* -------------------------------------------------------------------------- */
/* Financing maths                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Solves for the monthly interest rate that turns `principal` over `months`
 * into `payment`, by bisection. Returns the annual nominal rate as a
 * percentage, which is what `financing_rates.interest_rate` stores.
 */
function annualRateFor(principal: number, months: number, payment: number): number {
  const factor = payment / principal

  // Nothing to solve: the payments barely cover the principal.
  if (factor <= 1 / months) return 0

  let low = 0
  let high = 1 // 100% per month is far beyond any real quote
  for (let i = 0; i < 200; i += 1) {
    const mid = (low + high) / 2
    const growth = (1 + mid) ** months
    const guess = (mid * growth) / (growth - 1)
    if (guess > factor) high = mid
    else low = mid
  }

  return Number((((low + high) / 2) * 12 * 100).toFixed(4))
}

const peso = (value: number) =>
  `₱${value.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`

/* -------------------------------------------------------------------------- */
/* Inventory                                                                   */
/* -------------------------------------------------------------------------- */

type Quote = {
  /** Price the JACCS sheet is calculated from, which can differ from the ad. */
  sheetPrice: number
  financeAmount: number
  downPayment: number
  ltoFee?: number
  insuranceFirstPayment?: number
  processingFee?: number
  totalCashOut?: number
  /** Quoted monthly payment, keyed by term in months. */
  monthly: Record<number, number>
  inclusions?: string[]
}

type VehicleImport = {
  folder: string
  slug: string
  brand: string
  model: string
  variant: string | null
  year: number
  condition: 'brand_new' | 'used' | 'certified_pre_owned'
  bodyType: string
  fuelType: string
  transmission: string
  driveType?: string
  seatingCapacity?: number
  mileage?: number
  engine?: string
  sellingPrice: number
  brandNewPrice?: number
  description: string
  features: string[]
  quote?: Quote
  isFeatured?: boolean
  /** 1 leads the homepage hero; unset orders by newest listing. */
  featuredRank?: number
  contactPhone?: string
}

/*
 * Only fields the dealership actually stated are recorded here, plus body type
 * and fuel where the model name makes them certain (an H350 is a diesel van; a
 * Camaro RS is a coupe) because the inventory filters need them.
 *
 * Nothing is inferred beyond that - no invented seating counts, drive types or
 * specifications. A blank field simply does not render, which is preferable to
 * a plausible-looking guess on a listing a customer will act on.
 */
const INVENTORY: VehicleImport[] = [
  {
    folder: 'hyundai',
    slug: 'hyundai-h350-2019',
    brand: 'Hyundai',
    model: 'H350',
    variant: 'Customized 10-Seater',
    year: 2019,
    condition: 'used',
    bodyType: 'van',
    fuelType: 'diesel',
    transmission: 'manual',
    seatingCapacity: 10,
    mileage: 28000,
    sellingPrice: 1_850_000,
    brandNewPrice: 2_800_000,
    isFeatured: true,
    description: `Close to brand-new condition, with roughly ₱1.5M of customisation already done. Acquired 2019 with 28,000 legitimate kilometres on the odometer — unlimited scan, and you are welcome to bring your own mechanic.

Fitted out as a proper touring van: ten seats including captain's chairs, a spacious bed at the back, TV and videoke, a fridge/cooler, Android monitor, dashcam and backup camera. Four brand-new tyres, two original keys, complete manual booklet and complete documents.

Money back if the unit is tampered, flooded, has any history of accident, or has illegal documents. For serious buyers only.`,
    features: [
      '10 seater with captain seats',
      'Push button seats',
      'Touchscreen with pin light',
      'Spacious bed at the back',
      'TV installed',
      'Videoke installed',
      'Refrigerator / cooler installed',
      'Android monitor',
      'Dashcam',
      'Backup camera',
      'Brand new set of 4 tyres',
      '2 original keys',
      'Complete manual booklet',
      'Complete documents',
      'Unlimited scan — bring your own mechanic',
    ],
    quote: {
      sheetPrice: 1_900_000,
      financeAmount: 1_300_000,
      downPayment: 600_000,
      ltoFee: 10_000,
      insuranceFirstPayment: 10_000,
      processingFee: 37_214,
      totalCashOut: 657_214,
      monthly: { 12: 124_670, 24: 73_954, 36: 53_791, 48: 44_113 },
    },
  },
  {
    folder: 'chev',
    slug: 'chevrolet-camaro-rs-turbo-2020',
    brand: 'Chevrolet',
    model: 'Camaro',
    variant: 'RS 2.0 Turbo',
    year: 2020,
    condition: 'used',
    bodyType: 'coupe',
    fuelType: 'gasoline',
    transmission: 'automatic',
    mileage: 19000,
    engine: '2.0L Turbocharged',
    sellingPrice: 2_650_000,
    brandNewPrice: 4_300_000,
    isFeatured: true,
    // The dealership wants the Camaro to be the first car a visitor sees.
    featuredRank: 1,
    description: `19,000km only, unlimited scan. Turbocharged 2.0-litre with a Borla exhaust, six-speed automatic and paddle shifters — fresh inside and out, with two original keys and complete, clean papers. LTO verified and HPG verified.

Money back guarantee against flooding, any history of accident, or illegal documents.

We accept cash, financing, trade-in and swap.`,
    features: [
      'Turbocharged 2.0L engine',
      'Borla exhaust',
      '6-speed automatic with paddle shifters',
      'Leather seats',
      '4-wheel disc brakes',
      'Racing stripes',
      'Rear camera',
      'Parking assist monitor',
      'Touchscreen head unit with Apple CarPlay and Android Auto',
      'BOSE sound system',
      'Keyless entry with push start',
      'Dual-zone climate control',
      'LED headlights with DRL',
      '2 original keys',
      'LTO verified / HPG verified',
    ],
    quote: {
      sheetPrice: 2_650_000,
      financeAmount: 1_800_000,
      downPayment: 850_000,
      ltoFee: 10_000,
      insuranceFirstPayment: 10_000,
      processingFee: 44_617,
      totalCashOut: 914_617,
      monthly: { 12: 172_380, 24: 100_463, 36: 72_465, 48: 58_984 },
      inclusions: [
        'Transfer of ownership',
        'Comprehensive insurance',
        'LTO clearance',
        'HPG clearance',
        'Detailing',
        'Full tank',
      ],
    },
  },
  {
    folder: 'ford-teri',
    slug: 'ford-territory-titanium-2025',
    brand: 'Ford',
    model: 'Territory',
    variant: 'Titanium 1.5',
    year: 2025,
    condition: 'used',
    bodyType: 'crossover',
    fuelType: 'gasoline',
    transmission: 'automatic',
    mileage: 9000,
    engine: '1.5L Gasoline',
    sellingPrice: 850_000,
    isFeatured: true,
    description: `Close to brand new — 9,000 legitimate kilometres with unlimited scan, and it still smells like a new car. All original paint, fresh inside and out, with a 360-degree camera. LTO verified, HPG verified, complete and legal documents.

We accept cash, financing, trade-in and swap.`,
    features: [
      '360-degree camera',
      'All original paint',
      '9,000km legitimate mileage',
      'Unlimited scan',
      'LTO verified / HPG verified',
      'Complete and legal documents',
    ],
    quote: {
      sheetPrice: 850_000,
      financeAmount: 660_000,
      downPayment: 190_000,
      ltoFee: 10_000,
      insuranceFirstPayment: 10_000,
      processingFee: 28_035,
      totalCashOut: 238_035,
      monthly: { 12: 63_294, 24: 37_546, 36: 27_309, 48: 22_396, 60: 19_712 },
    },
  },
  {
    folder: 'ford-ranger',
    slug: 'ford-ranger-sport-4x2-2023',
    brand: 'Ford',
    model: 'Ranger',
    variant: 'Sport 4x2',
    year: 2023,
    condition: 'used',
    bodyType: 'pickup',
    fuelType: 'diesel',
    transmission: 'automatic',
    driveType: 'rwd',
    mileage: 43000,
    sellingPrice: 1_060_000,
    brandNewPrice: 1_820_000,
    description: `Class A unit. 43,000+ legitimate odometer reading with unlimited scan — bring your trusted mechanic. Fresh in and out with no dents and no scratches. Not flooded, no history of accident, 100% legal documents. LTO verified and HPG verified, with a money back guarantee.

We accept cash, financing, swap and trade-in.`,
    features: [
      'No dents, no scratches',
      '100% not flooded',
      'No history of accident',
      '100% legal documents',
      'LTO verified / HPG verified',
      'Unlimited scan — bring your trusted mechanic',
      'Money back guarantee',
    ],
    quote: {
      sheetPrice: 1_070_000,
      financeAmount: 740_000,
      downPayment: 330_000,
      ltoFee: 10_000,
      insuranceFirstPayment: 10_000,
      processingFee: 30_103,
      totalCashOut: 380_103,
      monthly: { 12: 70_867, 24: 41_301, 36: 29_791, 48: 24_249, 60: 21_213 },
    },
  },
  {
    folder: 'slick',
    slug: 'fkm-slick-400-2024',
    brand: 'FKM',
    model: 'Slick 400',
    variant: 'Big Scooter',
    year: 2024,
    condition: 'used',
    bodyType: 'scooter',
    fuelType: 'gasoline',
    transmission: 'automatic',
    mileage: 5000,
    engine: '400cc',
    sellingPrice: 230_000,
    contactPhone: '0933 827 9839',
    description: `Expressway legal 400cc big scooter, 2024 model acquired with 5,000 legitimate kilometres. Fresh unit, all original paint, close to brand-new condition. Registered until 2027 with two original remote keys.

Fitted with an Akrapovic exhaust worth ₱30,000, a GIVI box worth ₱5,000, fog lights and an upgraded horn.

Money back guarantee. Please call 0933 827 9839 for this unit.`,
    features: [
      '400cc — expressway legal',
      'Akrapovic exhaust (worth ₱30,000)',
      'GIVI box (worth ₱5,000)',
      'Fog lights',
      'Upgraded horn',
      'All original paint',
      '2 original remote keys',
      'Registered until 2027',
      'Money back guarantee',
    ],
    quote: {
      sheetPrice: 230_000,
      financeAmount: 161_000,
      downPayment: 69_000,
      totalCashOut: 97_625,
      monthly: { 12: 15_567, 24: 8_687, 36: 6_369 },
      inclusions: [
        'Transfer of ownership',
        'Chattel mortgage',
        'LTO clearance',
        'HPG clearance',
        '₱1,000 gas',
      ],
    },
  },
]

/* -------------------------------------------------------------------------- */
/* Media                                                                       */
/* -------------------------------------------------------------------------- */

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
}

async function uploadMedia(vehicleId: string, folder: string, label: string) {
  const dir = join(IMAGES_ROOT, folder)
  let entries: string[]
  try {
    entries = readdirSync(dir).sort()
  } catch {
    console.log(`    no folder at ${dir} — skipping media`)
    return
  }

  const { count: existing } = await supabase
    .from('vehicle_images')
    .select('id', { count: 'exact' })
    .eq('vehicle_id', vehicleId)
    .limit(1)

  if ((existing ?? 0) > 0) {
    console.log(`    ${existing} photo(s) already attached — skipping upload`)
    return
  }

  const images = entries.filter((f) => ['.jpg', '.jpeg', '.png', '.webp'].includes(extname(f).toLowerCase()))
  const videos = entries.filter((f) => extname(f).toLowerCase() === '.mp4')

  let order = 0
  for (const file of images) {
    const path = join(dir, file)
    const bytes = readFileSync(path)
    const ext = extname(file).toLowerCase()
    const storagePath = `vehicles/${vehicleId}/images/${crypto.randomUUID()}${ext}`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, bytes, { contentType: MIME[ext], upsert: false })

    if (uploadError) {
      console.log(`    ! ${file}: ${uploadError.message}`)
      continue
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)

    const { error } = await supabase.from('vehicle_images').insert({
      vehicle_id: vehicleId,
      storage_path: storagePath,
      url: publicUrl,
      alt_text: `${label} — photo ${order + 1}`,
      category: 'exterior',
      sort_order: order,
      is_primary: order === 0,
      file_size: bytes.byteLength,
    })

    if (error) {
      await supabase.storage.from(BUCKET).remove([storagePath])
      console.log(`    ! ${file}: ${error.message}`)
      continue
    }
    order += 1
  }
  console.log(`    ${order} photo(s) uploaded`)

  for (const [index, file] of videos.entries()) {
    const path = join(dir, file)
    const size = statSync(path).size
    const storagePath = `vehicles/${vehicleId}/videos/${crypto.randomUUID()}.mp4`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, readFileSync(path), { contentType: 'video/mp4', upsert: false })

    if (uploadError) {
      console.log(`    ! video ${file} (${(size / 1024 / 1024).toFixed(1)}MB): ${uploadError.message}`)
      continue
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)

    await supabase.from('vehicle_videos').insert({
      vehicle_id: vehicleId,
      title: `${label} walkaround`,
      video_url: publicUrl,
      provider: 'file',
      video_type: 'walkaround',
      sort_order: index,
    })
    console.log(`    video uploaded (${(size / 1024 / 1024).toFixed(1)}MB)`)
  }
}

/* -------------------------------------------------------------------------- */
/* Import                                                                      */
/* -------------------------------------------------------------------------- */

async function ensureProvider(): Promise<string | null> {
  const { data: existing } = await supabase
    .from('financing_providers')
    .select('id')
    .eq('slug', 'jaccs')
    .maybeSingle()

  if (existing) return existing.id

  const { data, error } = await supabase
    .from('financing_providers')
    .insert({
      name: 'JACCS',
      slug: 'jaccs',
      description:
        'Quoted monthly payments per unit. Final terms and approval depend on JACCS and the applicant.',
      is_active: true,
      sort_order: 0,
    })
    .select('id')
    .single()

  if (error) {
    console.error('  could not create the JACCS provider:', error.message)
    return null
  }
  return data.id
}

async function run() {
  console.log(`\nImporting inventory into ${url}\n`)

  const providerId = await ensureProvider()

  for (const item of INVENTORY) {
    const label = [item.year, item.brand, item.model, item.variant].filter(Boolean).join(' ')
    console.log(`  ${label}`)

    const row = {
      brand: item.brand,
      model: item.model,
      variant: item.variant,
      slug: item.slug,
      year: item.year,
      condition: item.condition,
      body_type: item.bodyType,
      fuel_type: item.fuelType,
      transmission: item.transmission,
      drive_type: item.driveType ?? null,
      seating_capacity: item.seatingCapacity ?? null,
      mileage: item.mileage ?? null,
      engine: item.engine ?? null,
      description: item.description,
      features: item.features,
      selling_price: item.sellingPrice,
      status: 'published' as const,
      is_featured: item.isFeatured ?? false,
      featured_rank: item.isFeatured ? (item.featuredRank ?? null) : null,
      // Derived from the *financed* amount rather than the sheet's down payment
      // percentage. Some ads quote a slightly lower cash price than the JACCS
      // sheet was built on, and anchoring on the financed amount is what makes
      // the site reproduce the quoted monthly exactly instead of under-quoting
      // it, which is the dangerous direction to be wrong in.
      default_down_payment_percent: item.quote
        ? Number(((1 - item.quote.financeAmount / item.sellingPrice) * 100).toFixed(2))
        : null,
      default_term_months: item.quote
        ? Math.max(...Object.keys(item.quote.monthly).map(Number))
        : null,
    }

    const { data: existing } = await supabase
      .from('vehicles')
      .select('id')
      .eq('slug', item.slug)
      .maybeSingle()

    let vehicleId: string
    if (existing) {
      const { error } = await supabase.from('vehicles').update(row).eq('id', existing.id)
      if (error) {
        console.log(`    ! update failed: ${error.message}`)
        continue
      }
      vehicleId = existing.id
      console.log('    record updated')
    } else {
      const { data, error } = await supabase.from('vehicles').insert(row).select('id').single()
      if (error) {
        console.log(`    ! insert failed: ${error.message}`)
        continue
      }
      vehicleId = data.id
      console.log('    record created')
    }

    await uploadMedia(vehicleId, item.folder, label)

    /* Specifications: the dealership's own figures, verbatim. */
    await supabase.from('vehicle_specifications').delete().eq('vehicle_id', vehicleId)

    const specs: { group_name: string; name: string; value: string; sort_order: number }[] = []
    let order = 0

    if (item.brandNewPrice) {
      specs.push({
        group_name: 'Pricing',
        name: 'Brand new price',
        value: peso(item.brandNewPrice),
        sort_order: order++,
      })
    }
    specs.push({
      group_name: 'Pricing',
      name: 'Selling price',
      value: peso(item.sellingPrice),
      sort_order: order++,
    })

    if (item.quote) {
      const q = item.quote
      specs.push(
        { group_name: 'JACCS Financing', name: 'Down payment', value: peso(q.downPayment), sort_order: order++ },
        { group_name: 'JACCS Financing', name: 'Amount financed', value: peso(q.financeAmount), sort_order: order++ },
      )
      if (q.ltoFee) specs.push({ group_name: 'JACCS Financing', name: 'LTO (dealer)', value: peso(q.ltoFee), sort_order: order++ })
      if (q.insuranceFirstPayment) specs.push({ group_name: 'JACCS Financing', name: 'Insurance first payment', value: peso(q.insuranceFirstPayment), sort_order: order++ })
      if (q.processingFee) specs.push({ group_name: 'JACCS Financing', name: 'Processing fee', value: peso(q.processingFee), sort_order: order++ })
      if (q.totalCashOut) specs.push({ group_name: 'JACCS Financing', name: 'Total all-in cash out', value: peso(q.totalCashOut), sort_order: order++ })

      for (const [term, payment] of Object.entries(q.monthly)) {
        const years = Number(term) / 12
        specs.push({
          group_name: 'Monthly payment (JACCS)',
          name: `${years} year${years === 1 ? '' : 's'} (${term} months)`,
          value: `${peso(payment)} / month`,
          sort_order: order++,
        })
      }

      for (const inclusion of q.inclusions ?? []) {
        specs.push({ group_name: 'Included', name: inclusion, value: 'Included', sort_order: order++ })
      }
    }

    if (item.contactPhone) {
      specs.push({
        group_name: 'Contact',
        name: 'Direct line for this unit',
        value: item.contactPhone,
        sort_order: order++,
      })
    }

    if (specs.length > 0) {
      const { error } = await supabase
        .from('vehicle_specifications')
        .insert(specs.map((spec) => ({ ...spec, vehicle_id: vehicleId })))
      if (error) console.log(`    ! specifications: ${error.message}`)
      else console.log(`    ${specs.length} specification row(s)`)
    }

    /* Financing rates derived from the quoted monthlies. */
    if (item.quote && providerId) {
      await supabase.from('financing_rates').delete().eq('vehicle_id', vehicleId)

      const minimumDown = Number(
        ((1 - item.quote.financeAmount / item.sellingPrice) * 100).toFixed(2),
      )

      const rates = Object.entries(item.quote.monthly).map(([term, payment]) => ({
        provider_id: providerId,
        vehicle_id: vehicleId,
        term_months: Number(term),
        interest_rate: annualRateFor(item.quote!.financeAmount, Number(term), payment),
        minimum_down_payment_percent: minimumDown,
        is_active: true,
      }))

      const { error } = await supabase.from('financing_rates').insert(rates)
      if (error) console.log(`    ! financing rates: ${error.message}`)
      else console.log(`    ${rates.length} financing rate(s) derived`)
    }
  }

  console.log('\nDone.\n')
}

await run()
