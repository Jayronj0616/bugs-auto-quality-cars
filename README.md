# BUGS Auto Quality Cars

Dealership platform: a public storefront for browsing vehicles, estimating payments and
sending inquiries, plus an admin dashboard for managing inventory, media, financing, customer
inquiries and dealership information.

**Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (Postgres, Auth, Storage)**

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

**Local (needs Docker Desktop running):**

```bash
npm run db:start
```

It prints `API URL`, `anon key` and `service_role key`. Copy those into `.env.local`, then load
the schema and demo data:

```bash
npm run db:reset
```

**Hosted Supabase project:**

Put the project URL and keys in `.env.local`, link the project, then push the migrations:

```bash
npx supabase link --project-ref <your-project-ref>
npm run db:push
```

`supabase/seed.sql` is development data only and is **not** part of the migration chain — it
never runs against a hosted project unless you run it deliberately.

### Create the first admin

Admin accounts are provisioned deliberately; there is no public signup. Set
`ADMIN_BOOTSTRAP_*` in `.env.local` and run:

```bash
npm run create-admin
```

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
