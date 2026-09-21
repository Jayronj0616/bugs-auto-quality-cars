'use client'

import * as React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'

import { SORT_OPTIONS, type SortOption } from '@/lib/constants'
import type { VehicleFilters } from '@/lib/data/vehicles'
import { buildInventoryQuery } from '@/lib/inventory-search-params'

/** Keyword search box. Submits on enter; the URL stays the source of truth. */
export function InventorySearch({ filters }: { filters: VehicleFilters }) {
  const router = useRouter()
  const pathname = usePathname()
  const [value, setValue] = React.useState(filters.q ?? '')
  const [isPending, startTransition] = React.useTransition()

  // Resync the box when the server sends back a different query - a chip was
  // removed, "clear all" was pressed, or the visitor used the back button.
  // Adjusting during render is React's documented pattern for this, and avoids
  // the extra paint an effect would cause.
  const [lastQuery, setLastQuery] = React.useState(filters.q)
  if (lastQuery !== filters.q) {
    setLastQuery(filters.q)
    setValue(filters.q ?? '')
  }

  const submit = (nextValue: string) => {
    const query = buildInventoryQuery({ ...filters, q: nextValue.trim() || undefined, page: 1 })
    startTransition(() => router.push(`${pathname}${query}`))
  }

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
        submit(value)
      }}
      className="relative flex-1"
    >
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search by brand, model or keyword"
        aria-label="Search inventory"
        className="h-11 w-full rounded-md border border-ink-300 bg-white pr-9 pl-9 text-sm transition-colors placeholder:text-ink-400 hover:border-ink-400 focus:border-accent-500"
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            setValue('')
            submit('')
          }}
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
          aria-label="Clear search"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : null}
      <span aria-live="polite" className="sr-only">
        {isPending ? 'Searching' : ''}
      </span>
    </form>
  )
}

export function SortSelect({ filters }: { filters: VehicleFilters }) {
  const router = useRouter()
  const pathname = usePathname()
  const id = React.useId()

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="shrink-0 text-sm text-ink-600">
        Sort
      </label>
      <select
        id={id}
        value={filters.sort}
        onChange={(event) => {
          const query = buildInventoryQuery({
            ...filters,
            sort: event.target.value as SortOption,
            page: 1,
          })
          router.push(`${pathname}${query}`)
        }}
        className="h-11 rounded-md border border-ink-300 bg-white px-3 text-sm transition-colors hover:border-ink-400 focus:border-accent-500"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
