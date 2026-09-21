'use client'

import * as React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { SlidersHorizontal, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'
import {
  BODY_TYPES,
  FUEL_TYPES,
  TRANSMISSIONS,
  VEHICLE_CONDITIONS,
  labelFor,
  type Option,
} from '@/lib/constants'
import type { InventoryFacets, VehicleFilters } from '@/lib/data/vehicles'
import { formatPesoCompact } from '@/lib/format'
import { buildInventoryQuery, countActiveFilters } from '@/lib/inventory-search-params'
import { cn } from '@/lib/utils'
import type { BodyType, FuelType, TransmissionType, VehicleCondition } from '@/types/database'

/**
 * Inventory filter panel.
 *
 * Holds a draft of the filters locally so typing a price range does not fire a
 * request per keystroke, then writes the whole set to the URL. Because the URL
 * is the state, a filtered view is shareable and the back button works.
 *
 * Desktop renders it as a sidebar; below `lg` the same component renders inside
 * a full-height drawer.
 */
export function InventoryFilters({
  facets,
  filters,
  resultCount,
}: {
  facets: InventoryFacets
  filters: VehicleFilters
  resultCount: number
}) {
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const activeCount = countActiveFilters(filters)

  return (
    <>
      {/* Mobile trigger */}
      <div className="flex items-center gap-2 lg:hidden">
        <Button
          type="button"
          variant="outline"
          size="md"
          fullWidth
          onClick={() => setDrawerOpen(true)}
          aria-expanded={drawerOpen}
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          Filters
          {activeCount > 0 ? (
            <span className="ml-1 inline-flex size-5 items-center justify-center rounded-full bg-accent-600 text-[11px] font-semibold text-white">
              {activeCount}
            </span>
          ) : null}
        </Button>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <FilterForm facets={facets} filters={filters} resultCount={resultCount} />
      </div>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 animate-fade-in bg-ink-950/60"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close filters"
            tabIndex={-1}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filter vehicles"
            className="absolute inset-y-0 right-0 flex w-[min(24rem,92vw)] animate-slide-in-right flex-col bg-white shadow-panel"
          >
            <div className="flex items-center justify-between border-b border-ink-200 px-4 py-3.5">
              <h2 className="text-base font-semibold text-ink-900">Filters</h2>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="-m-1.5 rounded-md p-1.5 text-ink-500 hover:bg-ink-100 hover:text-ink-900"
                aria-label="Close filters"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <FilterForm
                facets={facets}
                filters={filters}
                resultCount={resultCount}
                onApplied={() => setDrawerOpen(false)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

type Draft = {
  brands: string[]
  bodyTypes: BodyType[]
  fuelTypes: FuelType[]
  transmissions: TransmissionType[]
  conditions: VehicleCondition[]
  minPrice: string
  maxPrice: string
  maxMonthly: string
  minYear: string
  maxYear: string
  featuredOnly: boolean
  promoOnly: boolean
  includeSold: boolean
}

function toDraft(filters: VehicleFilters): Draft {
  return {
    brands: filters.brands ?? [],
    bodyTypes: filters.bodyTypes ?? [],
    fuelTypes: filters.fuelTypes ?? [],
    transmissions: filters.transmissions ?? [],
    conditions: filters.conditions ?? [],
    minPrice: filters.minPrice ? String(filters.minPrice) : '',
    maxPrice: filters.maxPrice ? String(filters.maxPrice) : '',
    maxMonthly: filters.maxMonthly ? String(filters.maxMonthly) : '',
    minYear: filters.minYear ? String(filters.minYear) : '',
    maxYear: filters.maxYear ? String(filters.maxYear) : '',
    featuredOnly: Boolean(filters.featuredOnly),
    promoOnly: Boolean(filters.promoOnly),
    includeSold: Boolean(filters.includeSold),
  }
}

function FilterForm({
  facets,
  filters,
  resultCount,
  onApplied,
}: {
  facets: InventoryFacets
  filters: VehicleFilters
  resultCount: number
  onApplied?: () => void
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = React.useTransition()
  const [draft, setDraft] = React.useState<Draft>(() => toDraft(filters))

  // Resync when the server sends back a different filter set (back button, a
  // chip removed from the results header, "clear all"). The serialised query is
  // used as the comparison key because `filters` is a fresh object every render.
  // Adjusting during render is React's documented pattern for resetting state
  // from props, and avoids the extra paint an effect would cause.
  const appliedQuery = buildInventoryQuery(filters)
  const [lastApplied, setLastApplied] = React.useState(appliedQuery)
  if (lastApplied !== appliedQuery) {
    setLastApplied(appliedQuery)
    setDraft(toDraft(filters))
  }

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }))

  const toggle = <K extends 'brands' | 'bodyTypes' | 'fuelTypes' | 'transmissions' | 'conditions'>(
    key: K,
    value: Draft[K][number],
  ) =>
    setDraft((current) => {
      const list = current[key] as string[]
      const next = list.includes(value)
        ? list.filter((item) => item !== value)
        : [...list, value]
      return { ...current, [key]: next }
    })

  function apply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const query = buildInventoryQuery({
      ...filters,
      brands: draft.brands,
      bodyTypes: draft.bodyTypes,
      fuelTypes: draft.fuelTypes,
      transmissions: draft.transmissions,
      conditions: draft.conditions,
      minPrice: draft.minPrice ? Number(draft.minPrice) : null,
      maxPrice: draft.maxPrice ? Number(draft.maxPrice) : null,
      maxMonthly: draft.maxMonthly ? Number(draft.maxMonthly) : null,
      minYear: draft.minYear ? Number(draft.minYear) : null,
      maxYear: draft.maxYear ? Number(draft.maxYear) : null,
      featuredOnly: draft.featuredOnly,
      promoOnly: draft.promoOnly,
      includeSold: draft.includeSold,
      // Any change to the filters invalidates the current page number.
      page: 1,
    })

    startTransition(() => {
      router.push(`${pathname}${query}`, { scroll: true })
      onApplied?.()
    })
  }

  function clearAll() {
    startTransition(() => {
      router.push(pathname, { scroll: true })
      onApplied?.()
    })
  }

  const availableOptions = <T extends string>(all: readonly Option<T>[], present: T[]) =>
    all.filter((option) => present.includes(option.value))

  return (
    <form onSubmit={apply} className="space-y-6">
      {facets.brands.length > 0 ? (
        <FilterGroup legend="Brand">
          <CheckboxList
            options={facets.brands.map((brand) => ({ value: brand, label: brand }))}
            selected={draft.brands}
            onToggle={(value) => toggle('brands', value)}
            name="brand"
          />
        </FilterGroup>
      ) : null}

      <FilterGroup legend="Price">
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            step={10000}
            placeholder={facets.priceRange ? String(facets.priceRange.min) : 'Min'}
            aria-label="Minimum price"
            value={draft.minPrice}
            onChange={(event) => update('minPrice', event.target.value)}
          />
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            step={10000}
            placeholder={facets.priceRange ? String(facets.priceRange.max) : 'Max'}
            aria-label="Maximum price"
            value={draft.maxPrice}
            onChange={(event) => update('maxPrice', event.target.value)}
          />
        </div>
        {facets.priceRange ? (
          <p className="mt-1.5 text-xs text-ink-500">
            Available from {formatPesoCompact(facets.priceRange.min)} to{' '}
            {formatPesoCompact(facets.priceRange.max)}
          </p>
        ) : null}
      </FilterGroup>

      <FilterGroup legend="Monthly budget">
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          step={1000}
          placeholder="Max monthly payment"
          aria-label="Maximum monthly payment"
          value={draft.maxMonthly}
          onChange={(event) => update('maxMonthly', event.target.value)}
        />
        <p className="mt-1.5 text-xs text-ink-500">
          Estimated using the standard down payment and loan term.
        </p>
      </FilterGroup>

      {facets.bodyTypes.length > 0 ? (
        <FilterGroup legend="Body type">
          <CheckboxList
            options={availableOptions(BODY_TYPES, facets.bodyTypes)}
            selected={draft.bodyTypes}
            onToggle={(value) => toggle('bodyTypes', value as BodyType)}
            name="body"
          />
        </FilterGroup>
      ) : null}

      {facets.fuelTypes.length > 0 ? (
        <FilterGroup legend="Fuel">
          <CheckboxList
            options={availableOptions(FUEL_TYPES, facets.fuelTypes)}
            selected={draft.fuelTypes}
            onToggle={(value) => toggle('fuelTypes', value as FuelType)}
            name="fuel"
          />
        </FilterGroup>
      ) : null}

      {facets.transmissions.length > 0 ? (
        <FilterGroup legend="Transmission">
          <CheckboxList
            options={availableOptions(TRANSMISSIONS, facets.transmissions)}
            selected={draft.transmissions}
            onToggle={(value) => toggle('transmissions', value as TransmissionType)}
            name="transmission"
          />
        </FilterGroup>
      ) : null}

      {facets.conditions.length > 1 ? (
        <FilterGroup legend="Condition">
          <CheckboxList
            options={availableOptions(VEHICLE_CONDITIONS, facets.conditions)}
            selected={draft.conditions}
            onToggle={(value) => toggle('conditions', value as VehicleCondition)}
            name="condition"
          />
        </FilterGroup>
      ) : null}

      {facets.yearRange && facets.yearRange.min !== facets.yearRange.max ? (
        <FilterGroup legend="Year">
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              inputMode="numeric"
              min={facets.yearRange.min}
              max={facets.yearRange.max}
              placeholder={String(facets.yearRange.min)}
              aria-label="Earliest year"
              value={draft.minYear}
              onChange={(event) => update('minYear', event.target.value)}
            />
            <Input
              type="number"
              inputMode="numeric"
              min={facets.yearRange.min}
              max={facets.yearRange.max}
              placeholder={String(facets.yearRange.max)}
              aria-label="Latest year"
              value={draft.maxYear}
              onChange={(event) => update('maxYear', event.target.value)}
            />
          </div>
        </FilterGroup>
      ) : null}

      <FilterGroup legend="Show">
        <div className="space-y-2.5">
          <SwitchRow
            label="Featured only"
            checked={draft.featuredOnly}
            onChange={(checked) => update('featuredOnly', checked)}
          />
          <SwitchRow
            label="Promo units only"
            checked={draft.promoOnly}
            onChange={(checked) => update('promoOnly', checked)}
          />
          <SwitchRow
            label="Include sold units"
            checked={draft.includeSold}
            onChange={(checked) => update('includeSold', checked)}
          />
        </div>
      </FilterGroup>

      <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-ink-200 bg-white px-4 py-3 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
        <Button type="submit" fullWidth isLoading={isPending} loadingText="Applying…">
          Show {resultCount > 0 ? resultCount : ''} results
        </Button>
        <Button type="button" variant="outline" onClick={clearAll} disabled={isPending}>
          Clear
        </Button>
      </div>
    </form>
  )
}

function FilterGroup({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2.5 text-sm font-semibold text-ink-900">{legend}</legend>
      {children}
    </fieldset>
  )
}

function CheckboxList<T extends string>({
  options,
  selected,
  onToggle,
  name,
}: {
  options: Option<T>[]
  selected: string[]
  onToggle: (value: T) => void
  name: string
}) {
  return (
    <div className={cn('space-y-2', options.length > 8 && 'max-h-56 overflow-y-auto pr-1')}>
      {options.map((option) => {
        const id = `${name}-${option.value}`
        const checked = selected.includes(option.value)
        return (
          <div key={option.value} className="flex items-center gap-2.5">
            <input
              id={id}
              type="checkbox"
              checked={checked}
              onChange={() => onToggle(option.value)}
              className="size-4 shrink-0 rounded-sm border-ink-300 accent-accent-600"
            />
            <label htmlFor={id} className="cursor-pointer text-sm text-ink-700 select-none">
              {option.label}
            </label>
          </div>
        )
      })}
    </div>
  )
}

function SwitchRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  const id = React.useId()
  return (
    <div className="flex items-center gap-2.5">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 shrink-0 rounded-sm border-ink-300 accent-accent-600"
      />
      <label htmlFor={id} className="cursor-pointer text-sm text-ink-700 select-none">
        {label}
      </label>
    </div>
  )
}

