/**
 * Concatenates the migrations into a single `supabase/setup.sql`.
 *
 *   npm run db:bundle
 *
 * The bundle exists for the one-off case of applying the schema through the
 * Supabase dashboard's SQL editor, which needs no database password and no
 * Docker. `supabase db push` remains the normal path once a project is linked.
 *
 * It is generated rather than hand-maintained so it can never drift from the
 * migrations, which stay the source of truth.
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const MIGRATIONS_DIR = join('supabase', 'migrations')
const OUTPUT = join('supabase', 'setup.sql')

const files = readdirSync(MIGRATIONS_DIR)
  .filter((name) => name.endsWith('.sql'))
  .sort()

if (files.length === 0) {
  console.error('No migrations found in', MIGRATIONS_DIR)
  process.exit(1)
}

const header = `-- =============================================================================
-- BUGS Auto Quality Cars - complete schema
-- =============================================================================
-- GENERATED FILE - do not edit. Run \`npm run db:bundle\` to regenerate.
--
-- Every migration in supabase/migrations, concatenated in order, so the whole
-- schema can be applied in one paste through the Supabase SQL editor.
--
-- Running it twice will fail on the CREATE TABLE statements, which is
-- intentional: it is meant to be run once on an empty project.
--
-- Source migrations:
${files.map((name) => `--   ${name}`).join('\n')}
-- =============================================================================

`

const body = files
  .map((name) => {
    const contents = readFileSync(join(MIGRATIONS_DIR, name), 'utf8').trimEnd()
    return [
      '-- ' + '='.repeat(75),
      `-- BEGIN ${name}`,
      '-- ' + '='.repeat(75),
      '',
      contents,
      '',
    ].join('\n')
  })
  .join('\n')

writeFileSync(OUTPUT, header + body + '\n', 'utf8')

console.log(`Wrote ${OUTPUT} from ${files.length} migration(s).`)
