'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox, Input, Select } from '@/components/ui/field'
import { Alert } from '@/components/ui/surfaces'
import { ADMIN_ROLES, ROLE_CAPABILITIES } from '@/lib/constants'
import { updateAdminUser } from '@/lib/actions/admin-users'
import type { AdminRole, AdminUserRow } from '@/types/database'

/**
 * One editable admin account.
 *
 * Only the application profile is editable here - email and password belong to
 * Supabase Auth and are changed there, so the dashboard never handles a
 * colleague's credentials.
 */
export function AdminUserRowForm({
  user,
  isCurrentUser,
}: {
  user: AdminUserRow
  isCurrentUser: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)
  const [saved, setSaved] = React.useState(false)

  const [name, setName] = React.useState(user.name)
  const [role, setRole] = React.useState<AdminRole>(user.role)
  const [isActive, setIsActive] = React.useState(user.is_active)

  const dirty = name !== user.name || role !== user.role || isActive !== user.is_active

  function save() {
    setError(null)
    setSaved(false)

    startTransition(async () => {
      const result = await updateAdminUser({
        adminUserId: user.id,
        name,
        role,
        isActive,
      })

      if (result.ok) {
        setSaved(true)
        router.refresh()
      } else {
        setError(result.message)
      }
    })
  }

  return (
    <li className="p-4 sm:p-5">
      {error ? (
        <Alert tone="danger" className="mb-3">
          {error}
        </Alert>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_11rem_auto] lg:items-end">
        <div>
          <label
            htmlFor={`name-${user.id}`}
            className="mb-1.5 block text-xs font-medium text-ink-500"
          >
            Name
          </label>
          <Input
            id={`name-${user.id}`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={120}
          />
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-ink-500">Email</p>
          <p className="flex h-11 items-center truncate rounded-md bg-ink-100 px-3 text-sm text-ink-600">
            {user.email}
          </p>
        </div>

        <div>
          <label
            htmlFor={`role-${user.id}`}
            className="mb-1.5 block text-xs font-medium text-ink-500"
          >
            Role
          </label>
          <Select
            id={`role-${user.id}`}
            value={role}
            onChange={(event) => setRole(event.target.value as AdminRole)}
          >
            {ADMIN_ROLES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <Button type="button" onClick={save} disabled={!dirty} isLoading={isPending} loadingText="Saving…">
          {saved && !dirty ? (
            <>
              <Check className="size-4" aria-hidden="true" />
              Saved
            </>
          ) : (
            'Save'
          )}
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <Checkbox
          label="Active"
          hint={
            isCurrentUser
              ? 'This is your own account — you cannot deactivate it.'
              : 'Inactive accounts cannot sign in to the dashboard.'
          }
          checked={isActive}
          disabled={isCurrentUser}
          onChange={(event) => setIsActive(event.target.checked)}
        />

        <p className="text-xs text-ink-500">
          Can manage: {ROLE_CAPABILITIES[role].join(', ')}
        </p>
      </div>
    </li>
  )
}
