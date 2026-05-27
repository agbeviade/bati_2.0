create table if not exists debourses_models (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null,
  name        text not null,
  inputs      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists debourses_models_company_id_idx on debourses_models(company_id);

alter table debourses_models enable row level security;

create policy "debourses_models_company_access" on debourses_models
  for all using (company_id = auth_company_id());

create trigger debourses_models_updated_at
  before update on debourses_models
  for each row execute function update_updated_at_column();
