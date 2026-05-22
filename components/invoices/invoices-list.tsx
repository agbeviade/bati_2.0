"use client";

import Link from "next/link";
import { Plus, Receipt, User, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { SearchFilter } from "@/components/ui/search-filter";
import type { Invoice } from "@/lib/supabase/types";

type InvoiceRow = Pick<Invoice, "id" | "invoice_number" | "client_name" | "amount" | "status" | "due_date" | "paid_at" | "created_at">;

function formatAmount(n: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}
function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_OPTIONS = [
  { value: "draft",    label: "Brouillons" },
  { value: "sent",     label: "Envoyées" },
  { value: "paid",     label: "Payées" },
  { value: "overdue",  label: "En retard" },
  { value: "canceled", label: "Annulées" },
];

export function InvoicesList({ invoices, currency }: { invoices: InvoiceRow[]; currency: string }) {
  const emptyState = (
    <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
      <div className="p-4 rounded-full bg-muted">
        <Receipt className="h-10 w-10 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium">Aucune facture</p>
        <p className="text-sm text-muted-foreground">Créez votre première facture pour suivre les paiements.</p>
      </div>
      <Button asChild>
        <Link href="/invoices/new"><Plus className="h-4 w-4 mr-2" />Créer une facture</Link>
      </Button>
    </div>
  );

  return (
    <SearchFilter
      items={invoices}
      searchKeys={["invoice_number", "client_name"]}
      filterKey="status"
      filterOptions={STATUS_OPTIONS}
      filterAllLabel="Toutes"
      placeholder="Rechercher par numéro, client..."
      emptyState={emptyState}
      renderItem={(inv) => {
        const isOverdue = inv.status === "overdue" || (
          inv.status === "sent" && inv.due_date && new Date(inv.due_date) < new Date()
        );
        return (
          <Link href={`/invoices/${inv.id}`} className="block group">
            <Card className={`transition-shadow group-hover:shadow-md ${isOverdue ? "border-red-200" : ""}`}>
              <CardContent className="py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{inv.invoice_number}</p>
                      {isOverdue && <AlertCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-0">
                    <User className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{inv.client_name ?? "—"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{inv.due_date ? `Échéance ${formatDate(inv.due_date)}` : formatDate(inv.created_at)}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatAmount(inv.amount, currency)}</p>
                  </div>
                </div>
                <InvoiceStatusBadge status={inv.status} />
              </CardContent>
            </Card>
          </Link>
        );
      }}
    />
  );
}
