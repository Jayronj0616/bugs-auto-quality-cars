'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Facebook, Mail, Menu, Phone, X } from 'lucide-react'

import { cn } from '@/lib/utils'

export type NavLink = { href: string; label: string }

export type MobileContact = {
  telHref: string | null
  phoneLabel: string | null
  mailtoHref: string | null
  emailLabel: string | null
  facebookUrl: string | null
}

/**
 * Mobile navigation drawer.
 *
 * Closes on route change and on Escape, locks background scroll while open, and
 * moves focus to the panel so a keyboard or screen-reader user is not left
 * behind on the page underneath.
 */
export function MobileNav({ links, contact }: { links: NavLink[]; contact: MobileContact }) {
  const pathname = usePathname()
  const panelRef = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  // The drawer is derived from "which page was open when it was opened", so a
  // navigation closes it automatically - no effect watching the pathname, and
  // no window where the drawer lingers over the new page.
  const [openedOn, setOpenedOn] = React.useState<string | null>(null)
  const open = openedOn === pathname

  const setOpen = React.useCallback(
    (next: boolean) => setOpenedOn(next ? pathname : null),
    [pathname],
  )

  React.useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, setOpen])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex size-10 items-center justify-center rounded-md text-white transition-colors hover:bg-white/10 lg:hidden"
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
      >
        <Menu className="size-6" aria-hidden="true" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 animate-fade-in bg-brand-900/60 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            tabIndex={-1}
          />

          <div
            ref={panelRef}
            id="mobile-nav-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
            tabIndex={-1}
            className="absolute inset-y-0 right-0 flex w-[min(20rem,88vw)] animate-slide-in-right flex-col bg-brand-900 text-white shadow-panel outline-none"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <span className="eyebrow text-white/50">Menu</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="-m-1.5 rounded-md p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Close menu"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4">
              <ul className="space-y-1">
                {links.map((link) => {
                  const isActive =
                    link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className={cn(
                          'block rounded-md px-3 py-3 text-base font-medium transition-colors',
                          isActive ? 'bg-white/10 text-white' : 'text-white/75 hover:bg-white/5',
                        )}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        {link.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>

            <div className="space-y-2 border-t border-white/10 px-5 py-5">
              <Link
                href="/contact"
                className="flex h-11 w-full items-center justify-center rounded-md bg-accent-500 text-sm font-semibold text-ink-950 transition-colors hover:bg-accent-600"
              >
                Inquire Now
              </Link>

              {contact.telHref ? (
                <a
                  href={contact.telHref}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-white/20 text-sm font-medium text-white transition-colors hover:bg-white/10"
                >
                  <Phone className="size-4" aria-hidden="true" />
                  {contact.phoneLabel}
                </a>
              ) : null}

              {contact.mailtoHref ? (
                <a
                  href={contact.mailtoHref}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-white/20 text-sm font-medium text-white transition-colors hover:bg-white/10"
                >
                  <Mail className="size-4" aria-hidden="true" />
                  {contact.emailLabel}
                </a>
              ) : null}

              {contact.facebookUrl ? (
                <a
                  href={contact.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-white/20 text-sm font-medium text-white transition-colors hover:bg-white/10"
                >
                  <Facebook className="size-4" aria-hidden="true" />
                  Facebook
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
