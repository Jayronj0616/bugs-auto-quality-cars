import { AdminPageHeader } from '@/components/admin/page-header'
import { PastDealForm } from '@/components/admin/past-deal-form'
import { Alert } from '@/components/ui/surfaces'
import { requireCapability } from '@/lib/auth'

export const metadata = { title: 'Add a sold vehicle' }

export default async function NewPastDealPage() {
  await requireCapability('inventory', '/admin/sold-vehicles/new')

  return (
    <>
      <AdminPageHeader
        title="Add a sold vehicle"
        description="For units already sold, with nothing left on record but photos and a name."
        breadcrumbs={[
          { href: '/admin', label: 'Dashboard' },
          { href: '/admin/sold-vehicles', label: 'Sold Archive' },
          { label: 'Add sold vehicle' },
        ]}
      />

      <Alert tone="info" className="mb-6">
        Photos need an entry to attach to, so add those right after you save this. This is for
        past sales with no price or specs on record - a real listing that later gets sold should
        stay a vehicle in the main Vehicles list, not move here.
      </Alert>

      <PastDealForm />
    </>
  )
}
