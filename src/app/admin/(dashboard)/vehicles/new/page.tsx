import { AdminPageHeader } from '@/components/admin/page-header'
import { VehicleForm } from '@/components/admin/vehicle-form'
import { Alert } from '@/components/ui/surfaces'
import { requireCapability } from '@/lib/auth'

export const metadata = { title: 'Add vehicle' }

export default async function NewVehiclePage() {
  await requireCapability('inventory', '/admin/vehicles/new')

  return (
    <>
      <AdminPageHeader
        title="Add a vehicle"
        description="Fill in the details, then add photos once the listing exists."
        breadcrumbs={[
          { href: '/admin', label: 'Dashboard' },
          { href: '/admin/vehicles', label: 'Vehicles' },
          { label: 'Add vehicle' },
        ]}
      />

      <Alert tone="info" className="mb-6">
        Photos, videos and extra specifications can be added right after you create the vehicle —
        they need a listing to attach to. New vehicles start as a draft, so nothing goes live until
        you publish it.
      </Alert>

      <VehicleForm />
    </>
  )
}
