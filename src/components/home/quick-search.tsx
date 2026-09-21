'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/field'
import { BODY_TYPES } from '@/lib/constants'
import { PARAM } from '@/lib/inventory-search-params'
import { formatPesoCompact } from '@/lib/format'
import type { BodyType } from '@/types/database'

const PRICE_BUCKETS = [500_000, 800_000, 1_200_000, 1_800_000, 2_500_000, 4_000_000]

/**
 * Homepage search bar.
 *
 * Builds an inventory URL and navigates - it does not query anything itself, so
 * the result is a normal, shareable, server-rendered /cars page.
 */
export function QuickSearch({ brands, bodyTypes }: { brands: string[]; bodyTypes: BodyType[] }) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)

  const availableBodyTypes = BODY_TYPES.filter((option) => bodyTypes.includes(option.value))

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const params = new URLSearchParams()

    const keyword = String(form.get('keyword') ?? '').trim()
    const brand = String(form.get('brand') ?? '')
    const body = String(form.get('body') ?? '')
    const maxPrice = String(form.get('max_price') ?? '')

    if (keyword) params.set(PARAM.query, keyword)
    if (brand) params.set(PARAM.brand, brand)
    if (body) params.set(PARAM.bodyType, body)
    if (maxPrice) params.set(PARAM.maxPrice, maxPrice)

    setPending(true)
    const search = params.toString()
    router.push(search ? `/cars?${search}` : '/cars')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-card border border-ink-200 bg-white p-3 shadow-card sm:p-4"
      role="search"
      aria-label="Search inventory"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400"
            aria-hidden="true"
          />
          <input
            type="search"
            name="keyword"
            placeholder="Search brand, model or keyword"
            aria-label="Search brand, model or keyword"
            className="h-11 w-full rounded-md border border-ink-300 bg-white pr-3 pl-9 text-sm transition-colors placeholder:text-ink-400 hover:border-ink-400 focus:border-accent-500"
          />
        </div>

        <Select name="brand" aria-label="Brand" defaultValue="">
          <option value="">Any brand</option>
          {brands.map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </Select>

        <Select name="body" aria-label="Body type" defaultValue="">
          <option value="">Any body type</option>
          {availableBodyTypes.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <Select name="max_price" aria-label="Maximum price" defaultValue="">
          <option value="">Any price</option>
          {PRICE_BUCKETS.map((price) => (
            <option key={price} value={price}>
              Under {formatPesoCompact(price)}
            </option>
          ))}
        </Select>

        <Button type="submit" size="md" isLoading={pending} loadingText="Searching…">
          Search
        </Button>
      </div>
    </form>
  )
}
