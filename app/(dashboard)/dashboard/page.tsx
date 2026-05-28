import { redirect } from "next/navigation";
import Link from "next/link";
import {
  HardHat,
  FileText,
  TrendingUp,
  ArrowRight,
  Receipt,
  AlertTriangle,
  BadgeCheck,
  Clock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAuthedProfile } from "@/lib/auth/profile";
import { getCompanyMeta } from "@/lib/auth/company";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { userId, companyId } = await getAuthedProfile();
  const { currency } = await getCompanyMeta();

  // Nom de l'utilisateur pour le bonjour (cheap, scope déjà chargé via cache)
  const { data: profileExtra } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();
  const fullName = (profileExtra as { full_name?: string | null } | null)?.full_name;

  const today = new Date().toISOString().split("T")[0];

  // 1 RPC pour tous les KPIs agrégés + 4 listes bornées en parallèle.
  const [
    { data: kpisRows },
    { data: recentProjectsData },
    { data: overdueInvoicesData },
    { data: recentInvoicesData },
    { data: lowStockData },
  ] = await Promise.all([
    supabase.rpc("get_dashboard_kpis"),
    supabase
      .from("projects")
      .select("id, name, status, progress_pct, address")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("invoices")
      .select("id, invoice_number, client_name, amount, due_date, status")
      .eq("company_id", companyId)
      .in("status", ["sent", "overdue"])
      .lt("due_date", today)
      .order("due_date"),
    supabase
      .from("invoices")
      .select("id, invoice_number, client_name, amount, status, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("materials")
      .select("id, name, stock_qty, min_stock_qty, unit")
      .eq("company_id", companyId)
      .gt("min_stock_qty", 0),
  ]);

  const kpis = (kpisRows ?? [])[0] ?? {
    active_projects: 0,
    total_projects: 0,
    pending_quotes: 0,
    ca_this_month: 0,
    unpaid_total: 0,
    unpaid_count: 0,
    overdue_invoices_count: 0,
    low_stock_count: 0,
  };

  const recentProjects = (recentProjectsData ?? []) as Pick<
    Project,
    "id" | "name" | "status" | "progress_pct" | "address"
  >[];
  const recentInvoices = (recentInvoicesData ?? []) as Pick<
    Invoice,
    "id" | "invoice_number" | "client_name" | "amount" | "status" | "created_at"
  >[];
  const overdueInvoices = (overdueInvoicesData ?? []) as Pick<
    Invoice,
    "id" | "invoice_number" | "client_name" | "amount" | "due_date" | "status"
  >[];
  const allMaterials = (lowStockData ?? []) as Pick<
    Material,
    "id" | "name" | "stock_qty" | "min_stock_qty" | "unit"
  >[];
  const lowStockMaterials = allMaterials.filter((m) => m.stock_qty <= m.min_stock_qty);

  const now = new Date();
  const alertsCount = overdueInvoices.length + lowStockMaterials.length;

  const kpiCards = [
    {
      label: "Chantiers actifs",
      value: String(kpis.active_projects),
      icon: HardHat,
      hint:
        kpis.active_projects === 0 ? "Aucun chantier en cours" : `sur ${kpis.total_projects} total`,
      href: "/projects",
      color: "",
    },
    {
      label: "CA encaissé ce mois",
      value: formatAmount(Number(kpis.ca_this_month), currency),
      icon: BadgeCheck,
      hint:
        Number(kpis.ca_this_month) === 0
          ? "Aucune facture payée ce mois"
          : "Factures payées en " + now.toLocaleDateString("fr-FR", { month: "long" }),
      href: "/invoices",
      color: Number(kpis.ca_this_month) > 0 ? "text-success" : "",
    },
    {
      label: "Factures impayées",
      value: kpis.unpaid_count > 0 ? formatAmount(Number(kpis.unpaid_total), currency) : "0",
      icon: Clock,
      hint:
        kpis.unpaid_count === 0
          ? "Aucune facture en attente"
          : `${kpis.unpaid_count} facture${kpis.unpaid_count > 1 ? "s" : ""} en attente`,
      href: "/invoices",
      color: kpis.unpaid_count > 0 ? "text-brand-orange" : "",
    },
    {
      label: "Devis en attente",
      value: String(kpis.pending_quotes),
      icon: FileText,
      hint:
        kpis.pending_quotes === 0
          ? "Aucun devis envoyé non traité"
          : `devis envoyé${kpis.pending_quotes > 1 ? "s" : ""} sans réponse`,
      href: "/quotes",
      color: kpis.pending_quotes > 0 ? "text-primary" : "",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">
          Bonjour{fullName ? `, ${fullName.split(" ")[0]}` : ""} 👋
        </h2>
        <p className="text-muted-foreground">Vue d&apos;ensemble de votre activité.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link key={kpi.label} href={kpi.href}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-muted-foreground text-sm font-medium">
                    {kpi.label}
                  </CardTitle>
                  <Icon className="text-muted-foreground h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
                  <p className="text-muted-foreground mt-1 text-xs">{kpi.hint}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chantiers récents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Chantiers récents</CardTitle>
              <CardDescription>Derniers chantiers mis à jour.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/projects">
                Voir tout <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentProjects.length === 0 ? (
              <div className="space-y-3 py-8 text-center">
                <p className="text-muted-foreground text-sm">Aucun chantier pour l&apos;instant.</p>
                <Button size="sm" asChild>
                  <Link href="/projects/new">Créer un chantier</Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-3">
                {recentProjects.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/projects/${p.id}`}
                      className="flex items-center justify-between gap-3 py-1 transition-opacity hover:opacity-70"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{p.name}</p>
                        {p.address && (
                          <p className="text-muted-foreground truncate text-xs">{p.address}</p>
                        )}
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <span className="text-muted-foreground text-xs">{p.progress_pct}%</span>
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
              <Link href="/invoices">
                Voir tout <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentInvoices.length === 0 ? (
              <div className="space-y-3 py-8 text-center">
                <p className="text-muted-foreground text-sm">Aucune facture pour l&apos;instant.</p>
                <Button size="sm" asChild>
                  <Link href="/invoices/new">Créer une facture</Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-3">
                {recentInvoices.map((inv) => (
                  <li key={inv.id}>
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="flex items-center justify-between gap-3 py-1 transition-opacity hover:opacity-70"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{inv.invoice_number}</p>
                        <p className="text-muted-foreground truncate text-xs">
                          {inv.client_name ?? "—"}
                        </p>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <span className="text-xs font-medium">
                          {formatAmount(inv.amount, currency)}
                        </span>
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
      {kpis.pending_quotes > 0 && (
        <Card className="border-blue-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-500" />
                <CardTitle className="text-base">
                  {kpis.pending_quotes} devis en attente de réponse
                </CardTitle>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/quotes?filter=sent">
                  Voir <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
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
            {overdueInvoices.map((inv) => (
              <Link
                key={inv.id}
                href={`/invoices/${inv.id}`}
                className="flex items-center justify-between gap-3 rounded-lg bg-red-50 p-3 transition-colors hover:bg-red-100"
              >
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 flex-shrink-0 text-red-500" />
                  <div>
                    <p className="text-sm font-medium">Facture en retard : {inv.invoice_number}</p>
                    <p className="text-muted-foreground text-xs">
                      {inv.client_name} · {formatAmount(inv.amount, currency)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
            {lowStockMaterials.map((m) => (
              <Link
                key={m.id}
                href={`/materials/${m.id}`}
                className="flex items-center gap-3 rounded-lg bg-orange-50 p-3 transition-colors hover:bg-orange-100"
              >
                <AlertTriangle className="h-4 w-4 flex-shrink-0 text-orange-500" />
                <div>
                  <p className="text-sm font-medium">Stock faible : {m.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {m.stock_qty} {m.unit} restants (min {m.min_stock_qty} {m.unit})
                  </p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Progression rapide — placeholder graphique */}
      {kpis.total_projects > 0 && kpis.active_projects > 0 && (
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <TrendingUp className="h-3.5 w-3.5" />
          {kpis.active_projects} chantier{kpis.active_projects > 1 ? "s" : ""} en cours.
        </div>
      )}
    </div>
  );
}
