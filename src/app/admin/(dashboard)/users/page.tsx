import { Users } from 'lucide-react'

import { AdminUserRowForm } from '@/components/admin/admin-user-row'
import { AdminPageHeader } from '@/components/admin/page-header'
import { Alert, Card, CardHeader, EmptyState } from '@/components/ui/surfaces'
import { ADMIN_ROLES, ROLE_CAPABILITIES } from '@/lib/constants'
import { requireCapability } from '@/lib/auth'
import type { AdminUserRow } from '@/types/database'

export const metadata = { title: 'Admin users' }

export default async function AdminUsersPage() {
  const session = await requireCapability('users', '/admin/users')

  const { data } = await session.supabase
    .from('admin_users')
    .select('*')
    .order('created_at', { ascending: true })

  const users = (data ?? []) as AdminUserRow[]

  return (
    <>
      <AdminPageHeader
        title="Admin users"
        description="Who can sign in to the dashboard, and what each of them is allowed to do."
        breadcrumbs={[{ href: '/admin', label: 'Dashboard' }, { label: 'Admin users' }]}
      />

      <Alert tone="info" title="Adding a new account" className="mb-6">
        <p>
          New accounts are created from the server so the person sets their own password and the
          service-role key never leaves the machine:
        </p>
        <pre className="mt-2 overflow-x-auto rounded bg-white/60 px-3 py-2 font-mono text-xs">
          npm run create-admin
        </pre>
        <p className="mt-2">
          Once the account exists it appears here, where you can change its name, role and access.
        </p>
      </Alert>

      {users.length === 0 ? (
        <EmptyState
          icon={<Users className="size-6" aria-hidden="true" />}
          title="No admin accounts found"
          description="This is unusual — you are signed in, so at least your own account should be listed. Check that the admin_users table is readable."
        />
      ) : (
        <Card className="overflow-hidden">
          <CardHeader
            title={`${users.length} account${users.length === 1 ? '' : 's'}`}
            description="Changes take effect the next time that person loads a page."
          />
          <ul className="divide-y divide-ink-100">
            {users.map((user) => (
              <AdminUserRowForm
                key={user.id}
                user={user}
                isCurrentUser={user.id === session.profile.id}
              />
            ))}
          </ul>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader
          title="What each role can do"
          description="Enforced by the database, not just by what the dashboard shows."
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-ink-200 bg-ink-50 text-left text-xs tracking-wide text-ink-500 uppercase">
                <th scope="col" className="px-5 py-3 font-semibold">Role</th>
                <th scope="col" className="px-5 py-3 font-semibold">Permissions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {ADMIN_ROLES.map((role) => (
                <tr key={role.value}>
                  <td className="px-5 py-3 font-medium text-ink-900">{role.label}</td>
                  <td className="px-5 py-3 text-ink-600">
                    {ROLE_CAPABILITIES[role.value].map(describeCapability).join(' · ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}

function describeCapability(capability: string): string {
  const descriptions: Record<string, string> = {
    inventory: 'Vehicles and media',
    crm: 'Inquiries and test drives',
    financing: 'Financing configuration',
    settings: 'Dealership settings',
    users: 'Admin accounts',
  }
  return descriptions[capability] ?? capability
}
