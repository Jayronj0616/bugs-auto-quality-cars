import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExternalLink } from 'lucide-react'

import { MediaManager } from '@/components/admin/media-manager'
import { AdminPageHeader } from '@/components/admin/page-header'
import { SpecificationsEditor } from '@/components/admin/specifications-editor'
import { VehicleStatusBadge } from '@/components/admin/status-badge'
import { VehicleForm } from '@/components/admin/vehicle-form'
import { VideosEditor } from '@/components/admin/videos-editor'
import { Alert } from '@/components/ui/surfaces'
import { requireCapability } from '@/lib/auth'
import { getAdminVehicle } from '@/lib/data/admin-vehicles'
import { formatDateTime } from '@/lib/format'

export const metadata = { title: 'Edit vehicle' }

export default async function EditVehiclePage({
  params,
  searchParams,
}: PageProps<'/admin/vehicles/[id]'>) {
  const { id } = await params
  const query = await searchParams
  const session = await requireCapability('inventory', `/admin/vehicles/${id}`)

  const vehicle = await getAdminVehicle(session, id)
  if (!vehicle) notFound()

  const label = [vehicle.year, vehicle.brand, vehicle.model, vehicle.variant]
    .filter(Boolean)
    .join(' ')
  const justCreated = (Array.isArray(query.created) ? query.created[0] : query.created) === '1'
  const isPublic = ['published', 'reserved', 'sold'].includes(vehicle.status)

  return (
    <>
      <AdminPageHeader
        title={label}
        description={
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            <VehicleStatusBadge status={vehicle.status} />
            <span className="text-xs text-ink-500">
              Last updated {formatDateTime(vehicle.updated_at)}
            </span>
          </span>
        }
        breadcrumbs={[
          { href: '/admin', label: 'Dashboard' },
          { href: '/admin/vehicles', label: 'Vehicles' },
          { label },
        ]}
        actions={
          isPublic ? (
            <Link
              href={`/cars/${vehicle.slug}`}
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
        <Alert tone="success" title="Vehicle created" className="mb-6">
          {/* The status is whatever was chosen on the form, so the message has
              to read it rather than assume a draft. */}
          {isPublic
            ? 'It is live on the website now. Add photos below — listings without photography get very few inquiries.'
            : 'It is saved as a draft and is not visible on the website. Add photos below, then set the status to Published when it is ready to go live.'}
        </Alert>
      ) : null}

      {vehicle.status === 'published' && vehicle.images.length === 0 ? (
        <Alert tone="warning" title="This vehicle is live without any photos" className="mb-6">
          Listings without photography get very few inquiries. Add at least one exterior shot.
        </Alert>
      ) : null}

      <div className="space-y-6">
        <VehicleForm vehicle={vehicle} />
        <MediaManager vehicleId={vehicle.id} images={vehicle.images} />
        <VideosEditor vehicleId={vehicle.id} videos={vehicle.videos} />
        <SpecificationsEditor vehicleId={vehicle.id} specifications={vehicle.specifications} />
      </div>
    </>
  )
}
