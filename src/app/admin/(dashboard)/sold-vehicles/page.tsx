import Image from 'next/image'
import Link from 'next/link'
import { Archive, ImageOff, Plus } from 'lucide-react'

import { AdminPageHeader } from '@/components/admin/page-header'
import { PastDealRowActions } from '@/components/admin/past-deal-row-actions'
import { Badge } from '@/components/ui/badge'
import { ButtonLink, Card, EmptyState } from '@/components/ui/surfaces'
import { requireCapability } from '@/lib/auth'
import { listAdminPastDeals, type AdminPastDealListItem } from '@/lib/data/past-deals'
import { formatDate, formatRelativeTime } from '@/lib/format'

export const metadata = { title: 'Sold Archive' }

export default async function AdminPastDealsPage() {
  const session = await requireCapability('inventory', '/admin/sold-vehicles')
  const deals = await listAdminPastDeals(session)

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

      {deals.length === 0 ? (
        <EmptyState
          icon={<Archive className="size-6" aria-hidden="true" />}
          title="Nothing in the archive yet"
          description="Add a past sale with whatever photos and a title you have - no price or specs required."
          action={
            <ButtonLink href="/admin/sold-vehicles/new">
              <Plus className="size-4" aria-hidden="true" />
              Add sold vehicle
            </ButtonLink>
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

function PublishedBadge({ deal }: { deal: AdminPastDealListItem }) {
  return deal.is_published ? (
    <Badge tone="success">Published</Badge>
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
