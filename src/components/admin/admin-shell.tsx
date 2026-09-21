'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ExternalLink, LogOut, Menu, X } from 'lucide-react'

import { signOut } from '@/lib/actions/admin-auth'
import { labelFor } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { AdminRole } from '@/types/database'

import { isActiveNavItem, navigationFor } from './navigation'

/**
 * Admin chrome: fixed sidebar on desktop, slide-over drawer below `lg`.
 *
 * The navigation is derived here from the role rather than passed in from the
 * server layout. Nav items carry a Lucide icon *component*, and React cannot
 * serialize a function across the server/client boundary - passing the built
 * list in throws "Only plain objects can be passed to Client Components".
 *
 * Deriving it client-side is not a weakening of access control: this only
 * decides what is rendered. Every page still calls `requireCapability`, and
 * RLS enforces the same matrix in the database.
 */
export function AdminShell({
  businessName,
  adminName,
  adminRole,
  children,
}: {
  businessName: string
  adminName: string
  adminRole: AdminRole
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const navigation = React.useMemo(() => navigationFor(adminRole), [adminRole])

  // Derived from "which page was open when the drawer was opened", so
  // navigating closes it without an effect watching the route.
  const [openedOn, setOpenedOn] = React.useState<string | null>(null)
  const drawerOpen = openedOn === pathname

  React.useEffect(() => {
    if (!drawerOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenedOn(null)
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [drawerOpen])

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-white/10 px-5">
        <span
          aria-hidden="true"
          className="flex size-8 items-center justify-center rounded-md bg-accent-500 font-display text-xs font-bold text-ink-950"
        >
          {businessName.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{businessName}</p>
          <p className="text-[10px] tracking-[0.14em] text-white/40 uppercase">Dashboard</p>
        </div>
      </div>

      <nav aria-label="Dashboard" className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const active = isActiveNavItem(item, pathname)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-white/10 text-white'
                      : 'text-white/60 hover:bg-white/5 hover:text-white',
                  )}
                >
                  <item.icon className="size-4.5 shrink-0" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-white/10 p-3">
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white"
        >
          <ExternalLink className="size-4.5 shrink-0" aria-hidden="true" />
          View website
        </Link>

        <div className="mt-2 rounded-md bg-white/5 px-3 py-2.5">
          <p className="truncate text-sm font-medium text-white">{adminName}</p>
          <p className="text-xs text-white/45">{labelFor('adminRole', adminRole)}</p>

          <form action={signOut} className="mt-2.5">
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogOut className="size-3.5" aria-hidden="true" />
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-dvh bg-ink-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 bg-brand-900 lg:block">{sidebar}</aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-ink-200 bg-white px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setOpenedOn(pathname)}
          className="-ml-2 inline-flex size-10 items-center justify-center rounded-md text-ink-700 transition-colors hover:bg-ink-100"
          aria-label="Open dashboard menu"
          aria-expanded={drawerOpen}
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>
        <p className="truncate text-sm font-semibold text-ink-900">{businessName} Dashboard</p>
      </div>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 animate-fade-in bg-brand-900/60"
            onClick={() => setOpenedOn(null)}
            aria-label="Close dashboard menu"
            tabIndex={-1}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Dashboard navigation"
            className="absolute inset-y-0 left-0 w-[min(17rem,85vw)] animate-fade-in bg-brand-900 shadow-panel"
          >
            <button
              type="button"
              onClick={() => setOpenedOn(null)}
              className="absolute top-3.5 right-3 rounded-md p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close dashboard menu"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
            {sidebar}
          </div>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}
