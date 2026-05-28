-- ============================================================
-- AI usage logs — observability and cost tracking
--
-- One row per appel Claude API. Cache hit/miss explicites.
-- Sert au debug, au billing par company, et au monitoring du
-- coût IA.
-- ============================================================

create table if not exists public.ai_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  user_id uuid references public.users(id) on delete set null,
  kind text not null,                      -- 'quote_from_description' | 'quote_from_debourses' | 'quote_from_template' | 'quote_from_metres'
  model text not null,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cache_creation_input_tokens int not null default 0,
  cache_read_input_tokens int not null default 0,
  success boolean not null default true,
  error text,
  duration_ms int,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_logs_company on public.ai_logs(company_id, created_at desc);
create index if not exists idx_ai_logs_kind on public.ai_logs(kind, created_at desc);

alter table public.ai_logs enable row level security;

-- Lecture : admins et super_admins de la company seulement.
drop policy if exists "ai_logs_select" on public.ai_logs;
create policy "ai_logs_select" on public.ai_logs for select
  using (
    public.auth_role() = 'super_admin'
    or (company_id = public.auth_company_id() and public.auth_role() in ('admin', 'manager'))
  );

-- Insert : on laisse n'importe quel user authentifié de la company
-- (les routes API sont les seules à insérer, et elles fixent le company_id).
drop policy if exists "ai_logs_insert" on public.ai_logs;
create policy "ai_logs_insert" on public.ai_logs for insert
  to authenticated
  with check (
    company_id = public.auth_company_id() or company_id is null
  );
