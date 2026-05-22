# Migrations Supabase

## Workflow

1. Créer une nouvelle migration avec horodatage :
   `YYYYMMDDHHMMSS_description.sql`

2. Appliquer en local (si Supabase CLI installé) :
   ```bash
   npx supabase db reset
   ```

3. Pousser en prod :
   ```bash
   npx supabase db push
   ```

4. Régénérer les types TypeScript :
   ```bash
   npx supabase gen types typescript --project-id <id> > ../lib/supabase/types.ts
   ```

## Ordre des migrations

| Fichier | Contenu |
|---|---|
| `20260522000001_init_core.sql` | companies, users, enums, RLS, triggers |
| `20260522000002_projects.sql` | projects, tasks, assignments, photos, expenses (à venir) |
| `20260522000003_quotes_invoices.sql` | quotes, quote_items, invoices, payments (à venir) |
| `20260522000004_materials.sql` | materials, stock_movements (à venir) |
| `20260522000005_teams_attendance.sql` | teams, attendance (à venir) |
| `20260522000006_reports_notifs.sql` | reports, notifications, activity_logs (à venir) |
| `20260522000007_storage_buckets.sql` | création des buckets + policies (à venir) |
