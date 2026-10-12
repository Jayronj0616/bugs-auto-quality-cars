import 'server-only'

import { getRecentlySoldPastDeals, type PastDealSummary } from '@/lib/data/past-deals'
import { vehicleTitle } from '@/lib/data/vehicles'
import { formatDate } from '@/lib/format'
import { createPublicSupabaseClient } from '@/lib/supabase/server'
import type { VehicleImageRow, VehicleRow } from '@/types/database'

/**
 * One recently sold unit for the homepage, whichever table it came from.
 *
 * Two sources because a sale is recorded in two places: units sold out of the
 * live inventory (status "sold") and the Sold Archive of older sales.
 */
export type RecentSale = {
  key: string
  href: string
  title: string
  imageUrl: string | null
  imageAlt: string | null
  note: string | null
  /** Sort key, ms since epoch. */
  at: number
}

export function pastDealToSale(deal: PastDealSummary): RecentSale {
  const cover = deal.images[0]
  return {
    key: `deal-${deal.id}`,
    href: `/sold/${deal.slug}`,
    title: deal.title,
    imageUrl: cover?.url ?? null,
    imageAlt: cover?.alt_text ?? null,
    note: deal.sold_around ? `Sold around ${formatDate(deal.sold_around)}` : null,
    at: deal.sold_around ? Date.parse(deal.sold_around) : 0,
  }
}

type SoldVehicle = Pick<
  VehicleRow,
  'id' | 'slug' | 'year' | 'brand' | 'model' | 'variant' | 'sold_at'
> & {
  images: Pick<VehicleImageRow, 'url' | 'alt_text' | 'is_primary' | 'sort_order'>[]
}

async function getRecentlySoldVehicles(limit: number): Promise<RecentSale[]> {
  const supabase = createPublicSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('vehicles')
    .select(
      'id, slug, year, brand, model, variant, sold_at, images:vehicle_images(url, alt_text, is_primary, sort_order)',
    )
    .eq('status', 'sold')
    .not('sold_at', 'is', null)
    .order('sold_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[recent-sales] vehicles failed:', error.message)
    return []
  }

  return ((data ?? []) as unknown as SoldVehicle[]).map((vehicle) => {
    const cover = [...vehicle.images].sort((a, b) =>
      a.is_primary !== b.is_primary ? (a.is_primary ? -1 : 1) : a.sort_order - b.sort_order,
    )[0]
    return {
      key: `vehicle-${vehicle.id}`,
      href: `/cars/${vehicle.slug}`,
      title: vehicleTitle(vehicle),
      imageUrl: cover?.url ?? null,
      imageAlt: cover?.alt_text ?? null,
      note: `Sold ${formatDate(vehicle.sold_at!)}`,
      at: Date.parse(vehicle.sold_at!),
    }
  })
}

/** The latest sales across inventory and archive, newest first. */
export async function getRecentSales(limit = 3): Promise<RecentSale[]> {
  const [vehicles, deals] = await Promise.all([
    getRecentlySoldVehicles(limit),
    getRecentlySoldPastDeals(limit),
  ])
  return [...vehicles, ...deals.map(pastDealToSale)].sort((a, b) => b.at - a.at).slice(0, limit)
}
