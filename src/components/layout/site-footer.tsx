import Link from 'next/link'
import { Facebook, Instagram, Mail, MapPin, Phone } from 'lucide-react'

import { formatAddress, sortedBusinessHours, type DealershipSettings } from '@/lib/data/settings'
import { formatTime, toMailtoHref, toTelHref } from '@/lib/format'
import { titleCase } from '@/lib/constants'

import { Brand } from './brand'

const EXPLORE_LINKS = [
  { href: '/cars', label: 'Browse cars' },
  { href: '/cars?featured=1', label: 'Featured vehicles' },
  { href: '/cars?promo=1', label: 'Promo units' },
  { href: '/financing', label: 'Financing calculator' },
]

const COMPANY_LINKS = [
  { href: '/about', label: 'About us' },
  { href: '/contact', label: 'Contact' },
  { href: '/cars?condition=used', label: 'Pre-owned' },
]

export function SiteFooter({ settings }: { settings: DealershipSettings }) {
  const telHref = toTelHref(settings.phone)
  const mailtoHref = toMailtoHref(settings.email)
  const address = formatAddress(settings)
  const hours = sortedBusinessHours(settings)
  const year = new Date().getFullYear()

  return (
    <footer className="mt-auto bg-brand-900 text-white">
      <div className="container-page py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Brand settings={settings} tone="light" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">
              {settings.tagline ??
                'Quality vehicles, transparent pricing and straightforward financing.'}
            </p>

            {settings.facebook_url || settings.instagram_url ? (
              <div className="mt-6 flex gap-2">
                {settings.facebook_url ? (
                  <a
                    href={settings.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex size-10 items-center justify-center rounded-md border border-white/15 text-white/70 transition-colors hover:border-white/30 hover:text-white"
                    aria-label={`${settings.business_name} on Facebook`}
                  >
                    <Facebook className="size-4" aria-hidden="true" />
                  </a>
                ) : null}
                {settings.instagram_url ? (
                  <a
                    href={settings.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex size-10 items-center justify-center rounded-md border border-white/15 text-white/70 transition-colors hover:border-white/30 hover:text-white"
                    aria-label={`${settings.business_name} on Instagram`}
                  >
                    <Instagram className="size-4" aria-hidden="true" />
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>

          <nav className="lg:col-span-2" aria-labelledby="footer-explore">
            <h2 id="footer-explore" className="eyebrow text-white/45">
              Explore
            </h2>
            <ul className="mt-4 space-y-2.5">
              {EXPLORE_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/70 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav className="lg:col-span-2" aria-labelledby="footer-company">
            <h2 id="footer-company" className="eyebrow text-white/45">
              Company
            </h2>
            <ul className="mt-4 space-y-2.5">
              {COMPANY_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/70 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="lg:col-span-4">
            <h2 className="eyebrow text-white/45">Get in touch</h2>
            <ul className="mt-4 space-y-3 text-sm text-white/70">
              {telHref ? (
                <li>
                  <a href={telHref} className="inline-flex items-start gap-2.5 transition-colors hover:text-white">
                    <Phone className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <span>{settings.phone}</span>
                  </a>
                </li>
              ) : null}

              {mailtoHref ? (
                <li>
                  <a href={mailtoHref} className="inline-flex items-start gap-2.5 transition-colors hover:text-white">
                    <Mail className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <span className="break-all">{settings.email}</span>
                  </a>
                </li>
              ) : null}

              {address ? (
                <li>
                  {settings.google_maps_url ? (
                    <a
                      href={settings.google_maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-start gap-2.5 transition-colors hover:text-white"
                    >
                      <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                      <span>{address}</span>
                    </a>
                  ) : (
                    <span className="inline-flex items-start gap-2.5">
                      <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                      <span>{address}</span>
                    </span>
                  )}
                </li>
              ) : null}
            </ul>

            {hours.length > 0 ? (
              <div className="mt-6">
                <h3 className="eyebrow text-white/45">Business hours</h3>
                <dl className="mt-3 space-y-1.5 text-sm">
                  {hours.map((entry) => (
                    <div key={entry.day} className="flex justify-between gap-4">
                      <dt className="text-white/50">{titleCase(entry.day)}</dt>
                      <dd className="tabular text-white/75">
                        {entry.closed
                          ? 'Closed'
                          : `${formatTime(entry.open)} – ${formatTime(entry.close)}`}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-3 py-5 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {settings.business_name}. All rights reserved.
          </p>
          <p>
            Vehicle prices and financing estimates are indicative and subject to change without
            notice.
          </p>
        </div>
      </div>
    </footer>
  )
}
