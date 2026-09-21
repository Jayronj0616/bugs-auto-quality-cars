import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  CalendarClock,
  Car,
  HandCoins,
  MessageCircle,
  Phone,
  Wrench,
} from 'lucide-react'

import { Hero } from '@/components/home/hero'
import { QuickSearch } from '@/components/home/quick-search'
import { Reveal } from '@/components/ui/reveal'
import { ButtonLink, EmptyState, SectionHeading } from '@/components/ui/surfaces'
import { VehicleCard } from '@/components/vehicles/vehicle-card'
import { defaultsFromSettings } from '@/lib/data/financing'
import { getDealershipSettings } from '@/lib/data/settings'
import { getFeaturedVehicles, getInventoryFacets, getLatestVehicles } from '@/lib/data/vehicles'
import { toTelHref } from '@/lib/format'

export const metadata: Metadata = {
  title: 'Quality cars, transparent deals',
  description:
    'Browse available vehicles at BUGS Auto Quality Cars. Clear cash pricing, estimated monthly payments, photos, specifications and easy inquiries.',
  alternates: { canonical: '/' },
}

/** Storefront pages are static with ISR; admin edits also revalidate on save. */
export const revalidate = 300

const WHY_US = [
  {
    icon: BadgeCheck,
    title: 'Inspected before listing',
    body: 'Every unit is checked and documented before it reaches the website, so what you see on the listing is what you will find on the lot.',
  },
  {
    icon: Banknote,
    title: 'Pricing you can see',
    body: 'Cash price and an estimated monthly payment appear on every vehicle. No "inquire for price" games.',
  },
  {
    icon: HandCoins,
    title: 'Financing help',
    body: 'Estimate a monthly payment in seconds, then let us match you with a financing partner and walk you through requirements.',
  },
  {
    icon: Wrench,
    title: 'After the sale',
    body: 'Registration, transfer and aftersales questions are part of the deal, not an afterthought once the unit leaves.',
  },
]

