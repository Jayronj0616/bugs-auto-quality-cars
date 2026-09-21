'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Check, Save } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/field'
import { Alert, Card, CardBody, CardHeader } from '@/components/ui/surfaces'
import {
  BODY_TYPES,
  DRIVE_TYPES,
  FUEL_TYPES,
  LOAN_TERMS,
  TRANSMISSIONS,
  VEHICLE_CONDITIONS,
  VEHICLE_STATUSES,
} from '@/lib/constants'
import { saveVehicle } from '@/lib/actions/vehicles'
import type { FieldErrors } from '@/lib/actions/result'
import { buildVehicleSlug, slugify } from '@/lib/utils'
import type { AdminVehicleDetail } from '@/lib/data/admin-vehicles'

/**
 * Vehicle create/edit form.
 *
 * Split into labelled sections rather than one long column, matching how a
 * salesperson actually fills a listing in: identify the car, price it, describe
 * it, then decide whether it goes live.
 *
 * Uncontrolled inputs read through FormData on submit - there is no reason to
 * re-render forty fields on every keystroke. The slug is the one exception: it
 * previews live so the admin can see the URL the listing will get.
 */
export function VehicleForm({ vehicle }: { vehicle?: AdminVehicleDetail | null }) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({})
  const [formError, setFormError] = React.useState<string | null>(null)
  const [savedMessage, setSavedMessage] = React.useState<string | null>(null)
  const statusRef = React.useRef<HTMLDivElement>(null)

  // Live slug preview, derived from the identity fields until it is edited.
  const [identity, setIdentity] = React.useState({
    brand: vehicle?.brand ?? '',
    model: vehicle?.model ?? '',
    variant: vehicle?.variant ?? '',
    year: String(vehicle?.year ?? new Date().getFullYear()),
  })
  const [slug, setSlug] = React.useState(vehicle?.slug ?? '')
  const [slugEdited, setSlugEdited] = React.useState(Boolean(vehicle?.slug))

  const previewSlug = slugEdited
    ? slug
    : buildVehicleSlug({
        brand: identity.brand,
        model: identity.model,
        variant: identity.variant,
        year: Number(identity.year) || new Date().getFullYear(),
      })

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setFieldErrors({})
    setFormError(null)
    setSavedMessage(null)

    const text = (key: string) => String(form.get(key) ?? '')

    const payload = {
      vehicleId: vehicle?.id ?? null,
      brand: text('brand'),
      model: text('model'),
      variant: text('variant'),
      slug: slugEdited ? slug : previewSlug,
      year: text('year'),
      condition: text('condition'),
      bodyType: text('bodyType') || null,
      fuelType: text('fuelType') || null,
      transmission: text('transmission') || null,
      driveType: text('driveType') || null,
      seatingCapacity: text('seatingCapacity'),
      mileage: text('mileage'),
      exteriorColor: text('exteriorColor'),
      interiorColor: text('interiorColor'),
      plateEnding: text('plateEnding'),
      engine: text('engine'),
      powerHp: text('powerHp'),
      torqueNm: text('torqueNm'),
      description: text('description'),
      features: text('features'),
      srp: text('srp'),
      sellingPrice: text('sellingPrice'),
      promoPrice: text('promoPrice'),
      promoLabel: text('promoLabel'),
      promoStartsAt: text('promoStartsAt'),
      promoEndsAt: text('promoEndsAt'),
      defaultDownPaymentPercent: text('defaultDownPaymentPercent'),
      defaultTermMonths: text('defaultTermMonths'),
      status: text('status'),
      isFeatured: form.get('isFeatured') === 'on',
      isPromoted: form.get('isPromoted') === 'on',
      metaTitle: text('metaTitle'),
      metaDescription: text('metaDescription'),
    }

    startTransition(async () => {
      const result = await saveVehicle(payload as Parameters<typeof saveVehicle>[0])

      if (!result.ok) {
        setFormError(result.message)
        setFieldErrors(result.fieldErrors ?? {})
        statusRef.current?.focus()
        statusRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
        return
      }

      if (!vehicle) {
        // A new vehicle needs its own URL before photos can be attached to it.
        router.push(`/admin/vehicles/${result.data.vehicleId}?created=1`)
        return
      }

      setSavedMessage(result.message ?? 'Saved.')
      setSlug(result.data.slug)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <div ref={statusRef} tabIndex={-1} className="outline-none">
        {formError ? (
          <Alert tone="danger" title="Could not save this vehicle">
            {formError}
          </Alert>
        ) : null}
        {savedMessage ? (
          <Alert tone="success">
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-4" aria-hidden="true" />
              {savedMessage}
            </span>
          </Alert>
        ) : null}
      </div>

      <Card>
        <CardHeader
          title="Basic information"
          description="What the vehicle is. This drives the listing title and its web address."
        />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Brand" required error={fieldErrors.brand}>
            <Input
              name="brand"
              required
              defaultValue={vehicle?.brand ?? ''}
              placeholder="Toyota"
              onChange={(event) =>
                setIdentity((current) => ({ ...current, brand: event.target.value }))
              }
            />
          </Field>

          <Field label="Model" required error={fieldErrors.model}>
            <Input
              name="model"
              required
              defaultValue={vehicle?.model ?? ''}
              placeholder="Camry"
              onChange={(event) =>
                setIdentity((current) => ({ ...current, model: event.target.value }))
              }
            />
          </Field>

          <Field label="Variant" error={fieldErrors.variant}>
            <Input
              name="variant"
              defaultValue={vehicle?.variant ?? ''}
              placeholder="2.5 V HEV"
              onChange={(event) =>
                setIdentity((current) => ({ ...current, variant: event.target.value }))
              }
            />
          </Field>

          <Field label="Year" required error={fieldErrors.year}>
            <Input
              name="year"
              type="number"
              inputMode="numeric"
              required
              min={1950}
              max={new Date().getFullYear() + 2}
              defaultValue={vehicle?.year ?? new Date().getFullYear()}
              onChange={(event) =>
                setIdentity((current) => ({ ...current, year: event.target.value }))
              }
            />
          </Field>

          <Field
            label="Web address"
            error={fieldErrors.slug}
            description={`The listing will live at /cars/${previewSlug || '…'}`}
            className="sm:col-span-2"
          >
            <Input
              name="slug"
              value={previewSlug}
              onChange={(event) => {
                setSlugEdited(true)
                setSlug(slugify(event.target.value))
              }}
              placeholder="Generated from brand, model and year"
            />
          </Field>

          <Field label="Condition" required error={fieldErrors.condition}>
            <Select name="condition" defaultValue={vehicle?.condition ?? 'brand_new'}>
              {VEHICLE_CONDITIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Body type" error={fieldErrors.bodyType}>
            <Select name="bodyType" defaultValue={vehicle?.body_type ?? ''}>
              <option value="">Not specified</option>
              {BODY_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Pricing"
          description="Cash price and any promotional pricing. The website always shows the lower of the two while a promo is running."
        />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Selling price"
            required
            error={fieldErrors.sellingPrice}
            description="The price customers see."
          >
            <MoneyInput name="sellingPrice" defaultValue={vehicle?.selling_price} required />
          </Field>

          <Field
            label="SRP"
            error={fieldErrors.srp}
            description="Optional. Shown struck through when higher than the selling price."
          >
            <MoneyInput name="srp" defaultValue={vehicle?.srp} />
          </Field>

          <Field
            label="Promo price"
            error={fieldErrors.promoPrice}
            description="Leave blank when there is no promo."
          >
            <MoneyInput name="promoPrice" defaultValue={vehicle?.promo_price} />
          </Field>

          <Field label="Promo label" error={fieldErrors.promoLabel}>
            <Input
              name="promoLabel"
              defaultValue={vehicle?.promo_label ?? ''}
              placeholder="Year-end promo"
            />
          </Field>

          <Field
            label="Promo starts"
            error={fieldErrors.promoStartsAt}
            description="Optional. Blank means it is active immediately."
          >
            <Input
              name="promoStartsAt"
              type="date"
              defaultValue={toDateValue(vehicle?.promo_starts_at)}
            />
          </Field>

          <Field
            label="Promo ends"
            error={fieldErrors.promoEndsAt}
            description="Optional. The promo price stops showing automatically after this date."
          >
            <Input
              name="promoEndsAt"
              type="date"
              defaultValue={toDateValue(vehicle?.promo_ends_at)}
            />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Specifications"
          description="The attributes customers filter and compare on."
        />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Fuel type" error={fieldErrors.fuelType}>
            <Select name="fuelType" defaultValue={vehicle?.fuel_type ?? ''}>
              <option value="">Not specified</option>
              {FUEL_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Transmission" error={fieldErrors.transmission}>
            <Select name="transmission" defaultValue={vehicle?.transmission ?? ''}>
              <option value="">Not specified</option>
              {TRANSMISSIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Drive type" error={fieldErrors.driveType}>
            <Select name="driveType" defaultValue={vehicle?.drive_type ?? ''}>
              <option value="">Not specified</option>
              {DRIVE_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Engine" error={fieldErrors.engine}>
            <Input
              name="engine"
              defaultValue={vehicle?.engine ?? ''}
              placeholder="2.5L Dynamic Force Hybrid"
            />
          </Field>

          <Field label="Power (hp)" error={fieldErrors.powerHp}>
            <Input
              name="powerHp"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              defaultValue={vehicle?.power_hp ?? ''}
            />
          </Field>

          <Field label="Torque (Nm)" error={fieldErrors.torqueNm}>
            <Input
              name="torqueNm"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              defaultValue={vehicle?.torque_nm ?? ''}
            />
          </Field>

          <Field label="Seating capacity" error={fieldErrors.seatingCapacity}>
            <Input
              name="seatingCapacity"
              type="number"
              inputMode="numeric"
              min={1}
              max={60}
              defaultValue={vehicle?.seating_capacity ?? ''}
            />
          </Field>

          <Field
            label="Mileage (km)"
            error={fieldErrors.mileage}
            description="Leave blank for brand new units."
          >
            <Input
              name="mileage"
              type="number"
              inputMode="numeric"
              min={0}
              defaultValue={vehicle?.mileage ?? ''}
            />
          </Field>

          <Field label="Exterior colour" error={fieldErrors.exteriorColor}>
            <Input name="exteriorColor" defaultValue={vehicle?.exterior_color ?? ''} />
          </Field>

          <Field label="Interior colour" error={fieldErrors.interiorColor}>
            <Input name="interiorColor" defaultValue={vehicle?.interior_color ?? ''} />
          </Field>

          <Field
            label="Plate ending"
            error={fieldErrors.plateEnding}
            description="Internal reference only — not shown publicly."
          >
            <Input name="plateEnding" maxLength={10} defaultValue={vehicle?.plate_ending ?? ''} />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Description and features"
          description="What makes this unit worth a visit."
        />
        <CardBody className="space-y-4">
          <Field
            label="Description"
            error={fieldErrors.description}
            description="Leave a blank line between paragraphs."
          >
            <Textarea name="description" rows={7} defaultValue={vehicle?.description ?? ''} />
          </Field>

          <Field
            label="Features"
            error={fieldErrors.features}
            description="One feature per line. Up to 60."
          >
            <Textarea
              name="features"
              rows={7}
              defaultValue={(vehicle?.features ?? []).join('\n')}
              placeholder={'360° camera\nAdaptive cruise control\nWireless CarPlay'}
            />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Financing defaults"
          description="What the calculator opens on for this vehicle. Leave blank to use the dealership defaults."
        />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Down payment (%)" error={fieldErrors.defaultDownPaymentPercent}>
            <Input
              name="defaultDownPaymentPercent"
              type="number"
              inputMode="decimal"
              min={0}
              max={99}
              step="0.5"
              defaultValue={vehicle?.default_down_payment_percent ?? ''}
              placeholder="Dealership default"
            />
          </Field>

          <Field label="Loan term" error={fieldErrors.defaultTermMonths}>
            <Select name="defaultTermMonths" defaultValue={vehicle?.default_term_months ?? ''}>
              <option value="">Dealership default</option>
              {LOAN_TERMS.map((term) => (
                <option key={term} value={term}>
                  {term} months
                </option>
              ))}
            </Select>
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Search engine listing"
          description="Optional. Leave blank and these are generated from the vehicle's own details."
        />
        <CardBody className="space-y-4">
          <Field label="Meta title" error={fieldErrors.metaTitle}>
            <Input name="metaTitle" maxLength={160} defaultValue={vehicle?.meta_title ?? ''} />
          </Field>

          <Field label="Meta description" error={fieldErrors.metaDescription}>
            <Textarea
              name="metaDescription"
              rows={3}
              maxLength={320}
              defaultValue={vehicle?.meta_description ?? ''}
            />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Publishing"
          description="Only published, reserved and sold vehicles are visible on the website."
        />
        <CardBody className="space-y-4">
          <Field label="Status" error={fieldErrors.status}>
            <Select name="status" defaultValue={vehicle?.status ?? 'draft'} className="sm:max-w-xs">
              {VEHICLE_STATUSES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <Checkbox
            name="isFeatured"
            label="Feature on the homepage"
            hint="Featured vehicles lead the homepage and the inventory listing."
            defaultChecked={vehicle?.is_featured ?? false}
          />

          <Checkbox
            name="isPromoted"
            label="Mark as a promoted unit"
            hint="Appears under the Promo filter on the inventory page."
            defaultChecked={vehicle?.is_promoted ?? false}
          />
        </CardBody>
      </Card>

      {/* Sticky so the save button is reachable without scrolling a long form. */}
      <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-3 border-t border-ink-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <Button type="submit" size="lg" isLoading={isPending} loadingText="Saving…">
          <Save className="size-4" aria-hidden="true" />
          {vehicle ? 'Save changes' : 'Create vehicle'}
        </Button>
      </div>
    </form>
  )
}

/** Peso amount with a currency prefix, so the unit is never ambiguous. */
function MoneyInput({
  name,
  defaultValue,
  required,
}: {
  name: string
  defaultValue?: number | null
  required?: boolean
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-ink-500">
        ₱
      </span>
      <Input
        name={name}
        type="number"
        inputMode="numeric"
        min={0}
        step={1000}
        required={required}
        defaultValue={defaultValue ?? ''}
        className="pl-7"
      />
    </div>
  )
}

function toDateValue(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}
