# BUGS Auto Quality Cars — Build Progress

Living status of the implementation. Update as phases land.

**Last updated:** 2026-09-21 (live with real inventory)
**Stack:** Next.js 16.3.5 (App Router) · React 19.2 · TypeScript · Tailwind v4 · Supabase (Postgres + Auth + Storage)

---

## Current state

| | |
|---|---|
| TypeScript | ✅ clean (`npm run typecheck`) |
| ESLint | ✅ clean (`npm run lint`) |
| Unit tests | ✅ 49 passing (`npm run test`) |
| Production build | ✅ passing (`npm run build`) |
| **Run against a real database** | ✅ live on a hosted Supabase project (`npm run db:verify`) |

Phases 1–10 are code complete and the system now runs against a live hosted Supabase
project. The customer-to-dashboard loop has been walked end to end with real data:
a vehicle created and published in the dashboard appears on `/cars` with a correct monthly
estimate, and an inquiry submitted from its detail page arrives in the dashboard with the
vehicle attached.

The app also stays runnable without a backend — it renders a "Backend not configured" state
rather than crashing — so a fresh clone builds green before any credentials exist.

---

## Live status

Connected to a hosted Supabase project (`ap-southeast-2`) with the dealership's real data:

- **5 vehicles published** — Hyundai H350, Chevrolet Camaro RS, Ford Territory, Ford Ranger
  Sport, FKM Slick 400 — with 72 of their own photographs and 4 walkaround videos.
- **JACCS financing** configured per vehicle. The quoted monthlies are stored verbatim as
  specifications, and per-vehicle rates are derived so the on-site calculator reproduces each
  quote to within a few pesos.
- **Contact details** applied: both phone numbers, Plaridel/Bulacan location, logo.
- `npm run db:verify` passes, including that anonymous visitors cannot read customer data or
  write to any table.

### Reproducing the setup elsewhere

```bash
cp .env.example .env.local          # then fill in the Supabase URL and keys
npx supabase link --project-ref <ref>
npm run db:push                     # schema, RLS, storage, settings row
npm run db:bootstrap                # bucket + settings singleton
npm run create-admin                # first dashboard account
npm run db:verify                   # confirm, including that RLS actually bites
```

No Docker at any point: `db push` connects to the database directly.

### Still to supply

Left **unset** rather than invented — the site omits whatever is not configured:

