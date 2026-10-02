-- =============================================================================
-- Sold Archive: a "top 5" shown on the homepage.
-- =============================================================================
-- `featured_rank` is the entry's spot among the sold units the dealership
-- wants on the landing page: 1 leads, 5 is the last. Null means not featured.
--
-- The unique partial index is what makes it a leaderboard rather than a flag -
-- two entries can never claim the same spot, so the homepage can never end up
-- with ties or more than five.

alter table public.past_deals
  add column if not exists featured_rank smallint
    check (featured_rank is null or featured_rank between 1 and 5);

create unique index if not exists past_deals_featured_rank_key
  on public.past_deals (featured_rank)
  where featured_rank is not null;

comment on column public.past_deals.featured_rank is
  'Spot (1-5) among the sold units featured on the homepage. Null = not featured.';
