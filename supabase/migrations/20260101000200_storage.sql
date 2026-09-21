-- =============================================================================
-- BUGS Auto Quality Cars - Storage
-- =============================================================================
-- Layout:
--   vehicle-media/vehicles/{vehicle_id}/images/{uuid}.{ext}
--   vehicle-media/vehicles/{vehicle_id}/videos/{uuid}.{ext}
--   vehicle-media/branding/{uuid}.{ext}
--
-- The bucket is public-read because vehicle photography is marketing material
-- that has to be servable by the Next.js image optimizer and crawlers. Writes
-- are restricted to authenticated admins, and the application performs uploads
-- server-side so no storage credential ever reaches the browser.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vehicle-media',
  'vehicle-media',
  true,
  15728640, -- 15 MB
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/avif',
    'video/mp4', 'video/webm'
  ]
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "vehicle_media_public_read"   on storage.objects;
drop policy if exists "vehicle_media_admin_insert"  on storage.objects;
drop policy if exists "vehicle_media_admin_update"  on storage.objects;
drop policy if exists "vehicle_media_admin_delete"  on storage.objects;

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