/**
 * Removable chips above the results, so what is currently filtering the list is
 * visible without opening the panel.
 */
export function ActiveFilterChips({ filters }: { filters: VehicleFilters }) {
  const router = useRouter()
  const pathname = usePathname()

  const chips: { key: string; label: string; next: VehicleFilters }[] = []

  const removeFrom = <K extends keyof VehicleFilters>(key: K, value: string): VehicleFilters => ({
    ...filters,
    [key]: (filters[key] as string[]).filter((item) => item !== value),
    page: 1,
  })

  if (filters.q) {
    chips.push({ key: `q`, label: `“${filters.q}”`, next: { ...filters, q: undefined, page: 1 } })
  }
  for (const brand of filters.brands ?? []) {
    chips.push({ key: `brand-${brand}`, label: brand, next: removeFrom('brands', brand) })
  }
  for (const value of filters.bodyTypes ?? []) {
    chips.push({
      key: `body-${value}`,
      label: labelFor('bodyType', value),
      next: removeFrom('bodyTypes', value),
    })
  }
  for (const value of filters.fuelTypes ?? []) {
    chips.push({
      key: `fuel-${value}`,
      label: labelFor('fuelType', value),
      next: removeFrom('fuelTypes', value),
    })
  }
  for (const value of filters.transmissions ?? []) {
    chips.push({
      key: `transmission-${value}`,
      label: labelFor('transmission', value),
      next: removeFrom('transmissions', value),
    })
  }
  for (const value of filters.conditions ?? []) {
    chips.push({
      key: `condition-${value}`,
      label: labelFor('condition', value),
      next: removeFrom('conditions', value),
    })
  }
  if (filters.minPrice) {
    chips.push({
      key: 'min-price',
      label: `From ${formatPesoCompact(filters.minPrice)}`,
      next: { ...filters, minPrice: null, page: 1 },
    })
  }
  if (filters.maxPrice) {
    chips.push({
      key: 'max-price',
      label: `Up to ${formatPesoCompact(filters.maxPrice)}`,
      next: { ...filters, maxPrice: null, page: 1 },
    })
  }
  if (filters.maxMonthly) {
    chips.push({
      key: 'max-monthly',
      label: `Under ${formatPesoCompact(filters.maxMonthly)}/mo`,
      next: { ...filters, maxMonthly: null, page: 1 },
    })
  }
  if (filters.featuredOnly) {
    chips.push({
      key: 'featured',
      label: 'Featured',
      next: { ...filters, featuredOnly: false, page: 1 },
    })
  }
  if (filters.promoOnly) {
    chips.push({ key: 'promo', label: 'Promo', next: { ...filters, promoOnly: false, page: 1 } })
  }
  if (filters.includeSold) {
    chips.push({
      key: 'sold',
      label: 'Including sold',
      next: { ...filters, includeSold: false, page: 1 },
    })
  }

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => router.push(`${pathname}${buildInventoryQuery(chip.next)}`)}
          className="inline-flex items-center gap-1.5 rounded-full border border-ink-300 bg-white py-1.5 pr-2 pl-3 text-xs font-medium text-ink-700 transition-colors hover:border-ink-400 hover:bg-ink-50"
        >
          {chip.label}
          <X className="size-3.5 text-ink-400" aria-hidden="true" />
          <span className="sr-only">Remove filter</span>
        </button>
      ))}

      <button
        type="button"
        onClick={() => router.push(pathname)}
        className="text-xs font-semibold text-accent-600 underline underline-offset-2 hover:text-accent-700"
      >
        Clear all
      </button>
    </div>
  )
}
