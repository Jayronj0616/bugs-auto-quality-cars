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
