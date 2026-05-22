-- ============================================================
-- Migration : 20260522000001_init_core
-- Description : Tables de base (companies, users), enums, RLS,
--               helpers SQL, trigger d'inscription
-- ============================================================

-- -- ENUMS ----------------------------------------------------
create type user_role as enum (
  'super_admin',
  'admin',
  'manager',
  'foreman',
  'worker',
  'client'
);

create type subscription_plan as enum (
  'free',
  'pro',
  'enterprise'
);

create type subscription_status as enum (
  'active',
  'past_due',
  'canceled',
  'trialing'
);

-- -- TABLES ---------------------------------------------------

-- Multi-tenant : une company = une entreprise BTP
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  address text,
  phone text,
  email text,
  currency text not null default 'XOF',
  plan subscription_plan not null default 'free',
  subscription_status subscription_status not null default 'trialing',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Extension de auth.users
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  role user_role not null default 'worker',
  full_name text,
  phone text,
  avatar_url text,
  specialty text,
  daily_rate numeric(12,2),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_users_company on public.users(company_id);
create index idx_users_role on public.users(role);

-- -- HELPERS SQL ----------------------------------------------

create or replace function public.auth_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from public.users where id = auth.uid()
$$;

create or replace function public.auth_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role in ('super_admin', 'admin')
     from public.users where id = auth.uid()),
    false
  )
$$;

-- -- TRIGGER d'inscription -----------------------------------
-- À l'inscription Supabase Auth, on crée la ligne dans public.users.
-- Le role et company_id sont définis ultérieurement (onboarding).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -- TRIGGER updated_at ---------------------------------------

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger touch_companies_updated_at
  before update on public.companies
  for each row execute function public.touch_updated_at();

create trigger touch_users_updated_at
  before update on public.users
  for each row execute function public.touch_updated_at();

-- -- RLS ------------------------------------------------------

alter table public.companies enable row level security;
alter table public.users enable row level security;

-- companies : un user voit seulement sa company
create policy "companies_select_own"
on public.companies for select
using (id = public.auth_company_id() or public.auth_role() = 'super_admin');

create policy "companies_update_admin"
on public.companies for update
using (
  id = public.auth_company_id()
  and public.auth_role() in ('admin', 'super_admin')
);

create policy "companies_insert_authenticated"
on public.companies for insert
to authenticated
with check (true);  -- N'importe quel user peut créer sa company à l'onboarding

-- users : un user voit ses collègues de la même company
create policy "users_select_same_company"
on public.users for select
using (
  id = auth.uid()
  or company_id = public.auth_company_id()
  or public.auth_role() = 'super_admin'
);

create policy "users_update_self"
on public.users for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "users_update_admin"
on public.users for update
using (
  company_id = public.auth_company_id()
  and public.auth_role() in ('admin', 'super_admin')
);

create policy "users_insert_self"
on public.users for insert
to authenticated
with check (id = auth.uid());
