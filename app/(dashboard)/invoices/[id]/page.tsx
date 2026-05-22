import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, Calendar, FileText, Printer } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { InvoiceStatusActions } from "@/components/invoices/invoice-status-actions";
import { PaymentSection } from "@/components/invoices/payment-section";
import type { Invoice, Payment, Project, Quote } from "@/lib/supabase/types";

function formatAmount(n: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}
function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: invoiceData } = await admin.from("invoices").select("*").eq("id", id).maybeSingle();
  if (!invoiceData) notFound();
  const invoice = invoiceData as Invoice;

  const { data: company } = await admin
    .from("companies")
    .select("currency, name")
    .eq("id", invoice.company_id)
    .maybeSingle();
  const currency = (company as { currency?: string } | null)?.currency ?? "XOF";

  const { data: paymentsData } = await admin
    .from("payments")
    .select("*")
    .eq("invoice_id", id)
    .order("paid_at", { ascending: false });
  const payments = (paymentsData ?? []) as Payment[];

  let project: Pick<Project, "id" | "name"> | null = null;
  if (invoice.project_id) {
    const { data } = await admin.from("projects").select("id, name").eq("id", invoice.project_id).maybeSingle();
    project = data as Pick<Project, "id" | "name"> | null;
  }

  let quote: Pick<Quote, "id" | "quote_number"> | null = null;
  if (invoice.quote_id) {
    const { data } = await admin.from("quotes").select("id, quote_number").eq("id", invoice.quote_id).maybeSingle();
    quote = data as Pick<Quote, "id" | "quote_number"> | null;
  }

  const isTerminal = invoice.status === "paid" || invoice.status === "canceled";

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" asChild className="mt-0.5">
          <Link href="/invoices"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold">{invoice.invoice_number}</h2>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
          <p className="text-muted-foreground text-sm flex items-center gap-1.5 mt-0.5">
            <User className="h-3.5 w-3.5" />
            {invoice.client_name ?? "—"}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/invoices/${id}/print`} target="_blank">
            <Printer className="h-3.5 w-3.5 mr-1.5" />
            Imprimer
          </Link>
        </Button>
      </div>

      {/* Status actions */}
      <InvoiceStatusActions invoiceId={id} currentStatus={invoice.status} />

      {/* Meta cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Montant", value: formatAmount(invoice.amount, currency) },
          { label: "Créée le", value: formatDate(invoice.created_at) },
          { label: "Échéance", value: formatDate(invoice.due_date) },
          { label: "Payée le", value: invoice.paid_at ? formatDate(invoice.paid_at) : "—" },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="font-medium text-sm mt-0.5">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Liens */}
      {(project || quote) && (
        <div className="flex gap-3 flex-wrap">
          {project && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/projects/${project.id}`}>
                <FileText className="h-3.5 w-3.5 mr-1.5" />
                Chantier : {project.name}
              </Link>
            </Button>
          )}
          {quote && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/quotes/${quote.id}`}>
                <FileText className="h-3.5 w-3.5 mr-1.5" />
                Devis : {quote.quote_number}
              </Link>
            </Button>
          )}
        </div>
      )}

      {/* Notes */}
      {invoice.notes && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Notes</p>
            <p className="text-sm whitespace-pre-line">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Payments */}
      <PaymentSection
        invoiceId={id}
        invoiceAmount={invoice.amount}
        payments={payments}
        currency={currency}
        readonly={isTerminal}
      />
    </div>
  );
}