- Email address
- Facebook Page URL
- Exact street address and a Google Maps link (only "Near Sta. Rita Exit from NLEX,
  Plaridel, Bulacan" is recorded)
- Confirmation that the default business hours (Mon–Fri 8–6, Sat 9–5, Sun closed) are correct

All editable at `/admin/settings`.

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

### ✅ Phase 6 — Admin authentication & dashboard

- Sign-in as a Server Action, so the form works before hydration. A correct password is not
  enough: the account must also have an **active `admin_users` row**, or it is signed straight
  back out. Failure messages are deliberately vague to prevent account enumeration.
- Open-redirect guard on the post-login `next` parameter.
- Three-layer protection: `proxy.ts` (is there a session?) → admin layout (is this an active
  admin, and what may they do?) → RLS (final word on every row).
- Dashboard with role-filtered navigation, capability-gated stats and panels, and prompts for
  unconfigured contact details or unpublished drafts.
- **Bug found and fixed:** `/admin/vehicles` was being prerendered as a *static 307 redirect*
  to the login page, which would have bounced authenticated admins. The admin segment is now
  explicitly `force-dynamic`.

### ✅ Phase 7 — Vehicle CRUD + media management

- Full create/edit form in labelled sections, with a live slug preview and server-side slug
  uniqueness (`-2`, `-3`…) on top of the unique index.
- Status transitions, publish/unpublish, mark reserved/sold, archive with confirmation, and
  duplicate-as-draft (copies specs and videos, deliberately **not** photos — shared storage
  objects would let deleting one listing's photo break another).
- Photo upload through a **Route Handler**, because Server Action bodies are capped at 1MB.
  Validates size, MIME type *and* magic bytes, rolls the storage object back if the row insert
  fails, and never exposes a storage credential to the browser.
- Reorder by drag or keyboard, set the main photo, per-photo alt text and category, delete
  (removes the storage object too).
- Video management for external providers, plus free-form specification rows.

### ✅ Phase 8 — Inquiry & test-drive management

- Filterable lists with status tabs, counts, and search across name, phone, email, reference
  and vehicle.
- Inquiry detail: message, the financing snapshot, the linked vehicle, and a status pipeline
  with optimistic updates.
- Test drive detail: requested vs confirmed slot, with confirming/rescheduling *requiring* an
  actual date and time — enforced in the client, in Zod on the server, and surfaced in the UI.
- Append-only internal notes on both, never exposed publicly.

### ✅ Phase 9 — Dealership settings + financing configuration

- One settings screen driving the entire public site: contact channels, address, Google Maps,
  business hours, branding, financing defaults and the disclaimer. Saving revalidates
  site-wide.
- Logo/hero upload via a `settings`-scoped route handler; the URL is held in form state so an
  upload can be previewed and still abandoned.
- Financing providers and per-term rates, including **vehicle-specific override rates** for
  manufacturer promos, which the public calculator prefers over the general rate.

### ✅ Phase 10 — Remaining public pages, SEO, admin accounts

- `/financing` (standalone calculator, configured providers, how-it-works FAQ), `/about`
  (built from the dealership's own settings), `/contact` (every configured channel, hours,
  embedded map, working inquiry form).
- `sitemap.xml` generated from published inventory; `robots.txt` disallowing `/admin` and
  `/api`.
- Admin user management for `super_admin`, with a guard against removing your own access.
- `npm run create-admin` bootstraps the first account server-side — no public sign-up, and the
  service-role key never leaves the machine.

### 🟡 Phase 11 — Responsive, accessibility and performance

Done:
- Palette rebuilt on 60-30-10 (white 60 / brand teal 30 / warm amber 10).
- Contrast measured in-browser rather than eyeballed, which caught `text-ink-500`
  failing AA at 4.1:1 across 91 usages, and white-on-amber buttons at 2.9:1. The neutral
  ramp was retuned and amber fills now carry dark text.
- Automated contrast audit run over `/`, `/cars`, `/financing` and `/contact`: clean.

Outstanding:
- Sweep the remaining breakpoints from the UI spec (1920 / 1440 / 1280 / 1024 / 768 / 430 /
  390 / 375), especially the admin tables and the vehicle gallery.
- Keyboard-only pass over the gallery, modals and the mobile drawer.
- Lighthouse pass once real photography is in.

### 🟡 Phase 12 — End-to-end verification

Verified against the live database:
- Admin sign-in, dashboard, vehicle create + publish
- Published vehicle reaching `/cars` and its detail page, with a correct monthly estimate
- Inquiry submitted from the vehicle page arriving in the dashboard, vehicle attached
- RLS: anon reads published vehicles, sees no rows in `inquiries` / `test_drive_requests` /
  `admin_notes`, and is refused on insert with `42501`

Still to exercise:
- Photo upload, reorder and primary selection (needs real image files)
- Test-drive booking and its confirm/reschedule workflow
- Settings save propagating to the public header, footer and contact page
- Financing provider and rate configuration feeding the calculator
- Role enforcement for `sales` and `content_manager` accounts

---

## Resuming

```bash
npm install
npm run check      # typecheck + lint + test
npm run dev
```

The app runs without Supabase and shows a setup notice. To connect the backend:

```bash
cp .env.example .env.local        # then fill in the Supabase URL and keys
npx supabase link --project-ref <ref>
npm run db:push                   # applies the migrations to the hosted project
npm run create-admin              # creates the first dashboard account
```

### Next thing to do

Apply the schema to a hosted project, then work through the acceptance checklist against real
data: publish a vehicle from the dashboard and confirm it reaches `/cars`, submit an inquiry and
confirm it lands in the dashboard, upload and reorder photos, and confirm a `sales` role cannot
reach `/admin/vehicles` while a `content_manager` cannot read customer details.

---

## Decisions worth knowing

- **Overlays are portalled to `<body>`.** `position: fixed` is only relative to the viewport
  while nothing above it creates a containing block or a stacking context, and two things on
  this site do: the site header is `backdrop-blur`, and the page-transition wrapper in
  `template.tsx` keeps a stacking context because its opacity animation fills. Left in place,
  the mobile menu was sized to the 64px header bar and pushed off-screen, and the inventory
  filter drawer painted *below* the header — burying its own close button — no matter how high
  its z-index. `src/components/ui/portal.tsx` moves overlays out to `<body>`, which fixes both
  and cannot be re-broken by a decorative blur or animation added to a wrapper later.
- **Featured order is data, not an accident.** `vehicles.featured_rank` decides which featured
  vehicle leads the homepage hero (1 first, then 2, …); unranked featured stock falls in behind
  by recency. Previously the hero showed whichever unit happened to be listed last, which is a
  decision nobody made. The dealership sets it from the vehicle form.
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
