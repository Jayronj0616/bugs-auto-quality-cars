import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Calculator, ShieldCheck } from 'lucide-react'

import { ButtonLink } from '@/components/ui/surfaces'
import { labelFor } from '@/lib/constants'
import type { DealershipSettings } from '@/lib/data/settings'
import type { VehicleSummary } from '@/lib/data/vehicles'
import { formatPeso, formatPesoPrecise } from '@/lib/format'

/**
 * Homepage hero.
 *
 * When there is a featured vehicle it becomes the hero, because a real car with
 * a real price communicates "dealership" faster than any stock photograph. With
 * an empty inventory it degrades to a plain statement of what the business does
 * rather than an empty frame.
 */
export function Hero({
  settings,
  vehicle,
  inventoryCount,
}: {
  settings: DealershipSettings
  vehicle: VehicleSummary | null
  inventoryCount: number
}) {
  const heroImage = vehicle?.images[0] ?? null
  const backgroundImage = heroImage?.url ?? settings.hero_image_url

  return (
    <section className="relative isolate overflow-hidden bg-brand-900 text-white">
      {backgroundImage ? (
        <>
          <Image
            src={backgroundImage}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-45"
          />
          {/* Two gradients: one for text contrast on the left, one to seat the
              image into the page at the bottom. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-brand-900 via-brand-900/85 to-brand-900/25"
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-brand-900 to-transparent"
          />
        </>
      ) : null}

      <div className="container-page relative py-20 sm:py-28 lg:py-36">
        <div className="max-w-2xl">
          <p className="eyebrow animate-fade-in text-accent-300">
            {inventoryCount > 0
              ? `${inventoryCount} ${inventoryCount === 1 ? 'vehicle' : 'vehicles'} available now`
              : settings.business_name}
          </p>

          <h1
            className="mt-4 animate-fade-up text-4xl leading-[1.05] font-bold sm:text-5xl lg:text-6xl"
            style={{ animationDelay: '60ms' }}
          >
            Find your next car
            <span className="block text-white/55">without the guesswork.</span>
          </h1>

          <p
            className="mt-5 max-w-xl animate-fade-up text-base leading-relaxed text-white/70 sm:text-lg"
            style={{ animationDelay: '120ms' }}
          >
            {settings.tagline
              ? `${settings.tagline} `
              : 'Quality vehicles and transparent deals. '}
            See the cash price and an estimated monthly payment on every listing, then talk to us
            when you are ready.
          </p>

          <div
            className="mt-8 flex animate-fade-up flex-wrap gap-3"
            style={{ animationDelay: '180ms' }}
          >
            <ButtonLink href="/cars" size="lg" variant="primary">
              Browse cars
              <ArrowRight className="size-4" aria-hidden="true" />
            </ButtonLink>
            <ButtonLink href="/financing" size="lg" variant="inverted">
              <Calculator className="size-4" aria-hidden="true" />
              Calculate payment
            </ButtonLink>
          </div>

          <p
            className="mt-6 inline-flex animate-fade-up items-center gap-2 text-xs text-white/50"
            style={{ animationDelay: '240ms' }}
          >
            <ShieldCheck className="size-4" aria-hidden="true" />
            No account needed to browse, estimate or inquire.
          </p>
        </div>

        {vehicle ? (
          <div
            className="mt-12 animate-fade-up lg:absolute lg:right-8 lg:bottom-16 lg:mt-0 lg:w-80"
            style={{ animationDelay: '300ms' }}
          >
            <Link
              href={`/cars/${vehicle.slug}`}
              className="block rounded-card border border-white/15 bg-brand-900/70 p-5 backdrop-blur-md transition-colors hover:border-white/30"
            >
              <p className="eyebrow text-accent-300">Featured</p>
              <p className="mt-2 text-lg leading-snug font-semibold">
                {vehicle.year} {vehicle.brand} {vehicle.model}
              </p>
              {vehicle.variant ? (
                <p className="text-sm text-white/60">{vehicle.variant}</p>
              ) : null}

              <div className="mt-4 flex items-end justify-between gap-3 border-t border-white/10 pt-4">
                <div>
                  <p className="text-[11px] tracking-wide text-white/45 uppercase">Cash price</p>
                  <p className="tabular text-xl font-bold">{formatPeso(vehicle.pricing.price)}</p>
                </div>
                {vehicle.monthlyFrom ? (
                  <div className="text-right">
                    <p className="text-[11px] tracking-wide text-white/45 uppercase">From</p>
                    <p className="tabular text-sm font-semibold">
                      {formatPesoPrecise(vehicle.monthlyFrom)}
                      <span className="font-normal text-white/50">/mo</span>
                    </p>
                  </div>
                ) : null}
              </div>

              <p className="mt-4 text-sm font-semibold text-accent-300">
                View this vehicle →
              </p>
            </Link>

            {vehicle.fuel_type ? (
              <p className="mt-3 text-center text-xs text-white/40">
                {labelFor('fuelType', vehicle.fuel_type)} ·{' '}
                {labelFor('transmission', vehicle.transmission)}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  )
}
