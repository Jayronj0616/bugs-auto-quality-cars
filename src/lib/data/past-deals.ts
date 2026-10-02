import 'server-only'

import { cache } from 'react'

import type { AdminSession } from '@/lib/auth'
import { FEATURED_PAST_DEAL_SLOTS } from '@/lib/constants'
import { createPublicSupabaseClient } from '@/lib/supabase/server'
import type { PastDealBrand, PastDealImageRow, PastDealRow } from '@/types/database'

/**
 * Reads for the /sold showcase and its admin management screens.
 *
 * Mirrors the split in `vehicles.ts` / `admin-vehicles.ts`: the public side
 * only ever sees published deals, the admin side sees everything.
 */

export type PastDealSummary = PastDealRow & {
  images: Pick<PastDealImageRow, 'id' | 'url' | 'alt_text' | 'is_primary' | 'sort_order'>[]
}

const SUMMARY_SELECT = '*, images:past_deal_images(id, url, alt_text, is_primary, sort_order)'

function sortImages<T extends { is_primary: boolean; sort_order: number }>(images: T[]): T[] {
  return [...images].sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1
    return a.sort_order - b.sort_order
  })
}

export const PAST_DEALS_PER_PAGE = 24

export type PastDealListResult = {
  deals: PastDealSummary[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

/**
 * Published deals, newest first - powers the /sold grid.
 *
 * Paginated rather than returning everything: this archive is meant to grow
 * without bound (every past sale, going back years), and a page rendering
 * hundreds of full-size photos at once is slow to load for a visitor and
 * heavy on Next's image optimizer for no benefit - nobody scrolls that far.
 *
 * Counts first and clamps the page to what actually exists: PostgREST errors
 * with "Requested range not satisfiable" on a `.range()` past the last row,
 * which a brand filter makes easy to hit (few matches, a bookmarked later
 * page) - that error was previously swallowed into a misleading "total: 0".
 */
export const getPublishedPastDeals = cache(
  async (page = 1, brand?: PastDealBrand): Promise<PastDealListResult> => {
    const supabase = createPublicSupabaseClient()
    const empty: PastDealListResult = {
      deals: [],
      total: 0,
      page: 1,
      perPage: PAST_DEALS_PER_PAGE,
      totalPages: 0,
    }
    if (!supabase) return empty

    let countQuery = supabase
      .from('past_deals')
      .select('id', { count: 'exact', head: true })
      .eq('is_published', true)
    if (brand) countQuery = countQuery.eq('brand', brand)

    const { count, error: countError } = await countQuery
    if (countError) {
      console.error('[past-deals] count failed:', countError.message)
      return empty
    }

    const total = count ?? 0
    const totalPages = Math.max(1, Math.ceil(total / PAST_DEALS_PER_PAGE))
    const safePage = Math.min(Math.max(1, page), totalPages)

    let query = supabase.from('past_deals').select(SUMMARY_SELECT).eq('is_published', true)
    if (brand) query = query.eq('brand', brand)

    const from = (safePage - 1) * PAST_DEALS_PER_PAGE
    const { data, error } = await query
      .order('sold_around', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(from, from + PAST_DEALS_PER_PAGE - 1)

    if (error) {
      console.error('[past-deals] list failed:', error.message)
      return { ...empty, total, page: safePage, totalPages }
    }

    const rows = (data ?? []) as unknown as PastDealSummary[]

    return {
      deals: rows.map((row) => ({ ...row, images: sortImages(row.images) })),
      total,
      page: safePage,
      perPage: PAST_DEALS_PER_PAGE,
      totalPages,
    }
  },
)

/**
 * Brands with at least one published entry, most common first - powers the
 * filter bar on /sold. A brand with zero published entries isn't offered, so
 * the filter never leads to a guaranteed-empty page.
 */
export const getPastDealBrandFacets = cache(async (): Promise<
  { brand: PastDealBrand; count: number }[]
> => {
  const supabase = createPublicSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('past_deals')
    .select('brand')
    .eq('is_published', true)
    .not('brand', 'is', null)
    .limit(5000)

  if (error) {
    console.error('[past-deals] brand facets failed:', error.message)
    return []
  }

  const counts = new Map<PastDealBrand, number>()
  for (const row of (data ?? []) as { brand: PastDealBrand }[]) {
    counts.set(row.brand, (counts.get(row.brand) ?? 0) + 1)
  }

  return [...counts.entries()]
    .map(([brand, count]) => ({ brand, count }))
    .sort((a, b) => b.count - a.count)
})

/** The dealership's top sold units, spot 1 first - powers the homepage "Recently sold" row. */
export const getFeaturedPastDeals = cache(async (): Promise<PastDealSummary[]> => {
  const supabase = createPublicSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('past_deals')
    .select(SUMMARY_SELECT)
    .eq('is_published', true)
    .not('featured_rank', 'is', null)
    .order('featured_rank', { ascending: true })
    .limit(FEATURED_PAST_DEAL_SLOTS)

  if (error) {
    console.error('[past-deals] featured failed:', error.message)
    return []
  }

  const rows = (data ?? []) as unknown as PastDealSummary[]
  return rows.map((row) => ({ ...row, images: sortImages(row.images) }))
})

/** One deal with every photo - powers /sold/[slug]. */
export const getPastDealBySlug = cache(async (slug: string): Promise<PastDealSummary | null> => {
  const supabase = createPublicSupabaseClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('past_deals')
    .select(SUMMARY_SELECT)
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle()

  if (error) {
    console.error('[past-deals] detail failed:', error.message)
    return null
  }
  if (!data) return null

  const row = data as unknown as PastDealSummary
  return { ...row, images: sortImages(row.images) }
})

/** Minimal list used to build the sitemap. */
export async function getPublishedPastDealSlugs(): Promise<
  { slug: string; updated_at: string }[]
> {
  const supabase = createPublicSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('past_deals')
    .select('slug, updated_at')
    .eq('is_published', true)
    .order('updated_at', { ascending: false })
    .limit(2000)

  if (error) {
    console.error('[past-deals] slugs failed:', error.message)
    return []
  }
  return data ?? []
}

/* -------------------------------------------------------------------------- */
/* Admin reads                                                                */
/* -------------------------------------------------------------------------- */

export type AdminPastDealListItem = Pick<
  PastDealRow,
  'id' | 'slug' | 'title' | 'brand' | 'sold_around' | 'is_published' | 'featured_rank' | 'updated_at'
> & {
  images: Pick<PastDealImageRow, 'id' | 'url' | 'alt_text' | 'is_primary'>[]
}

/** `'unset'` selects the entries with no brand - the ones still needing a fix. */
export type AdminPastDealBrandFilter = PastDealBrand | 'unset'

export const ADMIN_PAST_DEALS_PER_PAGE = 30

export type AdminPastDealListResult = {
  deals: AdminPastDealListItem[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

/**
 * Paginated for the same reason /sold is: at real volume, rendering every
 * entry's photo on one page is slow to load and heavy on the image
 * optimizer, and here it also made the quick-edit modal this list exists to
 * support hard to even open while everything was still loading.
 *
 * Counts first and clamps the page to what actually exists: PostgREST errors
 * with "Requested range not satisfiable" on a `.range()` past the last row
 * (easy to hit here since a brand filter can leave very few rows - a filter
 * bookmarked at page 2 that later has only one match, for instance), and that
 * error was previously swallowed into a misleading "total: 0".
 */
export async function listAdminPastDeals(
  session: AdminSession,
  brand?: AdminPastDealBrandFilter,
  page = 1,
): Promise<AdminPastDealListResult> {
  let countQuery = session.supabase.from('past_deals').select('id', { count: 'exact', head: true })
  if (brand === 'unset') countQuery = countQuery.is('brand', null)
  else if (brand) countQuery = countQuery.eq('brand', brand)

  const { count, error: countError } = await countQuery
  if (countError) {
    console.error('[admin-past-deals] count failed:', countError.message)
    return { deals: [], total: 0, page: 1, perPage: ADMIN_PAST_DEALS_PER_PAGE, totalPages: 0 }
  }

  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_PAST_DEALS_PER_PAGE))
  const safePage = Math.min(Math.max(1, page), totalPages)

  let query = session.supabase
    .from('past_deals')
    .select(
      'id, slug, title, brand, sold_around, is_published, featured_rank, updated_at, images:past_deal_images(id, url, alt_text, is_primary)',
    )
  if (brand === 'unset') query = query.is('brand', null)
  else if (brand) query = query.eq('brand', brand)

  const from = (safePage - 1) * ADMIN_PAST_DEALS_PER_PAGE
  const { data, error } = await query
    .order('updated_at', { ascending: false })
    .range(from, from + ADMIN_PAST_DEALS_PER_PAGE - 1)

  if (error) {
    console.error('[admin-past-deals] list failed:', error.message)
    return { deals: [], total, page: safePage, perPage: ADMIN_PAST_DEALS_PER_PAGE, totalPages }
  }

  return {
    deals: (data ?? []) as unknown as AdminPastDealListItem[],
    total,
    page: safePage,
    perPage: ADMIN_PAST_DEALS_PER_PAGE,
    totalPages,
  }
}

/**
 * Brand counts, most common first, plus how many still have no brand set -
 * powers the filter bar on the admin list. Unlike `getPastDealBrandFacets`,
 * this counts every entry regardless of published state, and the unset count
 * is deliberately not thrown away: it's how an admin finds the ones still
 * needing a fix.
 */
export async function getAdminPastDealBrandFacets(session: AdminSession): Promise<{
  brands: { brand: PastDealBrand; count: number }[]
  unsetCount: number
}> {
  const { data, error } = await session.supabase.from('past_deals').select('brand').limit(5000)

  if (error) {
    console.error('[admin-past-deals] brand facets failed:', error.message)
    return { brands: [], unsetCount: 0 }
  }

  const counts = new Map<PastDealBrand, number>()
  let unsetCount = 0
  for (const row of (data ?? []) as { brand: PastDealBrand | null }[]) {
    if (row.brand === null) {
      unsetCount += 1
      continue
    }
    counts.set(row.brand, (counts.get(row.brand) ?? 0) + 1)
  }

  return {
    brands: [...counts.entries()]
      .map(([brand, count]) => ({ brand, count }))
      .sort((a, b) => b.count - a.count),
    unsetCount,
  }
}

/** Who currently holds each homepage spot - lets the picker say what a spot would replace. */
export async function getAdminFeaturedPastDeals(
  session: AdminSession,
): Promise<{ id: string; title: string; featured_rank: number }[]> {
  const { data, error } = await session.supabase
    .from('past_deals')
    .select('id, title, featured_rank')
    .not('featured_rank', 'is', null)
    .order('featured_rank', { ascending: true })

  if (error) {
    console.error('[admin-past-deals] featured failed:', error.message)
    return []
  }
  return (data ?? []) as { id: string; title: string; featured_rank: number }[]
}

export type AdminPastDealDetail =PastDealRow & { images: PastDealImageRow[] }

export async function getAdminPastDeal(
  session: AdminSession,
  id: string,
): Promise<AdminPastDealDetail | null> {
  const { data, error } = await session.supabase
    .from('past_deals')
    .select('*, images:past_deal_images(*)')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('[admin-past-deals] detail failed:', error.message)
    return null
  }
  if (!data) return null

  const deal = data as unknown as AdminPastDealDetail
  return { ...deal, images: sortImages(deal.images) }
}
