# BUGS Auto Quality Cars — Build Progress

Living status of the implementation. Update as phases land.

**Last updated:** 2026-09-21
**Stack:** Next.js 16.3.5 (App Router) · React 19.2 · TypeScript · Tailwind v4 · Supabase (Postgres + Auth + Storage)

---

## Current state

| | |
|---|---|
| TypeScript | ✅ clean (`npm run typecheck`) |
| ESLint | ✅ clean (`npm run lint`) |
| Unit tests | ✅ 33 passing (`npm run test`) |
| Production build | ✅ passing (`npm run build`) |
| **Run against a real database** | ⛔ **not yet done — see [Blocked](#blocked-needs-a-decision)** |

Everything so far is written against Supabase but has **not been executed against a live
database**. The app is deliberately tolerant of a missing backend: it builds and renders a
"Backend not configured" state instead of crashing, so the tree stays green until credentials
exist.

---

## Blocked: needs a decision

**Choose how to get a live Supabase**, then the migrations can be applied and every flow
verified end to end:

1. **Local stack (recommended)** — start Docker Desktop, then
   `npm run db:start && npm run db:reset`. Full Postgres + Auth + Storage locally, loads the
   seed data, needs no cloud account or secrets.
2. **Hosted project** — supply a project URL + anon key + service-role key; they go in
   `.env.local` (git-ignored) and `npm run db:push` applies the schema.

### Also needed from the business (placeholders until then)

These are intentionally left **unset** rather than invented. The public site omits whatever is
not configured; nothing fake is displayed.

- Phone number, email address, Facebook Page URL
- Street address + Google Maps link
- Logo file
- Real financing partners and their actual rates/terms (the seeded banks are **illustrative
  samples**, clearly labelled as such in `supabase/seed.sql`)
- Confirmation that the seeded business hours (Mon–Fri 8–6, Sat 9–5, Sun closed) are correct

---

## Phases

### ✅ Phase 1 — Foundation

- Git repository initialised; docs committed before any code.
- Next.js 16 scaffold (App Router, `src/`, TypeScript, Tailwind v4, ESLint).
- Migrated `middleware.ts` → `proxy.ts` (Next 16 convention).
- **Database schema** (`supabase/migrations/20260101000000_initial_schema.sql`)
  — 12 tables, CHECK constraints mirroring the app's enums, foreign keys with deliberate
  delete behaviour (customer records survive vehicle deletion via `ON DELETE SET NULL`),
  indexes on every filterable column, `updated_at` triggers, single-primary-image enforcement,
  auto `published_at`, and two generated columns (`filter_price`, `search_text`) so price
  filtering and search can use indexes.
- **Row Level Security** (`…_rls_policies.sql`) — capability matrix
  (`inventory` / `crm` / `financing` / `settings` / `users`) enforced in the database via
  `SECURITY DEFINER` helpers. Anonymous users get **read-only** access to published vehicles
  and have **no INSERT policy anywhere**; customer submissions are written server-side after
  validation. `activity_logs` is append-only.
- **Storage** (`…_storage.sql`) — `vehicle-media` bucket, public read, admin-only writes.
- **Settings bootstrap** (`…_bootstrap_settings.sql`) — creates the single settings row every
  environment needs, with contact fields left null.
- **Seed data** (`supabase/seed.sql`) — 10 vehicles across every status, images, videos,
  specs, sample financing, and demo inquiries/test drives. Dev-only, never in the migration chain.
- Design system: Tailwind v4 theme tokens (ink ramp + one crimson accent), Sora/Inter
  typography, motion tokens, `prefers-reduced-motion` handling, `.container-page` / `.tabular` /
  `.reveal` utilities.
- UI primitives: Button, Field/Input/Textarea/Select/Checkbox/Fieldset (accessible by
  construction), Badge, Card, SectionHeading, EmptyState, Alert, Skeleton, Modal (native
  `<dialog>`), ConfirmDialog, Pagination, Reveal.
- Site shell: sticky dark header with contact bar, desktop nav, mobile drawer, footer — all
  reading dealership settings from one cached source.
- Supabase client layer: browser / server (cookie, RLS-bound) / **public cookie-free** (keeps
  storefront pages statically renderable) / service-role (server-only, documented uses).
- Auth + authorization layer (`src/lib/auth.ts`) with `requireAdmin`, `requireCapability`,
  `authorizeAction`, activity logging.

### ✅ Phase 2 — Inventory

- Homepage: hero (features a real vehicle when one exists), quick search, featured grid,
  why-us, financing CTA, latest arrivals, contact CTA.
- `/cars`: keyword search, brand/body/fuel/transmission/condition filters, price range, **monthly
  budget filter** (inverts the amortisation to an indexed price comparison), year range,
  featured/promo/sold toggles, 6 sort orders, pagination.
- Filters live in the URL, so a filtered view is shareable and the back button works.
- Removable filter chips, mobile filter drawer, loading skeleton, empty state (distinguishes
  "no results" from "nothing published yet"), error state.
- `VehicleCard` with badge rules centralised in one place.

### ✅ Phase 3 — Vehicle detail

- `/cars/[slug]` with `generateStaticParams` + ISR (`dynamicParams` on, so newly published
  vehicles render on first request).
- Gallery: category chips, thumbnail strip, fullscreen `<dialog>` viewer, arrow-key navigation,
  touch swipe, lazy loading beyond the first image.
- Specifications (structured columns + grouped free-form rows), features list.
- Videos: click-to-load facade (`youtube-nocookie`), so no third-party player JS loads
  until the visitor presses play.
- Related vehicles, breadcrumbs, sticky mobile CTA bar, schema.org `Vehicle` + `Offer` JSON-LD,
  metadata generated from the row (sold units are `noindex`).

### ✅ Phase 4 — Financing

- `src/lib/financing/calculator.ts` — pure amortisation with explicit handling of zero
  interest, negative/NaN input, down payment ≥ price, term/rate bounds, provider minimums
  (advisory, not blocking) and 2-decimal rounding. **19 unit tests.**
- `src/lib/pricing.ts` — one rule for SRP / selling / promo (including scheduled promo
  windows). **14 unit tests.**
- Calculator UI: provider select, linked %/₱ down payment with presets, term, editable rate
  that follows the configured provider until overridden, live `aria-live` total, disclaimer
  pulled from settings.
- Cash / Installment segmented control on the vehicle page; the calculator's values travel
  into the inquiry.

### ✅ Phase 5 — Customer submissions (server side complete)

- `submitInquiry` / `submitTestDrive` Server Actions: rate limiting, honeypot, server-side Zod
  revalidation, vehicle re-read through the anon client (so only publicly visible vehicles can
  be inquired about), **financing figures recomputed server-side** rather than trusted, insert
  via service role, admin path revalidation.
- Inquiry form (financing section appears only for installment/financing types) and test-drive
  form, both with per-field errors, loading/success states and reference numbers.

### ⬜ Phase 6 — Admin authentication & dashboard
### ⬜ Phase 7 — Vehicle CRUD + media management
### ⬜ Phase 8 — Inquiry & test-drive management
### ⬜ Phase 9 — Dealership settings + financing configuration
### ⬜ Phase 10 — Remaining public pages (`/financing`, `/about`, `/contact`), sitemap, robots
### ⬜ Phase 11 — Responsive QA at all listed breakpoints, a11y pass, performance pass
### ⬜ Phase 12 — End-to-end verification against a live database, final polish

---

## Resuming

```bash
npm install
npm run check      # typecheck + lint + test
npm run dev
```

The app runs without Supabase and shows a setup notice. To bring the backend up:

```bash
cp .env.example .env.local
npm run db:start   # needs Docker Desktop running
npm run db:reset   # applies migrations + seed
```

`npm run db:start` prints the local URL, anon key and service-role key to paste into
`.env.local`.

### Next thing to build

`src/app/admin/login/page.tsx` + the admin layout shell (`src/app/admin/(dashboard)/layout.tsx`).
`src/lib/auth.ts` is already written and provides `requireAdmin` / `requireCapability` /
`authorizeAction`; the admin pages just need to consume it.

---

## Decisions worth knowing

- **One financing model.** `docs/Database.md` offered both `financing_rates` and
  `financing_terms`; using both would duplicate the same facts. Only `financing_rates` exists —
  one row per provider × term, optionally scoped to a vehicle, which is also how a
  vehicle-specific promo rate is expressed.
- **Specifications use both approaches.** Frequently filtered attributes are real columns
  (indexable); everything else lives in `vehicle_specifications` rows.
- **Anonymous users cannot INSERT.** The docs allow writing inquiries directly with the anon
  key, but that would let anyone bypass the Zod validation and rate limit. All public writes go
  through Server Actions using the service role after validation.
- **A cookie-free Supabase client for public pages.** Reading cookies would force every
  storefront page to render dynamically; this keeps them static with ISR.
- **No animation library.** CSS transitions plus one `IntersectionObserver` cover every
  animation the UI spec asks for, at zero bundle cost.
- **`filter_price` generated column.** Filtering on `coalesce(promo_price, selling_price)`
  in an index rather than loading rows to compute it in JS. The full display rule (promo
  windows, SRP comparison) still lives in `src/lib/pricing.ts`.
- **Client-only "today".** Business hours and test-drive date bounds resolve after hydration,
  so a statically rendered page never ships a date that was only correct at build time.
- **No dark mode.** Not requested, and a light site with dark header/hero/footer sections is
  what premium dealership sites actually do. Skipping it keeps the polish budget on the
  photography-led layouts.
