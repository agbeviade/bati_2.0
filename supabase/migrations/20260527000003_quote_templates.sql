-- Table des modeles de devis
create table if not exists quote_templates (
  id           uuid        default gen_random_uuid() primary key,
  company_id   uuid        not null references companies(id) on delete cascade,
  name         text        not null,
  category     text        not null default 'autre',
  description  text,
  storage_path text,
  file_type    text,        -- 'pdf' | 'image'
  mime_type    text,
  created_at   timestamptz default now()
);

create index if not exists quote_templates_company_id_idx on quote_templates(company_id);

alter table quote_templates enable row level security;

create policy "company_access" on quote_templates
  for all using (company_id = auth_company_id());

-- Bucket de stockage des modeles
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'quote-templates',
  'quote-templates',
  true,
  20971520, -- 20 MB
  array['application/pdf','image/jpeg','image/jpg','image/png','image/webp']
)
on conflict (id) do nothing;

-- Policies storage : lecture publique, ecriture authentifiee
create policy "quote_templates_public_read"
  on storage.objects for select
  using (bucket_id = 'quote-templates');

create policy "quote_templates_auth_insert"
  on storage.objects for insert
  with check (bucket_id = 'quote-templates' and auth.uid() is not null);

create policy "quote_templates_auth_update"
  on storage.objects for update
  using (bucket_id = 'quote-templates' and auth.uid() is not null);

create policy "quote_templates_auth_delete"
  on storage.objects for delete
  using (bucket_id = 'quote-templates' and auth.uid() is not null);
