-- Colonnes en-tête / pied de page sur companies
alter table public.companies
  add column if not exists header_url text,
  add column if not exists footer_url text;

-- Bucket pour les assets de branding entreprise
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-assets',
  'company-assets',
  true,
  3145728, -- 3 MB
  array['image/jpeg','image/png','image/webp','image/svg+xml']
)
on conflict (id) do nothing;

-- Politique : tout utilisateur authentifié peut uploader dans son dossier
create policy "company_assets_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'company-assets');

create policy "company_assets_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'company-assets');

create policy "company_assets_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'company-assets');

create policy "company_assets_select"
  on storage.objects for select
  to public
  using (bucket_id = 'company-assets');
