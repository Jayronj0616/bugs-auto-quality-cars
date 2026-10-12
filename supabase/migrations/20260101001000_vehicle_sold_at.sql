-- =============================================================================
-- Inventory vehicles remember when they were sold.
-- =============================================================================
-- The homepage "Recently sold" row mixes Sold Archive entries with cars sold
-- out of the live inventory, and needs a date to rank the latter. Vehicles had
-- only `updated_at`, which moves on every edit (a price tweak on a sold car
-- would make it look freshly sold).
--
-- A trigger rather than application code, so every write path - the admin
-- form, a quick status change, a SQL fix - records it the same way.

alter table public.vehicles
  add column if not exists sold_at timestamptz;

create or replace function public.set_vehicle_sold_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'sold' then
    -- Becoming sold (or inserted as sold): stamp it unless a date was supplied.
    if tg_op = 'INSERT' or old.status is distinct from 'sold' then
      new.sold_at := coalesce(new.sold_at, now());
    end if;
  else
    -- Back on sale (or never sold): no sold date.
    new.sold_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists vehicles_set_sold_at on public.vehicles;
create trigger vehicles_set_sold_at
  before insert or update of status on public.vehicles
  for each row execute function public.set_vehicle_sold_at();

-- Cars already marked sold: the last edit is the best date available.
update public.vehicles
  set sold_at = updated_at
  where status = 'sold' and sold_at is null;

create index if not exists vehicles_sold_at_idx
  on public.vehicles (sold_at desc)
  where status = 'sold';

comment on column public.vehicles.sold_at is
  'When status last became sold; null while not sold. Maintained by vehicles_set_sold_at.';
