-- Recree la table quote_templates si manquante.
-- Meme cause que 20260529000002 : la migration 20260527000003 a ete marquee
-- "applied" via repair sans executer la creation de la table.

create table if not exists quote_templates (
  id           uuid        default gen_random_uuid() primary key,
  company_id   uuid        not null references companies(id) on delete cascade,
  name         text        not null,
  category     text        not null default 'autre',
  description  text,
  storage_path text,
  file_type    text,
  mime_type    text,
  created_at   timestamptz default now()
);

create index if not exists quote_templates_company_id_idx on quote_templates(company_id);

alter table quote_templates enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'quote_templates'
      and policyname = 'company_access'
  ) then
    create policy "company_access" on quote_templates
      for all using (company_id = auth_company_id());
  end if;
end $$;
