'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Check, Save } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/field'
import { Alert, Card, CardBody, CardHeader } from '@/components/ui/surfaces'
import { savePastDeal } from '@/lib/actions/past-deals'
import type { FieldErrors } from '@/lib/actions/result'
import { PAST_DEAL_BRANDS, labelFor } from '@/lib/constants'
import type { AdminPastDealDetail } from '@/lib/data/past-deals'
import { slugify } from '@/lib/utils'
import type { PastDealBrand } from '@/types/database'

const UNCLEAR_TITLE = 'Sold vehicle'

/**
 * Past-deal create/edit form.
 *
 * Deliberately three fields next to `VehicleForm`'s forty: a brand, an
 * optional note, an optional approximate sold date, and whether it's public.
 * There is no price or spec section because a past deal has neither - see the
 * migration comment on `past_deals` for why.
 *
 * Brand is a dropdown, not a typed title - a badge is legible in a photo far
 * more reliably than an exact model is, and a fixed list is what makes
 * filtering /sold by brand possible at all. The displayed title is derived
 * from the chosen brand server-side.
 */
export function PastDealForm({ deal }: { deal?: AdminPastDealDetail | null }) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({})
  const [formError, setFormError] = React.useState<string | null>(null)
  const [savedMessage, setSavedMessage] = React.useState<string | null>(null)
  const statusRef = React.useRef<HTMLDivElement>(null)

  const [brand, setBrand] = React.useState<PastDealBrand | ''>(deal?.brand ?? '')
  const [slug, setSlug] = React.useState(deal?.slug ?? '')
  const [slugEdited, setSlugEdited] = React.useState(Boolean(deal?.slug))

  const brandTitle = brand ? labelFor('pastDealBrand', brand) : UNCLEAR_TITLE
  const previewSlug = slugEdited ? slug : slugify(brandTitle)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setFieldErrors({})
    setFormError(null)
    setSavedMessage(null)

    const text = (key: string) => String(form.get(key) ?? '')

    const payload = {
      dealId: deal?.id ?? null,
      brand: text('brand') || null,
      slug: slugEdited ? slug : previewSlug,
      note: text('note'),
      soldAround: text('soldAround'),
      isPublished: form.get('isPublished') === 'on',
    }

    startTransition(async () => {
      const result = await savePastDeal(payload as Parameters<typeof savePastDeal>[0])

      if (!result.ok) {
        setFormError(result.message)
        setFieldErrors(result.fieldErrors ?? {})
        statusRef.current?.focus()
        statusRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
        return
      }

      if (!deal) {
        // A new entry needs its own URL before photos can be attached to it.
        router.push(`/admin/sold-vehicles/${result.data.dealId}?created=1`)
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
          <Alert tone="danger" title="Could not save this entry">
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
          description="Only what's actually known about the sale - leave the rest blank."
        />
        <CardBody className="space-y-4">
          <Field
            label="Brand"
            error={fieldErrors.brand}
            description="Picked from the photo's badge, not typed - pick “Not sure” if the photo doesn't show one clearly."
            className="sm:max-w-xs"
          >
            <Select
              name="brand"
              value={brand}
              onChange={(event) => setBrand(event.target.value as PastDealBrand | '')}
            >
              <option value="">Not sure / no badge visible</option>
              {PAST_DEAL_BRANDS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Web address"
            error={fieldErrors.slug}
            description={`This entry will live at /sold/${previewSlug || '…'}`}
          >
            <Input
              name="slug"
              value={previewSlug}
              onChange={(event) => {
                setSlugEdited(true)
                setSlug(slugify(event.target.value))
              }}
              placeholder="Generated from the brand"
            />
          </Field>

          <Field
            label="Note"
            error={fieldErrors.note}
            description="Optional. A short line - colour, condition, anything worth mentioning. Not a spec sheet."
          >
            <Textarea name="note" rows={3} defaultValue={deal?.note ?? ''} placeholder="Optional" />
          </Field>

          <Field
            label="Sold around"
            error={fieldErrors.soldAround}
            description="Optional and approximate - most of these predate this system."
            className="sm:max-w-xs"
          >
            <Input name="soldAround" type="date" defaultValue={deal?.sold_around ?? ''} />
          </Field>

          <Checkbox
            name="isPublished"
            label="Active"
            hint="Visible on the public /sold page. Turn this off to hide an entry without deleting it."
            defaultChecked={deal?.is_published ?? true}
          />
        </CardBody>
      </Card>

      <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-3 border-t border-ink-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <Button type="submit" size="lg" isLoading={isPending} loadingText="Saving…">
          <Save className="size-4" aria-hidden="true" />
          {deal ? 'Save changes' : 'Create entry'}
        </Button>
      </div>
    </form>
  )
}
