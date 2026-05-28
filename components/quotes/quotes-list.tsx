"use client";

import Link from "next/link";
import { Plus, FileText, User, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QuoteStatusBadge } from "@/components/quotes/quote-status-badge";
import { SearchFilter } from "@/components/ui/search-filter";
import type { Quote } from "@/lib/supabase/types";

type QuoteRow = Pick<
  Quote,
  | "id"
  | "quote_number"
  | "client_name"
  | "project_type"
  | "total"
  | "status"
  | "valid_until"
  | "created_at"
>;

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const STATUS_OPTIONS = [
  { value: "draft", label: "Brouillons" },
  { value: "sent", label: "Envoyés" },
  { value: "approved", label: "Approuvés" },
  { value: "rejected", label: "Refusés" },
  { value: "expired", label: "Expirés" },
];

export function QuotesList({ quotes, currency }: { quotes: QuoteRow[]; currency: string }) {
  const emptyState = (
    <div className="flex flex-col items-center justify-center space-y-4 py-24 text-center">
      <div className="bg-muted rounded-full p-4">
        <FileText className="text-muted-foreground h-10 w-10" />
      </div>
      <div>
        <p className="font-medium">Aucun devis</p>
        <p className="text-muted-foreground text-sm">
          Créez votre premier devis à envoyer à un client.
        </p>
      </div>
      <Button asChild>
        <Link href="/quotes/new">
          <Plus className="mr-2 h-4 w-4" />
          Créer un devis
        </Link>
      </Button>
    </div>
  );

  return (
    <SearchFilter
      items={quotes}
      pageSize={20}
      searchKeys={["quote_number", "client_name", "project_type"]}
      filterKey="status"
      filterOptions={STATUS_OPTIONS}
      filterAllLabel="Tous"
      placeholder="Rechercher par numéro, client, type..."
      emptyState={emptyState}
      renderItem={(quote) => (
        <Link href={`/quotes/${quote.id}`} className="group block">
          <Card className="transition-shadow group-hover:shadow-md">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="grid min-w-0 flex-1 grid-cols-1 items-center gap-2 md:grid-cols-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{quote.quote_number}</p>
                  {quote.project_type && (
                    <p className="text-muted-foreground truncate text-xs">{quote.project_type}</p>
                  )}
                </div>
                <div className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-sm">
                  <User className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{quote.client_name ?? "—"}</span>
                </div>
                <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    {quote.valid_until
                      ? `Valide jusqu'au ${formatDate(quote.valid_until)}`
                      : formatDate(quote.created_at)}
                  </span>
                </div>
                <div className="min-w-0 text-right">
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
