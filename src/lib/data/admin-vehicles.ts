import 'server-only'

import type { AdminSession } from '@/lib/auth'
import type {
  VehicleImageRow,
  VehicleRow,
  VehicleSpecificationRow,
  VehicleStatus,
  VehicleVideoRow,
} from '@/types/database'

/**
 * Admin-side reads.
 *
 * Separate from `src/lib/data/vehicles.ts` because the audiences differ: the
 * public layer only ever sees published inventory and decorates rows for
 * display, while this one sees drafts and archives and returns raw rows for
 * editing.
 */

export type AdminVehicleListItem = Pick<
  VehicleRow,
  | 'id'
  | 'slug'
  | 'brand'
  | 'model'
  | 'variant'
  | 'year'
  | 'status'
  | 'condition'
  | 'selling_price'
  | 'promo_price'
  | 'is_featured'
  | 'featured_rank'
  | 'is_promoted'
  | 'updated_at'
> & {
  images: Pick<VehicleImageRow, 'url' | 'alt_text' | 'is_primary' | 'sort_order'>[]
}

export type AdminVehicleFilters = {
  q?: string
  status?: VehicleStatus | 'all'
  featuredOnly?: boolean
  page?: number
}

export type AdminVehicleList = {
  vehicles: AdminVehicleListItem[]
  total: number
  page: number
  totalPages: number
  perPage: number
  counts: Record<VehicleStatus | 'all', number>
}

const PER_PAGE = 20

export async function listAdminVehicles(
  session: AdminSession,
  filters: AdminVehicleFilters,
): Promise<AdminVehicleList> {
  const page = Math.max(1, filters.page ?? 1)
  const status = filters.status ?? 'all'

  let query = session.supabase
    .from('vehicles')
    .select(
      'id, slug, brand, model, variant, year, status, condition, selling_price, promo_price, is_featured, featured_rank, is_promoted, updated_at, images:vehicle_images(url, alt_text, is_primary, sort_order)',
      { count: 'exact' },
    )

  if (status !== 'all') query = query.eq('status', status)
  if (filters.featuredOnly) query = query.eq('is_featured', true)

  const term = filters.q?.trim()
  if (term) query = query.ilike('search_text', `%${term.toLowerCase()}%`)

  const from = (page - 1) * PER_PAGE
  const { data, error, count } = await query
    .order('updated_at', { ascending: false })
    .range(from, from + PER_PAGE - 1)

  if (error) {
    console.error('[admin-vehicles] list failed:', error.message)
  }

  const vehicles = ((data ?? []) as unknown as AdminVehicleListItem[]).map((vehicle) => ({
    ...vehicle,
    images: [...(vehicle.images ?? [])].sort((a, b) => {
      if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1
      return a.sort_order - b.sort_order
    }),
  }))

  const total = count ?? 0

  return {
    vehicles,
    total,
    page,
    perPage: PER_PAGE,
    totalPages: Math.max(1, Math.ceil(total / PER_PAGE)),
    counts: await countByStatus(session),
  }
}

/** Powers the status tabs, so each one can show how much is behind it. */
async function countByStatus(session: AdminSession): Promise<Record<VehicleStatus | 'all', number>> {
  const { data, error } = await session.supabase.from('vehicles').select('status')

  const counts: Record<VehicleStatus | 'all', number> = {
    all: 0,
    draft: 0,
    published: 0,
    reserved: 0,
    sold: 0,
    archived: 0,
  }

  if (error || !data) return counts

  for (const row of data) {
    counts.all += 1
    counts[row.status] += 1
  }
  return counts
}

export type AdminVehicleDetail = VehicleRow & {
  images: VehicleImageRow[]
  videos: VehicleVideoRow[]
  specifications: VehicleSpecificationRow[]
}

export async function getAdminVehicle(
  session: AdminSession,
  vehicleId: string,
): Promise<AdminVehicleDetail | null> {
  const { data, error } = await session.supabase
    .from('vehicles')
    .select(
      '*, images:vehicle_images(*), videos:vehicle_videos(*), specifications:vehicle_specifications(*)',
    )
    .eq('id', vehicleId)
    .maybeSingle()

  if (error) {
    console.error('[admin-vehicles] detail failed:', error.message)
    return null
  }
  if (!data) return null

  const vehicle = data as unknown as AdminVehicleDetail

  return {
    ...vehicle,
    images: [...(vehicle.images ?? [])].sort((a, b) => {
      if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1
      return a.sort_order - b.sort_order
    }),
    videos: [...(vehicle.videos ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    specifications: [...(vehicle.specifications ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
    ),
  }
}

/** Vehicle picker for vehicle-specific financing rates. */
export async function listVehicleOptionsForAdmin(
  session: AdminSession,
): Promise<{ id: string; label: string }[]> {
  const { data } = await session.supabase
    .from('vehicles')
    .select('id, brand, model, variant, year')
    .not('status', 'eq', 'archived')
    .order('brand', { ascending: true })
    .order('model', { ascending: true })
    .limit(500)

  return (data ?? []).map((row) => ({
    id: row.id,
    label: [row.year, row.brand, row.model, row.variant].filter(Boolean).join(' '),
  }))
}
