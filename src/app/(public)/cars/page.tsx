import type { Metadata } from 'next'
import { CarFront, SearchX } from 'lucide-react'

import { Pagination } from '@/components/ui/pagination'
import { Reveal } from '@/components/ui/reveal'
import { Alert, ButtonLink, EmptyState } from '@/components/ui/surfaces'
import { ActiveFilterChips, InventoryFilters } from '@/components/vehicles/inventory-filters'
import { InventorySearch, SortSelect } from '@/components/vehicles/inventory-toolbar'
import { VehicleCard } from '@/components/vehicles/vehicle-card'
import { defaultsFromSettings } from '@/lib/data/financing'
import { getDealershipSettings } from '@/lib/data/settings'
import { getInventoryFacets, listVehicles } from '@/lib/data/vehicles'
import { formatNumber } from '@/lib/format'
import { buildInventoryQuery, parseInventorySearchParams } from '@/lib/inventory-search-params'

export const metadata: Metadata = {
  title: 'Browse cars',
  description:
    'Search and filter available vehicles at BUGS Auto Quality Cars by brand, body type, fuel, transmission, price and monthly budget.',
  alternates: { canonical: '/cars' },
}



export default async function InventoryPage({ searchParams }: PageProps<'/cars'>) {
  const params = await searchParams
  const filters = parseInventorySearchParams(params)

  const settings = await getDealershipSettings()
  const defaults = defaultsFromSettings(settings)

  const [result, facets] = await Promise.all([
    listVehicles(filters, defaults),
    getInventoryFacets(),
  ])

  const rangeStart = (result.page - 1) * result.perPage + 1
  const rangeEnd = Math.min(result.page * result.perPage, result.total)

  return (
    <>
      <header className="border-b border-brand-100 bg-brand-50">
        <div className="container-page py-10 sm:py-12">
          <p className="eyebrow text-accent-700">Inventory</p>
          <h1 className="mt-2 text-3xl font-bold text-ink-900 sm:text-4xl">Browse cars</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-600 sm:text-base">
            {facets.total > 0
              ? `${formatNumber(facets.total)} ${facets.total === 1 ? 'vehicle' : 'vehicles'} listed. Filter by what matters to you, then see the cash price and an estimated monthly payment on every card.`
              : 'Vehicles published from the dashboard appear here automatically.'}
          </p>
        </div>
      </header>

      <div className="container-page py-8 sm:py-10">
        <div className="lg:grid lg:grid-cols-[17rem_1fr] lg:gap-10">
          <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="Filter vehicles">
            <div className="mb-4 lg:mb-0">
              <h2 className="sr-only">Filters</h2>
              <InventoryFilters facets={facets} filters={filters} resultCount={result.total} />
            </div>
          </aside>

          <div className="min-w-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <InventorySearch filters={filters} />
              <SortSelect filters={filters} />
            </div>

            <div className="mt-4">
              <ActiveFilterChips filters={filters} />
            </div>

            <p className="mt-4 text-sm text-ink-600" aria-live="polite">
              {result.total > 0
                ? `Showing ${formatNumber(rangeStart)}–${formatNumber(rangeEnd)} of ${formatNumber(result.total)}`
                : null}
            </p>

            {result.unavailable ? (
              <Alert tone="danger" title="Inventory is temporarily unavailable" className="mt-6">
                We could not reach the inventory service. Please refresh in a moment, or contact us
                directly and we will help you find the right vehicle.
              </Alert>
            ) : result.vehicles.length === 0 ? (
              <EmptyState
                className="mt-6"
                icon={
                  facets.total === 0 ? (
                    <CarFront className="size-6" aria-hidden="true" />
                  ) : (
                    <SearchX className="size-6" aria-hidden="true" />
                  )
                }
                title={facets.total === 0 ? 'No vehicles published yet' : 'No vehicles found'}
                description={
                  facets.total === 0
                    ? 'There is nothing in the public inventory at the moment. Please check back soon or send us an inquiry and we will let you know what is arriving.'
                    : 'Try removing a filter or widening your price range. If you are after something specific, tell us and we will look for it.'
                }
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    {facets.total > 0 ? (
                      <ButtonLink href="/cars" variant="outline">
                        Clear all filters
                      </ButtonLink>
                    ) : null}
                    <ButtonLink href="/contact">Tell us what you need</ButtonLink>
                  </div>
                }
              />
            ) : (
              <>
                <ul className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {result.vehicles.map((vehicle, index) => (
                    <Reveal as="li" key={vehicle.id} delay={Math.min(index, 6) * 50}>
                      <VehicleCard vehicle={vehicle} priority={index < 3} />
                    </Reveal>
                  ))}
                </ul>

                <Pagination
                  className="mt-10"
                  page={result.page}
                  totalPages={result.totalPages}
                  buildHref={(page) => `/cars${buildInventoryQuery({ ...filters, page })}`}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
