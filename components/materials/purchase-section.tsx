"use client";

import { useTransition, useState } from "react";
import { Trash2, Plus, ArrowDown, SlidersHorizontal, Info } from "lucide-react";
import { toast } from "sonner";
import { addMovement, deleteMovement } from "@/app/(dashboard)/materials/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { StockMovement } from "@/lib/supabase/types";

type Movement = Pick<StockMovement, "id" | "material_id" | "type" | "quantity" | "unit_cost" | "notes" | "created_at">;

const TYPES = {
  purchase:   { label: "Achat / Entrée",   icon: ArrowDown,        color: "text-success",      bg: "bg-success/10" },
  adjustment: { label: "Correction stock", icon: SlidersHorizontal, color: "text-brand-orange", bg: "bg-brand-orange/10" },
} as const;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export function PurchaseSection({
  materialId,
  unit,
  movements: initialMovements,
}: {
  materialId: string;
  unit: string;
  movements: Movement[];
}) {
  const [movements, setMovements] = useState(initialMovements);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await addMovement(materialId, fd);
      if (res?.error) { toast.error(res.error); return; }
      toast.success("Mouvement enregistré.");
      setShowForm(false);
      window.location.reload();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteMovement(id, materialId);
      setMovements(prev => prev.filter(m => m.id !== id));
      toast.success("Mouvement supprimé.");
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Achats & ajustements</CardTitle>
          <Button size="sm" onClick={() => setShowForm(v => !v)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Ajouter
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info contextuelle */}
        <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
          <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            Les sorties chantier se saisissent depuis l'onglet <strong>Matériaux</strong> de chaque chantier.
          </p>
        </div>

        {showForm && (
          <form onSubmit={handleAdd} className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="type">Type *</Label>
                <select
                  name="type" id="type" defaultValue="purchase" required
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {Object.entries(TYPES).map(([v, c]) => (
                    <option key={v} value={v}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="quantity">Quantité ({unit}) *</Label>
                <Input id="quantity" name="quantity" type="number" min="0.001" step="0.001" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="unit_cost">Prix unitaire</Label>
                <Input id="unit_cost" name="unit_cost" type="number" min="0" step="1" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" name="notes" placeholder="Fournisseur, bon de commande..." />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isPending}>Enregistrer</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>Annuler</Button>
            </div>
          </form>
        )}

        {movements.length === 0 && !showForm ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Aucun achat enregistré.</p>
        ) : (
          <ul className="space-y-0.5">
            {movements.map((m, i) => {
              const cfg = TYPES[m.type as keyof typeof TYPES];
              if (!cfg) return null;
              const Icon = cfg.icon;
              return (
                <li key={m.id}>
                  <div className="flex items-center gap-3 py-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                      <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${cfg.color}`}>
                          +{m.quantity.toLocaleString("fr-FR")} {unit}
                        </span>
                        <span className="text-xs text-muted-foreground">{cfg.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {fmtDate(m.created_at)}
                        {m.notes && ` · ${m.notes}`}
                      </p>
                    </div>
                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive"
                      disabled={isPending}
                      onClick={() => handleDelete(m.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {i < movements.length - 1 && <Separator />}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
