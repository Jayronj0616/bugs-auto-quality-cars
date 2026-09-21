-- =============================================================================
-- BUGS Auto Quality Cars - raise the media size limit
-- =============================================================================
-- The original 15MB cap was sized for photographs. The dealership's walkaround
-- videos, shot on a phone, run to roughly 30MB, so the bucket now allows 60MB.
--
-- The application still enforces its own, much tighter 10MB limit on photo
-- uploads (src/lib/media.ts); this ceiling only governs what storage itself
-- will accept, which matters for videos uploaded during an inventory import.
-- =============================================================================

update storage.buckets
   set file_size_limit = 62914560 -- 60 MB
 where id = 'vehicle-media';
