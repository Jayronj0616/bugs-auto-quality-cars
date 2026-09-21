'use client'

import * as React from 'react'
import { MessageSquare, Phone } from 'lucide-react'

import { InquiryForm } from '@/components/forms/inquiry-form'
import { Modal } from '@/components/ui/modal'
import { formatPeso, formatPesoPrecise } from '@/lib/format'
import type { FinancingProviderRow, VehicleStatus } from '@/types/database'

/**
 * Sticky mobile call-to-action bar.
 *
 * Appears only after the customer has scrolled past the top of the page, so it
 * never covers the hero on arrival, and the page reserves matching bottom
 * padding while it is visible so it cannot hide the footer or the last section.
 */
export function MobileActionBar({
  vehicleId,
  vehicleTitle,
  price,
  monthlyFrom,
  status,
  telHref,
  providers,
  sourcePath,
}: {
  vehicleId: string
  vehicleTitle: string
  price: number
  monthlyFrom: number | null
  status: VehicleStatus
  telHref: string | null
  providers: FinancingProviderRow[]
  sourcePath: string
  imageUrl?: string | null
}) {
  const [visible, setVisible] = React.useState(false)
  const [inquiryOpen, setInquiryOpen] = React.useState(false)

  React.useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 520)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      {/* Spacer keeps the bar from overlapping page content while it is shown. */}
      <div className={visible ? 'h-20 lg:hidden' : 'hidden'} aria-hidden="true" />

      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-ink-200 bg-white/97 backdrop-blur transition-transform duration-300 lg:hidden ${
          visible ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="tabular truncate text-base font-bold text-ink-900">{formatPeso(price)}</p>
            {monthlyFrom ? (
              <p className="tabular truncate text-xs text-ink-500">
                from {formatPesoPrecise(monthlyFrom)}/mo
              </p>
            ) : (
              <p className="truncate text-xs text-ink-500">{vehicleTitle}</p>
            )}
          </div>

          {telHref ? (
            <a
              href={telHref}
              aria-label="Call the dealership"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-ink-300 text-ink-800 transition-colors hover:bg-ink-50"
            >
              <Phone className="size-5" aria-hidden="true" />
            </a>
          ) : null}

          <button
            type="button"
            onClick={() => setInquiryOpen(true)}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md bg-accent-500 px-5 text-sm font-semibold text-ink-950 transition-colors hover:bg-accent-600"
          >
            <MessageSquare className="size-4" aria-hidden="true" />
            Inquire
          </button>
        </div>
      </div>

      <Modal
        open={inquiryOpen}
        onClose={() => setInquiryOpen(false)}
        title="Inquire about this vehicle"
        description={vehicleTitle}
        size="lg"
      >
        <InquiryForm
          vehicle={{ id: vehicleId, label: vehicleTitle, price }}
          providers={providers}
          defaultType={status === 'sold' ? 'general' : 'vehicle'}
          sourcePath={sourcePath}
          compact
        />
      </Modal>
    </>
  )
}
