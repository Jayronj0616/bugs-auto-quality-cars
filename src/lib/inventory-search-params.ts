/**
 * Translation between the inventory URL and the filter object.
 *
 * Filters live in the query string so a filtered view is shareable, linkable
 * and survives a refresh or a back button. This module is the only place that
 * knows the parameter names, and it is shared by the server page and the client
 * filter panel so the two can never disagree.
 */

import {
  BODY_TYPES,
  DEFAULT_SORT,
  FUEL_TYPES,
  SORT_OPTIONS,
  TRANSMISSIONS,
  VEHICLE_CONDITIONS,
  type SortOption,
} from '@/lib/constants'
import type { VehicleFilters } from '@/lib/data/vehicles'
import { toNumber } from '@/lib/utils'
import type { BodyType, FuelType, TransmissionType, VehicleCondition } from '@/types/database'

export const PARAM = {
  query: 'q',
  brand: 'brand',
  bodyType: 'body',
  fuelType: 'fuel',
  transmission: 'transmission',
  condition: 'condition',
  minPrice: 'min_price',
  maxPrice: 'max_price',
  minYear: 'min_year',
  maxYear: 'max_year',
  maxMonthly: 'max_monthly',
  featured: 'featured',
  promo: 'promo',
  includeSold: 'sold',
  sort: 'sort',
  page: 'page',
} as const

export type RawSearchParams = Record<string, string | string[] | undefined>

/** A parameter may repeat (`?brand=a&brand=b`); only the first value is used. */
function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function toList(value: string | string[] | undefined): string[] {
  if (value === undefined) return []
  const parts = Array.isArray(value) ? value : value.split(',')
  return parts.map((part) => part.trim()).filter(Boolean)
}

function keepKnown<T extends string>(values: string[], allowed: readonly { value: T }[]): T[] {
  const permitted = new Set(allowed.map((option) => option.value as string))
  return values.filter((value): value is T => permitted.has(value))
}

const isTruthy = (value: string | string[] | undefined) => {
  const raw = firstValue(value)
  return raw === '1' || raw === 'true' || raw === 'on'
}

/**
 * Parses untrusted query parameters into filters.
 *
 * Unknown values are dropped rather than passed to the database: a hand-edited
 * `?body=<script>` becomes no filter at all instead of a query error.
 */
export function parseInventorySearchParams(params: RawSearchParams): VehicleFilters {
  const sortRaw = firstValue(params[PARAM.sort])
  const sort = SORT_OPTIONS.some((option) => option.value === sortRaw)
    ? (sortRaw as SortOption)
    : DEFAULT_SORT

  const pageRaw = toNumber(firstValue(params[PARAM.page]))
  const queryRaw = firstValue(params[PARAM.query])

  return {
    q: queryRaw?.trim().slice(0, 100) || undefined,
    brands: toList(params[PARAM.brand]).slice(0, 20),
    bodyTypes: keepKnown<BodyType>(toList(params[PARAM.bodyType]), BODY_TYPES),
    fuelTypes: keepKnown<FuelType>(toList(params[PARAM.fuelType]), FUEL_TYPES),
    transmissions: keepKnown<TransmissionType>(toList(params[PARAM.transmission]), TRANSMISSIONS),
    conditions: keepKnown<VehicleCondition>(toList(params[PARAM.condition]), VEHICLE_CONDITIONS),
    minPrice: positiveOrNull(params[PARAM.minPrice]),
    maxPrice: positiveOrNull(params[PARAM.maxPrice]),
    minYear: positiveOrNull(params[PARAM.minYear]),
    maxYear: positiveOrNull(params[PARAM.maxYear]),
    maxMonthly: positiveOrNull(params[PARAM.maxMonthly]),
    featuredOnly: isTruthy(params[PARAM.featured]),
    promoOnly: isTruthy(params[PARAM.promo]),
    includeSold: isTruthy(params[PARAM.includeSold]),
    sort,
    page: pageRaw && pageRaw > 0 ? Math.min(Math.trunc(pageRaw), 500) : 1,
  }
}

function positiveOrNull(value: string | string[] | undefined): number | null {
  const parsed = toNumber(firstValue(value))
  return parsed !== null && parsed >= 0 ? parsed : null
}

/** Serialises filters back into a query string, omitting anything at default. */
export function buildInventoryQuery(filters: VehicleFilters): string {
  const search = new URLSearchParams()

  if (filters.q) search.set(PARAM.query, filters.q)
  if (filters.brands?.length) search.set(PARAM.brand, filters.brands.join(','))
  if (filters.bodyTypes?.length) search.set(PARAM.bodyType, filters.bodyTypes.join(','))
  if (filters.fuelTypes?.length) search.set(PARAM.fuelType, filters.fuelTypes.join(','))
  if (filters.transmissions?.length) search.set(PARAM.transmission, filters.transmissions.join(','))
  if (filters.conditions?.length) search.set(PARAM.condition, filters.conditions.join(','))
  if (filters.minPrice) search.set(PARAM.minPrice, String(filters.minPrice))
  if (filters.maxPrice) search.set(PARAM.maxPrice, String(filters.maxPrice))
  if (filters.minYear) search.set(PARAM.minYear, String(filters.minYear))
  if (filters.maxYear) search.set(PARAM.maxYear, String(filters.maxYear))
  if (filters.maxMonthly) search.set(PARAM.maxMonthly, String(filters.maxMonthly))
  if (filters.featuredOnly) search.set(PARAM.featured, '1')
  if (filters.promoOnly) search.set(PARAM.promo, '1')
  if (filters.includeSold) search.set(PARAM.includeSold, '1')
  if (filters.sort && filters.sort !== DEFAULT_SORT) search.set(PARAM.sort, filters.sort)
  if (filters.page && filters.page > 1) search.set(PARAM.page, String(filters.page))

  const serialised = search.toString()
  return serialised ? `?${serialised}` : ''
}

/** How many filters are applied - drives the "Filters (3)" badge on mobile. */
export function countActiveFilters(filters: VehicleFilters): number {
  return (
    (filters.q ? 1 : 0) +
    (filters.brands?.length ?? 0) +
    (filters.bodyTypes?.length ?? 0) +
    (filters.fuelTypes?.length ?? 0) +
    (filters.transmissions?.length ?? 0) +
    (filters.conditions?.length ?? 0) +
    (filters.minPrice ? 1 : 0) +
    (filters.maxPrice ? 1 : 0) +
    (filters.minYear ? 1 : 0) +
    (filters.maxYear ? 1 : 0) +
    (filters.maxMonthly ? 1 : 0) +
    (filters.featuredOnly ? 1 : 0) +
    (filters.promoOnly ? 1 : 0) +
    (filters.includeSold ? 1 : 0)
  )
}
