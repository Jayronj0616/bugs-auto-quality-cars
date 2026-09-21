'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { Alert } from '@/components/ui/surfaces'
import { signIn } from '@/lib/actions/admin-auth'
import type { ActionResult } from '@/lib/actions/result'

/**
 * Sign-in form.
 *
 * Posts straight to a Server Action via the `action` prop, so it submits and
 * works before hydration - an admin on a slow connection is never left with a
 * dead button.
 */
export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(signIn, null)

  return (
    <form action={formAction} className="space-y-5">
      {state && !state.ok ? (
        <Alert tone="danger" title="Could not sign in">
          {state.message}
        </Alert>
      ) : null}

      <input type="hidden" name="next" value={next ?? ''} />

      <Field label="Email address">
        <Input
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          placeholder="you@dealership.com"
        />
      </Field>

      <Field label="Password">
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>

      <SubmitButton />
    </form>
  )
}

/**
 * `useFormStatus` reads the pending state of the enclosing form, which is what
 * keeps the button honest when the action is invoked without JavaScript having
 * hydrated the page yet.
 */
function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" fullWidth size="lg" isLoading={pending} loadingText="Signing in…">
      Sign in
    </Button>
  )
}
