"use client";

import { useTransition, useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { createExpense, deleteExpense } from "@/app/(dashboard)/projects/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ProjectExpense, ExpenseCategory } from "@/lib/supabase/types";

const CATEGORIES: { value: ExpenseCategory; label: string; color: string }[] = [
  { value: "materials",  label: "Matériaux",       color: "bg-blue-100 text-blue-700" },
  { value: "labor",      label: "Main d'œuvre",    color: "bg-purple-100 text-purple-700" },
  { value: "transport",  label: "Transport",        color: "bg-orange-100 text-orange-700" },
  { value: "other",      label: "Autre",            color: "bg-gray-100 text-gray-600" },
];

function fmt(n: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

function catLabel(cat: string) {
  return CATEGORIES.find(c => c.value === cat)?.label ?? cat;
}
function catColor(cat: string) {
  return CATEGORIES.find(c => c.value === cat)?.color ?? "bg-gray-100 text-gray-600";
}

export function ExpensesTab({ projectId, expenses, currency }: {
  projectId: string;
  expenses: ProjectExpense[];
  currency: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory = CATEGORIES.map(cat => ({
    ...cat,
    total: expenses.filter(e => e.category === cat.value).reduce((s, e) => s + e.amount, 0),
  })).filter(c => c.total > 0);

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    startTransition(async () => {
      const result = await createExpense(projectId, new FormData(form));
      if (result?.error) { toast.error(result.error); return; }
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {byCategory.map(cat => (
            <Card key={cat.value}><CardContent className="pt-4">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.color}`}>{cat.label}</span>
              <p className="font-bold mt-2">{fmt(cat.total, currency)}</p>
            </CardContent></Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Dépenses</CardTitle>
              <p className="text-sm text-muted-foreground">{expenses.length} entrée{expenses.length > 1 ? "s" : ""} · Total : <span className="font-semibold text-foreground">{fmt(total, currency)}</span></p>
            </div>
            <Button size="sm" onClick={() => setShowForm(v => !v)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Formulaire d'ajout */}
          {showForm && (
            <form onSubmit={handleAdd} className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="category">Catégorie</Label>
                  <select name="category" id="category" className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="amount">Montant *</Label>
                  <Input id="amount" name="amount" type="number" min="0" step="500" placeholder="50000" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="spent_at">Date</Label>
                  <Input id="spent_at" name="spent_at" type="date" defaultValue={new Date().toISOString().split("T")[0]} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="description">Description</Label>
                  <Input id="description" name="description" placeholder="Ciment, fer 8mm..." />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={isPending}>Enregistrer</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>Annuler</Button>
              </div>
            </form>
          )}

          {/* Liste */}
          {expenses.length === 0 && !showForm ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Aucune dépense enregistrée.</p>
          ) : (
            <ul className="space-y-1">
              {expenses.map((exp, i) => (
                <li key={exp.id}>
                  <div className="flex items-center gap-3 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${catColor(exp.category)}`}>
                      {catLabel(exp.category)}
                    </span>
                    <span className="flex-1 text-sm truncate">{exp.description ?? "—"}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {new Date(exp.spent_at).toLocaleDateString("fr-FR")}
                    </span>
                    <span className="font-semibold text-sm flex-shrink-0">{fmt(exp.amount, currency)}</span>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive"
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
