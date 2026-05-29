-- Recree le bucket quote-templates et ses policies si manquants.
-- Necessaire parce que la migration 20260527000003 a ete marquee "applied"
-- via `supabase migration repair` sans avoir reellement execute la creation
-- du bucket sur le projet distant -> erreur "Bucket not found" a l'upload.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'quote-templates',
  'quote-templates',
  true,
  20971520,
  array['application/pdf','image/jpeg','image/jpg','image/png','image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'quote_templates_public_read'
  ) then
    create policy "quote_templates_public_read"
      on storage.objects for select
      using (bucket_id = 'quote-templates');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'quote_templates_auth_insert'
  ) then
    create policy "quote_templates_auth_insert"
      on storage.objects for insert
      with check (bucket_id = 'quote-templates' and auth.uid() is not null);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'quote_templates_auth_update'
  ) then
    create policy "quote_templates_auth_update"
      on storage.objects for update
      using (bucket_id = 'quote-templates' and auth.uid() is not null);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'quote_templates_auth_delete'
  ) then
    create policy "quote_templates_auth_delete"
      on storage.objects for delete
      using (bucket_id = 'quote-templates' and auth.uid() is not null);
  end if;
end $$;
