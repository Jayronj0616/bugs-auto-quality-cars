'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Landmark, Pencil, Plus, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/field'
import { ConfirmDialog, Modal } from '@/components/ui/modal'
import { Alert, Card, CardBody, CardHeader, EmptyState } from '@/components/ui/surfaces'
import { LOAN_TERMS } from '@/lib/constants'
import {
  deleteFinancingProvider,
  deleteFinancingRate,
  saveFinancingProvider,
  saveFinancingRate,
} from '@/lib/actions/settings'
import type { FieldErrors } from '@/lib/actions/result'
import { formatDate, formatPercent } from '@/lib/format'
import type { FinancingProviderRow, FinancingRateRow } from '@/types/database'

export type ProviderWithRates = FinancingProviderRow & { rates: FinancingRateRow[] }

/**
 * Financing configuration.
 *
 * A provider holds one rate per term, and a rate can optionally be scoped to a
 * single vehicle - that vehicle-specific row is how a manufacturer promo ("0%
 * for 24 months on the Seal 5") is expressed without a second table. The public
 * calculator picks the vehicle-specific rate over the general one.
 */
export function FinancingManager({
  providers,
  vehicleOptions,
}: {
  providers: ProviderWithRates[]
  vehicleOptions: { id: string; label: string }[]
}) {
  const router = useRouter()
  const [editingProvider, setEditingProvider] = React.useState<
    FinancingProviderRow | 'new' | null
  >(null)
  const [editingRate, setEditingRate] = React.useState<
    { providerId: string; rate: FinancingRateRow | null } | null
  >(null)
  const [confirmProvider, setConfirmProvider] = React.useState<FinancingProviderRow | null>(null)
  const [confirmRate, setConfirmRate] = React.useState<FinancingRateRow | null>(null)
  const [isPending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)

  const run = (action: () => Promise<{ ok: boolean; message?: string }>) => {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (result.ok) {
        setConfirmProvider(null)
        setConfirmRate(null)
        router.refresh()
      } else {
        setError(result.message ?? 'That did not work.')
      }
    })
  }

  const vehicleLabel = (vehicleId: string | null) =>
    vehicleId ? (vehicleOptions.find((option) => option.id === vehicleId)?.label ?? 'One vehicle') : null

  return (
    <div className="space-y-6">
      {error ? (
        <Alert tone="danger" title="Could not complete that change">
          {error}
        </Alert>
      ) : null}

      <div className="flex justify-end">
        <Button type="button" onClick={() => setEditingProvider('new')}>
          <Plus className="size-4" aria-hidden="true" />
          Add provider
        </Button>
      </div>

      {providers.length === 0 ? (
        <EmptyState
          icon={<Landmark className="size-6" aria-hidden="true" />}
          title="No financing providers configured"
          description="Add the banks or in-house financing options you actually work with, then give each one a rate per loan term. Until then the calculator falls back to the dealership default rate."
          action={
            <Button type="button" onClick={() => setEditingProvider('new')}>
              <Plus className="size-4" aria-hidden="true" />
              Add your first provider
            </Button>
          }
        />
      ) : (
        providers.map((provider) => (
          <Card key={provider.id}>
            <CardHeader
              title={
                <span className="inline-flex items-center gap-2">
                  {provider.name}
                  {provider.is_active ? null : <Badge tone="neutral">Inactive</Badge>}
                </span>
              }
              description={provider.description ?? undefined}
              action={
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditingProvider(provider)}
                    aria-label={`Edit ${provider.name}`}
                    className="inline-flex size-9 items-center justify-center rounded-md text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmProvider(provider)}
                    aria-label={`Remove ${provider.name}`}
                    className="inline-flex size-9 items-center justify-center rounded-md text-ink-500 transition-colors hover:bg-danger-50 hover:text-danger-700"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              }
            />

            <CardBody>
              {provider.rates.length === 0 ? (
                <p className="py-3 text-sm text-ink-500">
                  No rates yet — this provider will not appear in the calculator until it has at
                  least one.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-ink-100 text-left text-xs tracking-wide text-ink-500 uppercase">
                        <th scope="col" className="py-2 pr-4 font-semibold">Term</th>
                        <th scope="col" className="py-2 pr-4 font-semibold">Rate</th>
                        <th scope="col" className="py-2 pr-4 font-semibold">Min. down</th>
                        <th scope="col" className="py-2 pr-4 font-semibold">Applies to</th>
                        <th scope="col" className="py-2 pr-4 font-semibold">Valid</th>
                        <th scope="col" className="py-2 text-right font-semibold">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100">
                      {provider.rates.map((rate) => (
                        <tr key={rate.id}>
                          <td className="tabular py-2.5 pr-4 font-medium text-ink-900">
                            {rate.term_months} mo
                          </td>
                          <td className="tabular py-2.5 pr-4 text-ink-800">
                            {formatPercent(rate.interest_rate)}
                          </td>
                          <td className="tabular py-2.5 pr-4 text-ink-800">
                            {formatPercent(rate.minimum_down_payment_percent)}
                          </td>
                          <td className="py-2.5 pr-4 text-ink-600">
                            {vehicleLabel(rate.vehicle_id) ?? 'All vehicles'}
                          </td>
                          <td className="py-2.5 pr-4 text-xs text-ink-500">
                            {rate.is_active ? (
                              rate.valid_from || rate.valid_until ? (
                                <>
                                  {rate.valid_from ? formatDate(rate.valid_from) : 'Now'} –{' '}
                                  {rate.valid_until ? formatDate(rate.valid_until) : 'Ongoing'}
                                </>
                              ) : (
                                'Always'
                              )
                            ) : (
                              <span className="text-ink-400">Inactive</span>
                            )}
                          </td>
                          <td className="py-2.5">
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => setEditingRate({ providerId: provider.id, rate })}
                                aria-label={`Edit the ${rate.term_months} month rate`}
                                className="inline-flex size-8 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
                              >
                                <Pencil className="size-3.5" aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmRate(rate)}
                                aria-label={`Remove the ${rate.term_months} month rate`}
                                className="inline-flex size-8 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-danger-50 hover:text-danger-700"
                              >
                                <Trash2 className="size-3.5" aria-hidden="true" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setEditingRate({ providerId: provider.id, rate: null })}
              >
                <Plus className="size-4" aria-hidden="true" />
                Add rate
              </Button>
            </CardBody>
          </Card>
        ))
      )}

      <Modal
        open={editingProvider !== null}
        onClose={() => setEditingProvider(null)}
        title={editingProvider === 'new' ? 'Add financing provider' : 'Edit provider'}
        size="md"
      >
        {editingProvider !== null ? (
          <ProviderForm
            provider={editingProvider === 'new' ? null : editingProvider}
            onDone={() => {
              setEditingProvider(null)
              router.refresh()
            }}
          />
        ) : null}
      </Modal>

      <Modal
        open={editingRate !== null}
        onClose={() => setEditingRate(null)}
        title={editingRate?.rate ? 'Edit rate' : 'Add rate'}
        size="md"
      >
        {editingRate !== null ? (
          <RateForm
            providerId={editingRate.providerId}
            rate={editingRate.rate}
            vehicleOptions={vehicleOptions}
            onDone={() => {
              setEditingRate(null)
              router.refresh()
            }}
          />
        ) : null}
      </Modal>

      <ConfirmDialog
        open={confirmProvider !== null}
        onClose={() => setConfirmProvider(null)}
        onConfirm={() =>
          confirmProvider && run(() => deleteFinancingProvider(confirmProvider.id))
        }
        title="Remove this provider?"
        message={
          <>
            <strong>{confirmProvider?.name}</strong> and all of its rates will be removed from the
            calculator. Past inquiries that named this provider are kept — they simply stop showing
            a provider.
          </>
        }
        confirmLabel="Remove provider"
        isPending={isPending}
      />

      <ConfirmDialog
        open={confirmRate !== null}
        onClose={() => setConfirmRate(null)}
        onConfirm={() => confirmRate && run(() => deleteFinancingRate(confirmRate.id))}
        title="Remove this rate?"
        message={`The ${confirmRate?.term_months}-month option will no longer be offered for this provider.`}
        confirmLabel="Remove rate"
        isPending={isPending}
      />
    </div>
  )
}

