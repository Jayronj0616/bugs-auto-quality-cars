'use client'

import * as React from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Check, Save, Upload, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/field'
import { Alert, Card, CardBody, CardHeader } from '@/components/ui/surfaces'
import { LOAN_TERMS, titleCase } from '@/lib/constants'
import { saveDealershipSettings } from '@/lib/actions/settings'
import type { FieldErrors } from '@/lib/actions/result'
import type { BusinessHour, DealershipSettingsRow } from '@/types/database'

const DAYS: BusinessHour['day'][] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

/**
 * Dealership settings.
 *
 * This form is the reason no contact detail is hard-coded anywhere in the app:
 * saving here changes the header, footer, contact page, vehicle CTAs and the
 * mobile action bar at the same time.
 */
export function SettingsForm({ settings }: { settings: DealershipSettingsRow }) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({})
  const [formError, setFormError] = React.useState<string | null>(null)
  const [saved, setSaved] = React.useState(false)
  const statusRef = React.useRef<HTMLDivElement>(null)

  const [hours, setHours] = React.useState<BusinessHour[]>(() =>
    DAYS.map(
      (day) =>
        settings.business_hours.find((entry) => entry.day === day) ?? {
          day,
          open: '09:00',
          close: '18:00',
          closed: day === 'sunday',
        },
    ),
  )

  const [logoUrl, setLogoUrl] = React.useState(settings.logo_url ?? '')
  const [heroUrl, setHeroUrl] = React.useState(settings.hero_image_url ?? '')

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setFieldErrors({})
    setFormError(null)
    setSaved(false)

    const text = (key: string) => String(form.get(key) ?? '')

    startTransition(async () => {
      const result = await saveDealershipSettings({
        businessName: text('businessName'),
        tagline: text('tagline'),
        about: text('about'),
        phone: text('phone'),
        phoneSecondary: text('phoneSecondary'),
        email: text('email'),
        facebookUrl: text('facebookUrl'),
        messengerUrl: text('messengerUrl'),
        instagramUrl: text('instagramUrl'),
        tiktokUrl: text('tiktokUrl'),
        viberNumber: text('viberNumber'),
        addressLine1: text('addressLine1'),
        addressLine2: text('addressLine2'),
        city: text('city'),
        province: text('province'),
        postalCode: text('postalCode'),
        country: text('country'),
        googleMapsUrl: text('googleMapsUrl'),
        googleMapsEmbedUrl: text('googleMapsEmbedUrl'),
        businessHours: hours,
        logoUrl,
        heroImageUrl: heroUrl,
        responseTimeNote: text('responseTimeNote'),
        defaultInterestRate: text('defaultInterestRate'),
        defaultDownPaymentPercent: text('defaultDownPaymentPercent'),
        defaultTermMonths: text('defaultTermMonths'),
        financingDisclaimer: text('financingDisclaimer'),
      } as Parameters<typeof saveDealershipSettings>[0])

      if (result.ok) {
        setSaved(true)
        router.refresh()
      } else {
        setFormError(result.message)
        setFieldErrors(result.fieldErrors ?? {})
        statusRef.current?.focus()
        statusRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
    })
  }

  const updateHour = (day: BusinessHour['day'], patch: Partial<BusinessHour>) =>
    setHours((current) =>
      current.map((entry) => (entry.day === day ? { ...entry, ...patch } : entry)),
    )

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <div ref={statusRef} tabIndex={-1} className="outline-none">
        {formError ? (
          <Alert tone="danger" title="Could not save your settings">
            {formError}
          </Alert>
        ) : null}
        {saved ? (
          <Alert tone="success">
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-4" aria-hidden="true" />
              Settings saved. The website has been updated.
            </span>
          </Alert>
        ) : null}
      </div>

      <Card>
        <CardHeader title="Business" description="How the dealership is presented." />
        <CardBody className="space-y-4">
          <Field label="Business name" required error={fieldErrors.businessName}>
            <Input name="businessName" required defaultValue={settings.business_name} />
          </Field>

          <Field
            label="Tagline"
            error={fieldErrors.tagline}
            description="A short line under the name in the footer and hero."
          >
            <Input
              name="tagline"
              defaultValue={settings.tagline ?? ''}
              placeholder="Quality cars. Transparent deals."
            />
          </Field>

          <Field
            label="About"
            error={fieldErrors.about}
            description="Shown on the About page. Leave a blank line between paragraphs."
          >
            <Textarea name="about" rows={6} defaultValue={settings.about ?? ''} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <ImageField
              label="Logo"
              description="PNG with transparency works best. Replaces the text mark in the header."
              value={logoUrl}
              onChange={setLogoUrl}
            />
            <ImageField
              label="Homepage hero image"
              description="Used when no featured vehicle has a photo."
              value={heroUrl}
              onChange={setHeroUrl}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Contact"
          description="Anything left blank is simply not shown on the website — no placeholder appears."
        />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Phone"
            error={fieldErrors.phone}
            description="Becomes a tap-to-call link."
          >
            <Input
              name="phone"
              type="tel"
              defaultValue={settings.phone ?? ''}
              placeholder="+63 917 123 4567"
            />
          </Field>

          <Field label="Secondary phone" error={fieldErrors.phoneSecondary}>
            <Input name="phoneSecondary" type="tel" defaultValue={settings.phone_secondary ?? ''} />
          </Field>

          <Field label="Email" error={fieldErrors.email} description="Becomes a mailto link.">
            <Input name="email" type="email" defaultValue={settings.email ?? ''} />
          </Field>

          <Field label="Viber number" error={fieldErrors.viberNumber}>
            <Input name="viberNumber" defaultValue={settings.viber_number ?? ''} />
          </Field>

          <Field
            label="Facebook page URL"
            error={fieldErrors.facebookUrl}
            description="The full URL of your Facebook Page."
          >
            <Input
              name="facebookUrl"
              type="url"
              defaultValue={settings.facebook_url ?? ''}
              placeholder="https://www.facebook.com/yourpage"
            />
          </Field>

          <Field label="Messenger URL" error={fieldErrors.messengerUrl}>
            <Input
              name="messengerUrl"
              type="url"
              defaultValue={settings.messenger_url ?? ''}
              placeholder="https://m.me/yourpage"
            />
          </Field>

          <Field label="Instagram URL" error={fieldErrors.instagramUrl}>
            <Input name="instagramUrl" type="url" defaultValue={settings.instagram_url ?? ''} />
          </Field>

          <Field label="TikTok URL" error={fieldErrors.tiktokUrl}>
            <Input name="tiktokUrl" type="url" defaultValue={settings.tiktok_url ?? ''} />
          </Field>

          <Field
            label="Response time note"
            error={fieldErrors.responseTimeNote}
            className="sm:col-span-2"
            description="Optional. Only promise a response time you can keep."
          >
            <Input
              name="responseTimeNote"
              defaultValue={settings.response_time_note ?? ''}
              placeholder="We usually reply within one business day."
            />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Location" />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Address line 1" error={fieldErrors.addressLine1} className="sm:col-span-2">
            <Input name="addressLine1" defaultValue={settings.address_line1 ?? ''} />
          </Field>

          <Field label="Address line 2" error={fieldErrors.addressLine2} className="sm:col-span-2">
            <Input name="addressLine2" defaultValue={settings.address_line2 ?? ''} />
          </Field>

          <Field label="City" error={fieldErrors.city}>
            <Input name="city" defaultValue={settings.city ?? ''} />
          </Field>

          <Field label="Province" error={fieldErrors.province}>
            <Input name="province" defaultValue={settings.province ?? ''} />
          </Field>

          <Field label="Postal code" error={fieldErrors.postalCode}>
            <Input name="postalCode" defaultValue={settings.postal_code ?? ''} />
          </Field>

          <Field label="Country" error={fieldErrors.country}>
            <Input name="country" defaultValue={settings.country ?? 'Philippines'} />
          </Field>

          <Field
            label="Google Maps link"
            error={fieldErrors.googleMapsUrl}
            description="The share link. Powers the Get Directions button."
            className="sm:col-span-2"
          >
            <Input name="googleMapsUrl" type="url" defaultValue={settings.google_maps_url ?? ''} />
          </Field>

          <Field
            label="Google Maps embed URL"
            error={fieldErrors.googleMapsEmbedUrl}
            description="From Share → Embed a map, the src of the iframe. Shows the map on the contact page."
            className="sm:col-span-2"
          >
            <Input
              name="googleMapsEmbedUrl"
              type="url"
              defaultValue={settings.google_maps_embed_url ?? ''}
              placeholder="https://www.google.com/maps/embed?pb=…"
            />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Business hours" description="Shown in the footer and on the contact page." />
        <CardBody>
          <ul className="space-y-2">
            {hours.map((entry) => (
              <li
                key={entry.day}
                className="grid items-center gap-3 sm:grid-cols-[8rem_1fr_1fr_7rem]"
              >
                <span className="text-sm font-medium text-ink-800">{titleCase(entry.day)}</span>

                <Field label="" className="sm:space-y-0">
                  <Input
                    type="time"
                    value={entry.open}
                    disabled={entry.closed}
                    onChange={(event) => updateHour(entry.day, { open: event.target.value })}
                    aria-label={`${titleCase(entry.day)} opening time`}
                  />
                </Field>

                <Field label="" className="sm:space-y-0">
                  <Input
                    type="time"
                    value={entry.close}
                    disabled={entry.closed}
                    onChange={(event) => updateHour(entry.day, { close: event.target.value })}
                    aria-label={`${titleCase(entry.day)} closing time`}
                  />
                </Field>

                <Checkbox
                  label="Closed"
                  checked={entry.closed}
                  onChange={(event) => updateHour(entry.day, { closed: event.target.checked })}
                />
              </li>
            ))}
          </ul>

          {fieldErrors.businessHours ? (
            <p className="mt-3 text-xs font-medium text-danger-700" role="alert">
              {fieldErrors.businessHours[0]}
            </p>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Financing defaults"
          description="What the calculator opens on when a vehicle has no settings of its own."
        />
        <CardBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Interest rate (%)" required error={fieldErrors.defaultInterestRate}>
              <Input
                name="defaultInterestRate"
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step="0.25"
                required
                defaultValue={settings.default_interest_rate}
              />
            </Field>

            <Field
              label="Down payment (%)"
              required
              error={fieldErrors.defaultDownPaymentPercent}
            >
              <Input
                name="defaultDownPaymentPercent"
                type="number"
                inputMode="decimal"
                min={0}
                max={99}
                step="0.5"
                required
                defaultValue={settings.default_down_payment_percent}
              />
            </Field>

            <Field label="Loan term" required error={fieldErrors.defaultTermMonths}>
              <Select name="defaultTermMonths" defaultValue={settings.default_term_months}>
                {LOAN_TERMS.map((term) => (
                  <option key={term} value={term}>
                    {term} months
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field
            label="Financing disclaimer"
            required
            error={fieldErrors.financingDisclaimer}
            description="Shown wherever an estimated monthly payment appears."
          >
            <Textarea
              name="financingDisclaimer"
              rows={3}
              required
              defaultValue={settings.financing_disclaimer}
            />
          </Field>
        </CardBody>
      </Card>

      <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-3 border-t border-ink-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <Button type="submit" size="lg" isLoading={isPending} loadingText="Saving…">
          <Save className="size-4" aria-hidden="true" />
          Save settings
        </Button>
      </div>
    </form>
  )
}

/**
 * Image field with upload.
 *
 * The URL is held in form state rather than written straight to the database,
 * so an admin can upload, look at the preview, and still leave without changing
 * the live site.
 */
function ImageField({
  label,
  description,
  value,
  onChange,
}: {
  label: string
  description?: string
  value: string
  onChange: (url: string) => void
}) {
  const [uploading, setUploading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  async function upload(file: File | undefined) {
    if (!file) return
    setError(null)
    setUploading(true)

    const body = new FormData()
    body.set('file', file)

    try {
      const response = await fetch('/api/admin/media/branding', { method: 'POST', body })
      const payload = (await response.json()) as { url?: string; error?: string }

      if (!response.ok || !payload.url) {
        setError(payload.error ?? 'That image could not be uploaded.')
        return
      }
      onChange(payload.url)
    } catch {
      setError('Upload failed. Check your connection and try again.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <Field label={label} description={description} error={error}>
      <div className="space-y-2">
        {value ? (
          <div className="flex items-center gap-3 rounded-md border border-ink-200 bg-ink-50 p-3">
            <div className="relative h-12 w-24 shrink-0 overflow-hidden rounded bg-white">
              <Image src={value} alt="" fill sizes="96px" className="object-contain" />
            </div>
            <button
              type="button"
              onClick={() => onChange('')}
              className="inline-flex items-center gap-1.5 text-sm text-ink-600 transition-colors hover:text-danger-700"
            >
              <X className="size-3.5" aria-hidden="true" />
              Remove
            </button>
          </div>
        ) : null}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="sr-only"
          onChange={(event) => upload(event.target.files?.[0])}
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          isLoading={uploading}
          loadingText="Uploading…"
        >
          <Upload className="size-4" aria-hidden="true" />
          {value ? 'Replace image' : 'Upload image'}
        </Button>
      </div>
    </Field>
  )
}
