import * as React from 'react'

import { cn } from '@/lib/utils'

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'inverted'

export type ButtonSize = 'sm' | 'md' | 'lg'

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap ' +
  'transition-[background-color,border-color,color,box-shadow,transform] duration-150 ' +
  'active:translate-y-px disabled:pointer-events-none disabled:opacity-55 ' +
  'aria-disabled:pointer-events-none aria-disabled:opacity-55'

/**
 * `primary` is the amber accent - the 10% of the palette - so it is reserved
 * for the single most important action on a screen. It carries dark text
 * because white on a mid-tone amber is only about 3:1; ink on amber is ~7:1.
 *
 * `secondary` is the brand teal, for actions that matter but should not
 * compete with the primary one.
 */
const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent-500 text-ink-950 shadow-sm hover:bg-accent-400',
  secondary: 'bg-brand-700 text-white shadow-sm hover:bg-brand-600',
  outline: 'border border-ink-300 bg-white text-ink-800 hover:border-brand-400 hover:bg-brand-50',
  ghost: 'text-ink-700 hover:bg-brand-50 hover:text-brand-800',
  danger: 'bg-danger-500 text-white shadow-sm hover:bg-danger-700',
  inverted: 'bg-white text-brand-900 shadow-sm hover:bg-brand-50',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-13 px-7 text-base',
}

export function buttonClasses({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  className?: string
} = {}) {
  return cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)
}

export type ButtonProps = React.ComponentPropsWithoutRef<'button'> & {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  /** Shows a spinner and blocks input while a Server Action is in flight. */
  isLoading?: boolean
  loadingText?: string
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, fullWidth, isLoading = false, loadingText, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={buttonClasses({ variant, size, fullWidth, className })}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? (
        <>
          <Spinner />
          <span>{loadingText ?? children}</span>
        </>
      ) : (
        children
      )}
    </button>
  )
})

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('size-4 animate-spin', className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}
