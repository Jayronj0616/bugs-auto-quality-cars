import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight, Facebook } from 'lucide-react'

import { MobileActionBar } from '@/components/vehicles/mobile-action-bar'
import { PurchasePanel } from '@/components/vehicles/purchase-panel'
import { FeatureList, SpecificationGrid } from '@/components/vehicles/specifications'
import { VehicleBadges } from '@/components/vehicles/vehicle-badges'
import { VehicleCard } from '@/components/vehicles/vehicle-card'
import { VehicleGallery } from '@/components/vehicles/vehicle-gallery'
import { VehicleVideos } from '@/components/vehicles/vehicle-videos'
import { Reveal } from '@/components/ui/reveal'
import { SectionHeading } from '@/components/ui/surfaces'
import { labelFor } from '@/lib/constants'
import {
  defaultsFromSettings,
  getFinancingConfiguration,
  getFinancingProviders,
  resolveFinancingDefaults,
} from '@/lib/data/financing'
import { getDealershipSettings } from '@/lib/data/settings'
import {
  getPublishedVehicleSlugs,
  getRelatedVehicles,
  getVehicleBySlug,
} from '@/lib/data/vehicles'
import { getSiteUrl } from '@/lib/env'
import { formatPeso, toTelHref, truncate } from '@/lib/format'

export const revalidate = 300
export const dynamicParams = true

/**
 * Pre-renders the current inventory at build time. `dynamicParams` stays on, so
 * a vehicle published after a deploy is rendered on first request and then
 * cached like the rest.
 */
export async function generateStaticParams() {
  const slugs = await getPublishedVehicleSlugs()
  return slugs.slice(0, 200).map(({ slug }) => ({ slug }))
}

/** Metadata is derived from the vehicle row - never hand-written per listing. */
export async function generateMetadata({ params }: PageProps<'/cars/[slug]'>): Promise<Metadata> {
  const { slug } = await params
  const settings = await getDealershipSettings()
  const vehicle = await getVehicleBySlug(slug, defaultsFromSettings(settings))

  if (!vehicle) {
    return { title: 'Vehicle not found', robots: { index: false, follow: true } }
  }

  const title = vehicle.meta_title ?? vehicle.title
  const description =
    vehicle.meta_description ??
    truncate(
      vehicle.description?.replace(/\s+/g, ' ').trim() ||
        `Explore the ${vehicle.title} at ${settings.business_name}. Cash price ${formatPeso(vehicle.pricing.price)}, with photos, full specifications and an estimated monthly payment.`,
      155,
    )

  const image = vehicle.images[0]

  return {
    title,
    description,
    alternates: { canonical: `/cars/${vehicle.slug}` },
    openGraph: {
      title: `${title} | ${settings.business_name}`,
      description,
      url: `/cars/${vehicle.slug}`,
      type: 'website',
      images: image ? [{ url: image.url, alt: image.alt_text ?? vehicle.title }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image.url] : undefined,
    },
    // Sold units stay reachable by link but are kept out of the index.
    robots:
      vehicle.status === 'sold'
        ? { index: false, follow: true }
        : { index: true, follow: true },
  }
}

