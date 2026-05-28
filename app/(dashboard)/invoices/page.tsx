import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InvoicesList } from "@/components/invoices/invoices-list";
import type { Invoice } from "@/lib/supabase/types";

function formatAmount(n: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}
function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export default async function InvoicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("company_id").eq("id", user.id).single();
  if (!profile?.company_id) redirect("/onboarding");

  const { data: company } = await supabase.from("companies").select("currency").eq("id", profile.company_id).single();
  const currency = (company as { currency?: string } | null)?.currency ?? "XOF";

  const { data: invoicesData } = await supabase
    .from("invoices")
    .select("id, invoice_number, client_name, amount, status, due_date, paid_at, created_at")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  const invoices = (invoicesData ?? []) as Pick<Invoice, "id" | "invoice_number" | "client_name" | "amount" | "status" | "due_date" | "paid_at" | "created_at">[];

  const stats = {
    total: invoices.length,
    draft: invoices.filter(i => i.status === "draft").length,
    sent: invoices.filter(i => i.status === "sent").length,
    paid: invoices.filter(i => i.status === "paid").length,
    overdue: invoices.filter(i => i.status === "overdue").length,
    totalAmount: invoices.reduce((s, i) => s + i.amount, 0),
    paidAmount: invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.amount, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Factures</h2>
          <p className="text-muted-foreground">
            {invoices.length === 0
              ? "Aucune facture pour l'instant."
              : `${invoices.length} facture${invoices.length > 1 ? "s" : ""}`}
          </p>
        </div>
        <Button asChild className="self-start sm:self-auto">
          <Link href="/invoices/new">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle facture
          </Link>
        </Button>
      </div>

      {invoices.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Brouillons", value: stats.draft, color: "text-muted-foreground" },
            { label: "Envoyées", value: stats.sent, color: "text-blue-600" },
            { label: "Payées", value: stats.paid, color: "text-green-600" },
            { label: "En retard", value: stats.overdue, color: "text-red-600" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="pt-4 text-center">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <InvoicesList invoices={invoices} currency={currency} />
    </div>
  );
}
