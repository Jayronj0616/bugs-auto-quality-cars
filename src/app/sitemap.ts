import type { MetadataRoute } from 'next'

import { getPublishedPastDealSlugs } from '@/lib/data/past-deals'
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
    { url: `${baseUrl}/sold`, lastModified: now, changeFrequency: 'weekly', priority: 0.4 },
  ]

  const [vehicles, pastDeals] = await Promise.all([
    getPublishedVehicleSlugs(),
    getPublishedPastDealSlugs(),
  ])

  return [
    ...staticRoutes,
    ...vehicles.map((vehicle) => ({
      url: `${baseUrl}/cars/${vehicle.slug}`,
      lastModified: new Date(vehicle.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...pastDeals.map((deal) => ({
      url: `${baseUrl}/sold/${deal.slug}`,
      lastModified: new Date(deal.updated_at),
      changeFrequency: 'monthly' as const,
      priority: 0.3,
    })),
  ]
}
