-- ============================================================
-- Security fixes
-- 1. Add missing DELETE policy on invoices
-- 2. Exclude 'client' role from sensitive tables (internal data)
-- 3. Allow clients to read payments on their own invoices
-- ============================================================

-- ── 1. invoices — missing DELETE ────────────────────────────

drop policy if exists "invoices_delete" on public.invoices;
create policy "invoices_delete" on public.invoices for delete
  using (
    company_id = public.auth_company_id()
    and public.auth_role() in ('admin', 'super_admin')
  );

-- ── 2. payments — allow clients to read their own ───────────

drop policy if exists "payments_select" on public.payments;
create policy "payments_select" on public.payments for select
  using (
    invoice_id in (select id from public.invoices where company_id = public.auth_company_id())
    or invoice_id in (select id from public.invoices where client_id = auth.uid())
  );

-- ── 3. Exclude client role from internal/sensitive tables ───
--
-- The 'client' role must only access their own quotes/invoices.
-- All tables below are internal company data not meant for clients.

-- materials
drop policy if exists "materials_select" on public.materials;
create policy "materials_select" on public.materials for select
  using (
    public.auth_role() != 'client'
    and (company_id = public.auth_company_id() or public.auth_role() = 'super_admin')
  );

-- stock_movements
drop policy if exists "stock_movements_select" on public.stock_movements;
create policy "stock_movements_select" on public.stock_movements for select
  using (
    public.auth_role() != 'client'
    and material_id in (select id from public.materials where company_id = public.auth_company_id())
  );

-- teams
drop policy if exists "teams_select" on public.teams;
create policy "teams_select" on public.teams for select
  using (
    public.auth_role() != 'client'
    and (company_id = public.auth_company_id() or public.auth_role() = 'super_admin')
  );

-- team_members
drop policy if exists "team_members_select" on public.team_members;
create policy "team_members_select" on public.team_members for select
  using (
    public.auth_role() != 'client'
    and team_id in (select id from public.teams where company_id = public.auth_company_id())
  );

-- attendance
drop policy if exists "attendance_select" on public.attendance;
create policy "attendance_select" on public.attendance for select
  using (
    public.auth_role() != 'client'
    and (
      user_id = auth.uid()
      or user_id in (select id from public.users where company_id = public.auth_company_id())
      or public.auth_role() = 'super_admin'
    )
  );

-- project_expenses
drop policy if exists "expenses_select" on public.project_expenses;
create policy "expenses_select" on public.project_expenses for select
  using (
    public.auth_role() != 'client'
    and project_id in (select id from public.projects where company_id = public.auth_company_id())
  );

-- project_assignments
drop policy if exists "assignments_select" on public.project_assignments;
create policy "assignments_select" on public.project_assignments for select
  using (
    public.auth_role() != 'client'
    and project_id in (select id from public.projects where company_id = public.auth_company_id())
  );

-- project_photos
drop policy if exists "photos_select" on public.project_photos;
create policy "photos_select" on public.project_photos for select
  using (
    public.auth_role() != 'client'
    and project_id in (select id from public.projects where company_id = public.auth_company_id())
  );

-- project_documents
drop policy if exists "documents_select" on public.project_documents;
create policy "documents_select" on public.project_documents for select
  using (
    public.auth_role() != 'client'
    and project_id in (select id from public.projects where company_id = public.auth_company_id())
  );

-- tasks
drop policy if exists "tasks_select" on public.tasks;
create policy "tasks_select" on public.tasks for select
  using (
    public.auth_role() != 'client'
    and (
      project_id in (select id from public.projects where company_id = public.auth_company_id())
      or assigned_to = auth.uid()
    )
  );
