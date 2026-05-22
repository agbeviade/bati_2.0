-- ============================================================
-- Migration : 20260522000002_projects
-- Description : projects, tasks, project_assignments,
--               project_photos, project_documents, project_expenses
-- ============================================================

-- -- ENUMS ----------------------------------------------------

create type project_status as enum (
  'planned',
  'in_progress',
  'paused',
  'completed',
  'canceled'
);

create type task_status as enum (
  'todo',
  'in_progress',
  'done',
  'blocked'
);

create type task_priority as enum (
  'low',
  'medium',
  'high'
);

create type photo_source as enum (
  'web',
  'mobile',
  'whatsapp'
);

create type expense_category as enum (
  'materials',
  'labor',
  'transport',
  'other'
);

-- -- TABLES ---------------------------------------------------

create table public.projects (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  name          text not null,
  description   text,
  address       text,
  geo_lat       numeric(10, 7),
  geo_lng       numeric(10, 7),
  client_id     uuid references public.users(id) on delete set null,
  budget        numeric(15, 2),
  spent         numeric(15, 2) not null default 0,
  start_date    date,
  end_date      date,
  status        project_status not null default 'planned',
  progress_pct  int not null default 0 check (progress_pct between 0 and 100),
  cover_photo_url text,
  created_by    uuid references public.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_projects_company on public.projects(company_id, status);
create index idx_projects_created_by on public.projects(created_by);

create table public.tasks (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  title       text not null,
  description text,
  assigned_to uuid references public.users(id) on delete set null,
  status      task_status not null default 'todo',
  priority    task_priority not null default 'medium',
  due_date    date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_tasks_project on public.tasks(project_id, status);
create index idx_tasks_assigned on public.tasks(assigned_to);

create table public.project_assignments (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid not null references public.projects(id) on delete cascade,
  user_id          uuid not null references public.users(id) on delete cascade,
  role_on_project  text,
  start_date       date,
  end_date         date,
  unique (project_id, user_id)
);

create index idx_assignments_project on public.project_assignments(project_id);
create index idx_assignments_user on public.project_assignments(user_id);

create table public.project_photos (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  storage_path text not null,
  caption      text,
  ai_analysis  jsonb,
  taken_at     timestamptz not null default now(),
  uploaded_by  uuid references public.users(id) on delete set null,
  source       photo_source not null default 'web',
  geo_lat      numeric(10, 7),
  geo_lng      numeric(10, 7)
);

create index idx_photos_project on public.project_photos(project_id, taken_at desc);

create table public.project_documents (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  storage_path text not null,
  name         text not null,
  mime_type    text,
  size_bytes   bigint,
  uploaded_by  uuid references public.users(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index idx_documents_project on public.project_documents(project_id);

create table public.project_expenses (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  category    expense_category not null default 'other',
  amount      numeric(15, 2) not null,
  description text,
  receipt_url text,
  spent_at    date not null default current_date,
  created_by  uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index idx_expenses_project on public.project_expenses(project_id);

-- -- TRIGGERS updated_at --------------------------------------

create trigger touch_projects_updated_at
  before update on public.projects
  for each row execute function public.touch_updated_at();

create trigger touch_tasks_updated_at
  before update on public.tasks
  for each row execute function public.touch_updated_at();

-- -- TRIGGER projects.spent = SUM(expenses) ------------------

create or replace function public.sync_project_spent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
begin
  v_project_id := coalesce(new.project_id, old.project_id);
  update public.projects
    set spent = coalesce(
      (select sum(amount) from public.project_expenses where project_id = v_project_id),
      0
    )
  where id = v_project_id;
  return null;
end;
$$;

create trigger sync_project_spent_trigger
  after insert or update or delete on public.project_expenses
  for each row execute function public.sync_project_spent();

-- -- RLS ------------------------------------------------------

alter table public.projects           enable row level security;
alter table public.tasks              enable row level security;
alter table public.project_assignments enable row level security;
alter table public.project_photos     enable row level security;
alter table public.project_documents  enable row level security;
alter table public.project_expenses   enable row level security;

-- projects
create policy "projects_select"
on public.projects for select
using (
  company_id = public.auth_company_id()
  or client_id = auth.uid()
  or public.auth_role() = 'super_admin'
);

create policy "projects_insert"
on public.projects for insert
to authenticated
with check (
  company_id = public.auth_company_id()
  and public.auth_role() in ('admin', 'manager', 'foreman', 'super_admin')
);

create policy "projects_update"
on public.projects for update
using (
  company_id = public.auth_company_id()
  and public.auth_role() in ('admin', 'manager', 'foreman', 'super_admin')
);

create policy "projects_delete"
on public.projects for delete
using (
  company_id = public.auth_company_id()
  and public.auth_role() in ('admin', 'super_admin')
);

-- tasks
create policy "tasks_select"
on public.tasks for select
using (
  project_id in (
    select id from public.projects where company_id = public.auth_company_id()
  )
  or assigned_to = auth.uid()
);

create policy "tasks_insert"
on public.tasks for insert
to authenticated
with check (
  project_id in (
    select id from public.projects where company_id = public.auth_company_id()
  )
);

create policy "tasks_update"
on public.tasks for update
using (
  assigned_to = auth.uid()
  or project_id in (
    select id from public.projects
    where company_id = public.auth_company_id()
  )
);

create policy "tasks_delete"
on public.tasks for delete
using (
  project_id in (
    select id from public.projects
    where company_id = public.auth_company_id()
    and public.auth_role() in ('admin', 'manager', 'super_admin')
  )
);

-- project_assignments
create policy "assignments_select"
on public.project_assignments for select
using (
  project_id in (
    select id from public.projects where company_id = public.auth_company_id()
  )
);

create policy "assignments_insert"
on public.project_assignments for insert
to authenticated
with check (
  project_id in (
    select id from public.projects
    where company_id = public.auth_company_id()
    and public.auth_role() in ('admin', 'manager', 'super_admin')
  )
);

create policy "assignments_delete"
on public.project_assignments for delete
using (
  project_id in (
    select id from public.projects
    where company_id = public.auth_company_id()
    and public.auth_role() in ('admin', 'manager', 'super_admin')
  )
);

-- project_photos
create policy "photos_select"
on public.project_photos for select
using (
  project_id in (
    select id from public.projects where company_id = public.auth_company_id()
  )
);

create policy "photos_insert"
on public.project_photos for insert
to authenticated
with check (
  project_id in (
    select id from public.projects where company_id = public.auth_company_id()
  )
);

create policy "photos_delete"
on public.project_photos for delete
using (
  uploaded_by = auth.uid()
  or project_id in (
    select id from public.projects
    where company_id = public.auth_company_id()
    and public.auth_role() in ('admin', 'manager', 'super_admin')
  )
);

-- project_documents
create policy "documents_select"
on public.project_documents for select
using (
  project_id in (
    select id from public.projects where company_id = public.auth_company_id()
  )
);

create policy "documents_insert"
on public.project_documents for insert
to authenticated
with check (
  project_id in (
    select id from public.projects where company_id = public.auth_company_id()
  )
);

-- project_expenses
create policy "expenses_select"
on public.project_expenses for select
using (
  project_id in (
    select id from public.projects where company_id = public.auth_company_id()
  )
);

create policy "expenses_insert"
on public.project_expenses for insert
to authenticated
with check (
  project_id in (
    select id from public.projects where company_id = public.auth_company_id()
  )
);

create policy "expenses_update"
on public.project_expenses for update
using (
  project_id in (
    select id from public.projects
    where company_id = public.auth_company_id()
    and public.auth_role() in ('admin', 'manager', 'super_admin')
  )
);

create policy "expenses_delete"
on public.project_expenses for delete
using (
  project_id in (
    select id from public.projects
    where company_id = public.auth_company_id()
    and public.auth_role() in ('admin', 'manager', 'super_admin')
  )
);
