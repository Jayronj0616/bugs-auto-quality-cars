import Link from 'next/link'
import { CalendarClock, Phone } from 'lucide-react'

import { AdminSearch } from '@/components/admin/admin-search'
import { AdminPageHeader } from '@/components/admin/page-header'
import { TestDriveStatusBadge } from '@/components/admin/status-badge'
import { Pagination } from '@/components/ui/pagination'
import { ButtonLink, Card, EmptyState } from '@/components/ui/surfaces'
import { TEST_DRIVE_STATUSES } from '@/lib/constants'
import { requireCapability } from '@/lib/auth'
import { listTestDrives } from '@/lib/data/admin-crm'
import { formatDate, formatNumber, formatTime, toTelHref } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { TestDriveStatus } from '@/types/database'

export const metadata = { title: 'Test drives' }

const STATUS_TABS: { value: TestDriveStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  ...TEST_DRIVE_STATUSES.map((option) => ({ value: option.value, label: option.label })),
]

export default async function TestDrivesPage({ searchParams }: PageProps<'/admin/test-drives'>) {
  const session = await requireCapability('crm', '/admin/test-drives')
  const params = await searchParams

  const first = (key: string) => {
    const value = params[key]
    return Array.isArray(value) ? value[0] : value
  }

  const statusParam = first('status')
  const status = STATUS_TABS.some((tab) => tab.value === statusParam)
    ? (statusParam as TestDriveStatus | 'all')
    : 'all'

  const pageParam = Number(first('page'))

  const result = await listTestDrives(session, {
    q: first('q'),
    status,
    page: Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1,
  })

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const next = new URLSearchParams()
    const base: Record<string, string | undefined> = {
      q: first('q'),
      status: status === 'all' ? undefined : status,
      ...overrides,
    }
    for (const [key, value] of Object.entries(base)) {
      if (value) next.set(key, value)
    }
    const query = next.toString()
    return query ? `/admin/test-drives?${query}` : '/admin/test-drives'
  }

  return (
    <>
      <AdminPageHeader
        title="Test drives"
        description="Requested appointments, soonest first."
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="Filter by status" className="-mx-1 overflow-x-auto px-1 pb-1">
          <ul className="flex gap-1">
            {STATUS_TABS.map((tab) => {
              const active = tab.value === status
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
                        ? 'bg-ink-900 text-white'
                        : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
                    )}
                  >
                    {tab.label}
                    <span className={cn('text-xs', active ? 'text-white/60' : 'text-ink-400')}>
                      {formatNumber(result.counts[tab.value])}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <AdminSearch placeholder="Name, phone, vehicle or reference…" />
      </div>

      {result.requests.length === 0 ? (
        <EmptyState
          icon={<CalendarClock className="size-6" aria-hidden="true" />}
          title={result.counts.all === 0 ? 'No test drive requests yet' : 'Nothing matches this view'}
          description={
            result.counts.all === 0
              ? 'When a customer books a test drive from a vehicle page, the request appears here as pending.'
              : 'Try another status tab or clear your search.'
          }
          action={
            result.counts.all > 0 ? (
              <ButtonLink href="/admin/test-drives" variant="outline">
                Clear filters
              </ButtonLink>
            ) : null
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-200 bg-ink-50 text-left text-xs tracking-wide text-ink-500 uppercase">
                  <th scope="col" className="px-4 py-3 font-semibold">Customer</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Vehicle</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Requested</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Confirmed</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {result.requests.map((request) => {
                  const telHref = toTelHref(request.customer_phone)
                  return (
                    <tr key={request.id} className="transition-colors hover:bg-ink-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/test-drives/${request.id}`}
                          className="font-medium text-ink-900 hover:text-accent-600"
                        >
                          {request.customer_name}
                        </Link>
                        <p className="mt-0.5 text-xs text-ink-500">
                          {telHref ? (
                            <a href={telHref} className="hover:text-ink-800">
                              {request.customer_phone}
                            </a>
                          ) : (
                            request.customer_phone
                          )}
                          <span className="ml-1.5 text-ink-300">{request.reference}</span>
                        </p>
                      </td>
                      <td className="max-w-[18rem] truncate px-4 py-3 text-ink-800">
                        {request.vehicle_label ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap text-ink-600">
                        {formatDate(request.preferred_date)}
                        <span className="block text-ink-400">
                          {formatTime(request.preferred_time)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {request.confirmed_date ? (
                          <span className="font-medium text-success-700">
                            {formatDate(request.confirmed_date)}
                            <span className="block font-normal text-ink-500">
                              {formatTime(request.confirmed_time)}
                            </span>
                          </span>
                        ) : (
                          <span className="text-ink-400">Not confirmed</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <TestDriveStatusBadge status={request.status} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-ink-100 md:hidden">
            {result.requests.map((request) => {
              const telHref = toTelHref(request.customer_phone)
              return (
                <li key={request.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/admin/test-drives/${request.id}`}
                      className="font-medium text-ink-900"
                    >
                      {request.customer_name}
                    </Link>
                    <TestDriveStatusBadge status={request.status} />
                  </div>
                  <p className="mt-1 truncate text-sm text-ink-600">
                    {request.vehicle_label ?? 'Vehicle removed'}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-xs text-ink-500">
                      {formatDate(request.confirmed_date ?? request.preferred_date)} ·{' '}
                      {formatTime(request.confirmed_time ?? request.preferred_time)}
                    </span>
                    {telHref ? (
                      <a
                        href={telHref}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-600"
                      >
                        <Phone className="size-3.5" aria-hidden="true" />
                        Call
                      </a>
                    ) : null}
                  </div>
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
    </>
  )
}
