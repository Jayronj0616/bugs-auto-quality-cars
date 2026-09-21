import 'server-only'

import { cache } from 'react'

import {
  AVAILABLE_STATUSES,
  DEFAULT_SORT,
  PUBLICLY_VISIBLE_STATUSES,
  VEHICLES_PER_PAGE,
  type SortOption,
} from '@/lib/constants'
import { estimateMonthlyPayment } from '@/lib/financing/calculator'
import { resolvePricing, type VehiclePricing } from '@/lib/pricing'
import { createPublicSupabaseClient } from '@/lib/supabase/server'
import type {
  BodyType,
  FuelType,
  TransmissionType,
  VehicleCondition,
  VehicleImageRow,
  VehicleRow,
  VehicleSpecificationRow,
  VehicleStatus,
  VehicleVideoRow,
} from '@/types/database'

/* -------------------------------------------------------------------------- */
/* Shapes returned to the UI                                                   */
/* -------------------------------------------------------------------------- */

export type VehicleSummary = VehicleRow & {
  images: VehicleImageRow[]
  pricing: VehiclePricing
  /** Indicative monthly payment using the applicable defaults. Null if unknown. */
  monthlyFrom: number | null
  title: string
}

export type VehicleDetail = VehicleSummary & {
  videos: VehicleVideoRow[]
  specifications: VehicleSpecificationRow[]
}

export type VehicleFilters = {
  q?: string
  brands?: string[]
  bodyTypes?: BodyType[]
  fuelTypes?: FuelType[]
  transmissions?: TransmissionType[]
  conditions?: VehicleCondition[]
  minPrice?: number | null
  maxPrice?: number | null
  minYear?: number | null
  maxYear?: number | null
  maxMonthly?: number | null
  featuredOnly?: boolean
  promoOnly?: boolean
  includeSold?: boolean
  sort?: SortOption
  page?: number
  perPage?: number
}

export type VehicleListResult = {
  vehicles: VehicleSummary[]
  total: number
  page: number
  perPage: number
  totalPages: number
  /** True when Supabase is unreachable, so the UI can say so instead of "no results". */
  unavailable: boolean
}

export type FinancingDefaults = {
  downPaymentPercent: number
  termMonths: number
  interestRate: number
}

/* -------------------------------------------------------------------------- */
/* Query building                                                              */
/* -------------------------------------------------------------------------- */

const LIST_SELECT = '*, images:vehicle_images(*)'
const DETAIL_SELECT =
  '*, images:vehicle_images(*), videos:vehicle_videos(*), specifications:vehicle_specifications(*)'

export function vehicleTitle(vehicle: Pick<VehicleRow, 'year' | 'brand' | 'model' | 'variant'>): string {
  return [vehicle.year, vehicle.brand, vehicle.model, vehicle.variant].filter(Boolean).join(' ')
}

/**
 * Turns a listing row into the shape the UI wants: images sorted with the
 * primary first, the resolved price, and an indicative monthly payment.
 */
function decorate(
  row: VehicleRow & { images?: VehicleImageRow[] | null },
  defaults: FinancingDefaults,
): VehicleSummary {
  const images = [...(row.images ?? [])].sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
    return a.created_at.localeCompare(b.created_at)
  })

  const pricing = resolvePricing(row)
  const monthly = estimateMonthlyPayment({
    vehiclePrice: pricing.price,
    downPaymentPercent: row.default_down_payment_percent ?? defaults.downPaymentPercent,
    termMonths: row.default_term_months ?? defaults.termMonths,
    annualInterestRate: defaults.interestRate,
  })

  return {
    ...row,
    images,
    pricing,
    monthlyFrom: monthly > 0 ? monthly : null,
    title: vehicleTitle(row),
  }
}

/**
 * Inverts the amortisation so a "max ₱18,000/month" filter can be answered with
 * an indexed price comparison instead of computing a payment for every row.
 *
 *   payment = principal × k        where k depends only on rate and term
 *   price   = principal / (1 − dp)
 */
