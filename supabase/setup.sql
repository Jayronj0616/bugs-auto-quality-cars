-- =============================================================================
-- BUGS Auto Quality Cars - complete schema
-- =============================================================================
-- GENERATED FILE - do not edit. Run `npm run db:bundle` to regenerate.
--
-- Every migration in supabase/migrations, concatenated in order, so the whole
-- schema can be applied in one paste through the Supabase SQL editor.
--
-- Running it twice will fail on the CREATE TABLE statements, which is
-- intentional: it is meant to be run once on an empty project.
--
-- Source migrations:
--   20260101000000_initial_schema.sql
--   20260101000100_rls_policies.sql
--   20260101000200_storage.sql
--   20260101000300_bootstrap_settings.sql
--   20260101000400_motorcycle_body_type.sql
--   20260101000500_raise_media_size_limit.sql
--   20260101000600_featured_rank.sql
--   20260101000700_past_deals.sql
-- =============================================================================

-- ===========================================================================
-- BEGIN 20260101000000_initial_schema.sql
-- ===========================================================================

-- =============================================================================
-- BUGS Auto Quality Cars - Initial schema
-- =============================================================================
-- Conventions
--   * money      -> numeric(12,2) (Philippine peso, 2 decimal places)
--   * timestamps -> timestamptz, defaulted to now()
--   * enums      -> text + CHECK constraint (easier to extend than pg enums,
--                   and readable through PostgREST without extra casting)
-- =============================================================================

create extension if not exists "pg_trgm" with schema extensions;

-- -----------------------------------------------------------------------------
-- updated_at trigger helper
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$;

-- -----------------------------------------------------------------------------
-- Human friendly reference codes (INQ-2K4J7Q / TD-9F2M1X)
-- -----------------------------------------------------------------------------
create or replace function public.generate_reference(prefix text)
returns text
language sql
volatile
as $fn$
  select prefix || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 8));
$fn$;

