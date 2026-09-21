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
