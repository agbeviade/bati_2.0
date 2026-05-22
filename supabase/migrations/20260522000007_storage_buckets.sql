-- ============================================================
-- Migration : 20260522000007_storage_buckets
-- Description : Création des buckets Supabase Storage + policies
-- À appliquer via Supabase Dashboard > SQL Editor
-- ============================================================

-- Buckets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('project-photos',    'project-photos',    false, 10485760,  array['image/jpeg','image/png','image/webp','image/heic']),
  ('project-documents', 'project-documents', false, 52428800,  array['application/pdf','image/jpeg','image/png','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('avatars',           'avatars',           true,  2097152,   array['image/jpeg','image/png','image/webp']),
  ('company-logos',     'company-logos',     true,  2097152,   array['image/jpeg','image/png','image/webp','image/svg+xml'])
on conflict (id) do nothing;

-- -- Storage policies : project-photos ---

create policy "project_photos_upload"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'project-photos'
);

create policy "project_photos_select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'project-photos'
);

create policy "project_photos_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'project-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- -- Storage policies : project-documents ---

create policy "project_docs_upload"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'project-documents'
);

create policy "project_docs_select"
on storage.objects for select
to authenticated
using (
  bucket_id = 'project-documents'
);

create policy "project_docs_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'project-documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- -- Storage policies : avatars + company-logos (public) ---

create policy "avatars_upload"
on storage.objects for insert
to authenticated
with check (bucket_id = 'avatars');

create policy "avatars_select"
on storage.objects for select
using (bucket_id = 'avatars');

create policy "logos_upload"
on storage.objects for insert
to authenticated
with check (bucket_id = 'company-logos');

create policy "logos_select"
on storage.objects for select
using (bucket_id = 'company-logos');