function priceCeilingForMonthlyBudget(maxMonthly: number, defaults: FinancingDefaults): number {
  const monthlyRate = defaults.interestRate / 100 / 12
  const term = defaults.termMonths

  const principal =
    monthlyRate <= 0
      ? maxMonthly * term
      : (maxMonthly * ((1 + monthlyRate) ** term - 1)) / (monthlyRate * (1 + monthlyRate) ** term)

  const financedShare = 1 - defaults.downPaymentPercent / 100
  if (financedShare <= 0) return Number.POSITIVE_INFINITY

  return principal / financedShare
}

/* -------------------------------------------------------------------------- */
/* Public reads                                                                */
/* -------------------------------------------------------------------------- */

export async function listVehicles(
  filters: VehicleFilters,
  defaults: FinancingDefaults,
): Promise<VehicleListResult> {
  const page = Math.max(1, filters.page ?? 1)
  const perPage = Math.min(Math.max(filters.perPage ?? VEHICLES_PER_PAGE, 1), 48)
  const empty: VehicleListResult = {
    vehicles: [],
    total: 0,
    page,
    perPage,
    totalPages: 0,
    unavailable: false,
  }

  const supabase = createPublicSupabaseClient()
  if (!supabase) return { ...empty, unavailable: true }

  const statuses: VehicleStatus[] = filters.includeSold
    ? PUBLICLY_VISIBLE_STATUSES
    : AVAILABLE_STATUSES

  let query = supabase
    .from('vehicles')
    .select(LIST_SELECT, { count: 'exact' })
    .in('status', statuses)

  const term = filters.q?.trim()
  if (term) {
    query = query.ilike('search_text', `%${term.toLowerCase()}%`)
  }

  if (filters.brands?.length) query = query.in('brand', filters.brands)
  if (filters.bodyTypes?.length) query = query.in('body_type', filters.bodyTypes)
  if (filters.fuelTypes?.length) query = query.in('fuel_type', filters.fuelTypes)
  if (filters.transmissions?.length) query = query.in('transmission', filters.transmissions)
  if (filters.conditions?.length) query = query.in('condition', filters.conditions)

  if (typeof filters.minPrice === 'number') query = query.gte('filter_price', filters.minPrice)
  if (typeof filters.maxPrice === 'number') query = query.lte('filter_price', filters.maxPrice)
  if (typeof filters.minYear === 'number') query = query.gte('year', filters.minYear)
  if (typeof filters.maxYear === 'number') query = query.lte('year', filters.maxYear)

  if (typeof filters.maxMonthly === 'number' && filters.maxMonthly > 0) {
    const ceiling = priceCeilingForMonthlyBudget(filters.maxMonthly, defaults)
    if (Number.isFinite(ceiling)) query = query.lte('filter_price', Math.ceil(ceiling))
  }

  if (filters.featuredOnly) query = query.eq('is_featured', true)
  if (filters.promoOnly) query = query.not('promo_price', 'is', null)

  switch (filters.sort ?? DEFAULT_SORT) {
    case 'price_asc':
      query = query.order('filter_price', { ascending: true })
      break
    case 'price_desc':
      query = query.order('filter_price', { ascending: false })
      break
    case 'year_desc':
      query = query.order('year', { ascending: false })
      break
    case 'year_asc':
      query = query.order('year', { ascending: true })
      break
    case 'brand_asc':
      query = query.order('brand', { ascending: true }).order('model', { ascending: true })
      break
    default:
      // Featured stock leads, then the most recently published.
      query = query
        .order('is_featured', { ascending: false })
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
  }

  query = query.order('sort_order', { referencedTable: 'vehicle_images', ascending: true })

  const from = (page - 1) * perPage
  const { data, error, count } = await query.range(from, from + perPage - 1)

  if (error) {
    console.error('[vehicles] list failed:', error.message)
    return { ...empty, unavailable: true }
  }

  const total = count ?? 0
  return {
    vehicles: (data ?? []).map((row) => decorate(row as VehicleRow & { images: VehicleImageRow[] }, defaults)),
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    unavailable: false,
  }
}

