import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'

/** Consistent page heading for every dashboard screen. */
export function AdminPageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  breadcrumbs?: { href?: string; label: string }[]
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-6', className)}>
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav aria-label="Breadcrumb" className="mb-2">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-ink-500">
            {breadcrumbs.map((crumb, index) => (
              <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                {index > 0 ? <ChevronRight className="size-3" aria-hidden="true" /> : null}
                {crumb.href ? (
                  <Link href={crumb.href} className="transition-colors hover:text-ink-800">
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="font-medium text-ink-700">
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-ink-900">{title}</h1>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm text-ink-600">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  )
}
