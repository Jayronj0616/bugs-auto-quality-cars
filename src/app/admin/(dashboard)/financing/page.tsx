import { AdminPageHeader } from '@/components/admin/page-header'
import { FinancingManager, type ProviderWithRates } from '@/components/admin/financing-manager'
import { Alert } from '@/components/ui/surfaces'
import { requireCapability } from '@/lib/auth'
import { listVehicleOptionsForAdmin } from '@/lib/data/admin-vehicles'
import { getDealershipSettings } from '@/lib/data/settings'
import { formatPercent } from '@/lib/format'
import type { FinancingProviderRow, FinancingRateRow } from '@/types/database'

export const metadata = { title: 'Financing' }

export default async function FinancingPage() {
  const session = await requireCapability('financing', '/admin/financing')

  const [{ data: providerRows }, { data: rateRows }, vehicleOptions, settings] = await Promise.all([
    session.supabase
      .from('financing_providers')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    session.supabase
      .from('financing_rates')
      .select('*')
      .order('term_months', { ascending: true }),
    listVehicleOptionsForAdmin(session),
    getDealershipSettings(),
  ])

  const rates = (rateRows ?? []) as FinancingRateRow[]

  const providers: ProviderWithRates[] = ((providerRows ?? []) as FinancingProviderRow[]).map(
    (provider) => ({
      ...provider,
      rates: rates.filter((rate) => rate.provider_id === provider.id),
    }),
  )

  return (
    <>
      <AdminPageHeader
        title="Financing"
        description="The providers and rates the public calculator offers."
        breadcrumbs={[{ href: '/admin', label: 'Dashboard' }, { label: 'Financing' }]}
      />

      <Alert tone="info" className="mb-6">
        <p>
          Configure only the partners you actually work with — these appear to customers as your
          financing options. When no provider offers a given term, the calculator falls back to your
          default rate of {formatPercent(settings.default_interest_rate)}, editable under{' '}
          <span className="font-medium">Settings</span>.
        </p>
        <p className="mt-1.5">
          Every figure is presented as an estimate, never as an approved offer.
        </p>
      </Alert>

      <FinancingManager providers={providers} vehicleOptions={vehicleOptions} />
    </>
  )
}
