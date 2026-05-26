import { redirect } from "next/navigation";
import Link from "next/link";
import { HardHat, FileText, TrendingUp, ArrowRight, Receipt, AlertTriangle, BadgeCheck, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/projects/status-badge";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import type { Project, Invoice, Material } from "@/lib/supabase/types";

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("company_id, full_name")
    .eq("id", user.id)
    .maybeSingle();

  const typedProfile = profile as { company_id?: string | null; full_name?: string | null } | null;
  if (!typedProfile?.company_id) redirect("/onboarding");

  const companyId = typedProfile.company_id;

  const { data: companyData } = await admin
    .from("companies")
    .select("currency")
    .eq("id", companyId)
    .maybeSingle();
  const currency = (companyData as { currency?: string } | null)?.currency ?? "XOF";

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const today = now.toISOString().split("T")[0];

  // Données parallèles
  const [
    { data: allProjectsData },
    { data: recentProjectsData },
    { data: pendingQuotesData },
    { data: overdueInvoicesData },
    { data: recentInvoicesData },
    { data: paidThisMonthData },
    { data: unpaidInvoicesData },
    { data: lowStockData },
  ] = await Promise.all([
    admin.from("projects").select("id, status, progress_pct").eq("company_id", companyId),
    admin.from("projects").select("id, name, status, progress_pct, address").eq("company_id", companyId).order("created_at", { ascending: false }).limit(5),
    admin.from("quotes").select("id").eq("company_id", companyId).eq("status", "sent"),
    admin.from("invoices").select("id, invoice_number, client_name, amount, due_date, status")
      .eq("company_id", companyId)
      .in("status", ["sent", "overdue"])
      .lt("due_date", today)
      .order("due_date"),
    admin.from("invoices").select("id, invoice_number, client_name, amount, status, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(4),
    admin.from("invoices").select("amount")
      .eq("company_id", companyId)
      .eq("status", "paid")
      .gte("paid_at", monthStart),
    admin.from("invoices").select("amount")
      .eq("company_id", companyId)
      .in("status", ["sent", "overdue"]),
    admin.from("materials").select("id, name, stock_qty, min_stock_qty, unit")
      .eq("company_id", companyId)
      .gt("min_stock_qty", 0),
  ]);

  const allProjects = (allProjectsData ?? []) as { id: string; status: string; progress_pct: number }[];
  const recentProjects = (recentProjectsData ?? []) as Pick<Project, "id" | "name" | "status" | "progress_pct" | "address">[];
  const recentInvoices = (recentInvoicesData ?? []) as Pick<Invoice, "id" | "invoice_number" | "client_name" | "amount" | "status" | "created_at">[];
  const overdueInvoices = (overdueInvoicesData ?? []) as Pick<Invoice, "id" | "invoice_number" | "client_name" | "amount" | "due_date" | "status">[];
  const allMaterials = (lowStockData ?? []) as Pick<Material, "id" | "name" | "stock_qty" | "min_stock_qty" | "unit">[];
  const lowStockMaterials = allMaterials.filter(m => m.stock_qty <= m.min_stock_qty);

  const totalActive = allProjects.filter(p => p.status === "in_progress").length;
  const pendingQuotesCount = pendingQuotesData?.length ?? 0;
  const caThisMonth = (paidThisMonthData ?? []).reduce((s, i) => s + (i as { amount: number }).amount, 0);
  const unpaidTotal = (unpaidInvoicesData ?? []).reduce((s, i) => s + (i as { amount: number }).amount, 0);
  const unpaidCount = unpaidInvoicesData?.length ?? 0;

  const alertsCount = overdueInvoices.length + lowStockMaterials.length;

  const kpis = [
    {
      label: "Chantiers actifs",
      value: String(totalActive),
      icon: HardHat,
      hint: totalActive === 0 ? "Aucun chantier en cours" : `sur ${allProjects.length} total`,
      href: "/projects",
      color: "",
    },
    {
      label: "CA encaissé ce mois",
      value: formatAmount(caThisMonth, currency),
      icon: BadgeCheck,
      hint: caThisMonth === 0 ? "Aucune facture payée ce mois" : "Factures payées en " + now.toLocaleDateString("fr-FR", { month: "long" }),
      href: "/invoices",
      color: caThisMonth > 0 ? "text-success" : "",
    },
    {
      label: "Factures impayées",
      value: unpaidCount > 0 ? formatAmount(unpaidTotal, currency) : "0",
      icon: Clock,
      hint: unpaidCount === 0 ? "Aucune facture en attente" : `${unpaidCount} facture${unpaidCount > 1 ? "s" : ""} en attente`,
      href: "/invoices",
      color: unpaidCount > 0 ? "text-brand-orange" : "",
    },
    {
      label: "Devis en attente",
      value: String(pendingQuotesCount),
      icon: FileText,
      hint: pendingQuotesCount === 0 ? "Aucun devis envoyé non traité" : `devis envoyé${pendingQuotesCount > 1 ? "s" : ""} sans réponse`,
      href: "/quotes",
      color: pendingQuotesCount > 0 ? "text-primary" : "",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">
          Bonjour{typedProfile.full_name ? `, ${typedProfile.full_name.split(" ")[0]}` : ""} 👋
        </h2>
        <p className="text-muted-foreground">Vue d&apos;ensemble de votre activité.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link key={kpi.label} href={kpi.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{kpi.hint}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chantiers récents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Chantiers récents</CardTitle>
              <CardDescription>Derniers chantiers mis à jour.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/projects">Voir tout <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentProjects.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <p className="text-sm text-muted-foreground">Aucun chantier pour l&apos;instant.</p>
                <Button size="sm" asChild><Link href="/projects/new">Créer un chantier</Link></Button>
              </div>
            ) : (
              <ul className="space-y-3">
                {recentProjects.map(p => (
                  <li key={p.id}>
                    <Link href={`/projects/${p.id}`} className="flex items-center justify-between gap-3 py-1 hover:opacity-70 transition-opacity">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        {p.address && <p className="text-xs text-muted-foreground truncate">{p.address}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-muted-foreground">{p.progress_pct}%</span>
                        <StatusBadge status={p.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Factures récentes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Factures récentes</CardTitle>
              <CardDescription>Dernières factures créées.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/invoices">Voir tout <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentInvoices.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <p className="text-sm text-muted-foreground">Aucune facture pour l&apos;instant.</p>
                <Button size="sm" asChild><Link href="/invoices/new">Créer une facture</Link></Button>
              </div>
            ) : (
              <ul className="space-y-3">
                {recentInvoices.map(inv => (
                  <li key={inv.id}>
                    <Link href={`/invoices/${inv.id}`} className="flex items-center justify-between gap-3 py-1 hover:opacity-70 transition-opacity">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{inv.invoice_number}</p>
                        <p className="text-xs text-muted-foreground truncate">{inv.client_name ?? "—"}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-medium">{formatAmount(inv.amount, currency)}</span>
                        <InvoiceStatusBadge status={inv.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Devis en attente */}
      {pendingQuotesCount > 0 && (
        <Card className="border-blue-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-500" />
                <CardTitle className="text-base">
                  {pendingQuotesCount} devis en attente de réponse
                </CardTitle>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/quotes?filter=sent">Voir <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Alertes */}
      {alertsCount > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <CardTitle>Alertes ({alertsCount})</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {overdueInvoices.map(inv => (
              <Link key={inv.id} href={`/invoices/${inv.id}`} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-red-50 hover:bg-red-100 transition-colors">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Facture en retard : {inv.invoice_number}</p>
                    <p className="text-xs text-muted-foreground">{inv.client_name} · {formatAmount(inv.amount, currency)}</p>
                  </div>
                </div>
              </Link>
            ))}
            {lowStockMaterials.map(m => (
              <Link key={m.id} href={`/materials/${m.id}`} className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors">
                <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Stock faible : {m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.stock_qty} {m.unit} restants (min {m.min_stock_qty} {m.unit})</p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
