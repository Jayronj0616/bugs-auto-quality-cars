'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'

import { useIsHydrated } from '@/lib/hooks'

/**
 * Renders children into <body>, outside whatever markup they are written in.
 *
 * `position: fixed` is only relative to the viewport while no ancestor creates
 * a containing block for it. `transform`, `filter`, `backdrop-filter`,
 * `perspective`, `contain` and `will-change` all do - and the site header is
 * `backdrop-blur`, so a `fixed inset-0` overlay written inside it was sized to
 * the 64px header bar and pushed off the right edge of the screen instead of
 * covering it.
 *
 * Escaping to <body> fixes that at the root and keeps it fixed: a decorative
 * blur or transform added to some wrapper later cannot trap the overlay again.
 *
 * Renders nothing until hydration, because there is no document to portal into
 * on the server. Overlays open from a click, so nothing is ever missing from
 * the server-rendered page.
 */
export function Portal({ children }: { children: React.ReactNode }) {
  const hydrated = useIsHydrated()
  if (!hydrated) return null
  return createPortal(children, document.body)
}
