import { redirect } from "next/navigation";
import Link from "next/link";
import { Receipt } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent } from "@/components/ui/card";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import type { Invoice } from "@/lib/supabase/types";

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);
}

export default async function ClientInvoicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "client") redirect("/dashboard");

  const { data } = await admin
    .from("invoices")
    .select("id, invoice_number, amount, status, due_date, paid_at, created_at")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false });

  const invoices = (data ?? []) as Invoice[];
  const totalDue = invoices.filter(i => ["sent", "overdue"].includes(i.status)).reduce((s, i) => s + i.amount, 0);
  const totalPaid = invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold">Mes factures</h2>
        {invoices.length > 0 && (
          <div className="flex gap-4 text-sm">
            <span className="text-muted-foreground">À payer : <strong className="text-foreground">{fmt(totalDue)} XOF</strong></span>
            <span className="text-muted-foreground">Payé : <strong className="text-green-600">{fmt(totalPaid)} XOF</strong></span>
          </div>
        )}
      </div>

      {invoices.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center py-12 text-center">
          <Receipt className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="font-medium">Aucune facture pour le moment</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {invoices.map(inv => {
            const isOverdue = inv.status === "overdue" || (inv.status === "sent" && inv.due_date && new Date(inv.due_date) < new Date());
            return (
              <Card key={inv.id} className={`hover:shadow-md transition-shadow ${isOverdue ? "border-red-200" : ""}`}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-semibold">{inv.invoice_number}</span>
                        <InvoiceStatusBadge status={inv.status} />
                        {isOverdue && <span className="text-xs font-semibold text-red-600">EN RETARD</span>}
                      </div>
                      <div className="flex gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        {inv.due_date && (
                          <span className={isOverdue ? "text-red-500" : ""}>Échéance : {new Date(inv.due_date).toLocaleDateString("fr-FR")}</span>
                        )}
                        {inv.paid_at && <span className="text-green-600">Payée le {new Date(inv.paid_at).toLocaleDateString("fr-FR")}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-lg font-bold ${isOverdue ? "text-red-600" : ""}`}>{fmt(inv.amount)} XOF</p>
                      <Link href={`/invoices/${inv.id}/print`} target="_blank" className="text-xs text-blue-600 hover:underline">
                        Télécharger
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
