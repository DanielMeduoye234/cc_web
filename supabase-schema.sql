-- ============================================================
-- CampusConnect — Supabase Storage schema (web portal)
-- Run once: Supabase Dashboard → SQL Editor → paste → Run.
--
-- This sets up file storage for:
--   • Audio uploads from the Staff console  -> media/sounds/<file>
--   • Verification documents the approval    -> media/verification/<uid>/schoolId
--     queue links to (school ID, course form)   media/verification/<uid>/courseForm
--
-- Note: verification STATUS and the document URLs live in Firestore
-- (the `users` collection), not in Postgres. Supabase only holds the files.
-- The web app uploads with the ANON key only (never the service_role key).
-- ============================================================

-- 1) The shared public-read "media" bucket ---------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  104857600,                                   -- 100 MB per file
  array[
    -- audio (Staff console "Upload audio")
    'audio/mpeg','audio/mp3','audio/mp4','audio/m4a','audio/x-m4a',
    'audio/aac','audio/wav','audio/x-wav','audio/ogg','audio/webm',
    -- documents (student verification: school ID + course form)
    'application/pdf',
    'image/jpeg','image/jpg','image/png','image/webp','image/heic','image/heif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    -- posts / general media (shared with the mobile app)
    'video/mp4','video/quicktime','video/x-m4v','text/plain','application/octet-stream'
  ]
)
on conflict (id) do update set
  public            = excluded.public,
  file_size_limit   = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2) Row-level security policies on storage.objects ------------------------
-- (RLS is already enabled on storage.objects by default in Supabase.)

-- Anyone can READ media (public audio URLs + staff opening document links).
drop policy if exists "CampusConnect media public read" on storage.objects;
create policy "CampusConnect media public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'media');

-- Anyone with the anon key can UPLOAD into media.
drop policy if exists "CampusConnect media client upload" on storage.objects;
create policy "CampusConnect media client upload"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'media');

-- Allow upsert (the uploaders send x-upsert: true).
drop policy if exists "CampusConnect media client upsert" on storage.objects;
create policy "CampusConnect media client upsert"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'media')
  with check (bucket_id = 'media');
