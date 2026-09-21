-- =============================================================================
-- Removes the development demo data.
-- =============================================================================
-- Run once the dealership's real inventory has been imported, so the public
-- site only ever shows genuine stock. Safe to re-run.
--
--   npm run db:sql -- supabase/remove-demo-data.sql
-- =============================================================================

begin;

delete from public.admin_notes         where author_name = 'Seed Data';
delete from public.inquiries           where reference like 'INQ-DEMO%';
delete from public.test_drive_requests where reference like 'TD-DEMO%';

-- Seeded vehicles carry a fixed id prefix; real imports never do.
delete from public.vehicles where id::text like '5ee1a001-0000-4000-8000-%';

-- The illustrative bank rates that shipped with the seed. Real financing
-- partners added through the dashboard are untouched.
delete from public.financing_providers
 where slug in ('bdo', 'bpi', 'rcbc', 'metrobank', 'security-bank');

commit;
