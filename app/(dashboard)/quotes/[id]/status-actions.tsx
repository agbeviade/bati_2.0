"use client";

import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import { updateQuoteStatus } from "../actions";
import { Button } from "@/components/ui/button";
import type { QuoteStatus } from "@/lib/supabase/types";

const TRANSITIONS: Record<QuoteStatus, { next: QuoteStatus; label: string }[]> = {
  draft: [{ next: "sent", label: "Marquer comme envoyé" }],
  sent: [
    { next: "approved", label: "Approuver" },
    { next: "rejected", label: "Refuser" },
  ],
  approved: [],
  rejected: [{ next: "draft", label: "Remettre en brouillon" }],
  expired: [{ next: "draft", label: "Remettre en brouillon" }],
};

export function QuoteStatusActions({
  quoteId,
  currentStatus,
}: {
  quoteId: string;
  currentStatus: QuoteStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const actions = TRANSITIONS[currentStatus] ?? [];

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map(({ next, label }) => (
        <Button
          key={next}
          variant={
            next === "approved" ? "default" : next === "rejected" ? "destructive" : "outline"
          }
          size="sm"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await updateQuoteStatus(quoteId, next);
              if (result?.error) toast.error(result.error);
              else toast.success("Statut mis à jour.");
            })
          }
        >
          {label}
        </Button>
      ))}
      {currentStatus === "approved" && (
        <Button variant="outline" size="sm" asChild>
          <Link href={`/invoices/new?quote_id=${quoteId}`}>Créer une facture</Link>
        </Button>
      )}
    </div>
  );
}
