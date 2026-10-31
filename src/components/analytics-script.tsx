'use client'

import { OpenPanelComponent } from '@openpanel/nextjs'
import { usePathname } from 'next/navigation'

const CLIENT_ID = process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID

/**
 * Anonymous visitor analytics. Inert until NEXT_PUBLIC_OPENPANEL_CLIENT_ID is
 * set, and never loaded on the admin dashboard.
 */
export function AnalyticsScript() {
  const pathname = usePathname()

  if (!CLIENT_ID || pathname.startsWith('/admin')) return null

  return (
    <OpenPanelComponent
      clientId={CLIENT_ID}
      apiUrl="/api/op"
      scriptUrl="/api/op/op1.js"
      trackScreenViews
      trackOutgoingLinks
      trackAttributes
    />
  )
}
