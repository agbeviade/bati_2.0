"use client";

import { useTransition, useState } from "react";
import { Trash2, Plus, ArrowDown, ArrowUp, RotateCcw, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { addMovement, deleteMovement } from "@/app/(dashboard)/materials/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { StockMovement, Project } from "@/lib/supabase/types";

const MOVEMENT_CONFIG = {
  purchase: { label: "Achat / Entrée", icon: ArrowDown, color: "text-green-600" },
  use: { label: "Sortie chantier", icon: ArrowUp, color: "text-red-600" },
  return: { label: "Retour chantier", icon: RotateCcw, color: "text-blue-600" },
  adjustment: { label: "Correction stock", icon: SlidersHorizontal, color: "text-orange-600" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function MovementSection({
  materialId,
  unit,
  movements,
  projects,
}: {
  materialId: string;
  unit: string;
  movements: (StockMovement & { project_name?: string | null })[];
  projects: Pick<Project, "id" | "name">[];
}) {
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [movType, setMovType] = useState<string>("purchase");

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      const result = await addMovement(materialId, fd);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      form.reset();
      setShowForm(false);
      toast.success("Mouvement enregistré.");
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteMovement(id, materialId);
      toast.success("Mouvement supprimé.");
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Mouvements de stock</CardTitle>
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Ajouter
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <form onSubmit={handleAdd} className="bg-muted/30 space-y-3 rounded-lg border p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="type">Type *</Label>
                <select
                  name="type"
                  id="type"
                  required
                  value={movType}
                  onChange={(e) => setMovType(e.target.value)}
                  className="border-input bg-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
                >
                  {Object.entries(MOVEMENT_CONFIG).map(([v, c]) => (
                    <option key={v} value={v}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="quantity">Quantité ({unit}) *</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="0.001"
                  step="0.001"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="unit_cost">Prix unitaire</Label>
                <Input id="unit_cost" name="unit_cost" type="number" min="0" step="1" />
              </div>
              {(movType === "use" || movType === "return") && projects.length > 0 && (
                <div className="space-y-1.5">
                  <Label htmlFor="project_id">Chantier</Label>
                  <select
                    name="project_id"
                    id="project_id"
                    className="border-input bg-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <option value="">Aucun</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                name="notes"
                placeholder="Fournisseur, référence bon de commande..."
              />
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

        {movements.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            Aucun mouvement enregistré.
          </p>
        ) : (
          <ul className="space-y-1">
            {movements.map((m, i) => {
              const config = MOVEMENT_CONFIG[m.type] ?? MOVEMENT_CONFIG.purchase;
              const Icon = config.icon;
              const sign = m.type === "use" ? "−" : "+";
              return (
                <li key={m.id}>
                  <div className="flex items-center gap-3 py-2">
                    <Icon className={`h-4 w-4 flex-shrink-0 ${config.color}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${config.color}`}>
                          {sign}
                          {m.quantity.toLocaleString("fr-FR")} {unit}
                        </span>
                        <span className="text-muted-foreground text-xs">{config.label}</span>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {formatDate(m.created_at)}
                        {m.project_name && ` · ${m.project_name}`}
                        {m.notes && ` · ${m.notes}`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive h-7 w-7 flex-shrink-0"
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
