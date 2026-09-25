import Image from 'next/image'
import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import type { PastDealSummary } from '@/lib/data/past-deals'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Past-deal card for the /sold grid. Photo, title, "Sold" badge - nothing
 * else, because there is nothing else to show: no price, no specs, no CTA to
 * buy something that's no longer for sale.
 */
export function PastDealCard({
  deal,
  priority = false,
  className,
}: {
  deal: PastDealSummary
  priority?: boolean
  className?: string
}) {
  const cover = deal.images[0]

  return (
    <article
      className={cn(
        'group lift relative flex flex-col overflow-hidden rounded-card border border-ink-200 bg-white shadow-card hover:border-ink-300 hover:shadow-card-hover',
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-ink-100">
        {cover ? (
          <Image
            src={cover.url}
            alt={cover.alt_text ?? deal.title}
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            priority={priority}
            loading={priority ? undefined : 'lazy'}
            className="object-cover opacity-90 transition-transform duration-[600ms] ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-ink-400">
            No photo yet
          </div>
        )}

        <Badge tone="dark" className="absolute top-3 left-3">
          Sold
        </Badge>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 className="text-base leading-snug font-semibold text-ink-900">
          <Link href={`/sold/${deal.slug}`} className="before:absolute before:inset-0">
            {deal.title}
          </Link>
        </h3>

        {deal.sold_around ? (
          <p className="mt-1 text-xs font-medium text-ink-500">Sold around {formatDate(deal.sold_around)}</p>
        ) : null}
      </div>
    </article>
  )
}
