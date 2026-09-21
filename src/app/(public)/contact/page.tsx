import type { Metadata } from 'next'
import { Clock, Facebook, Mail, MapPin, MessageCircle, Navigation, Phone } from 'lucide-react'

import { InquiryForm } from '@/components/forms/inquiry-form'
import { Alert, Card, CardBody, SectionHeading } from '@/components/ui/surfaces'
import { titleCase } from '@/lib/constants'
import { getFinancingProviders } from '@/lib/data/financing'
import {
  formatAddress,
  getDealershipSettings,
  hasContactDetails,
  sortedBusinessHours,
} from '@/lib/data/settings'
import { getVehicleOptions } from '@/lib/data/vehicles'
import { formatTime, toMailtoHref, toTelHref } from '@/lib/format'

export const revalidate = 600

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getDealershipSettings()

  return {
    title: 'Contact us',
    description: `Get in touch with ${settings.business_name}. Call, email or message us about a vehicle, financing or a test drive.`,
    alternates: { canonical: '/contact' },
  }
}

export default async function ContactPage() {
  const [settings, vehicleOptions, providers] = await Promise.all([
    getDealershipSettings(),
    getVehicleOptions(),
    getFinancingProviders(),
  ])

  const telHref = toTelHref(settings.phone)
  const secondaryTelHref = toTelHref(settings.phone_secondary)
  const mailtoHref = toMailtoHref(settings.email)
  const address = formatAddress(settings)
  const hours = sortedBusinessHours(settings)

  return (
    <>
      <header className="border-b border-brand-100 bg-brand-50">
        <div className="container-page py-10 sm:py-14">
          <p className="eyebrow text-accent-700">Contact</p>
          <h1 className="mt-2 text-3xl font-bold text-ink-900 sm:text-4xl">
            Contact {settings.business_name}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-600 sm:text-base">
            Ask about a specific unit, request a quotation, or book a test drive. No account
            needed — just tell us what you are looking for.
          </p>
        </div>
      </header>

      <div className="container-page py-10 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-[1fr_22rem] lg:gap-14">
          <div className="min-w-0 order-2 lg:order-1">
            <SectionHeading
              title="Send us a message"
              description="Fill this in and a representative will get back to you."
            />
            <div className="mt-6">
              <InquiryForm
                vehicleOptions={vehicleOptions}
                providers={providers}
                sourcePath="/contact"
              />
            </div>
          </div>

          <aside className="order-1 space-y-4 lg:order-2">
            {!hasContactDetails(settings) ? (
              <Alert tone="info" title="Contact details coming soon">
                Our phone number and email have not been published yet. Send a message using the
                form and we will get back to you.
              </Alert>
            ) : null}

            <Card>
              <CardBody className="space-y-4">
                <h2 className="text-base font-semibold text-ink-900">Get in touch</h2>

                <ul className="space-y-3 text-sm">
                  {telHref ? (
                    <ContactItem
                      icon={Phone}
                      label="Call us"
                      value={settings.phone!}
                      href={telHref}
                    />
                  ) : null}

                  {secondaryTelHref ? (
                    <ContactItem
                      icon={Phone}
                      label="Alternate number"
                      value={settings.phone_secondary!}
                      href={secondaryTelHref}
                    />
                  ) : null}

                  {mailtoHref ? (
                    <ContactItem
                      icon={Mail}
                      label="Email us"
                      value={settings.email!}
                      href={mailtoHref}
                    />
                  ) : null}

                  {settings.facebook_url ? (
                    <ContactItem
                      icon={Facebook}
                      label="Facebook"
                      value="Visit our page"
                      href={settings.facebook_url}
                      external
                    />
                  ) : null}

                  {settings.messenger_url ? (
                    <ContactItem
                      icon={MessageCircle}
                      label="Messenger"
                      value="Chat with us"
                      href={settings.messenger_url}
                      external
                    />
                  ) : null}

                  {settings.viber_number ? (
                    <ContactItem
                      icon={MessageCircle}
                      label="Viber"
                      value={settings.viber_number}
                    />
                  ) : null}
                </ul>

                {address ? (
                  <div className="border-t border-ink-100 pt-4">
                    <p className="flex items-start gap-2.5 text-sm">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden="true" />
                      <span className="text-ink-700">{address}</span>
                    </p>

                    {settings.google_maps_url ? (
                      <a
                        href={settings.google_maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex h-10 items-center gap-2 rounded-md bg-brand-800 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                      >
                        <Navigation className="size-4" aria-hidden="true" />
                        Get directions
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </CardBody>
            </Card>

            {hours.length > 0 ? (
              <Card>
                <CardBody>
                  <h2 className="flex items-center gap-2 text-base font-semibold text-ink-900">
                    <Clock className="size-4 text-ink-400" aria-hidden="true" />
                    Business hours
                  </h2>
                  <dl className="mt-3 space-y-2 text-sm">
                    {hours.map((entry) => (
                      <div key={entry.day} className="flex justify-between gap-4">
                        <dt className="text-ink-600">{titleCase(entry.day)}</dt>
                        <dd className="tabular font-medium text-ink-900">
                          {entry.closed
                            ? 'Closed'
                            : `${formatTime(entry.open)} – ${formatTime(entry.close)}`}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </CardBody>
              </Card>
            ) : null}

            {settings.response_time_note ? (
              <p className="px-1 text-xs text-ink-500">{settings.response_time_note}</p>
            ) : null}
          </aside>
        </div>

        {settings.google_maps_embed_url ? (
          <section className="mt-14" aria-labelledby="map-heading">
            <h2 id="map-heading" className="sr-only">
              Our location on a map
            </h2>
            <div className="overflow-hidden rounded-card border border-ink-200 bg-white">
              <iframe
                src={settings.google_maps_embed_url}
                title={`Map showing the location of ${settings.business_name}`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
                className="h-[22rem] w-full border-0"
              />
            </div>
          </section>
        ) : null}
      </div>
    </>
  )
}

function ContactItem({
  icon: Icon,
  label,
  value,
  href,
  external,
}: {
  icon: typeof Phone
  label: string
  value: string
  href?: string
  external?: boolean
}) {
  const content = (
    <>
      <Icon className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden="true" />
      <span className="min-w-0">
        <span className="block text-xs text-ink-500">{label}</span>
        <span className="block break-all font-medium text-ink-900">{value}</span>
      </span>
    </>
  )

  return (
    <li>
      {href ? (
        <a
          href={href}
          target={external ? '_blank' : undefined}
          rel={external ? 'noopener noreferrer' : undefined}
          className="flex items-start gap-2.5 transition-colors hover:text-accent-700"
        >
          {content}
        </a>
      ) : (
        <span className="flex items-start gap-2.5">{content}</span>
      )}
    </li>
  )
}
