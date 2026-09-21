import Link from 'next/link'
import { Inbox, Phone } from 'lucide-react'

import { AdminSearch } from '@/components/admin/admin-search'
import { AdminPageHeader } from '@/components/admin/page-header'
import { InquiryStatusBadge } from '@/components/admin/status-badge'
import { Pagination } from '@/components/ui/pagination'
import { ButtonLink, Card, EmptyState } from '@/components/ui/surfaces'
import { INQUIRY_STATUSES, INQUIRY_TYPES, labelFor } from '@/lib/constants'
import { requireCapability } from '@/lib/auth'
import { listInquiries } from '@/lib/data/admin-crm'
import { formatDateTime, formatNumber, formatPesoPrecise, toTelHref } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { InquiryStatus, InquiryType } from '@/types/database'

export const metadata = { title: 'Inquiries' }

const STATUS_TABS: { value: InquiryStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  ...INQUIRY_STATUSES.map((option) => ({ value: option.value, label: option.label })),
]

export default async function InquiriesPage({ searchParams }: PageProps<'/admin/inquiries'>) {
  const session = await requireCapability('crm', '/admin/inquiries')
  const params = await searchParams

  const first = (key: string) => {
    const value = params[key]
    return Array.isArray(value) ? value[0] : value
  }

  const statusParam = first('status')
  const status = STATUS_TABS.some((tab) => tab.value === statusParam)
    ? (statusParam as InquiryStatus | 'all')
    : 'all'

  const typeParam = first('type')
  const type = INQUIRY_TYPES.some((option) => option.value === typeParam)
    ? (typeParam as InquiryType)
    : 'all'

  const pageParam = Number(first('page'))

  const result = await listInquiries(session, {
    q: first('q'),
    status,
    type,
    page: Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1,
  })

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const next = new URLSearchParams()
    const base: Record<string, string | undefined> = {
      q: first('q'),
      status: status === 'all' ? undefined : status,
      type: type === 'all' ? undefined : type,
      ...overrides,
    }
    for (const [key, value] of Object.entries(base)) {
      if (value) next.set(key, value)
    }
    const query = next.toString()
    return query ? `/admin/inquiries?${query}` : '/admin/inquiries'
  }

  return (
    <>
      <AdminPageHeader
        title="Inquiries"
        description="Every customer who has asked about a vehicle, newest first."
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
                        ? 'bg-brand-800 text-white'
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

        <AdminSearch placeholder="Name, phone, email or reference…" />
      </div>

      {result.inquiries.length === 0 ? (
        <EmptyState
          icon={<Inbox className="size-6" aria-hidden="true" />}
          title={result.counts.all === 0 ? 'No inquiries yet' : 'Nothing matches this view'}
          description={
            result.counts.all === 0
              ? 'Inquiries submitted from the website land here automatically, with the vehicle and any financing figures attached.'
              : 'Try another status tab or clear your search.'
          }
          action={
            result.counts.all > 0 ? (
              <ButtonLink href="/admin/inquiries" variant="outline">
                Clear filters
              </ButtonLink>
            ) : (
              <ButtonLink href="/cars" variant="outline">
                View the public inventory
              </ButtonLink>
            )
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
                  <th scope="col" className="px-4 py-3 font-semibold">Type</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Received</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {result.inquiries.map((inquiry) => {
                  const telHref = toTelHref(inquiry.customer_phone)
                  return (
                    <tr key={inquiry.id} className="transition-colors hover:bg-ink-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/inquiries/${inquiry.id}`}
                          className="font-medium text-ink-900 hover:text-accent-700"
                        >
                          {inquiry.customer_name}
                        </Link>
                        <p className="mt-0.5 text-xs text-ink-500">
                          {telHref ? (
                            <a href={telHref} className="hover:text-ink-800">
                              {inquiry.customer_phone}
                            </a>
                          ) : (
                            inquiry.customer_phone
                          )}
                          <span className="ml-1.5 text-ink-300">{inquiry.reference}</span>
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="max-w-[18rem] truncate text-ink-800">
                          {inquiry.vehicle_label ?? '—'}
                        </p>
                        {inquiry.estimated_monthly_payment ? (
                          <p className="tabular text-xs text-ink-500">
                            {formatPesoPrecise(inquiry.estimated_monthly_payment)}/mo estimate
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-ink-600">
                        {labelFor('inquiryType', inquiry.inquiry_type)}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap text-ink-500">
                        {formatDateTime(inquiry.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <InquiryStatusBadge status={inquiry.status} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <ul className="divide-y divide-ink-100 md:hidden">
            {result.inquiries.map((inquiry) => {
              const telHref = toTelHref(inquiry.customer_phone)
              return (
                <li key={inquiry.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/admin/inquiries/${inquiry.id}`}
                      className="font-medium text-ink-900"
                    >
                      {inquiry.customer_name}
                    </Link>
                    <InquiryStatusBadge status={inquiry.status} />
                  </div>
                  <p className="mt-1 truncate text-sm text-ink-600">
                    {inquiry.vehicle_label ?? labelFor('inquiryType', inquiry.inquiry_type)}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-xs text-ink-400">
                      {formatDateTime(inquiry.created_at)}
                    </span>
                    {telHref ? (
                      <a
                        href={telHref}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-700"
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
