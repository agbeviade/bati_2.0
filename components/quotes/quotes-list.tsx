"use client";

import Link from "next/link";
import { Plus, FileText, User, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QuoteStatusBadge } from "@/components/quotes/quote-status-badge";
import { SearchFilter } from "@/components/ui/search-filter";
import type { Quote } from "@/lib/supabase/types";

type QuoteRow = Pick<Quote, "id" | "quote_number" | "client_name" | "project_type" | "total" | "status" | "valid_until" | "created_at">;

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}
function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_OPTIONS = [
  { value: "draft",    label: "Brouillons" },
  { value: "sent",     label: "Envoyés" },
  { value: "approved", label: "Approuvés" },
  { value: "rejected", label: "Refusés" },
  { value: "expired",  label: "Expirés" },
];

export function QuotesList({ quotes, currency }: { quotes: QuoteRow[]; currency: string }) {
  const emptyState = (
    <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
      <div className="p-4 rounded-full bg-muted">
        <FileText className="h-10 w-10 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium">Aucun devis</p>
        <p className="text-sm text-muted-foreground">Créez votre premier devis à envoyer à un client.</p>
      </div>
      <Button asChild>
        <Link href="/quotes/new"><Plus className="h-4 w-4 mr-2" />Créer un devis</Link>
      </Button>
    </div>
  );

  return (
    <SearchFilter
      items={quotes}
      searchKeys={["quote_number", "client_name", "project_type"]}
      filterKey="status"
      filterOptions={STATUS_OPTIONS}
      filterAllLabel="Tous"
      placeholder="Rechercher par numéro, client, type..."
      emptyState={emptyState}
      renderItem={(quote) => (
        <Link href={`/quotes/${quote.id}`} className="block group">
          <Card className="transition-shadow group-hover:shadow-md">
            <CardContent className="py-4 flex items-center gap-4">
              <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{quote.quote_number}</p>
                  {quote.project_type && (
                    <p className="text-xs text-muted-foreground truncate">{quote.project_type}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-0">
                  <User className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{quote.client_name ?? "—"}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{quote.valid_until ? `Valide jusqu'au ${formatDate(quote.valid_until)}` : formatDate(quote.created_at)}</span>
                </div>
                <div className="text-right min-w-0">
                  <p className="font-semibold break-all">{formatAmount(quote.total, currency)}</p>
                </div>
              </div>
              <QuoteStatusBadge status={quote.status} />
            </CardContent>
          </Card>
        </Link>
      )}
    />
  );
}
