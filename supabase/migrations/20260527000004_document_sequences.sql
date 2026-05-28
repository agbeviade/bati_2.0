-- ============================================================
-- Document numbering — atomic per-company sequence
--
-- Replaces the race-prone `count(*) + 1` pattern in
-- app/(dashboard)/quotes/actions.ts and invoices/actions.ts.
--
-- One row per (company_id, kind, year). The RPC uses INSERT ...
-- ON CONFLICT DO UPDATE RETURNING — atomic, no double-numbering.
-- ============================================================

create table if not exists public.document_sequences (
  company_id uuid not null references public.companies(id) on delete cascade,
  kind text not null,
  year int not null,
  last_value int not null default 0,
  primary key (company_id, kind, year)
);

alter table public.document_sequences enable row level security;
-- No policies — table is only accessed via the SECURITY DEFINER function below.

-- Seed from existing data so the new sequences don't collide with existing numbers.
insert into public.document_sequences (company_id, kind, year, last_value)
select
  company_id,
  'quote'::text as kind,
  extract(year from created_at)::int as year,
  count(*) as last_value
from public.quotes
group by company_id, extract(year from created_at)::int
on conflict (company_id, kind, year) do update
  set last_value = greatest(document_sequences.last_value, excluded.last_value);

insert into public.document_sequences (company_id, kind, year, last_value)
select
  company_id,
  'invoice'::text as kind,
  extract(year from created_at)::int as year,
  count(*) as last_value
from public.invoices
group by company_id, extract(year from created_at)::int
on conflict (company_id, kind, year) do update
  set last_value = greatest(document_sequences.last_value, excluded.last_value);

-- Atomic next-number generator. Reads company_id from the JWT via auth_company_id().
create or replace function public.next_document_number(p_kind text)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_company_id uuid;
  v_year int := extract(year from now())::int;
  v_value int;
  v_prefix text;
begin
  v_company_id := public.auth_company_id();
  if v_company_id is null then
    raise exception 'No company context for current user';
  end if;

  if p_kind not in ('quote', 'invoice') then
    raise exception 'Invalid document kind: %', p_kind;
  end if;

  insert into public.document_sequences (company_id, kind, year, last_value)
  values (v_company_id, p_kind, v_year, 1)
  on conflict (company_id, kind, year)
  do update set last_value = public.document_sequences.last_value + 1
  returning last_value into v_value;

  v_prefix := case p_kind
    when 'quote' then 'DEVIS'
    when 'invoice' then 'FAC'
  end;

  return format('%s-%s-%s', v_prefix, v_year, lpad(v_value::text, 3, '0'));
end;
$$;

grant execute on function public.next_document_number(text) to authenticated;
