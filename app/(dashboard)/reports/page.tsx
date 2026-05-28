import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Attendance, User, ProjectExpense } from "@/lib/supabase/types";

function formatAmount(n: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}
function fmtHours(h: number | null) {
  if (!h) return "0h";
  return `${h.toFixed(1)}h`;
}

const MONTH_LABELS = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Juin",
  "Juil",
  "Aoû",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
];

export default async function ReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single();
  if (!profile?.company_id) redirect("/onboarding");

  const companyId = profile.company_id;
  const { data: company } = await supabase
    .from("companies")
    .select("currency")
    .eq("id", companyId)
    .single();
  const currency = (company as { currency?: string } | null)?.currency ?? "XOF";

  const thisYear = new Date().getFullYear();
  const janFirst = new Date(thisYear, 0, 1).toISOString();

  // Facturation mensuelle (année en cours)
  const { data: invoicesData } = await supabase
    .from("invoices")
    .select("amount, status, created_at")
    .eq("company_id", companyId)
    .gte("created_at", janFirst);

  const monthlyRevenue = Array(12).fill(0);
  const monthlyPaid = Array(12).fill(0);
  for (const inv of invoicesData ?? []) {
    const m = new Date(inv.created_at).getMonth();
    monthlyRevenue[m] += (inv as { amount: number }).amount;
    if ((inv as { status: string }).status === "paid")
      monthlyPaid[m] += (inv as { amount: number }).amount;
  }
  const maxRevenue = Math.max(...monthlyRevenue, 1);

  // Dépenses par chantier (top 8)
  const { data: expensesData } = await supabase
    .from("project_expenses")
    .select("project_id, amount")
    .gte("created_at", janFirst);

  const { data: projectsData } = await supabase
    .from("projects")
    .select("id, name")
    .eq("company_id", companyId);

  const projectNames = Object.fromEntries(
    ((projectsData ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name]),
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
  const { data: attendanceData } = await supabase
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
    const { data: usersData } = await supabase
      .from("users")
      .select("id, full_name")
      .in("id", userIds);
    for (const u of (usersData ?? []) as Pick<User, "id" | "full_name">[]) {
      userNames[u.id] = u.full_name;
    }
  }
  const topWorkers = Object.entries(hoursByUser)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const maxHours = Math.max(...topWorkers.map(([, v]) => v), 1);

  // KPIs globaux
  const { data: allInvoices } = await supabase
    .from("invoices")
    .select("amount, status")
    .eq("company_id", companyId);
  const totalInvoiced = (allInvoices ?? []).reduce(
    (s, i) => s + (i as { amount: number }).amount,
    0,
  );
  const totalCollected = (allInvoices ?? [])
    .filter((i) => (i as { status: string }).status === "paid")
    .reduce((s, i) => s + (i as { amount: number }).amount, 0);
  const collectionRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;

  const { data: allAttendance } = await supabase
    .from("attendance")
    .select("hours_worked")
    .not("hours_worked", "is", null)
    .gte("check_in", janFirst);
  const totalHours = (allAttendance ?? []).reduce(
    (s, a) => s + ((a as { hours_worked: number }).hours_worked ?? 0),
    0,
  );

  return (
    <div className="w-full max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Rapports</h2>
        <p className="text-muted-foreground">Analyse de l'activité — année {thisYear}.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Facturé", value: formatAmount(totalInvoiced, currency), sub: "Total cumulé" },
          {
            label: "Encaissé",
            value: formatAmount(totalCollected, currency),
            sub: "Factures payées",
          },
          { label: "Taux recouvrement", value: `${collectionRate}%`, sub: "Encaissé / Facturé" },
          {
            label: "Heures travaillées",
            value: fmtHours(totalHours),
            sub: `${thisYear} (pointage)`,
          },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-4">
              <p className="text-muted-foreground text-xs">{kpi.label}</p>
              <p className="mt-0.5 truncate text-base font-bold sm:text-xl">{kpi.value}</p>
              <p className="text-muted-foreground mt-0.5 text-xs">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Facturation mensuelle */}
        <Card>
          <CardHeader>
            <CardTitle>Facturation mensuelle {thisYear}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {MONTH_LABELS.map((month, i) => (
                <div key={month} className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground w-8 flex-shrink-0 text-right text-xs">
                    {month}
                  </span>
                  <div className="flex h-5 flex-1 gap-1">
                    {/* Total facturé */}
                    <div
                      className="bg-primary/20 flex-shrink-0 rounded-sm"
                      style={{
                        width: `${(monthlyRevenue[i] / maxRevenue) * 100}%`,
                        minWidth: monthlyRevenue[i] > 0 ? 2 : 0,
                      }}
                    />
                    {/* Encaissé */}
                    <div
                      className="bg-success flex-shrink-0 rounded-sm"
                      style={{
                        width: `${(monthlyPaid[i] / maxRevenue) * 100}%`,
                        minWidth: monthlyPaid[i] > 0 ? 2 : 0,
                      }}
                    />
                  </div>
                  <span className="text-muted-foreground w-20 flex-shrink-0 text-right text-xs">
                    {monthlyRevenue[i] > 0 ? formatAmount(monthlyRevenue[i], currency) : "—"}
                  </span>
                </div>
              ))}
            </div>
            <div className="text-muted-foreground mt-4 flex gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="bg-primary/20 h-3 w-3 rounded-sm" />
                Facturé
              </div>
              <div className="flex items-center gap-1.5">
                <div className="bg-success h-3 w-3 rounded-sm" />
                Encaissé
              </div>
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
              <p className="text-muted-foreground py-8 text-center text-sm">
                Aucune dépense enregistrée.
              </p>
            ) : (
              <div className="space-y-2">
                {topProjects.map(([projectId, amount]) => (
                  <div key={projectId} className="flex min-w-0 items-center gap-2 text-sm">
                    <Link
                      href={`/projects/${projectId}`}
                      className="w-20 flex-shrink-0 truncate text-xs hover:underline sm:w-32"
                    >
                      {projectNames[projectId] ?? "—"}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div
                        className="bg-brand-orange/30 h-5 rounded-sm"
                        style={{ width: `${(amount / maxExpense) * 100}%`, minWidth: 4 }}
                      />
                    </div>
                    <span className="text-muted-foreground w-16 flex-shrink-0 text-right text-xs sm:w-24">
                      {formatAmount(amount, currency)}
                    </span>
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
            <p className="text-muted-foreground py-6 text-center text-sm">
              Aucun pointage ce mois.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {topWorkers.map(([uid, hours]) => (
                <div key={uid} className="flex min-w-0 items-center gap-3">
                  <span className="w-24 flex-shrink-0 truncate text-sm font-medium sm:w-32">
                    {userNames[uid] ?? "—"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div
                      className="bg-primary/20 h-4 rounded-sm"
                      style={{ width: `${(hours / maxHours) * 100}%`, minWidth: 4 }}
                    />
                  </div>
                  <span className="text-muted-foreground w-10 flex-shrink-0 text-right text-xs sm:w-12">
                    {fmtHours(hours)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Liens rapides vers les exports */}
      <Card>
        <CardHeader>
          <CardTitle>Exports</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
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
