import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExternalLink } from 'lucide-react'

import { AdminPageHeader } from '@/components/admin/page-header'
import { PastDealForm } from '@/components/admin/past-deal-form'
import { PastDealMediaManager } from '@/components/admin/past-deal-media-manager'
import { Alert } from '@/components/ui/surfaces'
import { requireCapability } from '@/lib/auth'
import { getAdminPastDeal } from '@/lib/data/past-deals'
import { formatDateTime } from '@/lib/format'

export const metadata = { title: 'Edit sold vehicle' }

export default async function EditPastDealPage({
  params,
  searchParams,
}: PageProps<'/admin/sold-vehicles/[id]'>) {
  const { id } = await params
  const query = await searchParams
  const session = await requireCapability('inventory', `/admin/sold-vehicles/${id}`)

  const deal = await getAdminPastDeal(session, id)
  if (!deal) notFound()

  const justCreated = (Array.isArray(query.created) ? query.created[0] : query.created) === '1'

  return (
    <>
      <AdminPageHeader
        title={deal.title}
        description={
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-xs text-ink-500">
              Last updated {formatDateTime(deal.updated_at)}
            </span>
          </span>
        }
        breadcrumbs={[
          { href: '/admin', label: 'Dashboard' },
          { href: '/admin/sold-vehicles', label: 'Sold Archive' },
          { label: deal.title },
        ]}
        actions={
          deal.is_published ? (
            <Link
              href={`/sold/${deal.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-md border border-ink-300 bg-white px-4 text-sm font-medium text-ink-800 transition-colors hover:border-ink-400 hover:bg-ink-50"
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              View on website
            </Link>
          ) : null
        }
      />

      {justCreated ? (
        <Alert tone="success" title="Entry created" className="mb-6">
          Add photos below - an entry with none stays off the /sold page until it has at least
          one.
        </Alert>
      ) : null}

      {deal.is_published && deal.images.length === 0 ? (
        <Alert tone="warning" title="This entry is published without any photos" className="mb-6">
          Add at least one photo, or it will look broken on the /sold page.
        </Alert>
      ) : null}

      <div className="space-y-6">
        <PastDealForm deal={deal} />
        <PastDealMediaManager dealId={deal.id} images={deal.images} />
      </div>
    </>
  )
}
