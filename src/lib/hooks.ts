'use client'

import { useSyncExternalStore } from 'react'

const noopSubscribe = () => () => {}

/**
 * True only after hydration.
 *
 * For values that can only be correct in the browser - "today", the visitor's
 * clock - where computing them during server render would bake a build-time
 * answer into a static page and then mismatch on hydration.
 *
 * `useSyncExternalStore` gives React an explicit server snapshot (`false`) and
 * client snapshot (`true`), so this needs no state and no effect.
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  )
}
