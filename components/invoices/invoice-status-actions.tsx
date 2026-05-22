"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { updateInvoiceStatus } from "@/app/(dashboard)/invoices/actions";
import { Button } from "@/components/ui/button";
import type { InvoiceStatus } from "@/lib/supabase/types";

type Transition = { label: string; next: InvoiceStatus; variant?: "default" | "destructive" | "outline" };

const TRANSITIONS: Record<InvoiceStatus, Transition[]> = {
  draft: [
    { label: "Marquer envoyée", next: "sent" },
    { label: "Annuler", next: "canceled", variant: "destructive" },
  ],
  sent: [
    { label: "Marquer payée", next: "paid", variant: "default" },
    { label: "Marquer en retard", next: "overdue", variant: "outline" },
    { label: "Annuler", next: "canceled", variant: "destructive" },
  ],
  overdue: [
    { label: "Marquer payée", next: "paid" },
    { label: "Annuler", next: "canceled", variant: "destructive" },
  ],
  paid: [],
  canceled: [],
};

export function InvoiceStatusActions({ invoiceId, currentStatus }: { invoiceId: string; currentStatus: InvoiceStatus }) {
  const [isPending, startTransition] = useTransition();
  const transitions = TRANSITIONS[currentStatus] ?? [];

  if (transitions.length === 0) return null;

  function handle(next: InvoiceStatus) {
    startTransition(async () => {
      const result = await updateInvoiceStatus(invoiceId, next);
      if (result?.error) { toast.error(result.error); return; }
      toast.success("Statut mis à jour.");
    });
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {transitions.map(t => (
        <Button
          key={t.next}
          size="sm"
          variant={t.variant ?? "default"}
          disabled={isPending}
          onClick={() => handle(t.next)}
        >
          {t.label}
        </Button>
      ))}
    </div>
  );
}
