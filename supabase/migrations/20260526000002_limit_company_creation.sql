-- ============================================================
-- Limit company creation: a user can only create one company.
-- Prevents abuse where a single authenticated user spawns
-- unlimited companies (no billing / quota bypass).
-- ============================================================

drop policy if exists "companies_insert_authenticated" on public.companies;

create policy "companies_insert_authenticated" on public.companies
  for insert to authenticated
  with check (
    not exists (
      select 1 from public.users
      where id = auth.uid()
        and company_id is not null
    )
  );
