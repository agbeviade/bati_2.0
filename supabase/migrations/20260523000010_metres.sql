-- Migration: Module Métrés BTP
-- Tables: ouvrage_types (recettes réutilisables) + project_ouvrages (instances par projet)

-- Recettes/types d'ouvrages réutilisables par company
create table if not exists ouvrage_types (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null,
  designation   text not null,
  type_geometrie text not null,
  unite_principale text not null default 'm²',
  recette       jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Ouvrages (instances) attachés à un projet
create table if not exists project_ouvrages (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null,
  company_id      uuid not null,
  type_id         uuid,
  designation     text not null,
  type_geometrie  text not null,
  dimensions      jsonb not null default '{}'::jsonb,
  vides_deduits   jsonb not null default '[]'::jsonb,
  quantite_brute  numeric not null default 0,
  quantite_nette  numeric not null default 0,
  unite_principale text not null default 'm²',
  recette         jsonb not null default '[]'::jsonb,
  recette_calculee jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Index
create index if not exists ouvrage_types_company_id_idx on ouvrage_types(company_id);
create index if not exists project_ouvrages_project_id_idx on project_ouvrages(project_id);
create index if not exists project_ouvrages_company_id_idx on project_ouvrages(company_id);

-- RLS
alter table ouvrage_types enable row level security;
alter table project_ouvrages enable row level security;

create policy "ouvrage_types_company_access" on ouvrage_types
  for all using (company_id = auth_company_id());

create policy "project_ouvrages_company_access" on project_ouvrages
  for all using (company_id = auth_company_id());

-- Trigger updated_at
create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger ouvrage_types_updated_at
  before update on ouvrage_types
  for each row execute function update_updated_at_column();

create trigger project_ouvrages_updated_at
  before update on project_ouvrages
  for each row execute function update_updated_at_column();
