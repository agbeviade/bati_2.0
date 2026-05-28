import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/ui/print-button";
import type { Invoice, Payment, Company, Project, Quote } from "@/lib/supabase/types";

const METHOD_LABELS: Record<string, string> = {
  cash: "Espèces",
  bank: "Virement",
  mobile_money: "Mobile Money",
  geniuspay: "GeniusPay",
  flutterwave: "Flutterwave",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyée",
  paid: "Payée",
  overdue: "En retard",
  canceled: "Annulée",
};

function fmt(n: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}
function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: invoiceData } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!invoiceData) notFound();
  const invoice = invoiceData as Invoice;

  const { data: paymentsData } = await supabase
    .from("payments")
    .select("*")
    .eq("invoice_id", id)
    .order("paid_at");
  const payments = (paymentsData ?? []) as Payment[];

  const { data: companyData } = await supabase
    .from("companies")
    .select("name, currency, address, phone, email")
    .eq("id", invoice.company_id)
    .maybeSingle();
  const company = companyData as Pick<
    Company,
    "name" | "currency" | "address" | "phone" | "email"
  > | null;
  const currency = company?.currency ?? "XOF";

  let project: Pick<Project, "name"> | null = null;
  if (invoice.project_id) {
    const { data } = await supabase
      .from("projects")
      .select("name")
      .eq("id", invoice.project_id)
      .maybeSingle();
    project = data as Pick<Project, "name"> | null;
  }

  let quote: Pick<Quote, "quote_number"> | null = null;
  if (invoice.quote_id) {
    const { data } = await supabase
      .from("quotes")
      .select("quote_number")
      .eq("id", invoice.quote_id)
      .maybeSingle();
    quote = data as Pick<Quote, "quote_number"> | null;
  }

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = invoice.amount - totalPaid;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 32px" }}>
      {/* Print button */}
      <div
        className="no-print"
        style={{ marginBottom: 24, display: "flex", justifyContent: "flex-end", gap: 8 }}
      >
        <PrintButton />
        <a
          href={`/invoices/${id}`}
          style={{
            padding: "8px 20px",
            border: "1px solid #ddd",
            borderRadius: 6,
            textDecoration: "none",
            color: "#111",
            fontSize: 14,
          }}
        >
          ← Retour
        </a>
      </div>

      {/* En-tête */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 40,
        }}
      >
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{company?.name ?? "—"}</h1>
          {company?.address && (
            <p style={{ margin: "4px 0 0", color: "#555", fontSize: 13 }}>{company.address}</p>
          )}
          {company?.phone && (
            <p style={{ margin: "2px 0 0", color: "#555", fontSize: 13 }}>{company.phone}</p>
          )}
          {company?.email && (
            <p style={{ margin: "2px 0 0", color: "#555", fontSize: 13 }}>{company.email}</p>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#16a34a" }}>FACTURE</h2>
          <p style={{ margin: "4px 0 0", fontWeight: 600, fontSize: 16 }}>
            {invoice.invoice_number}
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 13 }}>
            <span
              style={{
                background:
                  invoice.status === "paid"
                    ? "#dcfce7"
                    : invoice.status === "overdue"
                      ? "#fee2e2"
                      : "#f1f5f9",
                padding: "2px 8px",
                borderRadius: 12,
                color:
                  invoice.status === "paid"
                    ? "#166534"
                    : invoice.status === "overdue"
                      ? "#991b1b"
                      : "#475569",
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              {STATUS_LABELS[invoice.status] ?? invoice.status}
            </span>
          </p>
        </div>
      </div>

      {/* Meta */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            padding: "16px 20px",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 11,
              fontWeight: 600,
              color: "#888",
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Destinataire
          </p>
          <p style={{ margin: "4px 0 0", fontWeight: 600, fontSize: 15 }}>
            {invoice.client_name ?? "—"}
          </p>
          {project && (
            <p style={{ margin: "2px 0 0", color: "#555", fontSize: 13 }}>
              Chantier : {project.name}
            </p>
          )}
          {quote && (
            <p style={{ margin: "2px 0 0", color: "#555", fontSize: 13 }}>
              Réf. devis : {quote.quote_number}
            </p>
          )}
        </div>
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            padding: "16px 20px",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 11,
              fontWeight: 600,
              color: "#888",
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Dates
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#555" }}>
            Émise le : <strong style={{ color: "#111" }}>{fmtDate(invoice.created_at)}</strong>
          </p>
          {invoice.due_date && (
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#555" }}>
              Échéance : <strong style={{ color: "#111" }}>{fmtDate(invoice.due_date)}</strong>
            </p>
          )}
          {invoice.paid_at && (
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#555" }}>
              Payée le : <strong style={{ color: "#16a34a" }}>{fmtDate(invoice.paid_at)}</strong>
            </p>
          )}
        </div>
      </div>

      {/* Montant principal */}
      <div
        style={{
          border: "2px solid #16a34a",
          borderRadius: 10,
          padding: "24px 28px",
          marginBottom: 32,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: 13, color: "#666" }}>Montant total</p>
          <p style={{ margin: "4px 0 0", fontSize: 32, fontWeight: 800, color: "#16a34a" }}>
            {fmt(invoice.amount, currency)}
          </p>
        </div>
        {remaining > 0 && remaining < invoice.amount && (
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: 0, fontSize: 13, color: "#666" }}>Reste à payer</p>
            <p style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 700, color: "#dc2626" }}>
              {fmt(remaining, currency)}
            </p>
          </div>
        )}
        {remaining <= 0 && (
          <div
            style={{
              background: "#dcfce7",
              border: "1px solid #86efac",
              borderRadius: 8,
              padding: "8px 16px",
            }}
          >
            <p style={{ margin: 0, fontWeight: 700, color: "#16a34a" }}>✓ INTÉGRALEMENT PAYÉE</p>
          </div>
        )}
      </div>

      {/* Historique paiements */}
      {payments.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <p
            style={{
              margin: "0 0 8px",
              fontSize: 11,
              fontWeight: 700,
              color: "#16a34a",
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Paiements reçus
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f0fdf4" }}>
                <th
                  style={{
                    textAlign: "left",
                    padding: "6px 8px",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  Date
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "6px 8px",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  Mode
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "6px 8px",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  Référence
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "6px 8px",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  Montant
                </th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9" }}>
                    {fmtDate(p.paid_at)}
                  </td>
                  <td
                    style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9", color: "#555" }}
                  >
                    {METHOD_LABELS[p.method] ?? p.method}
                  </td>
                  <td
                    style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9", color: "#555" }}
                  >
                    {p.reference ?? "—"}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      padding: "6px 8px",
                      borderBottom: "1px solid #f1f5f9",
                      fontWeight: 600,
                    }}
                  >
                    {fmt(p.amount, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Notes */}
      {invoice.notes && (
        <div
          style={{
            marginTop: 24,
            padding: "16px 20px",
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: 8,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 11,
              fontWeight: 600,
              color: "#92400e",
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Notes / Conditions
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 13, whiteSpace: "pre-line", color: "#444" }}>
            {invoice.notes}
          </p>
        </div>
      )}

      {/* Pied de page */}
      <div
        style={{
          marginTop: 48,
          borderTop: "1px solid #e2e8f0",
          paddingTop: 16,
          textAlign: "center",
          fontSize: 11,
          color: "#999",
        }}
      >
        Document généré par BatiFlow · {company?.name} · {fmtDate(new Date().toISOString())}
      </div>
    </div>
  );
}
