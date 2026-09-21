import type { Metadata } from 'next'
import { BadgeCheck, Banknote, HandCoins, MapPin, Wrench } from 'lucide-react'

import { Reveal } from '@/components/ui/reveal'
import { ButtonLink, SectionHeading } from '@/components/ui/surfaces'
import { VehicleCard } from '@/components/vehicles/vehicle-card'
import { defaultsFromSettings } from '@/lib/data/financing'
import { formatAddress, getDealershipSettings } from '@/lib/data/settings'
import { getFeaturedVehicles, getInventoryFacets } from '@/lib/data/vehicles'
import { formatNumber } from '@/lib/format'

export const revalidate = 600

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getDealershipSettings()

  return {
    title: 'About us',
    description: `Learn about ${settings.business_name} — how we select, price and stand behind the vehicles we sell.`,
    alternates: { canonical: '/about' },
  }
}

const VALUES = [
  {
    icon: BadgeCheck,
    title: 'Inspected before listing',
    body: 'Every unit is checked and documented before it goes on the website. What you read on a listing is what you will find on the lot.',
  },
  {
    icon: Banknote,
    title: 'Pricing in the open',
    body: 'Cash price and an estimated monthly payment appear on every vehicle. No "inquire for price", no figures that change when you arrive.',
  },
  {
    icon: HandCoins,
    title: 'Financing without the fog',
    body: 'Estimate a payment yourself, then let us match you with a provider and tell you exactly what the requirements are.',
  },
  {
    icon: Wrench,
    title: 'Support after the sale',
    body: 'Registration, transfer and aftersales questions are part of the deal, not something that stops mattering once the unit leaves.',
  },
]

export default async function AboutPage() {
  const settings = await getDealershipSettings()
  const defaults = defaultsFromSettings(settings)

  const [facets, featured] = await Promise.all([
    getInventoryFacets(),
    getFeaturedVehicles(defaults, 3),
  ])

  const address = formatAddress(settings)

  return (
    <>
      <header className="bg-brand-900 text-white">
        <div className="container-page py-14 sm:py-20">
          <p className="eyebrow text-accent-300">About</p>
          <h1 className="mt-3 max-w-3xl text-3xl leading-tight font-bold sm:text-4xl lg:text-5xl">
            {settings.business_name}
          </h1>
          {settings.tagline ? (
            <p className="mt-3 max-w-2xl text-lg text-white/60">{settings.tagline}</p>
          ) : null}
        </div>
      </header>

      <section className="container-page py-14 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
          <div className="max-w-2xl">
            {settings.about ? (
              <div className="space-y-4 text-base leading-relaxed text-ink-700">
                {settings.about.split(/\n{2,}/).map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            ) : (
              <div className="space-y-4 text-base leading-relaxed text-ink-700">
                <p>
                  {settings.business_name} sells quality vehicles with pricing you can see before
                  you visit. Every listing carries its cash price, an estimated monthly payment,
                  full specifications and real photographs, so the conversation starts from the
                  same facts we do.
                </p>
                <p>
                  Whether you are paying cash or financing, the aim is the same: you should be able
                  to find the car you want, understand what it costs, and know what happens next.
                </p>
              </div>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/cars">Browse our inventory</ButtonLink>
              <ButtonLink href="/contact" variant="outline">
                Talk to us
              </ButtonLink>
            </div>
          </div>

          <aside className="space-y-4">
            <dl className="grid grid-cols-2 gap-4">
              <Stat label="Vehicles listed" value={formatNumber(facets.total)} />
              <Stat label="Brands available" value={formatNumber(facets.brands.length)} />
            </dl>

            {address ? (
              <div className="rounded-card border border-ink-200 bg-white p-5">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                  <MapPin className="size-4 text-ink-400" aria-hidden="true" />
                  Where to find us
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{address}</p>
                {settings.google_maps_url ? (
                  <a
                    href={settings.google_maps_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-block text-sm font-semibold text-accent-700 hover:text-accent-800"
                  >
                    Get directions →
                  </a>
                ) : null}
              </div>
            ) : null}
          </aside>
        </div>
      </section>

      <section className="bg-brand-50 py-14 sm:py-20">
        <div className="container-page">
          <SectionHeading
            eyebrow="How we work"
            title="What you can expect"
            description="Four things we try to get right on every deal."
          />

          <ul className="mt-10 grid gap-8 sm:grid-cols-2">
            {VALUES.map((value, index) => (
              <Reveal as="li" key={value.title} delay={index * 70} className="flex gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-accent-50 text-accent-700">
                  <value.icon className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-ink-900">{value.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{value.body}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {featured.length > 0 ? (
        <section className="container-page py-14 sm:py-20">
          <SectionHeading
            eyebrow="From the lot"
            title="A few of our vehicles"
            action={
              <ButtonLink href="/cars" variant="outline">
                See everything
              </ButtonLink>
            }
          />
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((vehicle, index) => (
              <Reveal as="li" key={vehicle.id} delay={index * 60}>
                <VehicleCard vehicle={vehicle} />
              </Reveal>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-ink-200 bg-white p-5">
      <dt className="text-xs font-medium tracking-wide text-ink-500 uppercase">{label}</dt>
      <dd className="tabular mt-1 text-3xl font-bold text-ink-900">{value}</dd>
    </div>
  )
}
