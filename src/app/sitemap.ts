import type { MetadataRoute } from 'next'

import { getPublishedVehicleSlugs } from '@/lib/data/vehicles'
import { getSiteUrl } from '@/lib/env'

/**
 * Sitemap.
 *
 * Built from the database, so publishing a vehicle adds it automatically.
 * Admin routes are excluded here and disallowed in robots.txt.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl()
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/cars`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/financing`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
  ]

  const vehicles = await getPublishedVehicleSlugs()

  return [
    ...staticRoutes,
    ...vehicles.map((vehicle) => ({
      url: `${baseUrl}/cars/${vehicle.slug}`,
      lastModified: new Date(vehicle.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}