function ProviderForm({
  provider,
  onDone,
}: {
  provider: FinancingProviderRow | null
  onDone: () => void
}) {
  const [isPending, startTransition] = React.useTransition()
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({})
  const [formError, setFormError] = React.useState<string | null>(null)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setFieldErrors({})
    setFormError(null)

    startTransition(async () => {
      const result = await saveFinancingProvider({
        providerId: provider?.id ?? null,
        name: String(form.get('name') ?? ''),
        slug: String(form.get('slug') ?? ''),
        description: String(form.get('description') ?? ''),
        logoUrl: String(form.get('logoUrl') ?? ''),
        isActive: form.get('isActive') === 'on',
        sortOrder: String(form.get('sortOrder') ?? '0'),
      })

      if (result.ok) onDone()
      else {
        setFormError(result.message)
        setFieldErrors(result.fieldErrors ?? {})
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {formError ? (
        <Alert tone="danger" title="Could not save">
          {formError}
        </Alert>
      ) : null}

      <Field label="Name" required error={fieldErrors.name}>
        <Input name="name" required defaultValue={provider?.name ?? ''} placeholder="BDO" />
      </Field>

      <Field
        label="URL slug"
        error={fieldErrors.slug}
        description="Leave blank to generate it from the name."
      >
        <Input name="slug" defaultValue={provider?.slug ?? ''} />
      </Field>

      <Field label="Description" error={fieldErrors.description}>
        <Textarea
          name="description"
          rows={3}
          defaultValue={provider?.description ?? ''}
          placeholder="Requirements, processing time, or anything customers should know."
        />
      </Field>

      <Field label="Logo URL" error={fieldErrors.logoUrl}>
        <Input name="logoUrl" type="url" defaultValue={provider?.logo_url ?? ''} />
      </Field>

      <Field label="Display order" error={fieldErrors.sortOrder}>
        <Input
          name="sortOrder"
          type="number"
          min={0}
          max={999}
          defaultValue={provider?.sort_order ?? 0}
        />
      </Field>

      <Checkbox
        name="isActive"
        label="Active"
        hint="Inactive providers are hidden from the public calculator."
        defaultChecked={provider?.is_active ?? true}
      />

      <div className="flex justify-end pt-1">
        <Button type="submit" isLoading={isPending} loadingText="Saving…">
          {provider ? 'Save provider' : 'Add provider'}
        </Button>
      </div>
    </form>
  )
}

function RateForm({
  providerId,
  rate,
  vehicleOptions,
  onDone,
}: {
  providerId: string
  rate: FinancingRateRow | null
  vehicleOptions: { id: string; label: string }[]
  onDone: () => void
}) {
  const [isPending, startTransition] = React.useTransition()
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({})
  const [formError, setFormError] = React.useState<string | null>(null)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setFieldErrors({})
    setFormError(null)

    startTransition(async () => {
      const result = await saveFinancingRate({
        rateId: rate?.id ?? null,
        providerId,
        vehicleId: String(form.get('vehicleId') ?? ''),
        termMonths: String(form.get('termMonths') ?? ''),
        interestRate: String(form.get('interestRate') ?? ''),
        minimumDownPaymentPercent: String(form.get('minimumDownPaymentPercent') ?? ''),
        isActive: form.get('isActive') === 'on',
        validFrom: String(form.get('validFrom') ?? ''),
        validUntil: String(form.get('validUntil') ?? ''),
      })

      if (result.ok) onDone()
      else {
        setFormError(result.message)
        setFieldErrors(result.fieldErrors ?? {})
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {formError ? (
        <Alert tone="danger" title="Could not save">
          {formError}
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Loan term" required error={fieldErrors.termMonths}>
          <Select name="termMonths" defaultValue={rate?.term_months ?? 60}>
            {LOAN_TERMS.map((term) => (
              <option key={term} value={term}>
                {term} months
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Interest rate (%)" required error={fieldErrors.interestRate}>
          <Input
            name="interestRate"
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step="0.25"
            required
            defaultValue={rate?.interest_rate ?? ''}
          />
        </Field>

        <Field
          label="Minimum down payment (%)"
          required
          error={fieldErrors.minimumDownPaymentPercent}
          className="sm:col-span-2"
        >
          <Input
            name="minimumDownPaymentPercent"
            type="number"
            inputMode="decimal"
            min={0}
            max={99}
            step="0.5"
            required
            defaultValue={rate?.minimum_down_payment_percent ?? 20}
          />
        </Field>
      </div>

      <Field
        label="Applies to"
        error={fieldErrors.vehicleId}
        description="Choose a vehicle to override this provider's general rate for that unit only."
      >
        <Select name="vehicleId" defaultValue={rate?.vehicle_id ?? ''}>
          <option value="">All vehicles</option>
          {vehicleOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Valid from"
          error={fieldErrors.validFrom}
          description="Optional."
        >
          <Input name="validFrom" type="date" defaultValue={rate?.valid_from ?? ''} />
        </Field>

        <Field label="Valid until" error={fieldErrors.validUntil} description="Optional.">
          <Input name="validUntil" type="date" defaultValue={rate?.valid_until ?? ''} />
        </Field>
      </div>

      <Checkbox name="isActive" label="Active" defaultChecked={rate?.is_active ?? true} />

      <div className="flex justify-end pt-1">
        <Button type="submit" isLoading={isPending} loadingText="Saving…">
          {rate ? 'Save rate' : 'Add rate'}
        </Button>
      </div>
    </form>
  )
}