-- =============================================================================
-- admin_users : application profile + role for a Supabase Auth user.
-- Credentials live in auth.users; this table never stores passwords.
-- =============================================================================
create table public.admin_users (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null check (length(btrim(name)) between 1 and 120),
  email       text not null,
  role        text not null default 'admin'
              check (role in ('super_admin', 'admin', 'sales', 'content_manager')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index admin_users_role_idx on public.admin_users (role) where is_active;

create trigger admin_users_set_updated_at
  before update on public.admin_users
  for each row execute function public.set_updated_at();

-- =============================================================================
-- dealership_settings : single source of truth for contact information.
-- The `singleton` column guarantees the table can never hold a second row.
-- =============================================================================
create table public.dealership_settings (
  id                      uuid primary key default gen_random_uuid(),
  singleton               boolean not null default true unique check (singleton),

  business_name           text not null default 'BUGS Auto Quality Cars',
  tagline                 text,
  about                   text,

  phone                   text,
  phone_secondary         text,
  email                   text,
  facebook_url            text,
  messenger_url           text,
  instagram_url           text,
  tiktok_url              text,
  viber_number            text,

  address_line1           text,
  address_line2           text,
  city                    text,
  province                text,
  postal_code             text,
  country                 text default 'Philippines',
  google_maps_url         text,
  google_maps_embed_url   text,

  -- [{ "day": "monday", "open": "09:00", "close": "18:00", "closed": false }, ...]
  business_hours          jsonb not null default '[]'::jsonb,

  logo_url                text,
  hero_image_url          text,
  response_time_note      text,

  default_interest_rate        numeric(5,2) not null default 7.50
                               check (default_interest_rate >= 0 and default_interest_rate <= 100),
  default_down_payment_percent numeric(5,2) not null default 20.00
                               check (default_down_payment_percent >= 0 and default_down_payment_percent < 100),
  default_term_months          integer not null default 60
                               check (default_term_months between 1 and 120),
  financing_disclaimer    text not null default
    'Estimated monthly payment only. Actual financing rates, terms, fees, and approval depend on the financing provider and applicant qualifications.',

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create trigger dealership_settings_set_updated_at
  before update on public.dealership_settings
  for each row execute function public.set_updated_at();

-- =============================================================================
-- vehicles
-- =============================================================================
create table public.vehicles (
  id                uuid primary key default gen_random_uuid(),

  brand             text not null check (length(btrim(brand)) > 0),
  model             text not null check (length(btrim(model)) > 0),
  variant           text,
  slug              text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  year              integer not null check (year between 1950 and 2100),

  condition         text not null default 'brand_new'
                    check (condition in ('brand_new', 'used', 'certified_pre_owned')),
  body_type         text check (body_type in (
                      'sedan', 'hatchback', 'suv', 'crossover', 'mpv', 'pickup',
                      'van', 'coupe', 'convertible', 'wagon', 'truck', 'other')),
  fuel_type         text check (fuel_type in (
                      'gasoline', 'diesel', 'hybrid', 'plug_in_hybrid', 'electric', 'lpg', 'other')),
  transmission      text check (transmission in ('automatic', 'manual', 'cvt', 'dct', 'amt', 'other')),
  drive_type        text check (drive_type in ('fwd', 'rwd', 'awd', '4wd', 'other')),

  seating_capacity  integer check (seating_capacity between 1 and 60),
  mileage           integer check (mileage >= 0),
  exterior_color    text,
  interior_color    text,
  plate_ending      text,

  engine            text,
  power_hp          numeric(7,2) check (power_hp is null or power_hp >= 0),
  torque_nm         numeric(7,2) check (torque_nm is null or torque_nm >= 0),

  description       text,
  features          text[] not null default '{}',

  -- Pricing. selling_price is the canonical price; promo_price wins when set.
  srp               numeric(12,2) check (srp is null or srp >= 0),
  selling_price     numeric(12,2) not null check (selling_price > 0),
  promo_price       numeric(12,2) check (promo_price is null or promo_price >= 0),
  promo_label       text,
  promo_starts_at   timestamptz,
  promo_ends_at     timestamptz,
  constraint vehicles_promo_below_selling check (
    promo_price is null or promo_price <= selling_price
  ),
  constraint vehicles_promo_window check (
    promo_starts_at is null or promo_ends_at is null or promo_ends_at > promo_starts_at
  ),

  -- Per-vehicle financing defaults (fall back to dealership_settings when null)
  default_down_payment_percent numeric(5,2)
                    check (default_down_payment_percent is null
                           or (default_down_payment_percent >= 0 and default_down_payment_percent < 100)),
  default_term_months integer check (default_term_months is null or default_term_months between 1 and 120),

  status            text not null default 'draft'
                    check (status in ('draft', 'published', 'reserved', 'sold', 'archived')),
  is_featured       boolean not null default false,
  is_promoted       boolean not null default false,

  view_count        integer not null default 0,

  meta_title        text,
  meta_description  text,

  created_by        uuid references public.admin_users (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  published_at      timestamptz,

  -- Price the inventory filters and sorts on. The full display rule (promo
  -- windows, SRP comparisons) lives in src/lib/pricing.ts; this column exists
  -- so "under ₱1M" can be answered by an index instead of by loading every row.
  filter_price      numeric(12,2) generated always as (coalesce(promo_price, selling_price)) stored,

  -- Denormalised lowercase haystack so one index can serve free-text search.
  search_text       text generated always as (
                      lower(
                        coalesce(brand, '') || ' ' ||
                        coalesce(model, '') || ' ' ||
                        coalesce(variant, '') || ' ' ||
                        coalesce(year::text, '') || ' ' ||
                        coalesce(body_type, '') || ' ' ||
                        coalesce(fuel_type, '') || ' ' ||
                        coalesce(transmission, '') || ' ' ||
                        coalesce(exterior_color, '')
                      )
                    ) stored
);

create index vehicles_status_idx        on public.vehicles (status);
create index vehicles_brand_idx         on public.vehicles (lower(brand));
create index vehicles_model_idx         on public.vehicles (lower(model));
create index vehicles_year_idx          on public.vehicles (year);
create index vehicles_body_type_idx     on public.vehicles (body_type);
create index vehicles_fuel_type_idx     on public.vehicles (fuel_type);
create index vehicles_transmission_idx  on public.vehicles (transmission);
create index vehicles_condition_idx     on public.vehicles (condition);
create index vehicles_price_idx         on public.vehicles (filter_price);
create index vehicles_published_at_idx  on public.vehicles (published_at desc nulls last);
create index vehicles_featured_idx      on public.vehicles (is_featured) where is_featured;
create index vehicles_search_text_idx   on public.vehicles using gin (search_text extensions.gin_trgm_ops);

create trigger vehicles_set_updated_at
  before update on public.vehicles
  for each row execute function public.set_updated_at();

-- published_at is bookkeeping, not something the UI should have to remember.
create or replace function public.vehicles_sync_published_at()
returns trigger
language plpgsql
as $fn$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$fn$;

create trigger vehicles_sync_published_at
  before insert or update of status on public.vehicles
  for each row execute function public.vehicles_sync_published_at();

-- =============================================================================
-- vehicle_images
-- =============================================================================
create table public.vehicle_images (
  id            uuid primary key default gen_random_uuid(),
  vehicle_id    uuid not null references public.vehicles (id) on delete cascade,
  storage_path  text,
  url           text not null,
  alt_text      text,
  category      text not null default 'exterior'
                check (category in ('exterior', 'interior', 'dashboard', 'engine', 'features', 'other')),
  sort_order    integer not null default 0,
  is_primary    boolean not null default false,
  width         integer,
  height        integer,
  file_size     integer,
  created_at    timestamptz not null default now()
);

create index vehicle_images_vehicle_idx on public.vehicle_images (vehicle_id, sort_order);
create unique index vehicle_images_single_primary_idx
  on public.vehicle_images (vehicle_id) where is_primary;

-- Demoting siblings is a data-integrity rule, so it belongs in the database:
-- application code can never forget to run it.
create or replace function public.vehicle_images_enforce_single_primary()
returns trigger
language plpgsql
as $fn$
begin
  update public.vehicle_images
    set is_primary = false
    where vehicle_id = new.vehicle_id
      and id <> new.id
      and is_primary;
  return new;
end;
$fn$;

create trigger vehicle_images_enforce_single_primary
  before insert or update of is_primary on public.vehicle_images
  for each row when (new.is_primary) execute function public.vehicle_images_enforce_single_primary();

-- Keep a vehicle from ending up with images but no primary one.
create or replace function public.vehicle_images_promote_next_primary()
returns trigger
language plpgsql
as $fn$
begin
  if old.is_primary then
    update public.vehicle_images
      set is_primary = true
      where id = (
        select id from public.vehicle_images
        where vehicle_id = old.vehicle_id
        order by sort_order, created_at
        limit 1
      );
  end if;
  return old;
end;
$fn$;

create trigger vehicle_images_promote_next_primary
  after delete on public.vehicle_images
  for each row execute function public.vehicle_images_promote_next_primary();

-- =============================================================================
-- vehicle_videos
-- =============================================================================
create table public.vehicle_videos (
  id            uuid primary key default gen_random_uuid(),
  vehicle_id    uuid not null references public.vehicles (id) on delete cascade,
  title         text not null check (length(btrim(title)) > 0),
  video_url     text not null,
  provider      text not null default 'youtube'
                check (provider in ('youtube', 'vimeo', 'facebook', 'file', 'other')),
  external_id   text,
  thumbnail_url text,
  video_type    text not null default 'walkaround'
                check (video_type in ('walkaround', 'interior', 'exterior', 'driving',
                                      'features', 'promotion', 'other')),
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index vehicle_videos_vehicle_idx on public.vehicle_videos (vehicle_id, sort_order);

create trigger vehicle_videos_set_updated_at
  before update on public.vehicle_videos
  for each row execute function public.set_updated_at();

-- =============================================================================
-- vehicle_specifications : free-form rows on top of the structured columns.
-- =============================================================================
create table public.vehicle_specifications (
  id          uuid primary key default gen_random_uuid(),
  vehicle_id  uuid not null references public.vehicles (id) on delete cascade,
  group_name  text not null default 'General',
  name        text not null check (length(btrim(name)) > 0),
  value       text not null check (length(btrim(value)) > 0),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (vehicle_id, group_name, name)
);

create index vehicle_specifications_vehicle_idx
  on public.vehicle_specifications (vehicle_id, sort_order);

-- =============================================================================
-- financing_providers / financing_rates
-- A rate row is the single financing model: one row per provider+term(+vehicle).
-- =============================================================================
create table public.financing_providers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (length(btrim(name)) > 0),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  logo_url    text,
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger financing_providers_set_updated_at
  before update on public.financing_providers
  for each row execute function public.set_updated_at();

create table public.financing_rates (
  id                            uuid primary key default gen_random_uuid(),
  provider_id                   uuid not null references public.financing_providers (id) on delete cascade,
  -- null = applies to the whole inventory; set = overrides for one vehicle.
  vehicle_id                    uuid references public.vehicles (id) on delete cascade,
  term_months                   integer not null check (term_months between 1 and 120),
  interest_rate                 numeric(5,2) not null check (interest_rate >= 0 and interest_rate <= 100),
  minimum_down_payment_percent  numeric(5,2) not null default 20
                                check (minimum_down_payment_percent >= 0 and minimum_down_payment_percent < 100),
  is_active                     boolean not null default true,
  valid_from                    date,
  valid_until                   date,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  constraint financing_rates_valid_window check (
    valid_from is null or valid_until is null or valid_until >= valid_from
  )
);

-- One rate per provider/vehicle/term. coalesce() makes the "global" rows
-- (vehicle_id is null) participate in the uniqueness check too.
create unique index financing_rates_unique_idx on public.financing_rates (
  provider_id,
  coalesce(vehicle_id, '00000000-0000-0000-0000-000000000000'::uuid),
  term_months
);
create index financing_rates_vehicle_idx on public.financing_rates (vehicle_id) where vehicle_id is not null;
create index financing_rates_active_idx  on public.financing_rates (is_active, term_months);

create trigger financing_rates_set_updated_at
  before update on public.financing_rates
  for each row execute function public.set_updated_at();

-- =============================================================================
-- inquiries
-- vehicle_id uses ON DELETE SET NULL so removing a vehicle never destroys the
-- customer record; vehicle_label preserves what they originally asked about.
-- =============================================================================
create table public.inquiries (
  id                        uuid primary key default gen_random_uuid(),
  reference                 text not null unique default public.generate_reference('INQ'),

  customer_name             text not null check (length(btrim(customer_name)) between 2 and 120),
  customer_email            text check (customer_email is null or customer_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  customer_phone            text not null check (length(btrim(customer_phone)) between 7 and 32),

  vehicle_id                uuid references public.vehicles (id) on delete set null,
  vehicle_label             text,

  inquiry_type              text not null default 'general'
                            check (inquiry_type in ('general', 'vehicle', 'cash_purchase', 'installment',
                                                    'financing', 'test_drive', 'trade_in', 'other')),
  message                   text not null check (length(btrim(message)) between 1 and 4000),

  preferred_contact_method  text not null default 'any'
                            check (preferred_contact_method in ('phone', 'email', 'messenger', 'any')),
  preferred_contact_date    date,

  -- Financing snapshot: inputs are stored so the estimate can be reproduced later.
  vehicle_price_at_inquiry  numeric(12,2) check (vehicle_price_at_inquiry is null or vehicle_price_at_inquiry >= 0),
  down_payment_amount       numeric(12,2) check (down_payment_amount is null or down_payment_amount >= 0),
  down_payment_percent      numeric(5,2)  check (down_payment_percent is null or (down_payment_percent >= 0 and down_payment_percent < 100)),
  loan_term_months          integer       check (loan_term_months is null or loan_term_months between 1 and 120),
  interest_rate             numeric(5,2)  check (interest_rate is null or (interest_rate >= 0 and interest_rate <= 100)),
  estimated_monthly_payment numeric(12,2) check (estimated_monthly_payment is null or estimated_monthly_payment >= 0),
  financing_provider_id     uuid references public.financing_providers (id) on delete set null,

  status                    text not null default 'new'
                            check (status in ('new', 'contacted', 'qualified', 'negotiating',
                                              'converted', 'closed', 'cancelled')),
  source_path               text,

  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index inquiries_status_idx     on public.inquiries (status);
create index inquiries_vehicle_idx    on public.inquiries (vehicle_id);
create index inquiries_created_at_idx on public.inquiries (created_at desc);
create index inquiries_type_idx       on public.inquiries (inquiry_type);

create trigger inquiries_set_updated_at
  before update on public.inquiries
  for each row execute function public.set_updated_at();

-- =============================================================================
-- test_drive_requests
-- =============================================================================
create table public.test_drive_requests (
  id              uuid primary key default gen_random_uuid(),
  reference       text not null unique default public.generate_reference('TD'),

  vehicle_id      uuid references public.vehicles (id) on delete set null,
  vehicle_label   text,

  customer_name   text not null check (length(btrim(customer_name)) between 2 and 120),
  customer_email  text check (customer_email is null or customer_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  customer_phone  text not null check (length(btrim(customer_phone)) between 7 and 32),

  preferred_date  date not null,
  preferred_time  time not null,
  confirmed_date  date,
  confirmed_time  time,

  message         text check (message is null or length(message) <= 2000),

  status          text not null default 'pending'
                  check (status in ('pending', 'contacted', 'confirmed', 'rescheduled',
                                    'completed', 'cancelled')),

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index test_drive_requests_status_idx  on public.test_drive_requests (status);
create index test_drive_requests_vehicle_idx on public.test_drive_requests (vehicle_id);
create index test_drive_requests_date_idx    on public.test_drive_requests (preferred_date);
create index test_drive_requests_created_idx on public.test_drive_requests (created_at desc);

create trigger test_drive_requests_set_updated_at
  before update on public.test_drive_requests
  for each row execute function public.set_updated_at();

-- =============================================================================
-- admin_notes : internal only, never surfaced on the public site.
-- Exactly one of inquiry_id / test_drive_request_id must be set.
-- =============================================================================
create table public.admin_notes (
  id                      uuid primary key default gen_random_uuid(),
  inquiry_id              uuid references public.inquiries (id) on delete cascade,
  test_drive_request_id   uuid references public.test_drive_requests (id) on delete cascade,
  admin_user_id           uuid references public.admin_users (id) on delete set null,
  author_name             text,
  note                    text not null check (length(btrim(note)) between 1 and 4000),
  created_at              timestamptz not null default now(),
  constraint admin_notes_single_parent check (
    (inquiry_id is not null)::int + (test_drive_request_id is not null)::int = 1
  )
);

create index admin_notes_inquiry_idx    on public.admin_notes (inquiry_id, created_at desc);
create index admin_notes_test_drive_idx on public.admin_notes (test_drive_request_id, created_at desc);

-- =============================================================================
-- activity_logs
-- =============================================================================
create table public.activity_logs (
  id            uuid primary key default gen_random_uuid(),
  admin_user_id uuid references public.admin_users (id) on delete set null,
  actor_name    text,
  action        text not null,
  entity_type   text,
  entity_id     uuid,
  entity_label  text,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index activity_logs_created_idx on public.activity_logs (created_at desc);
create index activity_logs_entity_idx  on public.activity_logs (entity_type, entity_id);

-- ===========================================================================
-- BEGIN 20260101000100_rls_policies.sql
-- ===========================================================================

-- =============================================================================
-- BUGS Auto Quality Cars - Row Level Security
-- =============================================================================
-- Security model
--
--   anon (public website)
--     * SELECT on publicly visible vehicles and their media/specs
--     * SELECT on active financing providers/rates and dealership settings
--     * NO insert anywhere. Customer submissions are written server-side with
--       the service-role key *after* Zod validation, so the public anon key can
--       never be used to bypass application validation or spam the tables.
--
--   authenticated (admin dashboard)
--     * Everything is gated on an active row in public.admin_users.
--     * Write access is capability based (see public.admin_can()).
--
--   service_role
--     * Bypasses RLS by design; only ever used from server-side code.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Authorization helpers.
--
-- SECURITY DEFINER so the lookup against admin_users does not itself go through
-- RLS (which would recurse). search_path is pinned to defeat search-path
-- hijacking.
-- -----------------------------------------------------------------------------
create or replace function public.current_admin_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select au.role
  from public.admin_users au
  where au.id = (select auth.uid())
    and au.is_active
  limit 1;
$fn$;

revoke execute on function public.current_admin_role() from public;
grant execute on function public.current_admin_role() to authenticated, service_role;

create or replace function public.is_active_admin()
returns boolean
language sql
stable
as $fn$
  select public.current_admin_role() is not null;
$fn$;

revoke execute on function public.is_active_admin() from public;
grant execute on function public.is_active_admin() to authenticated, service_role;

-- Capability matrix. Keeping it in one place means a policy never hard-codes a
-- list of role names, and adding a role is a single-function change.
--
--   inventory -> vehicles, images, videos, specifications
--   crm       -> inquiries, test drives, internal notes
--   financing -> providers and rates
--   settings  -> dealership settings
--   users     -> admin accounts
create or replace function public.admin_can(capability text)
returns boolean
language sql
stable
as $fn$
  select case capability
    when 'inventory' then public.current_admin_role() in ('super_admin', 'admin', 'content_manager')
    when 'crm'       then public.current_admin_role() in ('super_admin', 'admin', 'sales')
    when 'financing' then public.current_admin_role() in ('super_admin', 'admin')
    when 'settings'  then public.current_admin_role() in ('super_admin', 'admin')
    when 'users'     then public.current_admin_role() = 'super_admin'
    else false
  end;
$fn$;

revoke execute on function public.admin_can(text) from public;
grant execute on function public.admin_can(text) to authenticated, service_role;

-- A vehicle is visible to the public in these states. Draft and archived
-- vehicles (and every child row hanging off them) stay invisible.
create or replace function public.vehicle_is_public(vehicle uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select exists (
    select 1 from public.vehicles v
    where v.id = vehicle
      and v.status in ('published', 'reserved', 'sold')
  );
$fn$;

revoke execute on function public.vehicle_is_public(uuid) from public;
grant execute on function public.vehicle_is_public(uuid) to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Enable RLS everywhere. Any table without a matching policy is closed.
-- -----------------------------------------------------------------------------
alter table public.admin_users            enable row level security;
alter table public.dealership_settings    enable row level security;
alter table public.vehicles               enable row level security;
alter table public.vehicle_images         enable row level security;
alter table public.vehicle_videos         enable row level security;
alter table public.vehicle_specifications enable row level security;
alter table public.financing_providers    enable row level security;
alter table public.financing_rates        enable row level security;
alter table public.inquiries              enable row level security;
alter table public.test_drive_requests    enable row level security;
alter table public.admin_notes            enable row level security;
alter table public.activity_logs          enable row level security;

-- -----------------------------------------------------------------------------
-- admin_users
-- -----------------------------------------------------------------------------
create policy admin_users_select_self on public.admin_users
  for select to authenticated
  using (id = (select auth.uid()) or public.admin_can('users'));

create policy admin_users_manage on public.admin_users
  for all to authenticated
  using (public.admin_can('users'))
  with check (public.admin_can('users'));

-- -----------------------------------------------------------------------------
-- dealership_settings : world readable, admin writable.
-- -----------------------------------------------------------------------------
create policy dealership_settings_public_read on public.dealership_settings
  for select to anon, authenticated
  using (true);

create policy dealership_settings_manage on public.dealership_settings
  for all to authenticated
  using (public.admin_can('settings'))
  with check (public.admin_can('settings'));

-- -----------------------------------------------------------------------------
-- vehicles
-- -----------------------------------------------------------------------------
create policy vehicles_public_read on public.vehicles
  for select to anon, authenticated
  using (status in ('published', 'reserved', 'sold'));

create policy vehicles_admin_read on public.vehicles
  for select to authenticated
  using (public.is_active_admin());

create policy vehicles_admin_write on public.vehicles
  for all to authenticated
  using (public.admin_can('inventory'))
  with check (public.admin_can('inventory'));

-- -----------------------------------------------------------------------------
-- vehicle_images / vehicle_videos / vehicle_specifications
-- Visibility follows the parent vehicle.
-- -----------------------------------------------------------------------------
create policy vehicle_images_public_read on public.vehicle_images
  for select to anon, authenticated
  using (public.vehicle_is_public(vehicle_id));

create policy vehicle_images_admin_read on public.vehicle_images
  for select to authenticated
  using (public.is_active_admin());

create policy vehicle_images_admin_write on public.vehicle_images
  for all to authenticated
  using (public.admin_can('inventory'))
  with check (public.admin_can('inventory'));

create policy vehicle_videos_public_read on public.vehicle_videos
  for select to anon, authenticated
  using (public.vehicle_is_public(vehicle_id));

create policy vehicle_videos_admin_read on public.vehicle_videos
  for select to authenticated
  using (public.is_active_admin());

create policy vehicle_videos_admin_write on public.vehicle_videos
  for all to authenticated
  using (public.admin_can('inventory'))
  with check (public.admin_can('inventory'));

create policy vehicle_specifications_public_read on public.vehicle_specifications
  for select to anon, authenticated
  using (public.vehicle_is_public(vehicle_id));

create policy vehicle_specifications_admin_read on public.vehicle_specifications
  for select to authenticated
  using (public.is_active_admin());

create policy vehicle_specifications_admin_write on public.vehicle_specifications
  for all to authenticated
  using (public.admin_can('inventory'))
  with check (public.admin_can('inventory'));

-- -----------------------------------------------------------------------------
-- financing : the public only ever sees active configuration.
-- -----------------------------------------------------------------------------
create policy financing_providers_public_read on public.financing_providers
  for select to anon, authenticated
  using (is_active);

create policy financing_providers_admin_read on public.financing_providers
  for select to authenticated
  using (public.is_active_admin());

create policy financing_providers_admin_write on public.financing_providers
  for all to authenticated
  using (public.admin_can('financing'))
  with check (public.admin_can('financing'));

create policy financing_rates_public_read on public.financing_rates
  for select to anon, authenticated
  using (
    is_active
    and (valid_from is null or valid_from <= current_date)
    and (valid_until is null or valid_until >= current_date)
  );

create policy financing_rates_admin_read on public.financing_rates
  for select to authenticated
  using (public.is_active_admin());

create policy financing_rates_admin_write on public.financing_rates
  for all to authenticated
  using (public.admin_can('financing'))
  with check (public.admin_can('financing'));

-- -----------------------------------------------------------------------------
-- Customer data. No anon policy at all: not readable and not writable with the
-- public key. Server actions insert through the service role after validation.
-- -----------------------------------------------------------------------------
create policy inquiries_admin_all on public.inquiries
  for all to authenticated
  using (public.admin_can('crm'))
  with check (public.admin_can('crm'));

create policy test_drive_requests_admin_all on public.test_drive_requests
  for all to authenticated
  using (public.admin_can('crm'))
  with check (public.admin_can('crm'));

create policy admin_notes_admin_all on public.admin_notes
  for all to authenticated
  using (public.admin_can('crm'))
  with check (public.admin_can('crm'));

-- -----------------------------------------------------------------------------
-- activity_logs : any active admin may read the trail and append to it, but the
-- history is append-only - there is no update or delete policy, so nobody can
-- edit or erase what they did.
-- -----------------------------------------------------------------------------
create policy activity_logs_admin_read on public.activity_logs
  for select to authenticated
  using (public.is_active_admin());

create policy activity_logs_admin_append on public.activity_logs
  for insert to authenticated
  with check (public.is_active_admin() and admin_user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Table privileges.
--
-- RLS filters *rows*; a GRANT is what makes a table visible to a role at all.
-- Supabase normally applies these through default privileges, but that only
-- covers tables created after those defaults were set - so they are stated
-- explicitly here rather than assumed. Without them PostgREST reports
-- "Could not find the table in the schema cache" for anon, and the storefront
-- renders as though the inventory were empty.
--
-- Granting broadly is safe precisely because RLS is enabled on every table:
-- anon holds SELECT on `inquiries`, for instance, but no policy matches it, so
-- it reads zero rows.
-- -----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;

grant usage, select on all sequences in schema public to anon, authenticated, service_role;

-- Anything added later inherits the same shape.
alter default privileges in schema public
  grant select on tables to anon;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant all on tables to service_role;

-- ===========================================================================
-- BEGIN 20260101000200_storage.sql
-- ===========================================================================

-- =============================================================================
-- BUGS Auto Quality Cars - Storage
-- =============================================================================
-- Layout:
--   vehicle-media/vehicles/{vehicle_id}/images/{uuid}.{ext}
--   vehicle-media/vehicles/{vehicle_id}/videos/{uuid}.{ext}
--   vehicle-media/branding/{uuid}.{ext}
--
-- The bucket is public-read because vehicle photography is marketing material
-- that has to be servable by the Next.js image optimizer and by crawlers.
--
-- The application never touches storage from the browser: uploads and deletes
-- run server-side with the service-role key, which bypasses RLS entirely. The
-- policies below are therefore defence in depth rather than load-bearing - they
-- close off direct client access that the app itself never uses.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vehicle-media',
  'vehicle-media',
  true,
  62914560, -- 60 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/webm']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- Policies on storage.objects.
--
-- Wrapped in an exception handler on purpose: `storage.objects` is owned by the
-- Supabase storage role, and depending on how this script is applied the
-- current user may not be allowed to create policies on it. That is not fatal -
-- the bucket above is what the application actually needs - so a permission
-- error is reported as a notice instead of aborting the whole setup and leaving
-- later migrations unapplied.
--
-- If this block is skipped, the equivalent policies can be added from
-- Storage -> Policies in the Supabase dashboard.
-- -----------------------------------------------------------------------------
do $storage$
begin
  drop policy if exists "vehicle_media_public_read"  on storage.objects;
  drop policy if exists "vehicle_media_admin_insert" on storage.objects;
  drop policy if exists "vehicle_media_admin_update" on storage.objects;
  drop policy if exists "vehicle_media_admin_delete" on storage.objects;

  create policy "vehicle_media_public_read" on storage.objects
    for select to anon, authenticated
    using (bucket_id = 'vehicle-media');

  create policy "vehicle_media_admin_insert" on storage.objects
    for insert to authenticated
    with check (bucket_id = 'vehicle-media' and public.admin_can('inventory'));

  create policy "vehicle_media_admin_update" on storage.objects
    for update to authenticated
    using (bucket_id = 'vehicle-media' and public.admin_can('inventory'))
    with check (bucket_id = 'vehicle-media' and public.admin_can('inventory'));

  create policy "vehicle_media_admin_delete" on storage.objects
    for delete to authenticated
    using (bucket_id = 'vehicle-media' and public.admin_can('inventory'));

  raise notice 'Storage policies applied.';
exception
  when insufficient_privilege then
    raise notice
      'Skipped storage.objects policies: the current role may not alter them. '
      'The vehicle-media bucket is created and the application uploads through '
      'the service role, so this is not fatal. Add the policies from '
      'Storage -> Policies in the dashboard if you want direct client access.';
end
$storage$;

-- ===========================================================================
-- BEGIN 20260101000300_bootstrap_settings.sql
-- ===========================================================================

-- =============================================================================
-- BUGS Auto Quality Cars - Bootstrap the dealership settings singleton.
-- =============================================================================
-- Every environment (including production) needs exactly one settings row for
-- the admin to edit. Only the business name is filled in: phone, email,
-- Facebook and address are deliberately left null until the dealership supplies
-- the real values, and the public site simply omits whatever is not configured
-- rather than showing a placeholder that looks real.
-- =============================================================================

insert into public.dealership_settings (business_name, tagline, business_hours)
values (
  'BUGS Auto Quality Cars',
  'Quality cars. Transparent deals.',
  jsonb_build_array(
    jsonb_build_object('day', 'monday',    'open', '08:00', 'close', '18:00', 'closed', false),
    jsonb_build_object('day', 'tuesday',   'open', '08:00', 'close', '18:00', 'closed', false),
    jsonb_build_object('day', 'wednesday', 'open', '08:00', 'close', '18:00', 'closed', false),
    jsonb_build_object('day', 'thursday',  'open', '08:00', 'close', '18:00', 'closed', false),
    jsonb_build_object('day', 'friday',    'open', '08:00', 'close', '18:00', 'closed', false),
    jsonb_build_object('day', 'saturday',  'open', '09:00', 'close', '17:00', 'closed', false),
    jsonb_build_object('day', 'sunday',    'open', '09:00', 'close', '16:00', 'closed', true)
  )
)
on conflict (singleton) do nothing;

-- ===========================================================================
-- BEGIN 20260101000400_motorcycle_body_type.sql
-- ===========================================================================

-- =============================================================================
-- BUGS Auto Quality Cars - allow motorcycles in the inventory
-- =============================================================================
-- The dealership also sells big scooters and motorcycles, which the original
-- body_type list did not cover. Adding the values here rather than filing them
-- under 'other' keeps them filterable on the public inventory.
-- =============================================================================

alter table public.vehicles
  drop constraint if exists vehicles_body_type_check;

alter table public.vehicles
  add constraint vehicles_body_type_check check (
    body_type in (
      'sedan', 'hatchback', 'suv', 'crossover', 'mpv', 'pickup',
      'van', 'coupe', 'convertible', 'wagon', 'truck',
      'motorcycle', 'scooter',
      'other'
    )
  );

-- ===========================================================================
-- BEGIN 20260101000500_raise_media_size_limit.sql
-- ===========================================================================

-- =============================================================================
-- BUGS Auto Quality Cars - raise the media size limit
-- =============================================================================
-- The original 15MB cap was sized for photographs. The dealership's walkaround
-- videos, shot on a phone, run to roughly 30MB, so the bucket now allows 60MB.
--
-- The application still enforces its own, much tighter 10MB limit on photo
-- uploads (src/lib/media.ts); this ceiling only governs what storage itself
-- will accept, which matters for videos uploaded during an inventory import.
-- =============================================================================

update storage.buckets
   set file_size_limit = 62914560 -- 60 MB
 where id = 'vehicle-media';

-- ===========================================================================
-- BEGIN 20260101000600_featured_rank.sql
-- ===========================================================================

-- =============================================================================
-- Lets the dealership choose which featured vehicle leads the homepage.
-- =============================================================================
-- Featured stock was ordered by `published_at` alone, so the hero showed
-- whichever unit happened to be listed last. That is not a decision anyone
-- made - it is an accident of data entry, and it changes every time a vehicle
-- is added.
--
-- `featured_rank` makes the order explicit: 1 leads, then 2, and so on. It is
-- nullable on purpose. A featured vehicle with no rank keeps the old behaviour
-- and sorts after every ranked one by recency, so nothing has to be ranked for
-- the homepage to work.

alter table public.vehicles
  add column if not exists featured_rank smallint
    check (featured_rank is null or featured_rank between 1 and 999);

comment on column public.vehicles.featured_rank is
  'Display order among featured vehicles - 1 leads the homepage hero. Null sorts last, by published_at.';

-- Partial: only featured rows are ever read through this path.
create index if not exists vehicles_featured_rank_idx
  on public.vehicles (featured_rank)
  where is_featured and featured_rank is not null;

-- ===========================================================================
-- BEGIN 20260101000700_past_deals.sql
-- ===========================================================================

-- =============================================================================
-- Past deals: a lightweight showcase of units already sold.
-- =============================================================================
-- Not the same thing as `vehicles`. A vehicle is something for sale: it has a
-- price, financing terms, an inquiry flow, a calculator. A past deal is proof
-- of work - a car the dealership already sold, often years before this system
-- existed, with nothing left on record but a handful of photographs and
-- whatever the dealership remembers to call it.
--
-- Forcing that into `vehicles` would mean either inventing a price and specs
-- nobody has, or fighting `selling_price` through every place that assumes a
-- real listing has one (the card, the financing calculator, the chat script,
-- the inquiry snapshot). A separate, much smaller table has none of that
-- surface area and cannot be mistaken for something still for sale.
-- =============================================================================

create table public.past_deals (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  title         text not null,
  note          text,
  sold_around   date,
  is_published  boolean not null default true,
  created_by    uuid references public.admin_users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger past_deals_set_updated_at
  before update on public.past_deals
  for each row execute function public.set_updated_at();

create table public.past_deal_images (
  id            uuid primary key default gen_random_uuid(),
  past_deal_id  uuid not null references public.past_deals (id) on delete cascade,
  storage_path  text,
  url           text not null,
  alt_text      text,
  sort_order    integer not null default 0,
  is_primary    boolean not null default false,
  file_size     integer,
  created_at    timestamptz not null default now()
);

create index past_deal_images_deal_idx on public.past_deal_images (past_deal_id, sort_order);
create unique index past_deal_images_single_primary_idx
  on public.past_deal_images (past_deal_id) where is_primary;

-- Same integrity rules as vehicle_images, so a deal can never end up with two
-- cover photos or (while it has photos at all) none.
create or replace function public.past_deal_images_enforce_single_primary()
returns trigger
language plpgsql
as $fn$
begin
  update public.past_deal_images
    set is_primary = false
    where past_deal_id = new.past_deal_id
      and id <> new.id
      and is_primary;
  return new;
end;
$fn$;

create trigger past_deal_images_enforce_single_primary
  before insert or update of is_primary on public.past_deal_images
  for each row when (new.is_primary) execute function public.past_deal_images_enforce_single_primary();

create or replace function public.past_deal_images_promote_next_primary()
returns trigger
language plpgsql
as $fn$
begin
  if old.is_primary then
    update public.past_deal_images
      set is_primary = true
      where id = (
        select id from public.past_deal_images
        where past_deal_id = old.past_deal_id
        order by sort_order, created_at
        limit 1
      );
  end if;
  return old;
end;
$fn$;

create trigger past_deal_images_promote_next_primary
  after delete on public.past_deal_images
  for each row execute function public.past_deal_images_promote_next_primary();

-- -----------------------------------------------------------------------------
-- RLS - the same shape as vehicles / vehicle_images: public reads only what is
-- published, admins with the `inventory` capability do everything else.
-- -----------------------------------------------------------------------------

create or replace function public.past_deal_is_public(deal uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select exists (
    select 1 from public.past_deals d
    where d.id = deal and d.is_published
  );
$fn$;

revoke execute on function public.past_deal_is_public(uuid) from public;
grant execute on function public.past_deal_is_public(uuid) to anon, authenticated, service_role;

alter table public.past_deals enable row level security;
alter table public.past_deal_images enable row level security;

create policy past_deals_public_read on public.past_deals
  for select to anon, authenticated
  using (is_published);

create policy past_deals_admin_read on public.past_deals
  for select to authenticated
  using (public.is_active_admin());

create policy past_deals_admin_write on public.past_deals
  for all to authenticated
  using (public.admin_can('inventory'))
  with check (public.admin_can('inventory'));

create policy past_deal_images_public_read on public.past_deal_images
  for select to anon, authenticated
  using (public.past_deal_is_public(past_deal_id));

create policy past_deal_images_admin_read on public.past_deal_images
  for select to authenticated
  using (public.is_active_admin());

create policy past_deal_images_admin_write on public.past_deal_images
  for all to authenticated
  using (public.admin_can('inventory'))
  with check (public.admin_can('inventory'));

-- Explicit grants rather than relying only on the earlier `alter default
-- privileges` - that statement only reaches tables created afterwards by the
-- exact same role in the exact same way, and this project has already been
-- bitten once by a table PostgREST silently hid from anon for want of a grant.
grant select on public.past_deals, public.past_deal_images to anon;
grant select, insert, update, delete on public.past_deals, public.past_deal_images to authenticated;
grant all on public.past_deals, public.past_deal_images to service_role;

-- Storage: no bucket or policy change needed. `vehicle-media`'s policies are
-- already bucket-wide and gated on admin_can('inventory'), not tied to the
-- vehicles table - photos live at vehicle-media/past-deals/{id}/{uuid}.{ext}.

