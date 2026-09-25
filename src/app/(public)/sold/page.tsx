import type { Metadata } from 'next'
import { Archive } from 'lucide-react'

import { Pagination } from '@/components/ui/pagination'
import { Reveal } from '@/components/ui/reveal'
import { EmptyState } from '@/components/ui/surfaces'
import { PastDealCard } from '@/components/vehicles/past-deal-card'
import { getPublishedPastDeals } from '@/lib/data/past-deals'
import { formatNumber } from '@/lib/format'

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

  const result = await getPublishedPastDeals(page)

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
              buildHref={(p) => (p > 1 ? `/sold?page=${p}` : '/sold')}
            />
          </>
        )}
      </div>
    </>
  )
}
