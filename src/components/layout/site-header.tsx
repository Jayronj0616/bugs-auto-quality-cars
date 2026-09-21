import Link from 'next/link'
import { MapPin, Phone } from 'lucide-react'

import { formatShortAddress, type DealershipSettings } from '@/lib/data/settings'
import { toMailtoHref, toTelHref } from '@/lib/format'

import { Brand } from './brand'
import { MobileNav, type NavLink } from './mobile-nav'
import { ActiveNavLink } from './active-nav-link'
import { TodayHours } from './today-hours'
import { FacebookIcon } from '@/components/ui/brand-icons'

export const NAV_LINKS: NavLink[] = [
  { href: '/cars', label: 'Cars' },
  { href: '/financing', label: 'Financing' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
]

/**
 * Site header.
 *
 * Every contact detail below comes from `dealership_settings`, and each one is
 * conditional: if the dealership has not configured a phone number yet, the
 * call shortcut simply is not rendered - no placeholder that reads as real.
 */
export function SiteHeader({ settings }: { settings: DealershipSettings }) {
  const telHref = toTelHref(settings.phone)
  const mailtoHref = toMailtoHref(settings.email)
  const shortAddress = formatShortAddress(settings)

  return (
    <header className="sticky top-0 z-40 bg-brand-900/95 backdrop-blur supports-[backdrop-filter]:bg-brand-900/85">
      {/* Announcement / contact bar - desktop only, it is noise on a phone. */}
      {telHref || shortAddress || settings.business_hours.length > 0 ? (
        <div className="hidden border-b border-white/10 lg:block">
          <div className="container-page flex h-9 items-center justify-between text-xs text-white/60">
            <div className="flex items-center gap-5">
              {shortAddress ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5" aria-hidden="true" />
                  {shortAddress}
                </span>
              ) : null}
              <TodayHours
                hours={settings.business_hours}
                className="inline-flex items-center gap-1.5"
              />
            </div>

            <div className="flex items-center gap-5">
              {telHref ? (
                <a
                  href={telHref}
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-white"
                >
                  <Phone className="size-3.5" aria-hidden="true" />
                  {settings.phone}
                </a>
              ) : null}
              {settings.facebook_url ? (
                <a
                  href={settings.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-white"
                >
                  <FacebookIcon className="size-3.5" aria-hidden="true" />
                  Facebook
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Brand settings={settings} tone="light" />

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <ActiveNavLink href={link.href}>{link.label}</ActiveNavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          {telHref ? (
            <a
              href={telHref}
              className="hidden h-10 items-center gap-2 rounded-md border border-white/20 px-3.5 text-sm font-medium text-white transition-colors hover:bg-white/10 lg:inline-flex"
            >
              <Phone className="size-4" aria-hidden="true" />
              Call
            </a>
          ) : null}

          <Link
            href="/contact"
            className="hidden h-10 items-center rounded-md bg-accent-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-700 sm:inline-flex"
          >
            Inquire Now
          </Link>

          <MobileNav
            links={NAV_LINKS}
            contact={{
              telHref,
              phoneLabel: settings.phone,
              mailtoHref,
              emailLabel: settings.email,
              facebookUrl: settings.facebook_url,
            }}
          />
        </div>
      </div>
    </header>
  )
}

