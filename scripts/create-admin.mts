/**
 * Creates (or repairs) a dashboard admin account.
 *
 *   npm run create-admin
 *
 * There is deliberately no public sign-up: creating a Supabase Auth user needs
 * the service-role key, which only ever exists on the server. This script is
 * the one supported way in.
 *
 * It reads credentials from ADMIN_BOOTSTRAP_EMAIL / _PASSWORD / _NAME in
 * .env.local, or from arguments:
 *
 *   npm run create-admin -- --email you@example.com --name "Jane" --role admin
 *
 * Running it again for an existing email repairs the profile (reactivates the
 * account, updates the name and role) instead of failing.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

type Role = 'super_admin' | 'admin' | 'sales' | 'content_manager'

const VALID_ROLES: Role[] = ['super_admin', 'admin', 'sales', 'content_manager']

function loadEnvFile(filename: string) {
  try {
    const contents = readFileSync(resolve(process.cwd(), filename), 'utf8')
    for (const line of contents.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue

      const separator = trimmed.indexOf('=')
      if (separator === -1) continue

      const key = trimmed.slice(0, separator).trim()
      let value = trimmed.slice(separator + 1).trim()

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }

      // Real environment variables win over the file.
      if (!(key in process.env)) process.env[key] = value
    }
  } catch {
    // The file is optional; the values may come from the real environment.
  }
}

function readArgs(): Record<string, string> {
  const args: Record<string, string> = {}
  const argv = process.argv.slice(2)

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index]
    if (!current.startsWith('--')) continue
    const key = current.slice(2)
    const next = argv[index + 1]
    if (next && !next.startsWith('--')) {
      args[key] = next
      index += 1
    } else {
      args[key] = 'true'
    }
  }
  return args
}

function fail(message: string): never {
  console.error(`\n  ✗ ${message}\n`)
  process.exit(1)
}

async function main() {
  loadEnvFile('.env.local')
  loadEnvFile('.env')

  const args = readArgs()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!supabaseUrl || !serviceRoleKey) {
    fail(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local.\n' +
        '    Run `npm run db:start` for a local stack, or copy them from your Supabase project settings.',
    )
  }

  const email = (args.email ?? process.env.ADMIN_BOOTSTRAP_EMAIL ?? '').trim().toLowerCase()
  const password = args.password ?? process.env.ADMIN_BOOTSTRAP_PASSWORD ?? ''
  const name = (args.name ?? process.env.ADMIN_BOOTSTRAP_NAME ?? '').trim() || 'Administrator'
  const role = (args.role ?? process.env.ADMIN_BOOTSTRAP_ROLE ?? 'super_admin').trim() as Role

  if (!email || !email.includes('@')) {
    fail('Provide an email address with --email or ADMIN_BOOTSTRAP_EMAIL.')
  }
  if (password.length < 10) {
    fail('Provide a password of at least 10 characters with --password or ADMIN_BOOTSTRAP_PASSWORD.')
  }
  if (!VALID_ROLES.includes(role)) {
    fail(`Role must be one of: ${VALID_ROLES.join(', ')}`)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  console.log(`\n  Creating admin account for ${email}…`)

  let userId: string | null = null

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  })

  if (created?.user) {
    userId = created.user.id
    console.log('  ✓ Auth user created.')
  } else {
    // Already registered: find them and continue, so re-running repairs the
    // profile rather than erroring out.
    const alreadyExists =
      createError?.message?.toLowerCase().includes('already') ||
      createError?.message?.toLowerCase().includes('registered')

    if (!alreadyExists) {
      fail(`Could not create the auth user: ${createError?.message ?? 'unknown error'}`)
    }

    console.log('  • An auth user with that email already exists — updating their profile.')

    const { data: list, error: listError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })

    if (listError) fail(`Could not look up the existing user: ${listError.message}`)

    userId = list.users.find((user) => user.email?.toLowerCase() === email)?.id ?? null
    if (!userId) fail('That email is registered but the user could not be found.')
  }

  const { error: profileError } = await supabase
    .from('admin_users')
    .upsert(
      { id: userId, email, name, role, is_active: true },
      { onConflict: 'id' },
    )

  if (profileError) {
    fail(
      `The auth user exists but the admin profile could not be saved: ${profileError.message}\n` +
        '    Have the migrations been applied? Try `npm run db:reset` (local) or `npm run db:push`.',
    )
  }

  console.log('  ✓ Admin profile saved.')
  console.log(`\n  Done. Sign in at /admin/login as ${email} with the role "${role}".\n`)
}

main().catch((error) => {
  console.error('\n  ✗ Unexpected failure:', error)
  process.exit(1)
})
