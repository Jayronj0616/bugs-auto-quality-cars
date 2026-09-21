import { AdminPageHeader } from '@/components/admin/page-header'
import { SettingsForm } from '@/components/admin/settings-form'
import { Alert } from '@/components/ui/surfaces'
import { requireCapability } from '@/lib/auth'
import { getDealershipSettings, hasContactDetails } from '@/lib/data/settings'

export const metadata = { title: 'Dealership settings' }

export default async function SettingsPage() {
  await requireCapability('settings', '/admin/settings')
  const settings = await getDealershipSettings()

  return (
    <>
      <AdminPageHeader
        title="Dealership settings"
        description="One place for your contact details. Everything here appears across the public website automatically."
        breadcrumbs={[{ href: '/admin', label: 'Dashboard' }, { label: 'Settings' }]}
      />

      {!hasContactDetails(settings) ? (
        <Alert tone="warning" title="Customers cannot contact you yet" className="mb-6">
          No phone number, email address or Facebook page is configured, so the website is not
          showing any way to get in touch. Add at least one below.
        </Alert>
      ) : null}

      <SettingsForm settings={settings} />
    </>
  )
}
