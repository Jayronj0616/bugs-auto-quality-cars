'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Form primitives.
 *
 * `Field` owns the label/description/error wiring so every input in the app is
 * labelled, describes its own error via aria-describedby, and announces that
 * error to assistive technology - without each form having to remember to.
 */

const FieldContext = React.createContext<{
  id: string
  errorId: string
  descriptionId: string
  hasError: boolean
} | null>(null)

function useFieldContext() {
  return React.useContext(FieldContext)
}

export function Field({
  label,
  description,
  error,
  required,
  htmlFor,
  className,
  children,
}: {
  label?: React.ReactNode
  description?: React.ReactNode
  error?: string | string[] | null
  required?: boolean
  /** Use when the control is rendered outside this component (e.g. a fieldset). */
  htmlFor?: string
  className?: string
  children: React.ReactNode
}) {
  const generatedId = React.useId()
  const id = htmlFor ?? generatedId
  const message = Array.isArray(error) ? error[0] : error

  const context = React.useMemo(
    () => ({
      id,
      errorId: `${id}-error`,
      descriptionId: `${id}-description`,
      hasError: Boolean(message),
    }),
    [id, message],
  )

  return (
    <FieldContext.Provider value={context}>
      <div className={cn('space-y-1.5', className)}>
        {label ? (
          <label htmlFor={id} className="block text-sm font-medium text-ink-800">
            {label}
            {required ? (
              <span className="ml-0.5 text-accent-700" aria-hidden="true">
                *
              </span>
            ) : null}
          </label>
        ) : null}

        {children}

        {description ? (
          <p id={context.descriptionId} className="text-xs text-ink-500">
            {description}
          </p>
        ) : null}

        {message ? (
          <p id={context.errorId} className="text-xs font-medium text-danger-700" role="alert">
            {message}
          </p>
        ) : null}
      </div>
    </FieldContext.Provider>
  )
}

const CONTROL_BASE =
  'w-full rounded-md border bg-white text-sm text-ink-900 shadow-xs transition-colors ' +
  'placeholder:text-ink-400 disabled:cursor-not-allowed disabled:bg-ink-100 disabled:text-ink-500'

const CONTROL_STATE = (hasError: boolean) =>
  hasError
    ? 'border-danger-500 focus:border-danger-500'
    : 'border-ink-300 hover:border-ink-400 focus:border-accent-600'

/** Wires a control to the surrounding Field's id / error ids. */
function useControlProps(props: { id?: string; 'aria-describedby'?: string }) {
  const context = useFieldContext()
  if (!context) return { id: props.id, describedBy: props['aria-describedby'], hasError: false }

  const describedBy =
    [context.hasError ? context.errorId : null, props['aria-describedby']].filter(Boolean).join(' ') ||
    undefined

  return { id: props.id ?? context.id, describedBy, hasError: context.hasError }
}

export const Input = React.forwardRef<HTMLInputElement, React.ComponentPropsWithoutRef<'input'>>(
  function Input({ className, ...props }, ref) {
    const { id, describedBy, hasError } = useControlProps(props)
    return (
      <input
        ref={ref}
        {...props}
        id={id}
        aria-describedby={describedBy}
        aria-invalid={hasError || undefined}
        className={cn(CONTROL_BASE, CONTROL_STATE(hasError), 'h-11 px-3', className)}
      />
    )
  },
)

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentPropsWithoutRef<'textarea'>
>(function Textarea({ className, rows = 4, ...props }, ref) {
  const { id, describedBy, hasError } = useControlProps(props)
  return (
    <textarea
      ref={ref}
      rows={rows}
      {...props}
      id={id}
      aria-describedby={describedBy}
      aria-invalid={hasError || undefined}
      className={cn(CONTROL_BASE, CONTROL_STATE(hasError), 'resize-y px-3 py-2.5', className)}
    />
  )
})

export const Select = React.forwardRef<HTMLSelectElement, React.ComponentPropsWithoutRef<'select'>>(
  function Select({ className, children, ...props }, ref) {
    const { id, describedBy, hasError } = useControlProps(props)
    return (
      <select
        ref={ref}
        {...props}
        id={id}
        aria-describedby={describedBy}
        aria-invalid={hasError || undefined}
        className={cn(
          CONTROL_BASE,
          CONTROL_STATE(hasError),
          'h-11 appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat px-3 pr-9',
          // Inline chevron: avoids shipping an icon component for every select.
          "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%236f7a85'%3E%3Cpath fill-rule='evenodd' d='M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z' clip-rule='evenodd'/%3E%3C/svg%3E\")]",
          className,
        )}
      >
        {children}
      </select>
    )
  },
)

export const Checkbox = React.forwardRef<
  HTMLInputElement,
  React.ComponentPropsWithoutRef<'input'> & { label: React.ReactNode; hint?: React.ReactNode }
>(function Checkbox({ className, label, hint, ...props }, ref) {
  const generatedId = React.useId()
  const id = props.id ?? generatedId

  return (
    <div className={cn('flex items-start gap-2.5', className)}>
      <input
        ref={ref}
        type="checkbox"
        {...props}
        id={id}
        className="mt-0.5 size-4 shrink-0 rounded-sm border-ink-300 text-accent-700 accent-brand-600"
      />
      <label htmlFor={id} className="text-sm leading-5 text-ink-700 select-none">
        {label}
        {hint ? <span className="block text-xs text-ink-500">{hint}</span> : null}
      </label>
    </div>
  )
})

/** Groups related controls and gives the group an accessible name. */
export function Fieldset({
  legend,
  description,
  className,
  children,
}: {
  legend: React.ReactNode
  description?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <fieldset className={cn('min-w-0', className)}>
      <legend className="text-sm font-semibold text-ink-900">{legend}</legend>
      {description ? <p className="mt-1 text-xs text-ink-500">{description}</p> : null}
      <div className="mt-3">{children}</div>
    </fieldset>
  )
}
