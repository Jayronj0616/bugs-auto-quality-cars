import * as React from 'react'

import { cn } from '@/lib/utils'

export type BadgeTone =
  | 'neutral'
  | 'accent'
  | 'dark'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'outline'

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-ink-100 text-ink-700',
  accent: 'bg-accent-500 text-ink-950',
  dark: 'bg-brand-800 text-white',
  success: 'bg-success-50 text-success-700',
  warning: 'bg-warning-50 text-warning-700',
  danger: 'bg-danger-50 text-danger-700',
  info: 'bg-info-50 text-info-700',
  outline: 'border border-ink-300 bg-white/90 text-ink-700 backdrop-blur-sm',
}

export function Badge({
  tone = 'neutral',
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<'span'> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase',
        TONES[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}

/**
 * Coloured dot + label used in admin tables, where a full badge per row would
 * be visually noisy.
 */
export function StatusDot({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: BadgeTone
  children: React.ReactNode
  className?: string
}) {
  const dotColor: Record<BadgeTone, string> = {
    neutral: 'bg-ink-400',
    accent: 'bg-accent-500',
    dark: 'bg-brand-800',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    danger: 'bg-danger-500',
    info: 'bg-info-500',
    outline: 'bg-ink-400',
  }

  return (
    <span className={cn('inline-flex items-center gap-2 text-sm text-ink-700', className)}>
      <span className={cn('size-1.5 rounded-full', dotColor[tone])} aria-hidden="true" />
      {children}
    </span>
  )
}
