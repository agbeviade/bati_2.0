"use client";

import { useTransition, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { addPayment, deletePayment } from "@/app/(dashboard)/invoices/actions";
import { Button } from "@/components/ui/button";
import { DeleteButton } from "@/components/ui/delete-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Payment } from "@/lib/supabase/types";

const METHOD_LABELS: Record<string, string> = {
  cash: "Espèces",
  bank: "Virement",
  mobile_money: "Mobile Money",
  geniuspay: "GeniusPay",
  flutterwave: "Flutterwave",
};

function formatAmount(n: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export function PaymentSection({
  invoiceId,
  invoiceAmount,
  payments,
  currency,
  readonly,
}: {
  invoiceId: string;
  invoiceAmount: number;
  payments: Payment[];
  currency: string;
  readonly?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = invoiceAmount - totalPaid;

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      const result = await addPayment(invoiceId, fd);
      if (result?.error) { toast.error(result.error); return; }
      form.reset();
      setShowForm(false);
      toast.success("Paiement enregistré.");
    });
  }

  async function handleDelete(paymentId: string) {
    await deletePayment(paymentId, invoiceId);
    toast.success("Paiement supprimé.");
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Paiements</CardTitle>
            <p className="text-sm text-muted-foreground">
              {formatAmount(totalPaid, currency)} / {formatAmount(invoiceAmount, currency)} encaissé
            </p>
          </div>
          {!readonly && remaining > 0 && (
            <Button size="sm" onClick={() => setShowForm(v => !v)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Ajouter
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{ width: `${Math.min(100, (totalPaid / invoiceAmount) * 100)}%` }}
          />
        </div>

        {/* Form */}
        {showForm && (
          <form onSubmit={handleAdd} className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="amount">Montant *</Label>
                <Input
                  id="amount" name="amount" type="number" min="1" step="1"
                  placeholder={String(Math.max(0, remaining))} required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="method">Mode *</Label>
                <select
                  name="method" id="method"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {Object.entries(METHOD_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="paid_at">Date</Label>
                <Input id="paid_at" name="paid_at" type="date" defaultValue={new Date().toISOString().split("T")[0]} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reference">Référence</Label>
                <Input id="reference" name="reference" placeholder="N° chèque, reçu..." />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isPending}>Enregistrer</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>Annuler</Button>
            </div>
          </form>
        )}

        {/* List */}
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Aucun paiement enregistré.</p>
        ) : (
          <ul className="space-y-1">
            {payments.map((p, i) => (
              <li key={p.id}>
                <div className="flex items-center gap-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{formatAmount(p.amount, currency)}</span>
                      <span className="text-xs text-muted-foreground">{METHOD_LABELS[p.method] ?? p.method}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(p.paid_at)}{p.reference && ` · ${p.reference}`}
                    </p>
                  </div>
                  {!readonly && (
                    <DeleteButton
                      variant="icon"
                      disabled={isPending}
                      onConfirm={() => handleDelete(p.id)}
                      title="Supprimer ce paiement"
                      description="Ce paiement sera retiré définitivement de la facture."
                    />
                  )}
                </div>
                {i < payments.length - 1 && <Separator />}
              </li>
            ))}
          </ul>
        )}

        {remaining > 0 && totalPaid > 0 && (
          <div className="text-sm font-medium text-orange-600 pt-1">
            Reste à payer : {formatAmount(remaining, currency)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
