-- ============================================================
-- Migration 009 : Schéma complet idempotent + RLS
-- Crée les tables manquantes et applique toutes les policies
-- ============================================================

-- ── ENUMS (IF NOT EXISTS) ─────────────────────────────────────

do $$ begin create type user_role as enum ('super_admin','admin','manager','foreman','worker','client'); exception when duplicate_object then null; end $$;
do $$ begin create type subscription_plan as enum ('free','pro','enterprise'); exception when duplicate_object then null; end $$;
do $$ begin create type subscription_status as enum ('active','past_due','canceled','trialing'); exception when duplicate_object then null; end $$;
do $$ begin create type project_status as enum ('planned','in_progress','paused','completed','canceled'); exception when duplicate_object then null; end $$;
do $$ begin create type task_status as enum ('todo','in_progress','done','blocked'); exception when duplicate_object then null; end $$;
do $$ begin create type task_priority as enum ('low','medium','high'); exception when duplicate_object then null; end $$;
do $$ begin create type photo_source as enum ('web','mobile','whatsapp'); exception when duplicate_object then null; end $$;
do $$ begin create type expense_category as enum ('materials','labor','transport','other'); exception when duplicate_object then null; end $$;
do $$ begin create type quote_status as enum ('draft','sent','approved','rejected','expired'); exception when duplicate_object then null; end $$;
do $$ begin create type quote_item_category as enum ('material','labor','transport','equipment','other'); exception when duplicate_object then null; end $$;
do $$ begin create type invoice_status as enum ('draft','sent','paid','overdue','canceled'); exception when duplicate_object then null; end $$;
do $$ begin create type payment_method as enum ('cash','bank','mobile_money','geniuspay','flutterwave'); exception when duplicate_object then null; end $$;
do $$ begin create type material_category as enum ('cement','steel','wood','sand_gravel','paint','electrical','plumbing','tools','other'); exception when duplicate_object then null; end $$;
do $$ begin create type movement_type as enum ('purchase','use','return','adjustment'); exception when duplicate_object then null; end $$;

-- ── HELPERS ───────────────────────────────────────────────────

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create or replace function public.auth_company_id()
returns uuid language sql stable security definer set search_path = public as $$
  select company_id from public.users where id = auth.uid()
$$;

create or replace function public.auth_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from public.users where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('super_admin','admin') from public.users where id = auth.uid()), false)
$$;

-- ── TABLES ────────────────────────────────────────────────────

create table if not exists public.companies (
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

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  role user_role not null default 'worker',
  full_name text,
  email text,
  phone text,
  avatar_url text,
  specialty text,
  daily_rate numeric(12,2),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_users_company on public.users(company_id);
create index if not exists idx_users_role on public.users(role);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  address text,
  geo_lat numeric(10,7),
  geo_lng numeric(10,7),
  client_id uuid references public.users(id) on delete set null,
  budget numeric(15,2),
  spent numeric(15,2) not null default 0,
  start_date date,
  end_date date,
  status project_status not null default 'planned',
  progress_pct int not null default 0 check (progress_pct between 0 and 100),
  cover_photo_url text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_projects_company on public.projects(company_id, status);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  assigned_to uuid references public.users(id) on delete set null,
  status task_status not null default 'todo',
  priority task_priority not null default 'medium',
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tasks_project on public.tasks(project_id, status);

create table if not exists public.project_assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role_on_project text,
  start_date date,
  end_date date,
  unique (project_id, user_id)
);

create table if not exists public.project_photos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  storage_path text not null,
  caption text,
  ai_analysis jsonb,
  taken_at timestamptz not null default now(),
  uploaded_by uuid references public.users(id) on delete set null,
  source photo_source not null default 'web',
  geo_lat numeric(10,7),
  geo_lng numeric(10,7)
);

create index if not exists idx_photos_project on public.project_photos(project_id, taken_at desc);

