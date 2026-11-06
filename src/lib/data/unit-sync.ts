import 'server-only'

import { resolvePricing } from '@/lib/pricing'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { VehicleRow } from '@/types/database'
import { vehicleTitle } from './vehicles'

/**
 * What the leads app reads and writes on the website's inventory. The leads app
 * is where prices are edited, and its problems list compares against this.
 */

export type SyncUnit = {
  slug: string
  title: string
  price: number
  status: VehicleRow['status']
}

export class UnitNotFoundError extends Error {}

function serviceClient() {
  const supabase = createServiceRoleClient()
  if (!supabase) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  return supabase
}

export async function listSyncUnits(): Promise<SyncUnit[]> {
  const { data, error } = await serviceClient()
    .from('vehicles')
    .select('*')
    .neq('status', 'archived')
    .order('slug')
  if (error) throw error
  return (data as VehicleRow[]).map((row) => ({
    slug: row.slug,
    title: vehicleTitle(row),
    price: resolvePricing(row).price,
    status: row.status,
  }))
}

/** Marks a unit for sale, reserved or sold. The database's own trigger records when it sold. */
export async function setUnitStatus(
  slug: string,
  status: 'published' | 'reserved' | 'sold',
): Promise<{ status: string; previousStatus: VehicleRow['status'] }> {
  const supabase = serviceClient()
  const { data: current, error: readError } = await supabase.from('vehicles').select('status').eq('slug', slug).maybeSingle()
  if (readError) throw readError
  if (!current) throw new UnitNotFoundError(slug)

  const { error } = await supabase.from('vehicles').update({ status }).eq('slug', slug)
  if (error) throw error
  return { status, previousStatus: (current as Pick<VehicleRow, 'status'>).status }
}

/**
 * Sets the price customers see. A promo price would win over the new selling
 * price, so it is cleared: a price sent from the leads app is the whole answer.
 */
export async function setUnitPrice(slug: string, price: number): Promise<{ price: number; previousPrice: number }> {
  const supabase = serviceClient()
  const { data: current, error: readError } = await supabase.from('vehicles').select('*').eq('slug', slug).maybeSingle()
  if (readError) throw readError
  if (!current) throw new UnitNotFoundError(slug)

  const { error } = await supabase
    .from('vehicles')
    .update({ selling_price: price, promo_price: null, promo_label: null, promo_starts_at: null, promo_ends_at: null })
    .eq('slug', slug)
  if (error) throw error
  return { price, previousPrice: resolvePricing(current as VehicleRow).price }
}
