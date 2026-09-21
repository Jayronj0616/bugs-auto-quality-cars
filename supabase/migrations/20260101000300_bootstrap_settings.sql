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
