-- ============================================================
-- Migration : company default tax rate
-- Description : Ajoute un taux de TVA par défaut au niveau company
--   pour supporter multi-pays (CI=18, CM=19.25, MA=20, etc.) et
--   éviter le hardcode 0.18 côté clients (web + mobile).
-- ============================================================

alter table public.companies
  add column if not exists default_tax_rate numeric(5, 2) not null default 18;

comment on column public.companies.default_tax_rate is
  'Taux de TVA par défaut appliqué aux nouveaux devis/factures (en %). 18 pour CI, 19.25 pour CM, 20 pour MA…';
