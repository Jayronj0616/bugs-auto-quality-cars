import type { Metadata } from 'next'
import Link from 'next/link'
import { Archive } from 'lucide-react'

import { Pagination } from '@/components/ui/pagination'
import { Reveal } from '@/components/ui/reveal'
import { EmptyState } from '@/components/ui/surfaces'
import { PastDealCard } from '@/components/vehicles/past-deal-card'
import { labelFor } from '@/lib/constants'
import { getPastDealBrandFacets, getPublishedPastDeals } from '@/lib/data/past-deals'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { PastDealBrand } from '@/types/database'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Sold vehicles',
  description:
    'Vehicles already sold by BUGS Auto Quality Cars - a look at units that have already found a home.',
  alternates: { canonical: '/sold' },
}

export default async function SoldPage({ searchParams }: PageProps<'/sold'>) {
  const params = await searchParams
  const pageParam = Number(Array.isArray(params.page) ? params.page[0] : params.page)
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1

  const brandParam = Array.isArray(params.brand) ? params.brand[0] : params.brand
  const brandFacets = await getPastDealBrandFacets()
  const brand = brandFacets.some((facet) => facet.brand === brandParam)
    ? (brandParam as PastDealBrand)
    : undefined

  const result = await getPublishedPastDeals(page, brand)

  const buildHref = (overrides: { page?: number; brand?: PastDealBrand | null }) => {
    const nextBrand = overrides.brand === undefined ? brand : overrides.brand
    const nextPage = overrides.page ?? 1
    const query = new URLSearchParams()
    if (nextBrand) query.set('brand', nextBrand)
    if (nextPage > 1) query.set('page', String(nextPage))
    const q = query.toString()
    return q ? `/sold?${q}` : '/sold'
  }

  return (
    <>
      <header className="border-b border-brand-100 bg-brand-50">
        <div className="container-page py-10 sm:py-12">
          <p className="eyebrow text-accent-700">Track record</p>
          <h1 className="mt-2 text-3xl font-bold text-ink-900 sm:text-4xl">Sold vehicles</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-600 sm:text-base">
            {result.total > 0
              ? `${formatNumber(result.total)} ${result.total === 1 ? 'vehicle' : 'vehicles'} already sold. These aren't for sale - they're here to show the kind of cars that come through.`
              : 'Vehicles already sold will appear here.'}
          </p>
        </div>
      </header>

      <div className="container-page py-8 sm:py-10">
        {brandFacets.length > 0 ? (
          <nav
            aria-label="Filter by brand"
            className="-mx-1 mb-6 overflow-x-auto px-1 pb-1"
          >
            <ul className="flex gap-1">
              <li>
                <Link
                  href={buildHref({ brand: null, page: 1 })}
                  aria-current={!brand ? 'page' : undefined}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                    !brand
                      ? 'bg-brand-800 text-white'
                      : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
                  )}
                >
                  All
                </Link>
              </li>
              {brandFacets.map((facet) => {
                const active = facet.brand === brand
                return (
                  <li key={facet.brand}>
                    <Link
                      href={buildHref({ brand: facet.brand, page: 1 })}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                        active
                          ? 'bg-brand-800 text-white'
                          : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
                      )}
                    >
                      {labelFor('pastDealBrand', facet.brand)}
                      <span className={cn('text-xs', active ? 'text-white/60' : 'text-ink-400')}>
                        {formatNumber(facet.count)}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
        ) : null}

        {result.deals.length === 0 ? (
          <EmptyState
            icon={<Archive className="size-6" aria-hidden="true" />}
            title={result.total === 0 ? 'Nothing published yet' : 'Nothing on this page'}
            description={
              result.total === 0
                ? "Check back soon, or browse what's currently available."
                : 'Go back to the first page.'
            }
          />
        ) : (
          <>
            <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {result.deals.map((deal, index) => (
                <Reveal as="li" key={deal.id} delay={Math.min(index, 6) * 50}>
                  <PastDealCard deal={deal} priority={index < 3} />
                </Reveal>
              ))}
            </ul>

            <Pagination
              className="mt-10"
              page={result.page}
              totalPages={result.totalPages}
              buildHref={(p) => buildHref({ page: p })}
            />
          </>
        )}
      </div>
    </>
  )
}
