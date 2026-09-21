/**
 * Runs a SQL file against the project database.
 *
 *   npm run db:seed              -> supabase/seed.sql
 *   npm run db:sql -- path.sql   -> any file
 *
 * Reads `SUPABASE_DB_URL` from `.env.local`. Used for things that are not
 * migrations - primarily loading the development seed data, which is
 * deliberately kept out of the migration chain so it can never reach
 * production by accident.
 */

import { readFileSync } from 'node:fs'
import { Client } from 'pg'

const env: Record<string, string> = {}
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const i = trimmed.indexOf('=')
  if (i === -1) continue
  env[trimmed.slice(0, i).trim()] = trimmed.slice(i + 1).trim()
}

const connectionString = env.SUPABASE_DB_URL
if (!connectionString) {
  console.error(
    '\n  SUPABASE_DB_URL is not set in .env.local.\n' +
      '  Copy the connection string from Project Settings -> Database.\n' +
      '  Use the session pooler (port 5432) if your network has no IPv6 route.\n',
  )
  process.exit(1)
}

const file = process.argv[2] ?? 'supabase/seed.sql'
const sql = readFileSync(file, 'utf8')

const client = new Client({
  connectionString,
  // Supabase terminates TLS with its own chain; verification is off for the
  // same reason the Supabase CLI does it, and the connection is still encrypted.
  ssl: { rejectUnauthorized: false },
})

console.log(`\n  Running ${file}…`)

try {
  await client.connect()
  await client.query(sql)
  console.log('  Done.\n')
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`\n  Failed: ${message}\n`)
  process.exitCode = 1
} finally {
  await client.end()
}
