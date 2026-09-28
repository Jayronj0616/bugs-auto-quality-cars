import 'server-only'

import { cache } from 'react'

import type { AdminSession } from '@/lib/auth'
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
 */
export const getPublishedPastDeals = cache(
  async (page = 1, brand?: PastDealBrand): Promise<PastDealListResult> => {
    const safePage = Math.max(1, page)
    const supabase = createPublicSupabaseClient()
    const empty: PastDealListResult = {
      deals: [],
      total: 0,
      page: safePage,
      perPage: PAST_DEALS_PER_PAGE,
      totalPages: 0,
    }
    if (!supabase) return empty

    const from = (safePage - 1) * PAST_DEALS_PER_PAGE
    let query = supabase
      .from('past_deals')
      .select(SUMMARY_SELECT, { count: 'exact' })
      .eq('is_published', true)

    if (brand) query = query.eq('brand', brand)

    const { data, error, count } = await query
      .order('sold_around', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range(from, from + PAST_DEALS_PER_PAGE - 1)

    if (error) {
      console.error('[past-deals] list failed:', error.message)
      return empty
    }

    const rows = (data ?? []) as unknown as PastDealSummary[]
    const total = count ?? 0

    return {
      deals: rows.map((row) => ({ ...row, images: sortImages(row.images) })),
      total,
      page: safePage,
      perPage: PAST_DEALS_PER_PAGE,
      totalPages: Math.max(1, Math.ceil(total / PAST_DEALS_PER_PAGE)),
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
  'id' | 'slug' | 'title' | 'brand' | 'sold_around' | 'is_published' | 'updated_at'
> & {
  images: Pick<PastDealImageRow, 'url' | 'alt_text' | 'is_primary'>[]
}

export async function listAdminPastDeals(session: AdminSession): Promise<AdminPastDealListItem[]> {
  const { data, error } = await session.supabase
    .from('past_deals')
    .select(
      'id, slug, title, brand, sold_around, is_published, updated_at, images:past_deal_images(url, alt_text, is_primary)',
    )
    .order('updated_at', { ascending: false })
    .limit(500)

  if (error) {
    console.error('[admin-past-deals] list failed:', error.message)
    return []
  }

  return (data ?? []) as unknown as AdminPastDealListItem[]
}

export type AdminPastDealDetail = PastDealRow & { images: PastDealImageRow[] }

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
