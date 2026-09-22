import Link from 'next/link'
import {
  ArrowRight,
  CalendarClock,
  Car,
  CircleAlert,
  Inbox,
  Plus,
  Settings,
  Sparkles,
} from 'lucide-react'

import { AdminPageHeader } from '@/components/admin/page-header'
import {
  InquiryStatusDot,
  TestDriveStatusDot,
  VehicleStatusBadge,
} from '@/components/admin/status-badge'
import { Card, CardBody, CardHeader, EmptyState, ButtonLink, Alert } from '@/components/ui/surfaces'
import { labelFor } from '@/lib/constants'
import { can, requireAdmin } from '@/lib/auth'
import { getDashboardData } from '@/lib/data/dashboard'
import { getDealershipSettings, hasContactDetails } from '@/lib/data/settings'
import { formatDate, formatNumber, formatPeso, formatRelativeTime, formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'

export default async function AdminDashboardPage({ searchParams }: PageProps<'/admin'>) {
  const params = await searchParams
  const session = await requireAdmin()
  const [data, settings] = await Promise.all([getDashboardData(session), getDealershipSettings()])

  const denied = Array.isArray(params.denied) ? params.denied[0] : params.denied
  const { stats } = data

  return (
    <>
      <AdminPageHeader
        title={`Welcome back, ${session.profile.name.split(' ')[0]}`}
        description="An overview of your inventory and the customers waiting to hear from you."
        actions={
          can(session.profile, 'inventory') ? (
            <ButtonLink href="/admin/vehicles/new">
              <Plus className="size-4" aria-hidden="true" />
              Add vehicle
            </ButtonLink>
          ) : null
        }
      />

      {denied ? (
        <Alert tone="warning" title="You do not have access to that section" className="mb-6">
          Your role ({labelFor('adminRole', session.profile.role)}) does not include the{' '}
          <strong>{denied}</strong> permission. Ask a super admin if you need it.
        </Alert>
      ) : null}

      {/* A dealership with no contact details published is the single most
          consequential thing left unfinished, so it is surfaced first. */}
      {can(session.profile, 'settings') && !hasContactDetails(settings) ? (
        <Alert tone="warning" title="Add your contact details" className="mb-6">
          <p>
            No phone number, email address or Facebook page is configured yet, so the website is not
            showing customers any way to reach you.
          </p>
          <Link
            href="/admin/settings"
            className="mt-2 inline-flex items-center gap-1.5 font-semibold underline underline-offset-2"
          >
            <Settings className="size-3.5" aria-hidden="true" />
            Open dealership settings
          </Link>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.vehicles ? (
          <>
            <StatCard
              label="Published vehicles"
              value={stats.vehicles.published}
              hint={`${formatNumber(stats.vehicles.total)} total in the system`}
              icon={Car}
              href="/admin/vehicles?status=published"
            />
            <StatCard
              label="Drafts"
              value={stats.vehicles.draft}
              hint="Not visible on the website"
              icon={CircleAlert}
              tone={stats.vehicles.draft > 0 ? 'warning' : 'neutral'}
              href="/admin/vehicles?status=draft"
            />
          </>
        ) : null}

        {stats.crm ? (
          <>
            <StatCard
              label="New inquiries"
              value={stats.crm.newInquiries}
              hint={`${formatNumber(stats.crm.openInquiries)} still open`}
              icon={Inbox}
              tone={stats.crm.newInquiries > 0 ? 'accent' : 'neutral'}
              href="/admin/inquiries?status=new"
            />
            <StatCard
              label="Pending test drives"
              value={stats.crm.pendingTestDrives}
              hint={`${formatNumber(stats.crm.upcomingTestDrives)} upcoming`}
              icon={CalendarClock}
              tone={stats.crm.pendingTestDrives > 0 ? 'warning' : 'neutral'}
              href="/admin/test-drives?status=pending"
            />
          </>
        ) : null}

        {stats.vehicles && !stats.crm ? (
          <>
            <StatCard
              label="Featured"
              value={stats.vehicles.featured}
              hint="Shown on the homepage"
              icon={Sparkles}
              href="/admin/vehicles?featured=1"
            />
            <StatCard
              label="Sold"
              value={stats.vehicles.sold}
              hint="Kept for history"
              icon={Car}
              href="/admin/vehicles?status=sold"
            />
          </>
        ) : null}
      </div>

      {/*
        Grid items default to min-width: auto, which stops a track
        shrinking below its content's intrinsic width. On the single
        mobile column that let these cards force the grid past the
        viewport, so the "Recent inquiries" card's "View all" link ran
        off-screen on a phone with no way to scroll to it. min-w-0 on each
        card overrides that and lets the track shrink to the container.
      */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {stats.crm ? (
          <Card className="min-w-0">
            <CardHeader
              title="Recent inquiries"
              action={
                <Link
                  href="/admin/inquiries"
                  className="inline-flex items-center gap-1 text-sm font-medium text-accent-700 hover:text-accent-800"
                >
                  View all
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              }
            />
            {data.recentInquiries.length > 0 ? (
              <ul className="divide-y divide-ink-100">
                {data.recentInquiries.map((inquiry) => (
                  <li key={inquiry.id}>
                    <Link
                      href={`/admin/inquiries/${inquiry.id}`}
                      className="flex items-start justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-ink-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink-900">
                          {inquiry.customer_name}
                        </p>
                        <p className="truncate text-xs text-ink-500">
                          {inquiry.vehicle_label ?? labelFor('inquiryType', inquiry.inquiry_type)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <InquiryStatusDot status={inquiry.status} />
                        <p className="mt-0.5 text-xs text-ink-400">
                          {formatRelativeTime(inquiry.created_at)}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <CardBody>
                <EmptyState
                  className="border-0 py-8"
                  icon={<Inbox className="size-5" aria-hidden="true" />}
                  title="No inquiries yet"
                  description="Customer inquiries from the website will appear here."
                />
              </CardBody>
            )}
          </Card>
        ) : null}

        {stats.crm ? (
          <Card className="min-w-0">
            <CardHeader
              title="Upcoming test drives"
              action={
                <Link
                  href="/admin/test-drives"
                  className="inline-flex items-center gap-1 text-sm font-medium text-accent-700 hover:text-accent-800"
                >
                  View all
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              }
            />
            {data.upcomingTestDrives.length > 0 ? (
              <ul className="divide-y divide-ink-100">
                {data.upcomingTestDrives.map((request) => (
                  <li key={request.id}>
                    <Link
                      href={`/admin/test-drives/${request.id}`}
                      className="flex items-start justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-ink-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink-900">
                          {request.customer_name}
                        </p>
                        <p className="truncate text-xs text-ink-500">
                          {request.vehicle_label ?? 'Vehicle removed'}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <TestDriveStatusDot status={request.status} />
                        <p className="mt-0.5 text-xs text-ink-400">
                          {formatDate(request.preferred_date)} · {formatTime(request.preferred_time)}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <CardBody>
                <EmptyState
                  className="border-0 py-8"
                  icon={<CalendarClock className="size-5" aria-hidden="true" />}
                  title="Nothing scheduled"
                  description="Test drive requests from the website will appear here."
                />
              </CardBody>
            )}
          </Card>
        ) : null}

        {stats.vehicles ? (
          <Card className="min-w-0">
            <CardHeader
              title="Recently updated vehicles"
              action={
                <Link
                  href="/admin/vehicles"
                  className="inline-flex items-center gap-1 text-sm font-medium text-accent-700 hover:text-accent-800"
                >
                  View all
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              }
            />
            {data.recentVehicles.length > 0 ? (
              <ul className="divide-y divide-ink-100">
                {data.recentVehicles.map((vehicle) => (
                  <li key={vehicle.id}>
                    <Link
                      href={`/admin/vehicles/${vehicle.id}`}
                      className="flex items-start justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-ink-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink-900">
                          {vehicle.year} {vehicle.brand} {vehicle.model}
                          {vehicle.variant ? (
                            <span className="text-ink-500"> {vehicle.variant}</span>
                          ) : null}
                        </p>
                        <p className="tabular truncate text-xs text-ink-500">
                          {formatPeso(vehicle.selling_price)} ·{' '}
                          {formatRelativeTime(vehicle.updated_at)}
                        </p>
                      </div>
                      <div className="shrink-0">
                        <VehicleStatusBadge status={vehicle.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <CardBody>
                <EmptyState
                  className="border-0 py-8"
                  icon={<Car className="size-5" aria-hidden="true" />}
                  title="No vehicles yet"
                  description="Add your first vehicle to start building the inventory."
                  action={<ButtonLink href="/admin/vehicles/new">Add a vehicle</ButtonLink>}
                />
              </CardBody>
            )}
          </Card>
        ) : null}

        <Card className="min-w-0">
          <CardHeader title="Recent activity" description="What changed, and who changed it." />
          {data.recentActivity.length > 0 ? (
            <ul className="divide-y divide-ink-100">
              {data.recentActivity.map((entry) => (
                <li key={entry.id} className="flex items-start justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-ink-800">
                      <span className="font-medium">{entry.actor_name ?? 'Someone'}</span>{' '}
                      {describeAction(entry.action)}
                    </p>
                    {entry.entity_label ? (
                      <p className="truncate text-xs text-ink-500">{entry.entity_label}</p>
                    ) : null}
                  </div>
                  <p className="shrink-0 text-xs text-ink-400">
                    {formatRelativeTime(entry.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <CardBody>
              <p className="py-4 text-center text-sm text-ink-500">
                Nothing has been changed yet.
              </p>
            </CardBody>
          )}
        </Card>
      </div>
    </>
  )
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'neutral',
  href,
}: {
  label: string
  value: number
  hint?: string
  icon: typeof Car
  tone?: 'neutral' | 'accent' | 'warning'
  href?: string
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-ink-600">{label}</p>
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-md',
            tone === 'accent'
              ? 'bg-accent-50 text-accent-700'
              : tone === 'warning'
                ? 'bg-warning-50 text-warning-700'
                : 'bg-ink-100 text-ink-500',
          )}
        >
          <Icon className="size-4.5" aria-hidden="true" />
        </span>
      </div>
      <p className="tabular mt-2 text-3xl font-bold text-ink-900">{formatNumber(value)}</p>
      {hint ? <p className="mt-0.5 text-xs text-ink-500">{hint}</p> : null}
    </>
  )

  const className =
    'block rounded-card border border-ink-200 bg-white p-5 shadow-card transition-shadow'

  return href ? (
    <Link href={href} className={cn(className, 'hover:shadow-card-hover')}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  )
}

/** Turns `vehicle.published` into "published a vehicle". */
function describeAction(action: string): string {
  const [entity, verb] = action.split('.')
  if (!verb) return action

  const subject = entity.replace(/_/g, ' ')
  const readable: Record<string, string> = {
    created: `created a ${subject}`,
    updated: `updated a ${subject}`,
    deleted: `deleted a ${subject}`,
    archived: `archived a ${subject}`,
    published: `published a ${subject}`,
    unpublished: `unpublished a ${subject}`,
    duplicated: `duplicated a ${subject}`,
    status_changed: `changed a ${subject} status`,
    note_added: `added a note to a ${subject}`,
    uploaded: `uploaded ${subject} media`,
    reordered: `reordered ${subject} media`,
  }

  return readable[verb] ?? `${verb.replace(/_/g, ' ')} ${subject}`
}
