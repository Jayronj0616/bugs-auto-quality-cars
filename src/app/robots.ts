import type { MetadataRoute } from 'next'

import { getSiteUrl } from '@/lib/env'

/**
 * robots.txt.
 *
 * The dashboard and upload endpoints are disallowed as a courtesy to crawlers -
 * they are already protected by authentication, and every admin page is marked
 * `noindex` in its metadata.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl()

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/admin/', '/api/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