export default async function HomePage() {
  const settings = await getDealershipSettings()
  const defaults = defaultsFromSettings(settings)

  const [featured, latest, facets] = await Promise.all([
    getFeaturedVehicles(defaults, 6),
    getLatestVehicles(defaults, 8),
    getInventoryFacets(),
  ])

  // Fall back to the newest listing so the hero still features a real vehicle
  // when nothing has been flagged as featured yet.
  const heroVehicle = featured[0] ?? latest[0] ?? null
  const featuredGrid = featured.length > 0 ? featured : latest.slice(0, 6)
  const latestGrid = latest.filter((vehicle) => !featuredGrid.some((f) => f.id === vehicle.id)).slice(0, 4)
  const telHref = toTelHref(settings.phone)

  return (
    <>
      <Hero settings={settings} vehicle={heroVehicle} inventoryCount={facets.total} />

      {/* Search sits half over the hero so the first action is unmissable. */}
      <section className="container-page -mt-8 sm:-mt-10" aria-label="Quick vehicle search">
        <QuickSearch brands={facets.brands} bodyTypes={facets.bodyTypes} />
      </section>

      <section className="container-page py-16 sm:py-20">
        <SectionHeading
          eyebrow="Inventory"
          title="Featured vehicles"
          description="A selection from what is on the lot right now."
          action={
            <ButtonLink href="/cars" variant="outline">
              View all cars
              <ArrowRight className="size-4" aria-hidden="true" />
            </ButtonLink>
          }
        />

        {featuredGrid.length > 0 ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featuredGrid.map((vehicle, index) => (
              <Reveal key={vehicle.id} delay={index * 60}>
                <VehicleCard vehicle={vehicle} priority={index < 3} />
              </Reveal>
            ))}
          </div>
        ) : (
          <EmptyState
            className="mt-8"
            icon={<Car className="size-6" aria-hidden="true" />}
            title="No vehicles published yet"
            description="Once vehicles are published from the admin dashboard they will appear here automatically."
            action={
              <ButtonLink href="/admin/vehicles" variant="outline">
                Go to vehicle management
              </ButtonLink>
            }
          />
        )}
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="container-page">
          <SectionHeading
            eyebrow="Why BUGS"
            title={`Why buy from ${settings.business_name}`}
            description="Buying a car should be the easy part. Here is how we try to keep it that way."
          />

          <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {WHY_US.map((item, index) => (
              <Reveal as="li" key={item.title} delay={index * 70}>
                <div className="flex size-11 items-center justify-center rounded-md bg-accent-50 text-accent-600">
                  <item.icon className="size-5" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-ink-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{item.body}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* Financing CTA */}
      <section className="container-page py-16 sm:py-20">
        <Reveal className="overflow-hidden rounded-card bg-ink-950 text-white">
          <div className="grid gap-8 p-8 sm:p-12 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="eyebrow text-accent-400">Financing</p>
              <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">
                Know the monthly payment before you visit.
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/70">
                Set your down payment and loan term and see an estimated monthly payment instantly.
                When the numbers work, send us an inquiry and we will take it from there.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <ButtonLink href="/financing" variant="primary">
                  Open the calculator
                </ButtonLink>
                <ButtonLink href="/cars" variant="inverted">
                  Browse inventory
                </ButtonLink>
              </div>
            </div>

            <dl className="grid gap-4 sm:grid-cols-3 lg:gap-3">
              {[
                { label: 'Down payment', value: `${Math.round(defaults.downPaymentPercent)}%` },
                { label: 'Loan term', value: `${defaults.termMonths} mo` },
                { label: 'Indicative rate', value: `${defaults.interestRate}%` },
              ].map((item) => (
                <div key={item.label} className="rounded-md border border-white/12 bg-white/5 p-4">
                  <dt className="text-[11px] tracking-wide text-white/45 uppercase">{item.label}</dt>
                  <dd className="tabular mt-1 text-2xl font-semibold">{item.value}</dd>
                </div>
              ))}
              <p className="text-xs leading-relaxed text-white/45 sm:col-span-3">
                {settings.financing_disclaimer}
              </p>
            </dl>
          </div>
        </Reveal>
      </section>

      {latestGrid.length > 0 ? (
        <section className="container-page pb-16 sm:pb-20">
          <SectionHeading
            eyebrow="Just in"
            title="Latest arrivals"
            action={
              <ButtonLink href="/cars?sort=newest" variant="ghost">
                See more
                <ArrowRight className="size-4" aria-hidden="true" />
              </ButtonLink>
            }
          />
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {latestGrid.map((vehicle, index) => (
              <Reveal key={vehicle.id} delay={index * 60}>
                <VehicleCard vehicle={vehicle} />
              </Reveal>
            ))}
          </div>
        </section>
      ) : null}

      {/* Contact CTA */}
      <section className="bg-white py-16 sm:py-20">
        <div className="container-page">
          <Reveal className="rounded-card border border-ink-200 bg-ink-50 p-8 text-center sm:p-12">
            <h2 className="text-2xl font-semibold text-ink-900 sm:text-3xl">
              Ready to talk about a specific unit?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-ink-600">
              Send an inquiry, book a test drive, or just ask a question. A {settings.business_name}{' '}
              representative will get back to you.
            </p>

            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/contact" size="lg">
                <MessageCircle className="size-4" aria-hidden="true" />
                Send an inquiry
              </ButtonLink>

              {telHref ? (
                <a
                  href={telHref}
                  className="inline-flex h-13 items-center gap-2 rounded-md border border-ink-300 bg-white px-7 text-base font-medium text-ink-800 transition-colors hover:border-ink-400 hover:bg-ink-50"
                >
                  <Phone className="size-4" aria-hidden="true" />
                  {settings.phone}
                </a>
              ) : null}
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-ink-500">
              <Link href="/cars" className="inline-flex items-center gap-1.5 hover:text-ink-800">
                <Car className="size-4" aria-hidden="true" />
                Browse inventory
              </Link>
              <Link href="/cars" className="inline-flex items-center gap-1.5 hover:text-ink-800">
                <CalendarClock className="size-4" aria-hidden="true" />
                Book a test drive
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
