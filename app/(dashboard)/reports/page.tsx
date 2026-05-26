import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Attendance, User, ProjectExpense } from "@/lib/supabase/types";

function formatAmount(n: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}
function fmtHours(h: number | null) {
  if (!h) return "0h";
  return `${h.toFixed(1)}h`;
}

const MONTH_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin.from("users").select("company_id").eq("id", user.id).single();
  if (!profile?.company_id) redirect("/onboarding");

  const companyId = profile.company_id;
  const { data: company } = await admin.from("companies").select("currency").eq("id", companyId).single();
  const currency = (company as { currency?: string } | null)?.currency ?? "XOF";

  const thisYear = new Date().getFullYear();
  const janFirst = new Date(thisYear, 0, 1).toISOString();

  // Facturation mensuelle (année en cours)
  const { data: invoicesData } = await admin
    .from("invoices")
    .select("amount, status, created_at")
    .eq("company_id", companyId)
    .gte("created_at", janFirst);

  const monthlyRevenue = Array(12).fill(0);
  const monthlyPaid = Array(12).fill(0);
  for (const inv of invoicesData ?? []) {
    const m = new Date(inv.created_at).getMonth();
    monthlyRevenue[m] += (inv as { amount: number }).amount;
    if ((inv as { status: string }).status === "paid") monthlyPaid[m] += (inv as { amount: number }).amount;
  }
  const maxRevenue = Math.max(...monthlyRevenue, 1);

  // Dépenses par chantier (top 8)
  const { data: expensesData } = await admin
    .from("project_expenses")
    .select("project_id, amount")
    .gte("created_at", janFirst);

  const { data: projectsData } = await admin
    .from("projects")
    .select("id, name")
    .eq("company_id", companyId);

  const projectNames = Object.fromEntries(
    ((projectsData ?? []) as { id: string; name: string }[]).map(p => [p.id, p.name])
  );

  const expenseByProject: Record<string, number> = {};
  for (const e of (expensesData ?? []) as Pick<ProjectExpense, "project_id" | "amount">[]) {
    if (!e.project_id) continue;
    expenseByProject[e.project_id] = (expenseByProject[e.project_id] ?? 0) + e.amount;
  }
  const topProjects = Object.entries(expenseByProject)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const maxExpense = Math.max(...topProjects.map(([, v]) => v), 1);

  // Heures travaillées par membre (mois en cours)
  const monthStart = new Date(thisYear, new Date().getMonth(), 1).toISOString();
  const { data: attendanceData } = await admin
    .from("attendance")
    .select("user_id, hours_worked")
    .not("hours_worked", "is", null)
    .gte("check_in", monthStart);

  const hoursByUser: Record<string, number> = {};
  for (const a of (attendanceData ?? []) as Pick<Attendance, "user_id" | "hours_worked">[]) {
    hoursByUser[a.user_id] = (hoursByUser[a.user_id] ?? 0) + (a.hours_worked ?? 0);
  }

  const userIds = Object.keys(hoursByUser);
  const userNames: Record<string, string | null> = {};
  if (userIds.length > 0) {
    const { data: usersData } = await admin.from("users").select("id, full_name").in("id", userIds);
    for (const u of (usersData ?? []) as Pick<User, "id" | "full_name">[]) {
      userNames[u.id] = u.full_name;
    }
  }
  const topWorkers = Object.entries(hoursByUser)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const maxHours = Math.max(...topWorkers.map(([, v]) => v), 1);

  // KPIs globaux
  const { data: allInvoices } = await admin.from("invoices").select("amount, status").eq("company_id", companyId);
  const totalInvoiced = (allInvoices ?? []).reduce((s, i) => s + (i as { amount: number }).amount, 0);
  const totalCollected = (allInvoices ?? []).filter(i => (i as { status: string }).status === "paid").reduce((s, i) => s + (i as { amount: number }).amount, 0);
  const collectionRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;

  const { data: allAttendance } = await admin.from("attendance").select("hours_worked").not("hours_worked", "is", null).gte("check_in", janFirst);
  const totalHours = (allAttendance ?? []).reduce((s, a) => s + ((a as { hours_worked: number }).hours_worked ?? 0), 0);

  return (
    <div className="space-y-6 w-full max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold">Rapports</h2>
        <p className="text-muted-foreground">Analyse de l'activité — année {thisYear}.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Facturé", value: formatAmount(totalInvoiced, currency), sub: "Total cumulé" },
          { label: "Encaissé", value: formatAmount(totalCollected, currency), sub: "Factures payées" },
          { label: "Taux recouvrement", value: `${collectionRate}%`, sub: "Encaissé / Facturé" },
          { label: "Heures travaillées", value: fmtHours(totalHours), sub: `${thisYear} (pointage)` },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className="text-base sm:text-xl font-bold mt-0.5 truncate">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Facturation mensuelle */}
        <Card>
          <CardHeader>
            <CardTitle>Facturation mensuelle {thisYear}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {MONTH_LABELS.map((month, i) => (
                <div key={month} className="flex items-center gap-2 text-sm">
                  <span className="w-8 text-xs text-muted-foreground text-right flex-shrink-0">{month}</span>
                  <div className="flex-1 flex gap-1 h-5">
                    {/* Total facturé */}
                    <div
                      className="bg-primary/20 rounded-sm flex-shrink-0"
                      style={{ width: `${(monthlyRevenue[i] / maxRevenue) * 100}%`, minWidth: monthlyRevenue[i] > 0 ? 2 : 0 }}
                    />
                    {/* Encaissé */}
                    <div
                      className="bg-success rounded-sm flex-shrink-0"
                      style={{ width: `${(monthlyPaid[i] / maxRevenue) * 100}%`, minWidth: monthlyPaid[i] > 0 ? 2 : 0 }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-20 text-right flex-shrink-0">
                    {monthlyRevenue[i] > 0 ? formatAmount(monthlyRevenue[i], currency) : "—"}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-primary/20" />Facturé</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-success" />Encaissé</div>
            </div>
          </CardContent>
        </Card>

        {/* Dépenses par chantier */}
        <Card>
          <CardHeader>
            <CardTitle>Dépenses par chantier {thisYear}</CardTitle>
          </CardHeader>
          <CardContent>
            {topProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Aucune dépense enregistrée.</p>
            ) : (
              <div className="space-y-2">
                {topProjects.map(([projectId, amount]) => (
                  <div key={projectId} className="flex items-center gap-2 text-sm min-w-0">
                    <Link href={`/projects/${projectId}`} className="w-20 sm:w-32 text-xs truncate hover:underline flex-shrink-0">
                      {projectNames[projectId] ?? "—"}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="bg-brand-orange/30 rounded-sm h-5" style={{ width: `${(amount / maxExpense) * 100}%`, minWidth: 4 }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-16 sm:w-24 text-right flex-shrink-0">{formatAmount(amount, currency)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Heures par ouvrier ce mois */}
      <Card>
        <CardHeader>
          <CardTitle>Heures travaillées ce mois — top ouvriers</CardTitle>
        </CardHeader>
        <CardContent>
          {topWorkers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Aucun pointage ce mois.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {topWorkers.map(([uid, hours]) => (
                <div key={uid} className="flex items-center gap-3 min-w-0">
                  <span className="text-sm font-medium w-24 sm:w-32 truncate flex-shrink-0">{userNames[uid] ?? "—"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="bg-primary/20 rounded-sm h-4" style={{ width: `${(hours / maxHours) * 100}%`, minWidth: 4 }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-10 sm:w-12 text-right flex-shrink-0">{fmtHours(hours)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Liens rapides vers les exports */}
      <Card>
        <CardHeader><CardTitle>Exports</CardTitle></CardHeader>
        <CardContent className="flex gap-3 flex-wrap">
          <Button variant="outline" size="sm" asChild>
            <Link href="/invoices">Voir toutes les factures</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/projects">Voir tous les chantiers</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/teams?tab=attendance">Voir les pointages</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/materials">Voir le stock</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
