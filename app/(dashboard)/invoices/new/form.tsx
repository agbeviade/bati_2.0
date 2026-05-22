"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { createInvoice } from "@/app/(dashboard)/invoices/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Project, Quote } from "@/lib/supabase/types";

type Props = {
  prefill: { client_name?: string; amount?: number; project_id?: string; quote_id?: string };
  projects: Pick<Project, "id" | "name">[];
  approvedQuotes: Pick<Quote, "id" | "quote_number" | "client_name" | "total">[];
};

export default function NewInvoiceForm({ prefill, projects, approvedQuotes }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const result = await createInvoice(new FormData(e.currentTarget));
    setLoading(false);
    if (result?.error) toast.error(result.error);
  }

  return (
    <div className="space-y-4 max-w-lg">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/invoices"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h2 className="text-2xl font-bold">Nouvelle facture</h2>
      </div>

      <Card>
        <CardHeader><CardTitle>Informations</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {prefill.quote_id && <input type="hidden" name="quote_id" value={prefill.quote_id} />}

            <div className="space-y-1.5">
              <Label htmlFor="client_name">Client *</Label>
              <Input id="client_name" name="client_name" placeholder="Nom du client" required defaultValue={prefill.client_name} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="amount">Montant (TTC) *</Label>
              <Input id="amount" name="amount" type="number" min="0" step="1" required defaultValue={prefill.amount} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="due_date">Date d'échéance</Label>
              <Input id="due_date" name="due_date" type="date" />
            </div>

            {!prefill.quote_id && approvedQuotes.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="quote_id">Devis lié</Label>
                <select name="quote_id" id="quote_id" className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="">Aucun</option>
                  {approvedQuotes.map(q => (
                    <option key={q.id} value={q.id}>
                      {q.quote_number} — {q.client_name ?? "?"} ({q.total.toLocaleString("fr-FR")})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="project_id">Chantier lié</Label>
              <select name="project_id" id="project_id" defaultValue={prefill.project_id ?? ""} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="">Aucun</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={3} placeholder="Conditions de paiement, détails..." />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={loading}>{loading ? "Création..." : "Créer la facture"}</Button>
              <Button type="button" variant="ghost" asChild>
                <Link href="/invoices">Annuler</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
