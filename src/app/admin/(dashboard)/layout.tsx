import type { Metadata } from 'next'

import { AdminShell } from '@/components/admin/admin-shell'
import { navigationFor } from '@/components/admin/navigation'
import { requireAdmin } from '@/lib/auth'
import { getDealershipSettings } from '@/lib/data/settings'

export const metadata: Metadata = {
  title: { default: 'Dashboard', template: '%s | BUGS Auto Dashboard' },
  robots: { index: false, follow: false },
}

/**
 * Never prerender anything under /admin.
 *
 * Without this, a dashboard page whose render short-circuits into
 * `redirect('/admin/login')` during the build gets cached as a *static 307* -
 * which then bounces signed-in admins straight back to the login screen. The
 * pages are also per-user by definition, so caching them is never correct.
 */
export const dynamic = 'force-dynamic'

/**
 * Protected dashboard shell.
 *
 * `requireAdmin` runs on every request into this segment: proxy.ts has already
 * confirmed there is a session, and this confirms the session belongs to an
 * *active admin*. Each page then re-checks the specific capability it needs, and
 * RLS backs all of it at the database.
 *
 * Reading cookies makes everything below here dynamic, which is correct - none
 * of it should ever be cached or prerendered.
 */
export default async function AdminDashboardLayout({ children }: LayoutProps<'/admin'>) {
  const session = await requireAdmin()
  const settings = await getDealershipSettings()

  return (
    <AdminShell
      navigation={navigationFor(session.profile.role)}
      businessName={settings.business_name}
      adminName={session.profile.name}
      adminRole={session.profile.role}
    >
      {children}
    </AdminShell>
  )
}