export default async function VehicleDetailPage({ params }: PageProps<'/cars/[slug]'>) {
  const { slug } = await params
  const settings = await getDealershipSettings()
  const vehicle = await getVehicleBySlug(slug, defaultsFromSettings(settings))

  if (!vehicle) notFound()

  const [configuration, providers, related] = await Promise.all([
    getFinancingConfiguration(settings, vehicle),
    getFinancingProviders(),
    getRelatedVehicles(vehicle, resolveFinancingDefaults(settings, vehicle), 3),
  ])

  const telHref = toTelHref(settings.phone)
  const sourcePath = `/cars/${vehicle.slug}`
  const primaryImage = vehicle.images[0]

  return (
    <>
      <script
        type="application/ld+json"
        // Structured data lets the listing appear as a product result with a
        // price rather than a plain blue link.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(vehicleJsonLd(vehicle, settings.business_name)),
        }}
      />

      <div className="bg-white">
        <div className="container-page py-4">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1 text-sm text-ink-500">
              <li>
                <Link href="/" className="hover:text-ink-800">
                  Home
                </Link>
              </li>
              <ChevronRight className="size-3.5" aria-hidden="true" />
              <li>
                <Link href="/cars" className="hover:text-ink-800">
                  Cars
                </Link>
              </li>
              <ChevronRight className="size-3.5" aria-hidden="true" />
              <li aria-current="page" className="font-medium text-ink-800">
                {vehicle.brand} {vehicle.model}
              </li>
            </ol>
          </nav>
        </div>
      </div>

      <div className="container-page pb-16 lg:pb-24">
        <div className="lg:grid lg:grid-cols-[1.6fr_1fr] lg:items-start lg:gap-10">
          <div className="min-w-0">
            <div className="py-5">
              <VehicleBadges vehicle={vehicle} className="mb-3 flex flex-wrap gap-1.5" />
              <h1 className="text-3xl leading-tight font-bold text-ink-900 sm:text-4xl">
                {vehicle.year} {vehicle.brand} {vehicle.model}
              </h1>
              {vehicle.variant ? (
                <p className="mt-1 text-lg text-ink-600">{vehicle.variant}</p>
              ) : null}

              <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-500">
                {[
                  labelFor('condition', vehicle.condition),
                  labelFor('bodyType', vehicle.body_type),
                  labelFor('fuelType', vehicle.fuel_type),
                  labelFor('transmission', vehicle.transmission),
                ]
                  .filter(Boolean)
                  .map((item, index, all) => (
                    <span key={item}>
                      {item}
                      {index < all.length - 1 ? <span className="ml-3 text-ink-300">·</span> : null}
                    </span>
                  ))}
              </p>
            </div>

            <VehicleGallery images={vehicle.images} vehicleTitle={vehicle.title} />

            {/* Price panel sits directly under the gallery on mobile, where the
                sticky sidebar does not exist. */}
            <div className="mt-6 lg:hidden">
              <PurchasePanel
                vehicleId={vehicle.id}
                vehicleTitle={vehicle.title}
                pricing={vehicle.pricing}
                status={vehicle.status}
                configuration={configuration}
                providers={providers}
                phone={settings.phone}
                telHref={telHref}
                sourcePath={sourcePath}
              />
            </div>

            {vehicle.description ? (
              <Reveal className="mt-10">
                <h2 className="text-xl font-semibold text-ink-900">About this vehicle</h2>
                <div className="mt-3 space-y-4 text-sm leading-relaxed text-ink-700 sm:text-base">
                  {vehicle.description.split(/\n{2,}/).map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </Reveal>
            ) : null}

            <Reveal className="mt-10">
              <h2 className="text-xl font-semibold text-ink-900">Specifications</h2>
              <div className="mt-4">
                <SpecificationGrid vehicle={vehicle} />
              </div>
            </Reveal>

            {vehicle.features.length > 0 ? (
              <Reveal className="mt-10">
                <h2 className="text-xl font-semibold text-ink-900">Features</h2>
                <div className="mt-4">
                  <FeatureList features={vehicle.features} />
                </div>
              </Reveal>
            ) : null}

            {vehicle.videos.length > 0 ? (
              <Reveal className="mt-10">
                <h2 className="text-xl font-semibold text-ink-900">See it in action</h2>
                <p className="mt-1 text-sm text-ink-600">
                  Videos load only when you press play.
                </p>
                <div className="mt-4">
                  <VehicleVideos videos={vehicle.videos} vehicleTitle={vehicle.title} />
                </div>
              </Reveal>
            ) : null}

            <Reveal className="mt-10 rounded-card bg-ink-950 p-6 text-white sm:p-8">
              <h2 className="text-xl font-semibold sm:text-2xl">Interested in this vehicle?</h2>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/70">
                Talk to {settings.business_name}. Ask about availability, requirements, trade-in or
                financing — or book a test drive and see it yourself.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/contact"
                  className="inline-flex h-11 items-center rounded-md bg-accent-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-700"
                >
                  Send an inquiry
                </Link>
                {telHref ? (
                  <a
                    href={telHref}
                    className="inline-flex h-11 items-center rounded-md border border-white/20 px-5 text-sm font-medium text-white transition-colors hover:bg-white/10"
                  >
                    Call {settings.phone}
                  </a>
                ) : null}
                {settings.facebook_url ? (
                  <a
                    href={settings.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 items-center gap-2 rounded-md border border-white/20 px-5 text-sm font-medium text-white transition-colors hover:bg-white/10"
                  >
                    <Facebook className="size-4" aria-hidden="true" />
                    Message us
                  </a>
                ) : null}
              </div>
            </Reveal>
          </div>

          {/* Desktop sidebar: stays with the customer as they scroll the specs. */}
          <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start lg:pt-5">
            <PurchasePanel
              vehicleId={vehicle.id}
              vehicleTitle={vehicle.title}
              pricing={vehicle.pricing}
              status={vehicle.status}
              configuration={configuration}
              providers={providers}
              phone={settings.phone}
              telHref={telHref}
              sourcePath={sourcePath}
            />
          </aside>
        </div>

        {related.length > 0 ? (
          <section className="mt-16 border-t border-ink-200 pt-12">
            <SectionHeading
              eyebrow="You might also like"
              title="Similar vehicles"
              description="Other units in the same class that are available now."
            />
            <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item, index) => (
                <Reveal as="li" key={item.id} delay={index * 60}>
                  <VehicleCard vehicle={item} />
                </Reveal>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <MobileActionBar
        vehicleId={vehicle.id}
        vehicleTitle={vehicle.title}
        price={vehicle.pricing.price}
        monthlyFrom={vehicle.monthlyFrom}
        status={vehicle.status}
        telHref={telHref}
        providers={providers}
        sourcePath={sourcePath}
        imageUrl={primaryImage?.url ?? null}
      />
    </>
  )
}

/** schema.org Vehicle + Offer, built from the row rather than hand-maintained. */
function vehicleJsonLd(
  vehicle: Awaited<ReturnType<typeof getVehicleBySlug>> & object,
  businessName: string,
) {
  const availability =
    vehicle.status === 'sold'
      ? 'https://schema.org/SoldOut'
      : vehicle.status === 'reserved'
        ? 'https://schema.org/LimitedAvailability'
        : 'https://schema.org/InStock'

  return {
    '@context': 'https://schema.org',
    '@type': 'Vehicle',
    name: vehicle.title,
    brand: { '@type': 'Brand', name: vehicle.brand },
    model: vehicle.model,
    vehicleConfiguration: vehicle.variant ?? undefined,
    modelDate: String(vehicle.year),
    vehicleTransmission: vehicle.transmission ?? undefined,
    fuelType: vehicle.fuel_type ?? undefined,
    bodyType: vehicle.body_type ?? undefined,
    color: vehicle.exterior_color ?? undefined,
    seatingCapacity: vehicle.seating_capacity ?? undefined,
    mileageFromOdometer:
      vehicle.mileage !== null
        ? { '@type': 'QuantitativeValue', value: vehicle.mileage, unitCode: 'KMT' }
        : undefined,
    description: vehicle.description ?? undefined,
    image: vehicle.images.slice(0, 6).map((image) => image.url),
    url: `${getSiteUrl()}/cars/${vehicle.slug}`,
    offers: {
      '@type': 'Offer',
      price: vehicle.pricing.price,
      priceCurrency: 'PHP',
      availability,
      itemCondition:
        vehicle.condition === 'brand_new'
          ? 'https://schema.org/NewCondition'
          : 'https://schema.org/UsedCondition',
      seller: { '@type': 'AutoDealer', name: businessName },
    },
  }
}
