import 'server-only'

import { revalidatePath } from 'next/cache'

/**
 * Cache invalidation after an admin write.
 *
 * Storefront pages are statically rendered with ISR, so a vehicle edited in the
 * dashboard would otherwise keep serving the old version until its revalidate
 * window expired. Calling this makes "save" mean "live", which is what an
 * administrator expects.
 */

/** Pages that show inventory in aggregate, so any vehicle change affects them. */
export function revalidateInventory(slug?: string | null) {
  revalidatePath('/')
  revalidatePath('/cars')
  revalidatePath('/sitemap.xml')
  if (slug) revalidatePath(`/cars/${slug}`)
  revalidatePath('/admin/vehicles')
  revalidatePath('/admin')
}

/** Contact details appear in the shell, so every public page has to be refreshed. */
export function revalidateSiteWide() {
  revalidatePath('/', 'layout')
  revalidatePath('/admin/settings')
  revalidatePath('/admin')
}

/** Financing configuration feeds the calculator on every vehicle page. */
export function revalidateFinancing() {
  revalidatePath('/financing')
  revalidatePath('/cars', 'layout')
  revalidatePath('/admin/financing')
}

export function revalidateCrm() {
  revalidatePath('/admin')
  revalidatePath('/admin/inquiries')
  revalidatePath('/admin/test-drives')
}
