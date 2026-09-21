import Image from 'next/image'
import { ArrowRight, Calculator, ShieldCheck } from 'lucide-react'

import { ButtonLink } from '@/components/ui/surfaces'
import type { DealershipSettings } from '@/lib/data/settings'
import type { VehicleSummary } from '@/lib/data/vehicles'

import { FeaturedShowcase } from './featured-showcase'

/**
 * Homepage hero.
 *
 * The lead featured vehicle also provides the backdrop, because a real car with
 * a real price communicates "dealership" faster than any stock photograph. With
 * an empty inventory it degrades to a plain statement of what the business does
 * rather than an empty frame.
 */
export function Hero({
  settings,
  featured,
  inventoryCount,
}: {
  settings: DealershipSettings
  /** Featured stock, lead item first. Drives both the backdrop and the card. */
  featured: VehicleSummary[]
  inventoryCount: number
}) {
  const backgroundImage = featured[0]?.images[0]?.url ?? settings.hero_image_url

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
            className="object-cover opacity-70"
          />
          {/*
            Three overlays rather than one flat scrim: the first keeps the
            headline readable on the left while letting the car stay visible on
            the right, the second seats the image into the page, and the third
            lifts overall contrast just enough for white text without muddying
            the photograph.
          */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-brand-950 via-brand-950/80 to-brand-950/10"
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-brand-950 via-brand-950/60 to-transparent"
          />
          <div aria-hidden="true" className="absolute inset-0 bg-brand-950/20" />
        </>
      ) : null}

      {/*
        A faint accent glow behind the headline. Vehicle photography varies
        wildly in brightness, and a dark shot leaves the hero looking like a
        flat black rectangle; this gives it depth regardless of the image, and
        ties the section to the accent colour.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-32 size-[34rem] rounded-full bg-accent-600/18 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -bottom-32 size-[26rem] rounded-full bg-accent-500/10 blur-[110px]"
      />

      {/*
        A real two-column grid on large screens rather than an absolutely
        positioned card: the showcase can no longer collide with the floating
        chat launcher, and the hero grows with its content instead of clipping.
      */}
      <div className="container-page relative py-20 sm:py-28 lg:grid lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-center lg:gap-14 lg:py-32">
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

        {featured.length > 0 ? (
          <div className="mt-12 animate-fade-up lg:mt-0" style={{ animationDelay: '300ms' }}>
            <FeaturedShowcase vehicles={featured} />
          </div>
        ) : null}
      </div>
    </section>
  )
}
