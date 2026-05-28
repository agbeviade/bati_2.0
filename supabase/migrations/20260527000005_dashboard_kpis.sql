-- ============================================================
-- Dashboard KPIs — aggregation pushed to SQL
--
-- Remplace 6 requêtes JS + .reduce() dans dashboard/page.tsx par un seul
-- appel RPC. Reste à charger côté JS uniquement les listes bornées
-- (recent projects, recent invoices, overdue invoices, low stock materials).
-- ============================================================

create or replace function public.get_dashboard_kpis()
returns table (
  active_projects int,
  total_projects int,
  pending_quotes int,
  ca_this_month numeric,
  unpaid_total numeric,
  unpaid_count int,
  overdue_invoices_count int,
  low_stock_count int
)
language sql stable security definer set search_path = public
as $$
  with c as (
    select public.auth_company_id() as id
  ),
  month_start as (
    select date_trunc('month', now()) as d
  )
  select
    -- active_projects
    (select count(*)::int from public.projects p
       where p.company_id = (select id from c) and p.status = 'in_progress'),
    -- total_projects
    (select count(*)::int from public.projects p
       where p.company_id = (select id from c)),
    -- pending_quotes (status = sent)
    (select count(*)::int from public.quotes q
       where q.company_id = (select id from c) and q.status = 'sent'),
    -- ca_this_month (sum of paid invoices since start of current month)
    coalesce(
      (select sum(i.amount) from public.invoices i
         where i.company_id = (select id from c)
           and i.status = 'paid'
           and i.paid_at >= (select d from month_start)),
      0
    ),
    -- unpaid_total
    coalesce(
      (select sum(i.amount) from public.invoices i
         where i.company_id = (select id from c)
           and i.status in ('sent', 'overdue')),
      0
    ),
    -- unpaid_count
    (select count(*)::int from public.invoices i
       where i.company_id = (select id from c)
         and i.status in ('sent', 'overdue')),
    -- overdue_invoices_count
    (select count(*)::int from public.invoices i
       where i.company_id = (select id from c)
         and i.status in ('sent', 'overdue')
         and i.due_date < current_date),
    -- low_stock_count
    (select count(*)::int from public.materials m
       where m.company_id = (select id from c)
         and m.min_stock_qty > 0
         and m.stock_qty <= m.min_stock_qty);
$$;

grant execute on function public.get_dashboard_kpis() to authenticated;
