-- =============================================================================
-- Past deals get a constrained `brand` instead of a free-text title.
-- =============================================================================
-- The dealership asked for this after fixing several typed-in titles by hand:
-- a fixed list of choices is faster to pick from and correct than typing, and
-- it's the only way to filter /sold by brand without falling back to fuzzy
-- text matching on whatever an admin happened to type.
--
-- `title` stays as the column everything else (slug, cards, detail page)
-- already reads - it's now derived from `brand` at write time rather than
-- typed directly, so nothing downstream has to change. A null brand is a
-- deliberate case, not a missing one: the photo doesn't show a legible badge,
-- and `title` falls back to "Sold vehicle" for exactly those rows.
-- =============================================================================

alter table public.past_deals
  add column if not exists brand text
    check (brand in (
      'toyota', 'mitsubishi', 'honda', 'ford', 'nissan', 'hyundai', 'mazda',
      'suzuki', 'kia', 'chevrolet', 'isuzu', 'lexus', 'subaru', 'volkswagen',
      'bmw', 'mercedes_benz', 'volvo', 'peugeot', 'mg', 'byd', 'geely',
      'foton', 'jeep', 'other'
    ));

comment on column public.past_deals.brand is
  'Constrained list, not free text - drives both the derived title and the /sold brand filter. Null means no legible badge.';

create index if not exists past_deals_brand_idx on public.past_deals (brand);

-- Backfill from the existing titles, which are already exactly the brand
-- name for every row that has one (the free-text-title era ended with the
-- retitle-to-brand-only pass this column replaces).
update public.past_deals
  set brand = lower(title)
  where title <> 'Sold vehicle'
    and lower(title) in (
      'toyota', 'mitsubishi', 'honda', 'ford', 'nissan', 'hyundai', 'mazda',
      'suzuki', 'kia', 'chevrolet', 'isuzu', 'lexus'
    );
