import * as React from 'react'
import Link from 'next/link'

import { cn } from '@/lib/utils'

import { buttonClasses } from './button'

/* -------------------------------------------------------------------------- */
/* Card                                                                        */
/* -------------------------------------------------------------------------- */

export function Card({
  className,
  as: Component = 'div',
  ...props
}: React.ComponentPropsWithoutRef<'div'> & { as?: 'div' | 'section' | 'article' | 'li' }) {
  const Tag = Component as React.ElementType
  return (
    <Tag
      className={cn('rounded-card border border-ink-200 bg-white shadow-card', className)}
      {...props}
    />
  )
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-3 border-b border-ink-200 px-5 py-4',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-ink-900">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-ink-500">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export function CardBody({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return <div className={cn('px-5 py-4', className)} {...props} />
}

/* -------------------------------------------------------------------------- */
/* Section heading                                                             */
/* -------------------------------------------------------------------------- */

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = 'start',
  className,
}: {
  eyebrow?: string
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  align?: 'start' | 'center'
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        align === 'center' && 'sm:flex-col sm:items-center sm:text-center',
        className,
      )}
    >
      <div className={cn('max-w-2xl', align === 'center' && 'mx-auto')}>
        {eyebrow ? <p className="eyebrow mb-2 text-accent-600">{eyebrow}</p> : null}
        <h2 className="text-2xl font-semibold text-ink-900 sm:text-3xl">{title}</h2>
        {description ? (
          <p className="mt-2 text-sm leading-relaxed text-ink-600 sm:text-base">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Empty / error / loading states                                              */
/* -------------------------------------------------------------------------- */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-card border border-dashed border-ink-300 bg-white px-6 py-14 text-center',
        className,
      )}
    >
      {icon ? (
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-ink-100 text-ink-500">
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold text-ink-900">{title}</h3>
      {description ? <p className="mt-1.5 max-w-md text-sm text-ink-600">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}

export type AlertTone = 'info' | 'success' | 'warning' | 'danger'

const ALERT_TONES: Record<AlertTone, string> = {
  info: 'border-info-500/25 bg-info-50 text-info-700',
  success: 'border-success-500/25 bg-success-50 text-success-700',
  warning: 'border-warning-500/25 bg-warning-50 text-warning-700',
  danger: 'border-danger-500/25 bg-danger-50 text-danger-700',
}

export function Alert({
  tone = 'info',
  title,
  children,
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'> & { tone?: AlertTone; title?: React.ReactNode }) {
  return (
    <div
      className={cn('rounded-md border px-4 py-3 text-sm', ALERT_TONES[tone], className)}
      {...props}
    >
      {title ? <p className="font-semibold">{title}</p> : null}
      {children ? <div className={cn(title && 'mt-1', 'leading-relaxed')}>{children}</div> : null}
    </div>
  )
}

export function Skeleton({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return <div className={cn('shimmer rounded-md', className)} aria-hidden="true" {...props} />
}

/* -------------------------------------------------------------------------- */
/* Links styled as buttons                                                     */
/* -------------------------------------------------------------------------- */

export function ButtonLink({
  href,
  variant,
  size,
  fullWidth,
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof Link> &
  Parameters<typeof buttonClasses>[0] & { href: string }) {
  return (
    <Link href={href} className={buttonClasses({ variant, size, fullWidth, className })} {...props}>
      {children}
    </Link>
  )
}

/** External link that opens safely in a new tab. */
export function ExternalButtonLink({
  href,
  variant,
  size,
  fullWidth,
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<'a'> & Parameters<typeof buttonClasses>[0] & { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...props}
    >
      {children}
    </a>
  )
}
