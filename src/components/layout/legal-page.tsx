import type { ReactNode } from 'react'

import { formatAddress, type DealershipSettings } from '@/lib/data/settings'
import { toMailtoHref, toTelHref } from '@/lib/format'

/**
 * Shared shell for the privacy policy and data deletion pages: a plain,
 * readable document layout, since these exist to be read (by customers, and by
 * Meta's App Review, which checks the privacy policy URL).
 */
export function LegalPage({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string
  title: string
  updated: string
  children: ReactNode
}) {
  return (
    <>
      <header className="border-b border-brand-100 bg-brand-50">
        <div className="container-page py-10 sm:py-12">
          <p className="eyebrow text-accent-700">{eyebrow}</p>
          <h1 className="mt-2 text-3xl font-bold text-ink-900 sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-ink-500">Last updated {updated}</p>
        </div>
      </header>

      <div className="container-page py-10 sm:py-14">
        <div className="max-w-3xl space-y-10 text-base leading-relaxed text-ink-700">{children}</div>
      </div>
    </>
  )
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-ink-900">{title}</h2>
      {children}
    </section>
  )
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  )
}

/** The dealership's contact details, read from settings so they never go stale. */
export function LegalContact({ settings }: { settings: DealershipSettings }) {
  const address = formatAddress(settings)
  const phones = [settings.phone, settings.phone_secondary].filter((phone): phone is string => Boolean(phone))
  const linkClass = 'font-medium text-accent-700 underline underline-offset-2 hover:text-accent-800'

  return (
    <LegalList
      items={[
        <>
          <strong className="text-ink-900">{settings.business_name}</strong>
          {address ? `, ${address}` : null}
        </>,
        ...phones.map((phone) => (
          <>
            Phone / SMS:{' '}
            <a href={toTelHref(phone) ?? undefined} className={linkClass}>
              {phone}
            </a>
          </>
        )),
        ...(settings.email
          ? [
              <>
                Email:{' '}
                <a href={toMailtoHref(settings.email) ?? undefined} className={linkClass}>
                  {settings.email}
                </a>
              </>,
            ]
          : []),
        ...(settings.facebook_url
          ? [
              <>
                Facebook:{' '}
                <a href={settings.facebook_url} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  message our Page on Messenger
                </a>
              </>,
            ]
          : []),
      ]}
    />
  )
}
