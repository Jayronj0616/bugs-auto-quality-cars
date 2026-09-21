import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Server-rendered pagination.
 *
 * Real `<a>` elements, so a page can be opened in a new tab, crawled, and used
 * without JavaScript. `buildHref` keeps the caller in charge of how a page
 * number maps to a URL.
 */
export function Pagination({
  page,
  totalPages,
  buildHref,
  className,
}: {
  page: number
  totalPages: number
  buildHref: (page: number) => string
  className?: string
}) {
  if (totalPages <= 1) return null

  const pages = pageWindow(page, totalPages)

  return (
    <nav className={cn('flex items-center justify-center gap-1.5', className)} aria-label="Pagination">
      <PageLink
        href={buildHref(page - 1)}
        disabled={page <= 1}
        label="Previous page"
        className="px-2.5"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Previous</span>
      </PageLink>

      {pages.map((entry, index) =>
        entry === 'ellipsis' ? (
          <span key={`gap-${index}`} className="px-1 text-sm text-ink-400" aria-hidden="true">
            …
          </span>
        ) : (
          <Link
            key={entry}
            href={buildHref(entry)}
            aria-current={entry === page ? 'page' : undefined}
            className={cn(
              'inline-flex h-10 min-w-10 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors',
              entry === page
                ? 'bg-ink-900 text-white'
                : 'border border-ink-300 bg-white text-ink-700 hover:border-ink-400 hover:bg-ink-50',
            )}
          >
            {entry}
          </Link>
        ),
      )}

      <PageLink
        href={buildHref(page + 1)}
        disabled={page >= totalPages}
        label="Next page"
        className="px-2.5"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="size-4" aria-hidden="true" />
      </PageLink>
    </nav>
  )
}

function PageLink({
  href,
  disabled,
  label,
  className,
  children,
}: {
  href: string
  disabled: boolean
  label: string
  className?: string
  children: React.ReactNode
}) {
  const base =
    'inline-flex h-10 items-center gap-1 rounded-md border text-sm font-medium transition-colors'

  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className={cn(base, 'border-ink-200 bg-ink-100 text-ink-400', className)}
      >
        {children}
      </span>
    )
  }

  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(base, 'border-ink-300 bg-white text-ink-700 hover:border-ink-400 hover:bg-ink-50', className)}
    >
      {children}
    </Link>
  )
}

/** First, last, current and its neighbours - with gaps marked as ellipses. */
function pageWindow(page: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const window = new Set<number>([1, totalPages, page, page - 1, page + 1])
  const sorted = [...window].filter((value) => value >= 1 && value <= totalPages).sort((a, b) => a - b)

  const result: (number | 'ellipsis')[] = []
  let previous = 0
  for (const value of sorted) {
    if (previous && value - previous > 1) result.push('ellipsis')
    result.push(value)
    previous = value
  }
  return result
}
