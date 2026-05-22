import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PrintButton } from "@/components/ui/print-button";
import type { Quote, QuoteItem, Company } from "@/lib/supabase/types";

const CATEGORY_LABEL: Record<string, string> = {
  material: "Matériaux", labor: "Main d'œuvre", transport: "Transport",
  equipment: "Équipement", other: "Autre",
};

function fmt(n: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}
function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export default async function QuotePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: quoteData } = await admin.from("quotes").select("*").eq("id", id).maybeSingle();
  if (!quoteData) notFound();
  const quote = quoteData as Quote;

  const { data: itemsData } = await admin.from("quote_items").select("*").eq("quote_id", id).order("sort_order");
  const items = (itemsData ?? []) as QuoteItem[];

  const { data: companyData } = await admin.from("companies")
    .select("name, currency, address, phone, email").eq("id", quote.company_id).maybeSingle();
  const company = companyData as Pick<Company, "name" | "currency" | "address" | "phone" | "email"> | null;
  const currency = company?.currency ?? "XOF";

  const grouped = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, QuoteItem[]>);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 32px" }}>
      {/* Print button */}
      <div className="no-print" style={{ marginBottom: 24, display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <PrintButton />
        <a href={`/quotes/${id}`} style={{ padding: "8px 20px", border: "1px solid #ddd", borderRadius: 6, textDecoration: "none", color: "#111", fontSize: 14 }}>
          ← Retour
        </a>
      </div>

      {/* En-tête */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 40 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{company?.name ?? "—"}</h1>
          {company?.address && <p style={{ margin: "4px 0 0", color: "#555", fontSize: 13 }}>{company.address}</p>}
          {company?.phone && <p style={{ margin: "2px 0 0", color: "#555", fontSize: 13 }}>{company.phone}</p>}
          {company?.email && <p style={{ margin: "2px 0 0", color: "#555", fontSize: 13 }}>{company.email}</p>}
        </div>
        <div style={{ textAlign: "right" }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#2563eb" }}>DEVIS</h2>
          <p style={{ margin: "4px 0 0", fontWeight: 600, fontSize: 16 }}>{quote.quote_number}</p>
          <p style={{ margin: "2px 0 0", color: "#555", fontSize: 13 }}>Créé le {fmtDate(quote.created_at)}</p>
          {quote.valid_until && <p style={{ margin: "2px 0 0", color: "#555", fontSize: 13 }}>Valide jusqu'au {fmtDate(quote.valid_until)}</p>}
        </div>
      </div>

      {/* Client */}
      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "16px 20px", marginBottom: 32 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>Client</p>
        <p style={{ margin: "4px 0 0", fontWeight: 600, fontSize: 15 }}>{quote.client_name ?? "—"}</p>
        {quote.project_type && <p style={{ margin: "2px 0 0", color: "#555", fontSize: 13 }}>Travaux : {quote.project_type}</p>}
        {quote.surface_m2 && <p style={{ margin: "2px 0 0", color: "#555", fontSize: 13 }}>Surface : {quote.surface_m2} m²</p>}
      </div>

      {/* Lignes */}
      {Object.entries(grouped).map(([cat, catItems]) => (
        <div key={cat} style={{ marginBottom: 24 }}>
          <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: 1 }}>
            {CATEGORY_LABEL[cat] ?? cat}
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f1f5f9" }}>
                <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e2e8f0" }}>Description</th>
                <th style={{ textAlign: "right", padding: "6px 8px", borderBottom: "1px solid #e2e8f0", width: 60 }}>Qté</th>
                <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e2e8f0", width: 50 }}>Unité</th>
                <th style={{ textAlign: "right", padding: "6px 8px", borderBottom: "1px solid #e2e8f0", width: 100 }}>Prix unit.</th>
                <th style={{ textAlign: "right", padding: "6px 8px", borderBottom: "1px solid #e2e8f0", width: 100 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {catItems.map((item, i) => (
                <tr key={item.id} style={{ background: i % 2 === 0 ? "white" : "#fafafa" }}>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9" }}>{item.label}</td>
                  <td style={{ textAlign: "right", padding: "6px 8px", borderBottom: "1px solid #f1f5f9" }}>{item.quantity}</td>
                  <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9", color: "#666" }}>{item.unit}</td>
                  <td style={{ textAlign: "right", padding: "6px 8px", borderBottom: "1px solid #f1f5f9" }}>{fmt(item.unit_price, currency)}</td>
                  <td style={{ textAlign: "right", padding: "6px 8px", borderBottom: "1px solid #f1f5f9", fontWeight: 500 }}>{fmt(item.total, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* Totaux */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <div style={{ width: 280 }}>
          {[
            { label: "Sous-total HT", value: fmt(quote.subtotal, currency) },
            ...(quote.tax_rate > 0 ? [{ label: `TVA (${quote.tax_rate}%)`, value: fmt(quote.tax_amount, currency) }] : []),
            ...(quote.margin_pct > 0 ? [{ label: `Marge (${quote.margin_pct}%)`, value: fmt(quote.subtotal * quote.margin_pct / 100, currency) }] : []),
          ].map(r => (
            <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13, color: "#555", borderBottom: "1px solid #f1f5f9" }}>
              <span>{r.label}</span><span>{r.value}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", fontSize: 16, fontWeight: 700, borderTop: "2px solid #111", marginTop: 4 }}>
            <span>Total TTC</span><span style={{ color: "#2563eb" }}>{fmt(quote.total, currency)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {quote.notes && (
        <div style={{ marginTop: 40, padding: "16px 20px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "#92400e", textTransform: "uppercase", letterSpacing: 1 }}>Notes</p>
          <p style={{ margin: "6px 0 0", fontSize: 13, whiteSpace: "pre-line", color: "#444" }}>{quote.notes}</p>
        </div>
      )}

      {/* Pied de page */}
      <div style={{ marginTop: 48, borderTop: "1px solid #e2e8f0", paddingTop: 16, textAlign: "center", fontSize: 11, color: "#999" }}>
        Document généré par BatiFlow · {company?.name} · {fmtDate(new Date().toISOString())}
      </div>
    </div>
  );
}
