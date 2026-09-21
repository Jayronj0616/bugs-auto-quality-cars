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
