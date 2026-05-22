-- ============================================================
-- Migration : 20260522000003_quotes_invoices
-- Description : quotes, quote_items, invoices, payments
-- ============================================================

-- -- ENUMS ----------------------------------------------------

create type quote_status as enum (
  'draft',
  'sent',
  'approved',
  'rejected',
  'expired'
);

create type quote_item_category as enum (
  'material',
  'labor',
  'transport',
  'equipment',
  'other'
);

create type invoice_status as enum (
  'draft',
  'sent',
  'paid',
  'overdue',
  'canceled'
);

create type payment_method as enum (
  'cash',
  'bank',
  'mobile_money',
  'geniuspay',
  'flutterwave'
);

-- -- TABLES ---------------------------------------------------

create table public.quotes (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  project_id      uuid references public.projects(id) on delete set null,
  client_id       uuid references public.users(id) on delete set null,
  client_name     text,                       -- si pas de user client
  quote_number    text not null,
  project_type    text,                       -- maison, villa, duplex...
  surface_m2      numeric(10, 2),
  subtotal        numeric(15, 2) not null default 0,
  tax_rate        numeric(5, 2) not null default 0,
  tax_amount      numeric(15, 2) not null default 0,
  margin_pct      numeric(5, 2) not null default 0,
  total           numeric(15, 2) not null default 0,
  status          quote_status not null default 'draft',
  valid_until     date,
  notes           text,
  ai_generated    boolean not null default false,
  pdf_url         text,
  created_by      uuid references public.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_quotes_company on public.quotes(company_id, status);
create index idx_quotes_project on public.quotes(project_id);
create unique index idx_quotes_number on public.quotes(company_id, quote_number);

create table public.quote_items (
  id          uuid primary key default gen_random_uuid(),
  quote_id    uuid not null references public.quotes(id) on delete cascade,
  category    quote_item_category not null default 'other',
  label       text not null,
  quantity    numeric(12, 3) not null default 1,
  unit        text not null default 'u',   -- m², kg, h, sac, barre...
  unit_price  numeric(15, 2) not null default 0,
  total       numeric(15, 2) generated always as (quantity * unit_price) stored,
  sort_order  int not null default 0
);

create index idx_quote_items_quote on public.quote_items(quote_id, sort_order);

-- -- INVOICES ------------------------------------------------

create table public.invoices (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  project_id      uuid references public.projects(id) on delete set null,
  quote_id        uuid references public.quotes(id) on delete set null,
  client_id       uuid references public.users(id) on delete set null,
  client_name     text,
  invoice_number  text not null,
  amount          numeric(15, 2) not null default 0,
  status          invoice_status not null default 'draft',
  due_date        date,
  paid_at         timestamptz,
  notes           text,
  pdf_url         text,
  created_by      uuid references public.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_invoices_company on public.invoices(company_id, status);
create unique index idx_invoices_number on public.invoices(company_id, invoice_number);

create table public.payments (
  id            uuid primary key default gen_random_uuid(),
  invoice_id    uuid not null references public.invoices(id) on delete cascade,
  amount        numeric(15, 2) not null,
  method        payment_method not null default 'cash',
  reference     text,
  paid_at       timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

create index idx_payments_invoice on public.payments(invoice_id);

-- -- TRIGGERS updated_at -------------------------------------

create trigger touch_quotes_updated_at
  before update on public.quotes
  for each row execute function public.touch_updated_at();

create trigger touch_invoices_updated_at
  before update on public.invoices
  for each row execute function public.touch_updated_at();

-- -- TRIGGER : quotes totaux auto ---------------------------
-- Recalcule subtotal, tax_amount, total après insert/update/delete d'un item

create or replace function public.sync_quote_totals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote_id uuid;
  v_subtotal numeric(15,2);
  v_tax_rate numeric(5,2);
  v_margin_pct numeric(5,2);
begin
  v_quote_id := coalesce(new.quote_id, old.quote_id);

  select coalesce(sum(quantity * unit_price), 0)
  into v_subtotal
  from public.quote_items
  where quote_id = v_quote_id;

  select tax_rate, margin_pct
  into v_tax_rate, v_margin_pct
  from public.quotes
  where id = v_quote_id;

  update public.quotes
  set
    subtotal   = v_subtotal,
    tax_amount = round(v_subtotal * v_tax_rate / 100, 2),
    total      = round(
                   v_subtotal
                   + (v_subtotal * v_tax_rate / 100)
                   + (v_subtotal * v_margin_pct / 100),
                   2
                 )
  where id = v_quote_id;

  return null;
end;
$$;

create trigger sync_quote_totals_trigger
  after insert or update or delete on public.quote_items
  for each row execute function public.sync_quote_totals();

-- -- RLS ------------------------------------------------------

alter table public.quotes       enable row level security;
alter table public.quote_items  enable row level security;
alter table public.invoices     enable row level security;
alter table public.payments     enable row level security;

-- quotes
create policy "quotes_select"
on public.quotes for select
using (
  company_id = public.auth_company_id()
  or client_id = auth.uid()
  or public.auth_role() = 'super_admin'
);

create policy "quotes_insert"
on public.quotes for insert
to authenticated
with check (
  company_id = public.auth_company_id()
  and public.auth_role() in ('admin', 'manager', 'super_admin')
);

create policy "quotes_update"
on public.quotes for update
using (
  company_id = public.auth_company_id()
  and public.auth_role() in ('admin', 'manager', 'super_admin')
);

create policy "quotes_delete"
on public.quotes for delete
using (
  company_id = public.auth_company_id()
  and public.auth_role() in ('admin', 'super_admin')
);

-- quote_items (hérite de quotes)
create policy "quote_items_select"
on public.quote_items for select
using (
  quote_id in (
    select id from public.quotes where company_id = public.auth_company_id()
    union
    select id from public.quotes where client_id = auth.uid()
  )
);

create policy "quote_items_insert"
on public.quote_items for insert
to authenticated
with check (
  quote_id in (
    select id from public.quotes where company_id = public.auth_company_id()
  )
);

create policy "quote_items_update"
on public.quote_items for update
using (
  quote_id in (
    select id from public.quotes where company_id = public.auth_company_id()
  )
);

create policy "quote_items_delete"
on public.quote_items for delete
using (
  quote_id in (
    select id from public.quotes where company_id = public.auth_company_id()
  )
);

-- invoices
create policy "invoices_select"
on public.invoices for select
using (
  company_id = public.auth_company_id()
  or client_id = auth.uid()
  or public.auth_role() = 'super_admin'
);

create policy "invoices_insert"
on public.invoices for insert
to authenticated
with check (
  company_id = public.auth_company_id()
  and public.auth_role() in ('admin', 'manager', 'super_admin')
);

create policy "invoices_update"
on public.invoices for update
using (
  company_id = public.auth_company_id()
  and public.auth_role() in ('admin', 'manager', 'super_admin')
);

-- payments
create policy "payments_select"
on public.payments for select
using (
  invoice_id in (
    select id from public.invoices where company_id = public.auth_company_id()
  )
);

create policy "payments_insert"
on public.payments for insert
to authenticated
with check (
  invoice_id in (
    select id from public.invoices where company_id = public.auth_company_id()
  )
);
