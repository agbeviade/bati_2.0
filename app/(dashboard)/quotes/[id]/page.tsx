import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, User, Calendar, Printer } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { QuoteStatusBadge } from "@/components/quotes/quote-status-badge";
import { QuoteStatusActions } from "./status-actions";
import type { Quote, QuoteItem } from "@/lib/supabase/types";

const CATEGORY_LABEL: Record<string, string> = {
  material: "Matériaux", labor: "Main d'œuvre", transport: "Transport",
  equipment: "Équipement", other: "Autre",
};

function formatAmount(n: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}
function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: quoteData } = await supabase.from("quotes").select("*").eq("id", id).maybeSingle();
  if (!quoteData) notFound();
  const quote = quoteData as Quote;

  const { data: itemsData } = await supabase
    .from("quote_items")
    .select("*")
    .eq("quote_id", id)
    .order("sort_order");
  const items = (itemsData ?? []) as QuoteItem[];

  const { data: companyData } = await supabase
    .from("companies")
    .select("name, currency, address, phone, email")
    .eq("id", quote.company_id)
    .maybeSingle();
  const company = companyData as { name: string; currency: string; address: string | null; phone: string | null; email: string | null } | null;
  const currency = company?.currency ?? "XOF";

  const itemsByCategory = CATEGORY_LABEL
    ? Object.entries(
        items.reduce((acc, item) => {
          const cat = item.category;
          if (!acc[cat]) acc[cat] = [];
          acc[cat].push(item);
          return acc;
        }, {} as Record<string, QuoteItem[]>)
      )
    : [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" asChild className="mt-0.5">
          <Link href="/quotes"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold">{quote.quote_number}</h2>
            <QuoteStatusBadge status={quote.status} />
          </div>
          <p className="text-muted-foreground text-sm flex items-center gap-1.5 mt-0.5">
            <User className="h-3.5 w-3.5" />
            {quote.client_name ?? "—"}
            {quote.project_type && <span className="mx-1">·</span>}
            {quote.project_type}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/quotes/${id}/print`} target="_blank">
              <Printer className="h-3.5 w-3.5 mr-1.5" />
              Imprimer
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/quotes/${id}/edit`}>Modifier</Link>
          </Button>
        </div>
      </div>

      {/* Actions de statut */}
      <QuoteStatusActions quoteId={id} currentStatus={quote.status} />

      {/* Méta */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Créé le", value: formatDate(quote.created_at) },
          { label: "Valide jusqu'au", value: formatDate(quote.valid_until) },
          { label: "Surface", value: quote.surface_m2 ? `${quote.surface_m2} m²` : "—" },
          { label: "Type", value: quote.project_type ?? "—" },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="font-medium text-sm mt-0.5">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Lignes */}
      <Card>
        <CardHeader><CardTitle>Détail du devis</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {itemsByCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Aucune ligne.</p>
          ) : (
            itemsByCategory.map(([cat, catItems]) => (
              <div key={cat}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {CATEGORY_LABEL[cat] ?? cat}
                </p>
                <div className="space-y-1">
                  <div className="hidden md:grid grid-cols-[2fr_80px_80px_110px_110px] gap-2 text-xs text-muted-foreground px-2">
                    <span>Description</span><span className="text-right">Qté</span>
                    <span>Unité</span><span className="text-right">P.U.</span>
                    <span className="text-right">Total</span>
                  </div>
                  {catItems.map((item) => (
                    <div key={item.id} className="grid grid-cols-1 md:grid-cols-[2fr_80px_80px_110px_110px] gap-2 py-1.5 px-2 rounded hover:bg-muted/50 text-sm">
                      <span>{item.label}</span>
                      <span className="text-right text-muted-foreground">{item.quantity}</span>
                      <span className="text-muted-foreground">{item.unit}</span>
                      <span className="text-right">{formatAmount(item.unit_price, currency)}</span>
                      <span className="text-right font-medium">{formatAmount(item.total, currency)}</span>
                    </div>
                  ))}
                </div>
                <Separator className="mt-3" />
              </div>
            ))
          )}

          {/* Totaux */}
          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-2 pt-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sous-total HT</span>
                <span>{formatAmount(quote.subtotal, currency)}</span>
              </div>
              {quote.tax_rate > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">TVA ({quote.tax_rate}%)</span>
                  <span>{formatAmount(quote.tax_amount, currency)}</span>
                </div>
              )}
              {quote.margin_pct > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Marge ({quote.margin_pct}%)</span>
                  <span>{formatAmount(quote.subtotal * quote.margin_pct / 100, currency)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>Total TTC</span>
                <span>{formatAmount(quote.total, currency)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {quote.notes && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-sm whitespace-pre-line">{quote.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