create table if not exists public.project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  storage_path text not null,
  name text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.project_expenses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  category expense_category not null default 'other',
  amount numeric(15,2) not null,
  description text,
  receipt_url text,
  spent_at date not null default current_date,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  client_id uuid references public.users(id) on delete set null,
  client_name text,
  quote_number text not null,
  project_type text,
  surface_m2 numeric(10,2),
  subtotal numeric(15,2) not null default 0,
  tax_rate numeric(5,2) not null default 0,
  tax_amount numeric(15,2) not null default 0,
  margin_pct numeric(5,2) not null default 0,
  total numeric(15,2) not null default 0,
  status quote_status not null default 'draft',
  valid_until date,
  notes text,
  ai_generated boolean not null default false,
  pdf_url text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_quotes_company on public.quotes(company_id, status);
create unique index if not exists idx_quotes_number on public.quotes(company_id, quote_number);

create table if not exists public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  category quote_item_category not null default 'other',
  label text not null,
  quantity numeric(12,3) not null default 1,
  unit text not null default 'u',
  unit_price numeric(15,2) not null default 0,
  total numeric(15,2) generated always as (quantity * unit_price) stored,
  sort_order int not null default 0
);

create index if not exists idx_quote_items_quote on public.quote_items(quote_id, sort_order);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  quote_id uuid references public.quotes(id) on delete set null,
  client_id uuid references public.users(id) on delete set null,
  client_name text,
  invoice_number text not null,
  amount numeric(15,2) not null default 0,
  status invoice_status not null default 'draft',
  due_date date,
  paid_at timestamptz,
  notes text,
  pdf_url text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_invoices_company on public.invoices(company_id, status);
create unique index if not exists idx_invoices_number on public.invoices(company_id, invoice_number);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  amount numeric(15,2) not null,
  method payment_method not null default 'cash',
  reference text,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  lead_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_teams_company on public.teams(company_id);

create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  primary key (team_id, user_id)
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  check_in timestamptz not null default now(),
  check_out timestamptz,
  geo_lat_in numeric(10,7),
  geo_lng_in numeric(10,7),
  geo_lat_out numeric(10,7),
  geo_lng_out numeric(10,7),
  hours_worked numeric(5,2),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_attendance_user on public.attendance(user_id, check_in desc);
