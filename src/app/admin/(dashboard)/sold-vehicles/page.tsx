import Image from 'next/image'
import Link from 'next/link'
import { Archive, ImageOff, Plus } from 'lucide-react'

import { AdminPageHeader } from '@/components/admin/page-header'
import { PastDealRowActions } from '@/components/admin/past-deal-row-actions'
import { Badge } from '@/components/ui/badge'
import { ButtonLink, Card, EmptyState } from '@/components/ui/surfaces'
import { requireCapability } from '@/lib/auth'
import { labelFor } from '@/lib/constants'
import {
  getAdminPastDealBrandFacets,
  listAdminPastDeals,
  type AdminPastDealBrandFilter,
  type AdminPastDealListItem,
} from '@/lib/data/past-deals'
import { formatDate, formatNumber, formatRelativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Sold Archive' }

export default async function AdminPastDealsPage({
  searchParams,
}: PageProps<'/admin/sold-vehicles'>) {
  const session = await requireCapability('inventory', '/admin/sold-vehicles')
  const params = await searchParams
  const brandParam = Array.isArray(params.brand) ? params.brand[0] : params.brand

  const facets = await getAdminPastDealBrandFacets(session)
  const validBrand =
    brandParam === 'unset' || facets.brands.some((facet) => facet.brand === brandParam)
      ? (brandParam as AdminPastDealBrandFilter)
      : undefined

  const deals = await listAdminPastDeals(session, validBrand)

  const buildHref = (brand: AdminPastDealBrandFilter | null) =>
    brand ? `/admin/sold-vehicles?brand=${brand}` : '/admin/sold-vehicles'

  return (
    <>
      <AdminPageHeader
        title="Sold Archive"
        description="Units already sold, showcased on the public /sold page - not part of the shopping inventory."
        actions={
          <ButtonLink href="/admin/sold-vehicles/new">
            <Plus className="size-4" aria-hidden="true" />
            Add sold vehicle
          </ButtonLink>
        }
      />

      {facets.brands.length > 0 || facets.unsetCount > 0 ? (
        <nav aria-label="Filter by brand" className="-mx-1 mb-4 overflow-x-auto px-1 pb-1">
          <ul className="flex gap-1">
            <li>
              <FilterChip href={buildHref(null)} active={!validBrand} label="All" />
            </li>
            {facets.brands.map((facet) => (
              <li key={facet.brand}>
                <FilterChip
                  href={buildHref(facet.brand)}
                  active={validBrand === facet.brand}
                  label={labelFor('pastDealBrand', facet.brand)}
                  count={facet.count}
                />
              </li>
            ))}
            {facets.unsetCount > 0 ? (
              <li>
                <FilterChip
                  href={buildHref('unset')}
                  active={validBrand === 'unset'}
                  label="Needs a brand"
                  count={facets.unsetCount}
                />
              </li>
            ) : null}
          </ul>
        </nav>
      ) : null}

      {deals.length === 0 ? (
        <EmptyState
          icon={<Archive className="size-6" aria-hidden="true" />}
          title={validBrand ? 'Nothing matches this filter' : 'Nothing in the archive yet'}
          description={
            validBrand
              ? 'Try a different brand, or clear the filter.'
              : 'Add a past sale with whatever photos and a title you have - no price or specs required.'
          }
          action={
            validBrand ? (
              <ButtonLink href="/admin/sold-vehicles" variant="outline">
                Clear filter
              </ButtonLink>
            ) : (
              <ButtonLink href="/admin/sold-vehicles/new">
                <Plus className="size-4" aria-hidden="true" />
                Add sold vehicle
              </ButtonLink>
            )
          }
        />
      ) : (
        <Card className="overflow-hidden">
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-200 bg-ink-50 text-left text-xs tracking-wide text-ink-500 uppercase">
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Entry
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Photos
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Sold around
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Updated
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {deals.map((deal) => (
                  <tr key={deal.id} className="transition-colors hover:bg-ink-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Thumbnail image={deal.images[0]} alt={deal.title} />
                        <Link
                          href={`/admin/sold-vehicles/${deal.id}`}
                          className="block truncate font-medium text-ink-900 hover:text-accent-700"
                        >
                          {deal.title}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-600">{deal.images.length}</td>
                    <td className="px-4 py-3 text-ink-600">
                      {deal.sold_around ? formatDate(deal.sold_around) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <PublishedBadge deal={deal} />
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap text-ink-500">
                      {formatRelativeTime(deal.updated_at)}
                    </td>
                    <td className="px-4 py-3">
                      <PastDealRowActions dealId={deal.id} title={deal.title} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <ul className="divide-y divide-ink-100 md:hidden">
            {deals.map((deal) => (
              <li key={deal.id} className="flex items-start gap-3 p-4">
                <Thumbnail image={deal.images[0]} alt={deal.title} />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/sold-vehicles/${deal.id}`}
                    className="block truncate font-medium text-ink-900"
                  >
                    {deal.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {deal.images.length} photo{deal.images.length === 1 ? '' : 's'}
                    {deal.sold_around ? ` · ${formatDate(deal.sold_around)}` : ''}
                  </p>
                  <div className="mt-2">
                    <PublishedBadge deal={deal} />
                  </div>
                </div>
                <PastDealRowActions dealId={deal.id} title={deal.title} />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  )
}

function FilterChip({
  href,
  active,
  label,
  count,
}: {
  href: string
  active: boolean
  label: string
  count?: number
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
        active ? 'bg-brand-800 text-white' : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
      )}
    >
      {label}
      {count !== undefined ? (
        <span className={cn('text-xs', active ? 'text-white/60' : 'text-ink-400')}>
          {formatNumber(count)}
        </span>
      ) : null}
    </Link>
  )
}

function PublishedBadge({ deal }: { deal: AdminPastDealListItem }) {
  return deal.is_published ? (
    <Badge tone="success">Active</Badge>
  ) : (
    <Badge tone="neutral">Hidden</Badge>
  )
}

function Thumbnail({
  image,
  alt,
}: {
  image?: { url: string; alt_text: string | null }
  alt: string
}) {
  if (!image) {
    return (
      <div className="flex size-14 shrink-0 items-center justify-center rounded-md bg-ink-100 text-ink-400">
        <ImageOff className="size-5" aria-hidden="true" />
      </div>
    )
  }

  return (
    <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-ink-100">
      <Image src={image.url} alt={image.alt_text ?? alt} fill sizes="56px" className="object-cover" />
    </div>
  )
}
