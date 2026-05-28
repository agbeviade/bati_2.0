"use client";

import { useTransition, useState } from "react";
import { Trash2, Plus, Printer } from "lucide-react";
import { toast } from "sonner";
import { createExpense, deleteExpense } from "@/app/(dashboard)/projects/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ProjectExpense, ExpenseCategory } from "@/lib/supabase/types";

const CATEGORIES: { value: ExpenseCategory; label: string; color: string }[] = [
  { value: "materials", label: "Matériaux", color: "bg-blue-100 text-blue-700" },
  { value: "labor", label: "Main d'œuvre", color: "bg-purple-100 text-purple-700" },
  { value: "transport", label: "Transport", color: "bg-orange-100 text-orange-700" },
  { value: "other", label: "Autre", color: "bg-gray-100 text-gray-600" },
];

function fmt(n: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

function catLabel(cat: string) {
  return CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
}
function catColor(cat: string) {
  return CATEGORIES.find((c) => c.value === cat)?.color ?? "bg-gray-100 text-gray-600";
}

function printExpenseReceipt(
  exp: {
    description: string | null;
    category: string;
    amount: number;
    spent_at: string;
  },
  projectName: string,
  currency: string,
) {
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>Reçu dépense</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 420px; margin: 40px auto; color: #111; }
  .header { text-align: center; border-bottom: 2px solid #111; padding-bottom: 16px; margin-bottom: 20px; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; background: #ede9fe; color: #5b21b6; }
  .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #eee; }
  .row .label { color: #555; font-size: 13px; }
  .row .value { font-weight: 600; font-size: 13px; }
  .total { display: flex; justify-content: space-between; padding: 12px 0; font-size: 16px; font-weight: bold; border-top: 2px solid #111; margin-top: 8px; }
  .footer { text-align: center; margin-top: 32px; font-size: 11px; color: #888; }
</style></head><body>
<div class="header">
  <p style="font-size:11px;color:#888;margin:0 0 8px">BatiFlow</p>
  <h2 style="margin:0 0 8px">REÇU DE DÉPENSE</h2>
  <span class="badge">DÉPENSE</span>
</div>
<div class="row"><span class="label">Chantier</span><span class="value">${projectName}</span></div>
<div class="row"><span class="label">Date</span><span class="value">${new Date(exp.spent_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span></div>
<div class="row"><span class="label">Catégorie</span><span class="value">${catLabel(exp.category)}</span></div>
${exp.description ? `<div class="row"><span class="label">Description</span><span class="value">${exp.description}</span></div>` : ""}
<div class="total"><span>MONTANT</span><span>${new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(exp.amount)}</span></div>
<div class="footer">Document généré le ${new Date().toLocaleDateString("fr-FR")} — BatiFlow</div>
<script>window.onload = function(){ window.print(); }</script>
</body></html>`;
  const win = window.open("", "_blank", "width=500,height=700");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

export function ExpensesTab({
  projectId,
  projectName,
  expenses,
  currency,
}: {
  projectId: string;
  projectName: string;
  expenses: ProjectExpense[];
  currency: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory = CATEGORIES.map((cat) => ({
    ...cat,
    total: expenses.filter((e) => e.category === cat.value).reduce((s, e) => s + e.amount, 0),
  })).filter((c) => c.total > 0);

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    startTransition(async () => {
      const result = await createExpense(projectId, new FormData(form));
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      form.reset();
      setShowForm(false);
      toast.success("Dépense ajoutée.");
    });
  }

  function handleDelete(expenseId: string) {
    startTransition(async () => {
      await deleteExpense(expenseId, projectId);
      toast.success("Dépense supprimée.");
    });
  }

  return (
    <div className="space-y-6">
      {/* Totaux par catégorie */}
      {byCategory.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {byCategory.map((cat) => (
            <Card key={cat.value}>
              <CardContent className="pt-4">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cat.color}`}>
                  {cat.label}
                </span>
                <p className="mt-2 font-bold">{fmt(cat.total, currency)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Dépenses</CardTitle>
              <p className="text-muted-foreground text-sm">
                {expenses.length} entrée{expenses.length > 1 ? "s" : ""} · Total :{" "}
                <span className="text-foreground font-semibold">{fmt(total, currency)}</span>
              </p>
            </div>
            <Button size="sm" onClick={() => setShowForm((v) => !v)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Formulaire d'ajout */}
          {showForm && (
            <form onSubmit={handleAdd} className="bg-muted/30 space-y-3 rounded-lg border p-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="category">Catégorie</Label>
                  <select
                    name="category"
                    id="category"
                    className="border-input bg-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="amount">Montant *</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    min="0"
                    step="500"
                    placeholder="50000"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="spent_at">Date</Label>
                  <Input
                    id="spent_at"
                    name="spent_at"
                    type="date"
                    defaultValue={new Date().toISOString().split("T")[0]}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="description">Description</Label>
                  <Input id="description" name="description" placeholder="Ciment, fer 8mm..." />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={isPending}>
                  Enregistrer
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                  Annuler
                </Button>
              </div>
            </form>
          )}

          {/* Liste */}
          {expenses.length === 0 && !showForm ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              Aucune dépense enregistrée.
            </p>
          ) : (
            <ul className="space-y-1">
              {expenses.map((exp, i) => (
                <li key={exp.id}>
                  <div className="flex items-center gap-3 py-2">
                    <span
                      className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${catColor(exp.category)}`}
                    >
                      {catLabel(exp.category)}
                    </span>
                    <span className="flex-1 truncate text-sm">{exp.description ?? "—"}</span>
                    <span className="text-muted-foreground flex-shrink-0 text-xs">
                      {new Date(exp.spent_at).toLocaleDateString("fr-FR")}
                    </span>
                    <span className="flex-shrink-0 text-sm font-semibold">
                      {fmt(exp.amount, currency)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground h-7 w-7 flex-shrink-0"
                      title="Imprimer le reçu"
                      onClick={() => printExpenseReceipt(exp, projectName, currency)}
                    >
                      <Printer className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive h-7 w-7 flex-shrink-0"
                      disabled={isPending}
                      onClick={() => handleDelete(exp.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {i < expenses.length - 1 && <Separator />}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
