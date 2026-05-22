-- ============================================================
-- Migration : 20260522000005_teams_attendance
-- Description : teams, team_members, attendance (pointage)
-- ============================================================

-- -- TABLES ---------------------------------------------------

create table public.teams (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name       text not null,
  lead_id    uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_teams_company on public.teams(company_id);

create table public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  primary key (team_id, user_id)
);

create index idx_team_members_team on public.team_members(team_id);
create index idx_team_members_user on public.team_members(user_id);

create table public.attendance (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  project_id   uuid references public.projects(id) on delete set null,
  check_in     timestamptz not null default now(),
  check_out    timestamptz,
  geo_lat_in   numeric(10, 7),
  geo_lng_in   numeric(10, 7),
  geo_lat_out  numeric(10, 7),
  geo_lng_out  numeric(10, 7),
  hours_worked numeric(5, 2),
  notes        text,
  created_at   timestamptz not null default now()
);

create index idx_attendance_user on public.attendance(user_id, check_in desc);
create index idx_attendance_project on public.attendance(project_id);
-- Index partiel pour trouver rapidement les pointages ouverts
create index idx_attendance_open on public.attendance(user_id)
  where check_out is null;

-- -- TRIGGERS -------------------------------------------------

create trigger touch_teams_updated_at
  before update on public.teams
  for each row execute function public.touch_updated_at();

-- Calcule hours_worked automatiquement quand check_out est renseigné
create or replace function public.sync_attendance_hours()
returns trigger
language plpgsql
as $$
begin
  if new.check_out is not null then
    new.hours_worked := round(
      extract(epoch from (new.check_out - new.check_in)) / 3600.0,
      2
    );
  end if;
  return new;
end;
$$;

create trigger sync_attendance_hours_trigger
  before insert or update on public.attendance
  for each row execute function public.sync_attendance_hours();

-- -- RLS ------------------------------------------------------

alter table public.teams       enable row level security;
alter table public.team_members enable row level security;
alter table public.attendance  enable row level security;

-- teams
create policy "teams_select"
on public.teams for select
using (
  company_id = public.auth_company_id()
  or public.auth_role() = 'super_admin'
);

create policy "teams_insert"
on public.teams for insert
to authenticated
with check (
  company_id = public.auth_company_id()
  and public.auth_role() in ('admin', 'manager', 'super_admin')
);

create policy "teams_update"
on public.teams for update
using (
  company_id = public.auth_company_id()
  and public.auth_role() in ('admin', 'manager', 'super_admin')
);

create policy "teams_delete"
on public.teams for delete
using (
  company_id = public.auth_company_id()
  and public.auth_role() in ('admin', 'super_admin')
);

-- team_members
create policy "team_members_select"
on public.team_members for select
using (
  team_id in (
    select id from public.teams where company_id = public.auth_company_id()
  )
);

create policy "team_members_insert"
on public.team_members for insert
to authenticated
with check (
  team_id in (
    select id from public.teams
    where company_id = public.auth_company_id()
    and public.auth_role() in ('admin', 'manager', 'super_admin')
  )
);

create policy "team_members_delete"
on public.team_members for delete
using (
  team_id in (
    select id from public.teams
    where company_id = public.auth_company_id()
    and public.auth_role() in ('admin', 'manager', 'super_admin')
  )
);

-- attendance : un user voit son propre pointage + les admins/managers voient tout
create policy "attendance_select"
on public.attendance for select
using (
  user_id = auth.uid()
  or user_id in (
    select id from public.users where company_id = public.auth_company_id()
  )
  or public.auth_role() = 'super_admin'
);

create policy "attendance_insert"
on public.attendance for insert
to authenticated
with check (
  -- Un user peut pointer pour lui-même
  user_id = auth.uid()
  or (
    -- Un manager/admin peut pointer pour n'importe quel membre de sa company
    user_id in (
      select id from public.users where company_id = public.auth_company_id()
    )
    and public.auth_role() in ('admin', 'manager', 'foreman', 'super_admin')
  )
);

create policy "attendance_update"
on public.attendance for update
using (
  user_id = auth.uid()
  or (
    user_id in (
      select id from public.users where company_id = public.auth_company_id()
    )
    and public.auth_role() in ('admin', 'manager', 'super_admin')
  )
);