export const getVehicleBySlug = cache(
  async (slug: string, defaults: FinancingDefaults): Promise<VehicleDetail | null> => {
    const supabase = createPublicSupabaseClient()
    if (!supabase) return null

    const { data, error } = await supabase
      .from('vehicles')
      .select(DETAIL_SELECT)
      .eq('slug', slug)
      .in('status', PUBLICLY_VISIBLE_STATUSES)
      .maybeSingle()

    if (error) {
      console.error('[vehicles] detail failed:', error.message)
      return null
    }
    if (!data) return null

    const row = data as VehicleRow & {
      images: VehicleImageRow[]
      videos: VehicleVideoRow[]
      specifications: VehicleSpecificationRow[]
    }

    return {
      ...decorate(row, defaults),
      videos: [...(row.videos ?? [])].sort((a, b) => a.sort_order - b.sort_order),
      specifications: [...(row.specifications ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
      ),
    }
  },
)

export async function getFeaturedVehicles(
  defaults: FinancingDefaults,
  limit = 6,
): Promise<VehicleSummary[]> {
  const supabase = createPublicSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('vehicles')
    .select(LIST_SELECT)
    .in('status', AVAILABLE_STATUSES)
    .eq('is_featured', true)
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('sort_order', { referencedTable: 'vehicle_images', ascending: true })
    .limit(limit)

  if (error) {
    console.error('[vehicles] featured failed:', error.message)
    return []
  }

  return (data ?? []).map((row) => decorate(row as VehicleRow & { images: VehicleImageRow[] }, defaults))
}

export async function getLatestVehicles(
  defaults: FinancingDefaults,
  limit = 8,
): Promise<VehicleSummary[]> {
  const supabase = createPublicSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('vehicles')
    .select(LIST_SELECT)
    .in('status', AVAILABLE_STATUSES)
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('sort_order', { referencedTable: 'vehicle_images', ascending: true })
    .limit(limit)

  if (error) {
    console.error('[vehicles] latest failed:', error.message)
    return []
  }

  return (data ?? []).map((row) => decorate(row as VehicleRow & { images: VehicleImageRow[] }, defaults))
}

/**
 * Related vehicles for the bottom of a detail page: same body type first, then
 * topped up with anything else available so the row is never half empty.
 */
export async function getRelatedVehicles(
  vehicle: Pick<VehicleRow, 'id' | 'body_type' | 'brand'>,
  defaults: FinancingDefaults,
  limit = 3,
): Promise<VehicleSummary[]> {
  const supabase = createPublicSupabaseClient()
  if (!supabase) return []

  const collected = new Map<string, VehicleSummary>()

  const push = (rows: unknown[] | null) => {
    for (const row of (rows ?? []) as (VehicleRow & { images: VehicleImageRow[] })[]) {
      if (collected.size >= limit) break
      if (row.id === vehicle.id || collected.has(row.id)) continue
      collected.set(row.id, decorate(row, defaults))
    }
  }

  if (vehicle.body_type) {
    const { data } = await supabase
      .from('vehicles')
      .select(LIST_SELECT)
      .in('status', AVAILABLE_STATUSES)
      .eq('body_type', vehicle.body_type)
      .neq('id', vehicle.id)
      .order('sort_order', { referencedTable: 'vehicle_images', ascending: true })
      .limit(limit)
    push(data)
  }

  if (collected.size < limit) {
    const { data } = await supabase
      .from('vehicles')
      .select(LIST_SELECT)
      .in('status', AVAILABLE_STATUSES)
      .neq('id', vehicle.id)
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('sort_order', { referencedTable: 'vehicle_images', ascending: true })
      .limit(limit * 2)
    push(data)
  }

  return [...collected.values()]
}

/* -------------------------------------------------------------------------- */
/* Filter facets                                                               */
/* -------------------------------------------------------------------------- */

export type InventoryFacets = {
  brands: string[]
  bodyTypes: BodyType[]
  fuelTypes: FuelType[]
  transmissions: TransmissionType[]
  conditions: VehicleCondition[]
  priceRange: { min: number; max: number } | null
  yearRange: { min: number; max: number } | null
  total: number
}

/**
 * Only offers filters that would actually match something. Derived from the
 * available inventory in one query - at dealership scale (hundreds of vehicles,
 * not millions) that is cheaper and simpler than maintaining facet tables.
 */
export const getInventoryFacets = cache(async (): Promise<InventoryFacets> => {
  const emptyFacets: InventoryFacets = {
    brands: [],
    bodyTypes: [],
    fuelTypes: [],
    transmissions: [],
    conditions: [],
    priceRange: null,
    yearRange: null,
    total: 0,
  }

  const supabase = createPublicSupabaseClient()
  if (!supabase) return emptyFacets

  const { data, error } = await supabase
    .from('vehicles')
    .select('brand, body_type, fuel_type, transmission, condition, filter_price, year')
    .in('status', PUBLICLY_VISIBLE_STATUSES)

  if (error || !data) {
    if (error) console.error('[vehicles] facets failed:', error.message)
    return emptyFacets
  }

  const brands = new Set<string>()
  const bodyTypes = new Set<BodyType>()
  const fuelTypes = new Set<FuelType>()
  const transmissions = new Set<TransmissionType>()
  const conditions = new Set<VehicleCondition>()
  let minPrice = Number.POSITIVE_INFINITY
  let maxPrice = 0
  let minYear = Number.POSITIVE_INFINITY
  let maxYear = 0

  for (const row of data) {
    brands.add(row.brand)
    if (row.body_type) bodyTypes.add(row.body_type)
    if (row.fuel_type) fuelTypes.add(row.fuel_type)
    if (row.transmission) transmissions.add(row.transmission)
    conditions.add(row.condition)

    const price = Number(row.filter_price)
    if (Number.isFinite(price) && price > 0) {
      minPrice = Math.min(minPrice, price)
      maxPrice = Math.max(maxPrice, price)
    }
    minYear = Math.min(minYear, row.year)
    maxYear = Math.max(maxYear, row.year)
  }

  return {
    brands: [...brands].sort((a, b) => a.localeCompare(b)),
    bodyTypes: [...bodyTypes],
    fuelTypes: [...fuelTypes],
    transmissions: [...transmissions],
    conditions: [...conditions],
    priceRange: maxPrice > 0 ? { min: Math.floor(minPrice), max: Math.ceil(maxPrice) } : null,
    yearRange: maxYear > 0 ? { min: minYear, max: maxYear } : null,
    total: data.length,
  }
})

/** Slugs for `generateStaticParams` and the sitemap. */
export async function getPublishedVehicleSlugs(): Promise<
  { slug: string; updated_at: string }[]
> {
  const supabase = createPublicSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('vehicles')
    .select('slug, updated_at')
    .in('status', PUBLICLY_VISIBLE_STATUSES)
    .order('updated_at', { ascending: false })
    .limit(2000)

  if (error) {
    console.error('[vehicles] slugs failed:', error.message)
    return []
  }
  return data ?? []
}

/** Minimal list used to populate the vehicle picker on inquiry forms. */
export async function getVehicleOptions(): Promise<{ id: string; label: string; slug: string }[]> {
  const supabase = createPublicSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('vehicles')
    .select('id, slug, brand, model, variant, year')
    .in('status', AVAILABLE_STATUSES)
    .order('brand', { ascending: true })
    .order('model', { ascending: true })
    .limit(500)

  if (error) {
    console.error('[vehicles] options failed:', error.message)
    return []
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    label: vehicleTitle(row),
  }))
}
