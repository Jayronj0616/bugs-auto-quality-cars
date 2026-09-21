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
