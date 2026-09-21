import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CalendarClock, Car, ExternalLink, Mail, Phone } from 'lucide-react'

import { NotesPanel } from '@/components/admin/notes-panel'
import { AdminPageHeader } from '@/components/admin/page-header'
import { TestDriveStatusControl } from '@/components/admin/test-drive-status-control'
import { Alert, Card, CardBody, CardHeader } from '@/components/ui/surfaces'
import { requireCapability } from '@/lib/auth'
import { getTestDrive } from '@/lib/data/admin-crm'
import { formatDate, formatDateTime, formatTime, toMailtoHref, toTelHref } from '@/lib/format'

export const metadata = { title: 'Test drive' }

export default async function TestDriveDetailPage({
  params,
}: PageProps<'/admin/test-drives/[id]'>) {
  const { id } = await params
  const session = await requireCapability('crm', `/admin/test-drives/${id}`)

  const request = await getTestDrive(session, id)
  if (!request) notFound()

  const telHref = toTelHref(request.customer_phone)
  const mailtoHref = toMailtoHref(request.customer_email)

  const rescheduled =
    request.confirmed_date !== null &&
    (request.confirmed_date !== request.preferred_date ||
      (request.confirmed_time ?? '').slice(0, 5) !== request.preferred_time.slice(0, 5))

  return (
    <>
      <AdminPageHeader
        title={request.customer_name}
        description={
          <>
            Reference <span className="font-mono">{request.reference}</span> · Requested{' '}
            {formatDateTime(request.created_at)}
          </>
        }
        breadcrumbs={[
          { href: '/admin', label: 'Dashboard' },
          { href: '/admin/test-drives', label: 'Test drives' },
          { label: request.reference },
        ]}
        actions={
          telHref ? (
            <a
              href={telHref}
              className="inline-flex h-11 items-center gap-2 rounded-md bg-accent-500 px-4 text-sm font-semibold text-ink-950 transition-colors hover:bg-accent-600"
            >
              <Phone className="size-4" aria-hidden="true" />
              Call customer
            </a>
          ) : null
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Appointment" />
            <CardBody>
              <dl className="grid gap-6 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium tracking-wide text-ink-500 uppercase">
                    Customer requested
                  </dt>
                  <dd className="mt-1 text-lg font-semibold text-ink-900">
                    {formatDate(request.preferred_date)}
                  </dd>
                  <dd className="text-sm text-ink-600">{formatTime(request.preferred_time)}</dd>
                </div>

                <div>
                  <dt className="text-xs font-medium tracking-wide text-ink-500 uppercase">
                    Confirmed
                  </dt>
                  {request.confirmed_date ? (
                    <>
                      <dd className="mt-1 text-lg font-semibold text-success-700">
                        {formatDate(request.confirmed_date)}
                      </dd>
                      <dd className="text-sm text-ink-600">{formatTime(request.confirmed_time)}</dd>
                    </>
                  ) : (
                    <dd className="mt-1 text-sm text-ink-500">Not confirmed yet</dd>
                  )}
                </div>
              </dl>

              {rescheduled ? (
                <Alert tone="warning" className="mt-4">
                  This appointment was moved from the customer&rsquo;s requested slot. Make sure
                  they have been told.
                </Alert>
              ) : null}

              {request.message ? (
                <div className="mt-6 border-t border-ink-100 pt-4">
                  <p className="text-xs font-medium tracking-wide text-ink-500 uppercase">
                    Customer notes
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap text-ink-800">
                    {request.message}
                  </p>
                </div>
              ) : null}
            </CardBody>
          </Card>

          <NotesPanel notes={request.notes} testDriveRequestId={request.id} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Update"
              description="Confirming or rescheduling records the agreed slot."
            />
            <CardBody>
              <TestDriveStatusControl
                testDriveId={request.id}
                status={request.status}
                preferredDate={request.preferred_date}
                preferredTime={request.preferred_time}
                confirmedDate={request.confirmed_date}
                confirmedTime={request.confirmed_time}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Customer" />
            <CardBody>
              <dl className="space-y-3 text-sm">
                <div className="flex items-start gap-2.5">
                  <Phone className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden="true" />
                  <div className="min-w-0">
                    <dt className="text-xs text-ink-500">Mobile</dt>
                    <dd className="text-ink-900">
                      {telHref ? (
                        <a href={telHref} className="hover:text-accent-700">
                          {request.customer_phone}
                        </a>
                      ) : (
                        request.customer_phone
                      )}
                    </dd>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Mail className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden="true" />
                  <div className="min-w-0">
                    <dt className="text-xs text-ink-500">Email</dt>
                    <dd className="break-all text-ink-900">
                      {mailtoHref ? (
                        <a href={mailtoHref} className="hover:text-accent-700">
                          {request.customer_email}
                        </a>
                      ) : (
                        'Not provided'
                      )}
                    </dd>
                  </div>
                </div>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Vehicle" />
            <CardBody>
              {request.vehicle ? (
                <>
                  <p className="text-sm font-medium text-ink-900">
                    {request.vehicle.year} {request.vehicle.brand} {request.vehicle.model}
                    {request.vehicle.variant ? ` ${request.vehicle.variant}` : ''}
                  </p>

                  {request.vehicle.status === 'sold' ? (
                    <Alert tone="warning" className="mt-3">
                      This unit has been sold. Offer the customer an alternative before the
                      appointment.
                    </Alert>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href={`/admin/vehicles/${request.vehicle.id}`}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-700 hover:text-accent-800"
                    >
                      <Car className="size-3.5" aria-hidden="true" />
                      Manage vehicle
                    </Link>
                    <Link
                      href={`/cars/${request.vehicle.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-ink-600 hover:text-ink-900"
                    >
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                      View listing
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-ink-900">
                    {request.vehicle_label ?? 'Vehicle not recorded'}
                  </p>
                  <p className="mt-1 text-xs text-ink-500">
                    This vehicle has since been removed from the system.
                  </p>
                </>
              )}
            </CardBody>
          </Card>

          <p className="flex items-start gap-2 text-xs text-ink-500">
            <CalendarClock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            Updating a request does not notify the customer automatically.
          </p>
        </div>
      </div>
    </>
  )
}
