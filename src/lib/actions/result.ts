import type { z } from 'zod'

/**
 * Shared shape for every Server Action result.
 *
 * Actions never throw at the customer: they return a discriminated union that a
 * form can render directly. Field errors map one-to-one onto form fields, and
 * `message` is always something safe to display - raw database errors are
 * logged on the server and replaced with a generic sentence.
 */

export type FieldErrors = Record<string, string[]>

export type ActionResult<T = undefined> =
  | ({ ok: true; message?: string } & (T extends undefined ? { data?: never } : { data: T }))
  | { ok: false; message: string; fieldErrors?: FieldErrors }

export function actionSuccess(message?: string): ActionResult
export function actionSuccess<T>(message: string | undefined, data: T): ActionResult<T>
export function actionSuccess<T>(message?: string, data?: T) {
  return { ok: true as const, message, data }
}

export function actionError(message: string, fieldErrors?: FieldErrors): ActionResult<never> {
  return { ok: false, message, fieldErrors }
}

/** Flattens a Zod failure into the field-error map the forms expect. */
export function zodErrors(error: z.ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {}

  for (const issue of error.issues) {
    // Nested paths (businessHours.0.close) are joined so the form can look them
    // up with the same key it renders.
    const key = issue.path.length > 0 ? issue.path.join('.') : '_form'
    fieldErrors[key] ??= []
    fieldErrors[key].push(issue.message)
  }

  return fieldErrors
}

export const GENERIC_ERROR =
  'Something went wrong on our end. Please try again in a moment.'

/**
 * Logs the real error server-side and returns a message that is safe to show.
 * Database constraint text, table names and stack traces never reach a browser.
 */
export function internalError(context: string, error: unknown): ActionResult<never> {
  console.error(`[${context}]`, error)
  return actionError(GENERIC_ERROR)
}
