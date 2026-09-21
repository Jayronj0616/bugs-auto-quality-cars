import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Car, ExternalLink, Mail, MessageCircle, Phone } from 'lucide-react'

import { InquiryStatusControl } from '@/components/admin/inquiry-status-control'
import { NotesPanel } from '@/components/admin/notes-panel'
import { AdminPageHeader } from '@/components/admin/page-header'
import { Card, CardBody, CardHeader } from '@/components/ui/surfaces'
import { labelFor } from '@/lib/constants'
import { requireCapability } from '@/lib/auth'
import { getInquiry } from '@/lib/data/admin-crm'
import {
  formatDate,
  formatDateTime,
  formatPercent,
  formatPeso,
  formatPesoPrecise,
  toMailtoHref,
  toTelHref,
} from '@/lib/format'

export const metadata = { title: 'Inquiry' }

export default async function InquiryDetailPage({ params }: PageProps<'/admin/inquiries/[id]'>) {
  const { id } = await params
  const session = await requireCapability('crm', `/admin/inquiries/${id}`)

  const inquiry = await getInquiry(session, id)
  if (!inquiry) notFound()

  const telHref = toTelHref(inquiry.customer_phone)
  const mailtoHref = toMailtoHref(inquiry.customer_email)

  const hasFinancing =
    inquiry.loan_term_months !== null ||
    inquiry.down_payment_amount !== null ||
    inquiry.estimated_monthly_payment !== null

  return (
    <>
      <AdminPageHeader
        title={inquiry.customer_name}
        description={
          <>
            {labelFor('inquiryType', inquiry.inquiry_type)} · Reference{' '}
            <span className="font-mono">{inquiry.reference}</span> · Received{' '}
            {formatDateTime(inquiry.created_at)}
          </>
        }
        breadcrumbs={[
          { href: '/admin', label: 'Dashboard' },
          { href: '/admin/inquiries', label: 'Inquiries' },
          { label: inquiry.reference },
        ]}
        actions={
          <>
            {telHref ? (
              <a
                href={telHref}
                className="inline-flex h-11 items-center gap-2 rounded-md bg-accent-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-700"
              >
                <Phone className="size-4" aria-hidden="true" />
                Call customer
              </a>
            ) : null}
            {mailtoHref ? (
              <a
                href={mailtoHref}
                className="inline-flex h-11 items-center gap-2 rounded-md border border-ink-300 bg-white px-4 text-sm font-medium text-ink-800 transition-colors hover:border-ink-400 hover:bg-ink-50"
              >
                <Mail className="size-4" aria-hidden="true" />
                Email
              </a>
            ) : null}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Message" />
            <CardBody>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink-800">
                {inquiry.message}
              </p>
            </CardBody>
          </Card>

          {hasFinancing ? (
            <Card>
              <CardHeader
                title="Financing request"
                description="The figures the customer was looking at when they sent this."
              />
              <CardBody>
                <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-3">
                  <Detail
                    label="Vehicle price"
                    value={formatPeso(inquiry.vehicle_price_at_inquiry)}
                  />
                  <Detail
                    label="Down payment"
                    value={
                      inquiry.down_payment_amount !== null
                        ? `${formatPeso(inquiry.down_payment_amount)}${
                            inquiry.down_payment_percent !== null
                              ? ` (${formatPercent(inquiry.down_payment_percent)})`
                              : ''
                          }`
                        : '—'
                    }
                  />
                  <Detail
                    label="Loan term"
                    value={inquiry.loan_term_months ? `${inquiry.loan_term_months} months` : '—'}
                  />
                  <Detail label="Interest rate" value={formatPercent(inquiry.interest_rate)} />
                  <Detail label="Provider" value={inquiry.provider?.name ?? 'No preference'} />
                  <Detail
                    label="Estimated monthly"
                    value={formatPesoPrecise(inquiry.estimated_monthly_payment)}
                    emphasis
                  />
                </dl>

                <p className="mt-4 border-t border-ink-100 pt-3 text-xs text-ink-500">
                  These figures were recalculated on the server from the vehicle price at the time
                  of the inquiry. They remain an estimate, not an approved offer.
                </p>
              </CardBody>
            </Card>
          ) : null}

          <NotesPanel notes={inquiry.notes} inquiryId={inquiry.id} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Status" />
            <CardBody>
              <InquiryStatusControl inquiryId={inquiry.id} status={inquiry.status} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Customer" />
            <CardBody>
              <dl className="space-y-3 text-sm">
                <ContactRow
                  icon={Phone}
                  label="Mobile"
                  value={inquiry.customer_phone}
                  href={telHref}
                />
                <ContactRow
                  icon={Mail}
                  label="Email"
                  value={inquiry.customer_email ?? 'Not provided'}
                  href={mailtoHref}
                />
                <ContactRow
                  icon={MessageCircle}
                  label="Prefers"
                  value={labelFor('contactMethod', inquiry.preferred_contact_method)}
                />
                {inquiry.preferred_contact_date ? (
                  <ContactRow
                    icon={MessageCircle}
                    label="Best day"
                    value={formatDate(inquiry.preferred_contact_date)}
                  />
                ) : null}
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Vehicle" />
            <CardBody>
              {inquiry.vehicle ? (
                <>
                  <p className="text-sm font-medium text-ink-900">
                    {inquiry.vehicle.year} {inquiry.vehicle.brand} {inquiry.vehicle.model}
                    {inquiry.vehicle.variant ? ` ${inquiry.vehicle.variant}` : ''}
                  </p>
                  <p className="tabular mt-0.5 text-sm text-ink-600">
                    {formatPeso(inquiry.vehicle.promo_price ?? inquiry.vehicle.selling_price)}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/admin/vehicles/${inquiry.vehicle.id}`}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-700 hover:text-accent-800"
                    >
                      <Car className="size-3.5" aria-hidden="true" />
                      Manage vehicle
                    </Link>
                    <Link
                      href={`/cars/${inquiry.vehicle.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-ink-600 hover:text-ink-900"
                    >
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                      View listing
                    </Link>
                  </div>
                </>
              ) : inquiry.vehicle_label ? (
                <>
                  <p className="text-sm font-medium text-ink-900">{inquiry.vehicle_label}</p>
                  <p className="mt-1 text-xs text-ink-500">
                    This vehicle has since been removed from the system. The description above is
                    what the customer was looking at.
                  </p>
                </>
              ) : (
                <p className="text-sm text-ink-500">
                  A general inquiry — not about a specific vehicle.
                </p>
              )}

              {inquiry.source_path ? (
                <p className="mt-4 border-t border-ink-100 pt-3 text-xs text-ink-400">
                  Sent from <span className="font-mono">{inquiry.source_path}</span>
                </p>
              ) : null}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  )
}

function Detail({
  label,
  value,
  emphasis,
}: {
  label: string
  value: string
  emphasis?: boolean
}) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-ink-500 uppercase">{label}</dt>
      <dd
        className={
          emphasis
            ? 'tabular mt-1 text-lg font-bold text-ink-900'
            : 'tabular mt-1 text-sm font-medium text-ink-900'
        }
      >
        {value}
      </dd>
    </div>
  )
}

function ContactRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Phone
  label: string
  value: string
  href?: string | null
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-xs text-ink-500">{label}</dt>
        <dd className="text-sm text-ink-900">
          {href ? (
            <a href={href} className="break-all hover:text-accent-700">
              {value}
            </a>
          ) : (
            <span className="break-all">{value}</span>
          )}
        </dd>
      </div>
    </div>
  )
}
