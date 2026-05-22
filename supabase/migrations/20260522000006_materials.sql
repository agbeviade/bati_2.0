-- ============================================================
-- Migration : 20260522000006_materials
-- Description : matériaux, stock, mouvements
-- ============================================================

-- -- ENUMS ----------------------------------------------------

create type material_category as enum (
  'cement',
  'steel',
  'wood',
  'sand_gravel',
  'paint',
  'electrical',
  'plumbing',
  'tools',
  'other'
);

create type movement_type as enum (
  'purchase',   -- entrée achat
  'use',        -- sortie chantier
  'return',     -- retour chantier
  'adjustment'  -- correction inventaire
);

-- -- TABLES ---------------------------------------------------

create table public.materials (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  name          text not null,
  category      material_category not null default 'other',
  unit          text not null default 'u',
  stock_qty     numeric(12, 3) not null default 0,
  min_stock_qty numeric(12, 3) not null default 0,
  unit_cost     numeric(15, 2) not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_materials_company on public.materials(company_id);

create table public.stock_movements (
  id          uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials(id) on delete cascade,
  project_id  uuid references public.projects(id) on delete set null,
  type        movement_type not null default 'purchase',
  quantity    numeric(12, 3) not null,
  unit_cost   numeric(15, 2),
  notes       text,
  created_by  uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index idx_stock_movements_material on public.stock_movements(material_id, created_at desc);
create index idx_stock_movements_project on public.stock_movements(project_id);

-- -- TRIGGER updated_at ----------------------------------------

create trigger touch_materials_updated_at
  before update on public.materials
  for each row execute function public.touch_updated_at();

-- -- TRIGGER sync_stock_qty ------------------------------------
-- Met à jour stock_qty après chaque mouvement

create or replace function public.sync_material_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_material_id uuid;
  v_delta       numeric;
begin
  v_material_id := coalesce(new.material_id, old.material_id);

  select coalesce(sum(
    case type
      when 'purchase'   then  quantity
      when 'return'     then  quantity
      when 'use'        then -quantity
      when 'adjustment' then  quantity  -- quantity peut être négatif pour correction
    end
  ), 0)
  into v_delta
  from public.stock_movements
  where material_id = v_material_id;

  update public.materials
  set stock_qty = greatest(0, v_delta)
  where id = v_material_id;

  return null;
end;
$$;

create trigger sync_material_stock_trigger
  after insert or update or delete on public.stock_movements
  for each row execute function public.sync_material_stock();

-- -- RLS ------------------------------------------------------

alter table public.materials       enable row level security;
alter table public.stock_movements enable row level security;

-- materials
create policy "materials_select"
on public.materials for select
using (
  company_id = public.auth_company_id()
  or public.auth_role() = 'super_admin'
);

create policy "materials_insert"
on public.materials for insert
to authenticated
with check (
  company_id = public.auth_company_id()
  and public.auth_role() in ('admin', 'manager', 'super_admin')
);

create policy "materials_update"
on public.materials for update
using (
  company_id = public.auth_company_id()
  and public.auth_role() in ('admin', 'manager', 'super_admin')
);

create policy "materials_delete"
on public.materials for delete
using (
  company_id = public.auth_company_id()
  and public.auth_role() in ('admin', 'super_admin')
);

-- stock_movements
create policy "stock_movements_select"
on public.stock_movements for select
using (
  material_id in (
    select id from public.materials where company_id = public.auth_company_id()
  )
);

create policy "stock_movements_insert"
on public.stock_movements for insert
to authenticated
with check (
  material_id in (
    select id from public.materials where company_id = public.auth_company_id()
  )
  and public.auth_role() in ('admin', 'manager', 'foreman', 'super_admin')
);

create policy "stock_movements_delete"
on public.stock_movements for delete
using (
  material_id in (
    select id from public.materials where company_id = public.auth_company_id()
  )
  and public.auth_role() in ('admin', 'manager', 'super_admin')
);
