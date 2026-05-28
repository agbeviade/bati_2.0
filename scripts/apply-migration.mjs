import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  "https://pyuzfgghlndlpgspuxnt.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5dXpmZ2dobG5kbHBnc3B1eG50Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTM5ODI3NiwiZXhwIjoyMDk0OTc0Mjc2fQ.4KMpbQuISs6N82q1Pj2IBj5u1LmNlYRC9b3KgibeJBM",
);

const sql = `
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
`;

const { error } = await admin
  .rpc("exec_sql", { sql })
  .catch(() => ({ error: { message: "rpc exec_sql non disponible" } }));

if (error) {
  // Fallback: creer table via REST (pas de DDL direct possible sans connexion pg)
  console.log("RPC non disponible — verifie que la table existe via le Dashboard Supabase.");
  console.log("\nSQL a executer manuellement dans Supabase > SQL Editor :\n");
  console.log(sql);
} else {
  console.log("Migration appliquee avec succes.");
}
