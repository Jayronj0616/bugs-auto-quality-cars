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
