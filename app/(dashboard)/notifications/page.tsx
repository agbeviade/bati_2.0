import { redirect } from "next/navigation";
import Link from "next/link";
import { Receipt, Package, Clock, FileText, AlertTriangle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Invoice, Material, Attendance, User, Quote } from "@/lib/supabase/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}
function formatAmount(n: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}
function hoursAgo(iso: string) {
  return Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000);
}

type Alert = {
  id: string;
  level: "error" | "warning" | "info";
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  date: string;
};

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin.from("users").select("company_id").eq("id", user.id).single();
  if (!profile?.company_id) redirect("/onboarding");

  const companyId = profile.company_id;

  const { data: companyData } = await admin.from("companies").select("currency").eq("id", companyId).single();
  const currency = (companyData as { currency?: string } | null)?.currency ?? "XOF";

  const today = new Date().toISOString().split("T")[0];
  const twelveHoursAgo = new Date(new Date().getTime() - 12 * 3_600_000).toISOString();

  const [
    { data: overdueInvoicesData },
    { data: expiredQuotesData },
    { data: lowStockData },
    { data: openAttendanceData },
  ] = await Promise.all([
    admin.from("invoices")
      .select("id, invoice_number, client_name, amount, due_date, status")
      .eq("company_id", companyId)
      .in("status", ["sent", "overdue"])
      .lt("due_date", today)
      .order("due_date"),
    admin.from("quotes")
      .select("id, quote_number, client_name, valid_until")
      .eq("company_id", companyId)
      .eq("status", "sent")
      .lt("valid_until", today)
      .order("valid_until"),
    admin.from("materials")
      .select("id, name, stock_qty, min_stock_qty, unit")
      .eq("company_id", companyId)
      .gt("min_stock_qty", 0),
    admin.from("attendance")
      .select("id, user_id, check_in")
      .lt("check_in", twelveHoursAgo)
      .is("check_out", null)
      .in("user_id", (
        await admin.from("users").select("id").eq("company_id", companyId)
      ).data?.map(u => u.id) ?? []),
  ]);

  const overdueInvoices = (overdueInvoicesData ?? []) as Pick<Invoice, "id" | "invoice_number" | "client_name" | "amount" | "due_date" | "status">[];
  const expiredQuotes = (expiredQuotesData ?? []) as Pick<Quote, "id" | "quote_number" | "client_name" | "valid_until">[];
  const allMaterials = (lowStockData ?? []) as Pick<Material, "id" | "name" | "stock_qty" | "min_stock_qty" | "unit">[];
  const lowStockMaterials = allMaterials.filter(m => m.stock_qty <= m.min_stock_qty);
  const openAttendances = (openAttendanceData ?? []) as Pick<Attendance, "id" | "user_id" | "check_in">[];

  // Résoudre les noms des employés avec pointage ouvert
  const attendanceUserNames: Record<string, string | null> = {};
  if (openAttendances.length > 0) {
    const uids = [...new Set(openAttendances.map(a => a.user_id))];
    const { data: usersData } = await admin.from("users").select("id, full_name").in("id", uids);
    for (const u of (usersData ?? []) as Pick<User, "id" | "full_name">[]) {
      attendanceUserNames[u.id] = u.full_name;
    }
  }

  const alerts: Alert[] = [
    ...overdueInvoices.map(inv => ({
      id: `inv-${inv.id}`,
      level: "error" as const,
      icon: Receipt,
      title: `Facture en retard : ${inv.invoice_number}`,
      description: `${inv.client_name ?? "—"} · ${formatAmount(inv.amount, currency)} · Échue le ${formatDate(inv.due_date!)}`,
      href: `/invoices/${inv.id}`,
      date: inv.due_date!,
    })),
    ...expiredQuotes.map(q => ({
      id: `quote-${q.id}`,
      level: "warning" as const,
      icon: FileText,
      title: `Devis expiré : ${q.quote_number}`,
      description: `${q.client_name ?? "—"} · Expiré le ${formatDate(q.valid_until!)}`,
      href: `/quotes/${q.id}`,
      date: q.valid_until!,
    })),
    ...lowStockMaterials.map(m => ({
      id: `mat-${m.id}`,
      level: "warning" as const,
      icon: Package,
      title: `Stock faible : ${m.name}`,
      description: `${m.stock_qty.toLocaleString("fr-FR")} ${m.unit} restants (min : ${m.min_stock_qty} ${m.unit})`,
      href: `/materials/${m.id}`,
      date: new Date().toISOString(),
    })),
    ...openAttendances.map(a => ({
      id: `att-${a.id}`,
      level: "info" as const,
      icon: Clock,
      title: `Pointage ouvert : ${attendanceUserNames[a.user_id] ?? "—"}`,
      description: `En cours depuis ${hoursAgo(a.check_in)}h (depuis ${formatDate(a.check_in)})`,
      href: `/teams`,
      date: a.check_in,
    })),
  ];

  const LEVEL_STYLE = {
    error:   { bg: "bg-red-50 border-red-200",    icon: "text-red-500",    badge: "bg-red-100 text-red-700 border-red-200" },
    warning: { bg: "bg-orange-50 border-orange-200", icon: "text-orange-500", badge: "bg-orange-100 text-orange-700 border-orange-200" },
    info:    { bg: "bg-blue-50 border-blue-200",   icon: "text-blue-500",   badge: "bg-blue-100 text-blue-700 border-blue-200" },
  };

  const LEVEL_LABEL = { error: "Urgent", warning: "Attention", info: "Info" };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold">Notifications</h2>
        <p className="text-muted-foreground">
          {alerts.length === 0
            ? "Aucune alerte — tout est en ordre."
            : `${alerts.length} alerte${alerts.length > 1 ? "s" : ""} à traiter`}
        </p>
      </div>

      {alerts.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <div>
              <p className="font-medium">Tout est en ordre</p>
              <p className="text-sm text-muted-foreground">Aucune alerte active pour le moment.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Résumé par type */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Urgentes", count: alerts.filter(a => a.level === "error").length, color: "text-red-600" },
              { label: "Attention", count: alerts.filter(a => a.level === "warning").length, color: "text-orange-600" },
              { label: "Info", count: alerts.filter(a => a.level === "info").length, color: "text-blue-600" },
            ].map(s => (
              <Card key={s.label}>
                <CardContent className="pt-4 text-center">
                  <div className={`text-2xl font-bold ${s.color}`}>{s.count}</div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Liste */}
          <Card>
            <CardHeader><CardTitle>Toutes les alertes</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {alerts.map(alert => {
                const style = LEVEL_STYLE[alert.level];
                const Icon = alert.icon;
                return (
                  <Link
                    key={alert.id}
                    href={alert.href}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${style.bg} hover:opacity-80 transition-opacity`}
                  >
                    <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${style.icon}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{alert.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
                    </div>
                    <Badge variant="outline" className={`text-xs flex-shrink-0 ${style.badge}`}>
                      {LEVEL_LABEL[alert.level]}
                    </Badge>
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
