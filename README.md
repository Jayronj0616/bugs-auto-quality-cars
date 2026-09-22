# BUGS Auto Quality Cars

Dealership platform: a public storefront for browsing vehicles, estimating payments and
sending inquiries, plus an admin dashboard for managing inventory, media, financing, customer
inquiries and dealership information.

**Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (Postgres, Auth, Storage)**

**Live:** [bugs-auto-quality-cars.vercel.app](https://bugs-auto-quality-cars.vercel.app)
**Repo:** [github.com/Jayronj0616/bugs-auto-quality-cars](https://github.com/Jayronj0616/bugs-auto-quality-cars)

Every push to `main` deploys to production automatically (Vercel is connected directly to
this GitHub repo) - there is no separate deploy step to run.

Build status and what is left to do: **[`docs/PROGRESS.md`](docs/PROGRESS.md)**

---

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

The app runs without Supabase — it shows a "Backend not configured" notice instead of
crashing, so a fresh clone is immediately runnable.

### Bring up the database

Create a project at [supabase.com](https://supabase.com), then copy its URL and keys from
**Project Settings → API** into `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

Link the project and push the schema:

```bash
npx supabase link --project-ref <project-ref>
npm run db:push
```

`db:push` talks to the remote database directly — **no Docker required**.

To load the demo inventory as well, paste `supabase/seed.sql` into the Supabase SQL editor and
run it. That file is development data only and is deliberately **not** part of the migration
chain, so it never reaches production by accident.

<details>
<summary>Optional: local stack (requires Docker)</summary>

`npm run db:start` runs Postgres, Auth and Storage locally and prints keys to paste into
`.env.local`; `npm run db:reset` then applies the migrations plus `seed.sql`. Only these two
commands and `supabase db diff` need Docker.

</details>

### Create the first admin

Admin accounts are provisioned deliberately; there is no public signup. Set
`ADMIN_BOOTSTRAP_*` in `.env.local` and run:

```bash
npm run create-admin
```

---

## Deploying

The production site is hosted on Vercel and connected directly to this repo's `main` branch,
so `git push` is the entire deploy step.

To point a new Vercel project at a fork, set three environment variables (Project Settings ->
Environment Variables) - these are the only ones the app reads at runtime:

| Variable | Where it's used |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Safe to expose - read by the browser |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Safe to expose - Row Level Security is what actually protects the data |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only.** Store it as a Secret, never as a public/config value |

`NEXT_PUBLIC_SITE_URL` does not need to be set on Vercel - `src/lib/env.ts` falls back to
Vercel's own `VERCEL_PROJECT_PRODUCTION_URL` automatically. The database schema itself is
applied separately with `npm run db:push` (see above); Vercel only builds and serves the app.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run check` | Typecheck + lint + tests |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run test` | Vitest |
| `npm run db:start` / `db:stop` | Local Supabase stack |
| `npm run db:reset` | Recreate the local database from migrations + seed |
| `npm run db:push` | Apply migrations to the linked project |
| `npm run db:types` | Regenerate `src/types/database.generated.ts` |

---

## Layout

```
docs/                      Product, flow, UI and database specs, plus PROGRESS.md
supabase/
  migrations/              Schema, RLS policies, storage, settings bootstrap
  seed.sql                 Development demo data (never run in production)
src/
  app/
    (public)/              Storefront: home, inventory, vehicle detail, contact…
    admin/                 Protected dashboard
  components/
    ui/                    Design-system primitives
    layout/                Header, footer, navigation
    vehicles/              Cards, gallery, filters, specifications
    financing/             Installment calculator
    forms/                 Inquiry and test-drive forms
  lib/
    supabase/              Browser / server / public / service-role clients
    data/                  Read layer (vehicles, settings, financing)
    actions/               Server Actions
    validation/            Zod schemas shared by client and server
    financing/             Amortisation maths (+ tests)
    pricing.ts             The single rule for which price is displayed (+ tests)
  types/database.ts        Typed schema
```

---

## Security model

Three layers, each independently sufficient to deny:

| Layer | Answers |
|---|---|
| `src/proxy.ts` | Is there a valid session at all? |
| `src/lib/auth.ts` | Is this user an *active admin*, and what may they do? |
| Postgres RLS | The final word on every row |

- Anonymous visitors can read published vehicles, their media, active financing configuration
  and dealership settings. They have **no INSERT policy on any table**.
- Customer submissions are written server-side with the service-role key *after* Zod
  validation and rate limiting, so the public key cannot be used to bypass either.
- `SUPABASE_SERVICE_ROLE_KEY` is never prefixed with `NEXT_PUBLIC_` and is only imported by
  modules marked `server-only`.
- Customer contact details, inquiries and internal notes are readable only by admins with the
  `crm` capability. `activity_logs` is append-only — nobody can edit or erase their own trail.

---

## Dealership information

Phone, email, Facebook, address, Google Maps link, business hours and the financing disclaimer
all come from the single `dealership_settings` row and are edited at `/admin/settings`. Nothing
is hard-coded in components, so changing the phone number updates the header, footer, contact
page, vehicle CTAs and mobile action bar at once.

Values that have not been supplied yet are left **null**, and the UI omits them rather than
displaying a plausible-looking placeholder.