create index if not exists idx_attendance_open on public.attendance(user_id) where check_out is null;

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  category material_category not null default 'other',
  unit text not null default 'u',
  stock_qty numeric(12,3) not null default 0,
  min_stock_qty numeric(12,3) not null default 0,
  unit_cost numeric(15,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_materials_company on public.materials(company_id);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  type movement_type not null default 'purchase',
  quantity numeric(12,3) not null,
  unit_cost numeric(15,2),
  notes text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ── TRIGGERS (idempotents) ────────────────────────────────────

drop trigger if exists touch_companies_updated_at on public.companies;
create trigger touch_companies_updated_at before update on public.companies for each row execute function public.touch_updated_at();

drop trigger if exists touch_users_updated_at on public.users;
create trigger touch_users_updated_at before update on public.users for each row execute function public.touch_updated_at();

drop trigger if exists touch_projects_updated_at on public.projects;
create trigger touch_projects_updated_at before update on public.projects for each row execute function public.touch_updated_at();

drop trigger if exists touch_tasks_updated_at on public.tasks;
create trigger touch_tasks_updated_at before update on public.tasks for each row execute function public.touch_updated_at();

drop trigger if exists touch_quotes_updated_at on public.quotes;
create trigger touch_quotes_updated_at before update on public.quotes for each row execute function public.touch_updated_at();

drop trigger if exists touch_invoices_updated_at on public.invoices;
create trigger touch_invoices_updated_at before update on public.invoices for each row execute function public.touch_updated_at();

drop trigger if exists touch_teams_updated_at on public.teams;
create trigger touch_teams_updated_at before update on public.teams for each row execute function public.touch_updated_at();

drop trigger if exists touch_materials_updated_at on public.materials;
create trigger touch_materials_updated_at before update on public.materials for each row execute function public.touch_updated_at();

-- trigger inscription
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, full_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), coalesce(new.raw_user_meta_data->>'phone',''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- trigger sync project spent
create or replace function public.sync_project_spent()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_project_id uuid;
begin
  v_project_id := coalesce(new.project_id, old.project_id);
  update public.projects set spent = coalesce((select sum(amount) from public.project_expenses where project_id = v_project_id), 0) where id = v_project_id;
  return null;
end;
$$;

drop trigger if exists sync_project_spent_trigger on public.project_expenses;
create trigger sync_project_spent_trigger after insert or update or delete on public.project_expenses for each row execute function public.sync_project_spent();

-- trigger sync quote totals
create or replace function public.sync_quote_totals()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_quote_id uuid; v_subtotal numeric(15,2); v_tax_rate numeric(5,2); v_margin_pct numeric(5,2);
begin
  v_quote_id := coalesce(new.quote_id, old.quote_id);
  select coalesce(sum(quantity * unit_price), 0) into v_subtotal from public.quote_items where quote_id = v_quote_id;
  select tax_rate, margin_pct into v_tax_rate, v_margin_pct from public.quotes where id = v_quote_id;
  update public.quotes set subtotal = v_subtotal, tax_amount = round(v_subtotal * v_tax_rate / 100, 2), total = round(v_subtotal + (v_subtotal * v_tax_rate / 100) + (v_subtotal * v_margin_pct / 100), 2) where id = v_quote_id;
  return null;
end;
$$;

drop trigger if exists sync_quote_totals_trigger on public.quote_items;
create trigger sync_quote_totals_trigger after insert or update or delete on public.quote_items for each row execute function public.sync_quote_totals();

-- trigger sync material stock
create or replace function public.sync_material_stock()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_material_id uuid;
begin
  v_material_id := coalesce(new.material_id, old.material_id);
  update public.materials set stock_qty = greatest(0, coalesce((select sum(case type when 'purchase' then quantity when 'return' then quantity when 'use' then -quantity when 'adjustment' then quantity end) from public.stock_movements where material_id = v_material_id), 0)) where id = v_material_id;
  return null;
end;
$$;

drop trigger if exists sync_material_stock_trigger on public.stock_movements;
create trigger sync_material_stock_trigger after insert or update or delete on public.stock_movements for each row execute function public.sync_material_stock();

-- trigger attendance hours
create or replace function public.sync_attendance_hours()
returns trigger language plpgsql as $$
begin
  if new.check_out is not null then new.hours_worked := round(extract(epoch from (new.check_out - new.check_in)) / 3600.0, 2); end if;
  return new;
end;
$$;

drop trigger if exists sync_attendance_hours_trigger on public.attendance;
create trigger sync_attendance_hours_trigger before insert or update on public.attendance for each row execute function public.sync_attendance_hours();

-- ── RLS : ENABLE + POLICIES ───────────────────────────────────

alter table public.companies        enable row level security;
alter table public.users            enable row level security;
alter table public.projects         enable row level security;
alter table public.tasks            enable row level security;
alter table public.project_assignments enable row level security;
alter table public.project_photos   enable row level security;
alter table public.project_documents enable row level security;
alter table public.project_expenses enable row level security;
alter table public.quotes           enable row level security;
alter table public.quote_items      enable row level security;
alter table public.invoices         enable row level security;
alter table public.payments         enable row level security;
alter table public.teams            enable row level security;
alter table public.team_members     enable row level security;
alter table public.attendance       enable row level security;
alter table public.materials        enable row level security;
alter table public.stock_movements  enable row level security;

-- companies
drop policy if exists "companies_select_own" on public.companies;
drop policy if exists "companies_update_admin" on public.companies;
drop policy if exists "companies_insert_authenticated" on public.companies;
create policy "companies_select_own" on public.companies for select using (id = public.auth_company_id() or public.auth_role() = 'super_admin');
create policy "companies_update_admin" on public.companies for update using (id = public.auth_company_id() and public.auth_role() in ('admin','super_admin'));
create policy "companies_insert_authenticated" on public.companies for insert to authenticated with check (true);

-- users
drop policy if exists "users_select_same_company" on public.users;
drop policy if exists "users_update_self" on public.users;
drop policy if exists "users_update_admin" on public.users;
drop policy if exists "users_insert_self" on public.users;
create policy "users_select_same_company" on public.users for select using (id = auth.uid() or company_id = public.auth_company_id() or public.auth_role() = 'super_admin');
create policy "users_update_self" on public.users for update using (id = auth.uid()) with check (id = auth.uid());
create policy "users_update_admin" on public.users for update using (company_id = public.auth_company_id() and public.auth_role() in ('admin','super_admin'));
create policy "users_insert_self" on public.users for insert to authenticated with check (id = auth.uid());

-- projects
drop policy if exists "projects_select" on public.projects;
drop policy if exists "projects_insert" on public.projects;
drop policy if exists "projects_update" on public.projects;
drop policy if exists "projects_delete" on public.projects;
create policy "projects_select" on public.projects for select using (company_id = public.auth_company_id() or client_id = auth.uid() or public.auth_role() = 'super_admin');
create policy "projects_insert" on public.projects for insert to authenticated with check (company_id = public.auth_company_id() and public.auth_role() in ('admin','manager','foreman','super_admin'));
create policy "projects_update" on public.projects for update using (company_id = public.auth_company_id() and public.auth_role() in ('admin','manager','foreman','super_admin'));
create policy "projects_delete" on public.projects for delete using (company_id = public.auth_company_id() and public.auth_role() in ('admin','super_admin'));

-- tasks
drop policy if exists "tasks_select" on public.tasks;
drop policy if exists "tasks_insert" on public.tasks;
drop policy if exists "tasks_update" on public.tasks;
drop policy if exists "tasks_delete" on public.tasks;
create policy "tasks_select" on public.tasks for select using (project_id in (select id from public.projects where company_id = public.auth_company_id()) or assigned_to = auth.uid());
create policy "tasks_insert" on public.tasks for insert to authenticated with check (project_id in (select id from public.projects where company_id = public.auth_company_id()));
create policy "tasks_update" on public.tasks for update using (assigned_to = auth.uid() or project_id in (select id from public.projects where company_id = public.auth_company_id()));
create policy "tasks_delete" on public.tasks for delete using (project_id in (select id from public.projects where company_id = public.auth_company_id() and public.auth_role() in ('admin','manager','super_admin')));

-- project_assignments
drop policy if exists "assignments_select" on public.project_assignments;
drop policy if exists "assignments_insert" on public.project_assignments;
drop policy if exists "assignments_delete" on public.project_assignments;
create policy "assignments_select" on public.project_assignments for select using (project_id in (select id from public.projects where company_id = public.auth_company_id()));
create policy "assignments_insert" on public.project_assignments for insert to authenticated with check (project_id in (select id from public.projects where company_id = public.auth_company_id() and public.auth_role() in ('admin','manager','super_admin')));
create policy "assignments_delete" on public.project_assignments for delete using (project_id in (select id from public.projects where company_id = public.auth_company_id() and public.auth_role() in ('admin','manager','super_admin')));

-- project_photos
drop policy if exists "photos_select" on public.project_photos;
drop policy if exists "photos_insert" on public.project_photos;
drop policy if exists "photos_delete" on public.project_photos;
create policy "photos_select" on public.project_photos for select using (project_id in (select id from public.projects where company_id = public.auth_company_id()));
create policy "photos_insert" on public.project_photos for insert to authenticated with check (project_id in (select id from public.projects where company_id = public.auth_company_id()));
create policy "photos_delete" on public.project_photos for delete using (uploaded_by = auth.uid() or project_id in (select id from public.projects where company_id = public.auth_company_id() and public.auth_role() in ('admin','manager','super_admin')));

-- project_documents
drop policy if exists "documents_select" on public.project_documents;
drop policy if exists "documents_insert" on public.project_documents;
create policy "documents_select" on public.project_documents for select using (project_id in (select id from public.projects where company_id = public.auth_company_id()));
create policy "documents_insert" on public.project_documents for insert to authenticated with check (project_id in (select id from public.projects where company_id = public.auth_company_id()));

-- project_expenses
drop policy if exists "expenses_select" on public.project_expenses;
drop policy if exists "expenses_insert" on public.project_expenses;
drop policy if exists "expenses_update" on public.project_expenses;
drop policy if exists "expenses_delete" on public.project_expenses;
create policy "expenses_select" on public.project_expenses for select using (project_id in (select id from public.projects where company_id = public.auth_company_id()));
create policy "expenses_insert" on public.project_expenses for insert to authenticated with check (project_id in (select id from public.projects where company_id = public.auth_company_id()));
create policy "expenses_update" on public.project_expenses for update using (project_id in (select id from public.projects where company_id = public.auth_company_id() and public.auth_role() in ('admin','manager','super_admin')));
create policy "expenses_delete" on public.project_expenses for delete using (project_id in (select id from public.projects where company_id = public.auth_company_id() and public.auth_role() in ('admin','manager','super_admin')));

-- quotes
drop policy if exists "quotes_select" on public.quotes;
drop policy if exists "quotes_insert" on public.quotes;
drop policy if exists "quotes_update" on public.quotes;
drop policy if exists "quotes_delete" on public.quotes;
create policy "quotes_select" on public.quotes for select using (company_id = public.auth_company_id() or client_id = auth.uid() or public.auth_role() = 'super_admin');
create policy "quotes_insert" on public.quotes for insert to authenticated with check (company_id = public.auth_company_id() and public.auth_role() in ('admin','manager','super_admin'));
create policy "quotes_update" on public.quotes for update using (company_id = public.auth_company_id() and public.auth_role() in ('admin','manager','super_admin'));
create policy "quotes_delete" on public.quotes for delete using (company_id = public.auth_company_id() and public.auth_role() in ('admin','super_admin'));

-- quote_items
drop policy if exists "quote_items_select" on public.quote_items;
drop policy if exists "quote_items_insert" on public.quote_items;
drop policy if exists "quote_items_update" on public.quote_items;
drop policy if exists "quote_items_delete" on public.quote_items;
create policy "quote_items_select" on public.quote_items for select using (quote_id in (select id from public.quotes where company_id = public.auth_company_id() union select id from public.quotes where client_id = auth.uid()));
create policy "quote_items_insert" on public.quote_items for insert to authenticated with check (quote_id in (select id from public.quotes where company_id = public.auth_company_id()));
create policy "quote_items_update" on public.quote_items for update using (quote_id in (select id from public.quotes where company_id = public.auth_company_id()));
create policy "quote_items_delete" on public.quote_items for delete using (quote_id in (select id from public.quotes where company_id = public.auth_company_id()));

-- invoices
drop policy if exists "invoices_select" on public.invoices;
drop policy if exists "invoices_insert" on public.invoices;
drop policy if exists "invoices_update" on public.invoices;
create policy "invoices_select" on public.invoices for select using (company_id = public.auth_company_id() or client_id = auth.uid() or public.auth_role() = 'super_admin');
create policy "invoices_insert" on public.invoices for insert to authenticated with check (company_id = public.auth_company_id() and public.auth_role() in ('admin','manager','super_admin'));
create policy "invoices_update" on public.invoices for update using (company_id = public.auth_company_id() and public.auth_role() in ('admin','manager','super_admin'));

-- payments
drop policy if exists "payments_select" on public.payments;
drop policy if exists "payments_insert" on public.payments;
create policy "payments_select" on public.payments for select using (invoice_id in (select id from public.invoices where company_id = public.auth_company_id()));
create policy "payments_insert" on public.payments for insert to authenticated with check (invoice_id in (select id from public.invoices where company_id = public.auth_company_id()));

-- teams
drop policy if exists "teams_select" on public.teams;
drop policy if exists "teams_insert" on public.teams;
drop policy if exists "teams_update" on public.teams;
drop policy if exists "teams_delete" on public.teams;
create policy "teams_select" on public.teams for select using (company_id = public.auth_company_id() or public.auth_role() = 'super_admin');
create policy "teams_insert" on public.teams for insert to authenticated with check (company_id = public.auth_company_id() and public.auth_role() in ('admin','manager','super_admin'));
create policy "teams_update" on public.teams for update using (company_id = public.auth_company_id() and public.auth_role() in ('admin','manager','super_admin'));
create policy "teams_delete" on public.teams for delete using (company_id = public.auth_company_id() and public.auth_role() in ('admin','super_admin'));

-- team_members
drop policy if exists "team_members_select" on public.team_members;
drop policy if exists "team_members_insert" on public.team_members;
drop policy if exists "team_members_delete" on public.team_members;
create policy "team_members_select" on public.team_members for select using (team_id in (select id from public.teams where company_id = public.auth_company_id()));
create policy "team_members_insert" on public.team_members for insert to authenticated with check (team_id in (select id from public.teams where company_id = public.auth_company_id() and public.auth_role() in ('admin','manager','super_admin')));
create policy "team_members_delete" on public.team_members for delete using (team_id in (select id from public.teams where company_id = public.auth_company_id() and public.auth_role() in ('admin','manager','super_admin')));

-- attendance
drop policy if exists "attendance_select" on public.attendance;
drop policy if exists "attendance_insert" on public.attendance;
drop policy if exists "attendance_update" on public.attendance;
create policy "attendance_select" on public.attendance for select using (user_id = auth.uid() or user_id in (select id from public.users where company_id = public.auth_company_id()) or public.auth_role() = 'super_admin');
create policy "attendance_insert" on public.attendance for insert to authenticated with check (user_id = auth.uid() or (user_id in (select id from public.users where company_id = public.auth_company_id()) and public.auth_role() in ('admin','manager','foreman','super_admin')));
create policy "attendance_update" on public.attendance for update using (user_id = auth.uid() or (user_id in (select id from public.users where company_id = public.auth_company_id()) and public.auth_role() in ('admin','manager','super_admin')));

-- materials
drop policy if exists "materials_select" on public.materials;
drop policy if exists "materials_insert" on public.materials;
drop policy if exists "materials_update" on public.materials;
drop policy if exists "materials_delete" on public.materials;
create policy "materials_select" on public.materials for select using (company_id = public.auth_company_id() or public.auth_role() = 'super_admin');
create policy "materials_insert" on public.materials for insert to authenticated with check (company_id = public.auth_company_id() and public.auth_role() in ('admin','manager','super_admin'));
create policy "materials_update" on public.materials for update using (company_id = public.auth_company_id() and public.auth_role() in ('admin','manager','super_admin'));
create policy "materials_delete" on public.materials for delete using (company_id = public.auth_company_id() and public.auth_role() in ('admin','super_admin'));

-- stock_movements
drop policy if exists "stock_movements_select" on public.stock_movements;
drop policy if exists "stock_movements_insert" on public.stock_movements;
drop policy if exists "stock_movements_delete" on public.stock_movements;
create policy "stock_movements_select" on public.stock_movements for select using (material_id in (select id from public.materials where company_id = public.auth_company_id()));
create policy "stock_movements_insert" on public.stock_movements for insert to authenticated with check (material_id in (select id from public.materials where company_id = public.auth_company_id()) and public.auth_role() in ('admin','manager','foreman','super_admin'));
create policy "stock_movements_delete" on public.stock_movements for delete using (material_id in (select id from public.materials where company_id = public.auth_company_id()) and public.auth_role() in ('admin','manager','super_admin'));

-- ── STORAGE BUCKETS ───────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('project-photos', 'project-photos', false, 10485760, array['image/jpeg','image/png','image/webp','image/heic']),
  ('avatars',        'avatars',        true,  2097152,  array['image/jpeg','image/png','image/webp']),
  ('documents',      'documents',      false, 52428800, array['application/pdf','image/jpeg','image/png']),
  ('quote-pdfs',     'quote-pdfs',     false, 10485760, array['application/pdf']),
  ('invoice-pdfs',   'invoice-pdfs',   false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

-- Storage policies
drop policy if exists "project_photos_select" on storage.objects;
drop policy if exists "project_photos_insert" on storage.objects;
drop policy if exists "project_photos_delete" on storage.objects;
drop policy if exists "avatars_select" on storage.objects;
drop policy if exists "avatars_insert" on storage.objects;
drop policy if exists "documents_select" on storage.objects;
drop policy if exists "documents_insert" on storage.objects;
drop policy if exists "pdfs_select" on storage.objects;

create policy "project_photos_select" on storage.objects for select to authenticated
using (bucket_id = 'project-photos');

create policy "project_photos_insert" on storage.objects for insert to authenticated
with check (bucket_id = 'project-photos');

create policy "project_photos_delete" on storage.objects for delete to authenticated
using (bucket_id = 'project-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "avatars_select" on storage.objects for select
using (bucket_id = 'avatars');

create policy "avatars_insert" on storage.objects for insert to authenticated
with check (bucket_id = 'avatars');

create policy "documents_select" on storage.objects for select to authenticated
using (bucket_id = 'documents');

create policy "documents_insert" on storage.objects for insert to authenticated
with check (bucket_id = 'documents');

create policy "pdfs_select" on storage.objects for select to authenticated
using (bucket_id in ('quote-pdfs','invoice-pdfs'));
