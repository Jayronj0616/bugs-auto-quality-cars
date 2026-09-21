import Image from 'next/image'
import Link from 'next/link'
import { Car, ImageOff, Plus, Sparkles } from 'lucide-react'

import { AdminPageHeader } from '@/components/admin/page-header'
import { AdminSearch } from '@/components/admin/admin-search'
import { VehicleStatusBadge } from '@/components/admin/status-badge'
import { VehicleRowActions } from '@/components/admin/vehicle-row-actions'
import { Pagination } from '@/components/ui/pagination'
import { ButtonLink, Card, EmptyState } from '@/components/ui/surfaces'
import { labelFor, VEHICLE_STATUSES } from '@/lib/constants'
import { requireCapability } from '@/lib/auth'
import { listAdminVehicles } from '@/lib/data/admin-vehicles'
import { formatNumber, formatPeso, formatRelativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { VehicleStatus } from '@/types/database'

export const metadata = { title: 'Vehicles' }

const STATUS_TABS: { value: VehicleStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  ...VEHICLE_STATUSES.map((option) => ({ value: option.value, label: option.label })),
]

export default async function AdminVehiclesPage({ searchParams }: PageProps<'/admin/vehicles'>) {
  const session = await requireCapability('inventory', '/admin/vehicles')
  const params = await searchParams

  const first = (key: string) => {
    const value = params[key]
    return Array.isArray(value) ? value[0] : value
  }

  const statusParam = first('status')
  const status = STATUS_TABS.some((tab) => tab.value === statusParam)
    ? (statusParam as VehicleStatus | 'all')
    : 'all'

  const pageParam = Number(first('page'))
  const featuredOnly = first('featured') === '1'

  const result = await listAdminVehicles(session, {
    q: first('q'),
    status,
    featuredOnly,
    page: Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1,
  })

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const next = new URLSearchParams()
    const base: Record<string, string | undefined> = {
      q: first('q'),
      status: status === 'all' ? undefined : status,
      featured: featuredOnly ? '1' : undefined,
      ...overrides,
    }
    for (const [key, value] of Object.entries(base)) {
      if (value) next.set(key, value)
    }
    const query = next.toString()
    return query ? `/admin/vehicles?${query}` : '/admin/vehicles'
  }

  return (
    <>
      <AdminPageHeader
        title="Vehicles"
        description="Everything in your inventory, including drafts and archived listings."
        actions={
          <ButtonLink href="/admin/vehicles/new">
            <Plus className="size-4" aria-hidden="true" />
            Add vehicle
          </ButtonLink>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="Filter by status" className="-mx-1 overflow-x-auto px-1 pb-1">
          <ul className="flex gap-1">
            {STATUS_TABS.map((tab) => {
              const active = tab.value === status
              const count = result.counts[tab.value]
              return (
                <li key={tab.value}>
                  <Link
                    href={buildHref({
                      status: tab.value === 'all' ? undefined : tab.value,
                      page: undefined,
                    })}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                      active
                        ? 'bg-brand-800 text-white'
                        : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
                    )}
                  >
                    {tab.label}
                    <span className={cn('text-xs', active ? 'text-white/60' : 'text-ink-400')}>
                      {formatNumber(count)}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href={buildHref({ featured: featuredOnly ? undefined : '1', page: undefined })}
            className={cn(
              'inline-flex h-10 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors',
              featuredOnly
                ? 'border-accent-500 bg-accent-50 text-accent-800'
                : 'border-ink-300 bg-white text-ink-600 hover:border-ink-400',
            )}
          >
            <Sparkles className="size-4" aria-hidden="true" />
            Featured
          </Link>
          <AdminSearch placeholder="Search brand, model, year…" />
        </div>
      </div>

      {result.vehicles.length === 0 ? (
        <EmptyState
          icon={<Car className="size-6" aria-hidden="true" />}
          title={result.counts.all === 0 ? 'No vehicles yet' : 'No vehicles match this view'}
          description={
            result.counts.all === 0
              ? 'Add your first vehicle, then publish it to make it visible on the website.'
              : 'Try another status tab or clear your search.'
          }
          action={
            result.counts.all === 0 ? (
              <ButtonLink href="/admin/vehicles/new">
                <Plus className="size-4" aria-hidden="true" />
                Add vehicle
              </ButtonLink>
            ) : (
              <ButtonLink href="/admin/vehicles" variant="outline">
                Clear filters
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
                    Vehicle
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Price
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
                {result.vehicles.map((vehicle) => {
                  const label = [vehicle.year, vehicle.brand, vehicle.model, vehicle.variant]
                    .filter(Boolean)
                    .join(' ')
                  return (
                    <tr key={vehicle.id} className="transition-colors hover:bg-ink-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Thumbnail image={vehicle.images[0]} alt={label} />
                          <div className="min-w-0">
                            <Link
                              href={`/admin/vehicles/${vehicle.id}`}
                              className="block truncate font-medium text-ink-900 hover:text-accent-700"
                            >
                              {label}
                            </Link>
                            <p className="truncate text-xs text-ink-500">
                              {labelFor('condition', vehicle.condition)}
                              {vehicle.is_featured ? ' · Featured' : ''}
                              {vehicle.promo_price ? ' · Promo' : ''}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="tabular px-4 py-3 whitespace-nowrap">
                        <span className="font-medium text-ink-900">
                          {formatPeso(vehicle.promo_price ?? vehicle.selling_price)}
                        </span>
                        {vehicle.promo_price ? (
                          <span className="ml-1.5 text-xs text-ink-400 line-through">
                            {formatPeso(vehicle.selling_price)}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <VehicleStatusBadge status={vehicle.status} />
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap text-ink-500">
                        {formatRelativeTime(vehicle.updated_at)}
                      </td>
                      <td className="px-4 py-3">
                        <VehicleRowActions
                          vehicleId={vehicle.id}
                          slug={vehicle.slug}
                          label={label}
                          status={vehicle.status}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <ul className="divide-y divide-ink-100 md:hidden">
            {result.vehicles.map((vehicle) => {
              const label = [vehicle.year, vehicle.brand, vehicle.model, vehicle.variant]
                .filter(Boolean)
                .join(' ')
              return (
                <li key={vehicle.id} className="flex items-start gap-3 p-4">
                  <Thumbnail image={vehicle.images[0]} alt={label} />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/vehicles/${vehicle.id}`}
                      className="block truncate font-medium text-ink-900"
                    >
                      {label}
                    </Link>
                    <p className="tabular mt-0.5 text-sm text-ink-700">
                      {formatPeso(vehicle.promo_price ?? vehicle.selling_price)}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <VehicleStatusBadge status={vehicle.status} />
                      <span className="text-xs text-ink-400">
                        {formatRelativeTime(vehicle.updated_at)}
                      </span>
                    </div>
                  </div>
                  <VehicleRowActions
                    vehicleId={vehicle.id}
                    slug={vehicle.slug}
                    label={label}
                    status={vehicle.status}
                  />
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      <Pagination
        className="mt-6"
        page={result.page}
        totalPages={result.totalPages}
        buildHref={(page) => buildHref({ page: page > 1 ? String(page) : undefined })}
      />

      <p className="sr-only" aria-live="polite">
        {formatNumber(result.total)} vehicles, signed in as {session.profile.name}
      </p>
    </>
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
      <Image
        src={image.url}
        alt={image.alt_text ?? alt}
        fill
        sizes="56px"
        className="object-cover"
      />
    </div>
  )
}
