"use client";

import { useTransition, useState } from "react";
import { Trash2, Plus, ArrowUp, RotateCcw, Package, PackageX } from "lucide-react";
import { toast } from "sonner";
import { addMovement, deleteMovement } from "@/app/(dashboard)/materials/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Material } from "@/lib/supabase/types";

type Movement = {
  id: string;
  material_id: string;
  type: string;
  quantity: number;
  unit_cost: number | null;
  notes: string | null;
  created_at: string;
  material_name: string;
  unit: string;
};

const MOVE_TYPES = {
  use:    { label: "Sortie chantier",  icon: ArrowUp,    color: "text-red-600",  bg: "bg-red-50" },
  return: { label: "Retour au stock",  icon: RotateCcw,  color: "text-blue-600", bg: "bg-blue-50" },
} as const;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function fmtNum(n: number) {
  return n.toLocaleString("fr-FR");
}

export function MaterialsTab({
  projectId,
  movements: initialMovements,
  materials,
  currency,
}: {
  projectId: string;
  movements: Movement[];
  materials: Pick<Material, "id" | "name" | "unit" | "stock_qty" | "unit_cost">[];
  currency: string;
}) {
  const [movements, setMovements] = useState(initialMovements);
  const [showForm, setShowForm] = useState(false);
  const [selectedMat, setSelectedMat] = useState(materials[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();

  const mat = materials.find(m => m.id === selectedMat);

  // Résumé par matériau
  const summary = Object.values(
    movements.reduce<Record<string, { material_id: string; name: string; unit: string; used: number; returned: number; cost: number }>>((acc, m) => {
      if (!acc[m.material_id]) {
        acc[m.material_id] = { material_id: m.material_id, name: m.material_name, unit: m.unit, used: 0, returned: 0, cost: 0 };
      }
      if (m.type === "use") {
        acc[m.material_id].used += m.quantity;
        acc[m.material_id].cost += m.quantity * (m.unit_cost ?? 0);
      } else if (m.type === "return") {
        acc[m.material_id].returned += m.quantity;
      }
      return acc;
    }, {})
  ).sort((a, b) => b.cost - a.cost);

  const totalCost = summary.reduce((s, r) => s + r.cost, 0);

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedMat) { toast.error("Choisissez un matériau."); return; }
    const fd = new FormData(e.currentTarget);
    fd.set("project_id", projectId);
    startTransition(async () => {
      const res = await addMovement(selectedMat, fd);
      if (res?.error) { toast.error(res.error); return; }
      toast.success("Mouvement enregistré.");
      setShowForm(false);
      // Recharger la page pour avoir les données fraîches
      window.location.reload();
    });
  }

  function handleDelete(id: string, matId: string) {
    startTransition(async () => {
      await deleteMovement(id, matId);
      setMovements(prev => prev.filter(m => m.id !== id));
      toast.success("Mouvement supprimé.");
    });
  }

  return (
    <div className="space-y-4">
      {/* Récap coût total */}
      {summary.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold">Récapitulatif des matériaux</p>
              <p className="text-sm font-bold text-primary">
                {fmtNum(totalCost)} {currency}
              </p>
            </div>
            <div className="space-y-2">
              {summary.map(row => {
                const net = row.used - row.returned;
                return (
                  <div key={row.material_id} className="flex items-center gap-3 py-1.5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Package className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{row.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmtNum(row.used)} {row.unit} sorti
                        {row.returned > 0 && ` · ${fmtNum(row.returned)} retourné`}
                        {" · "}net : {fmtNum(net)} {row.unit}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{fmtNum(row.cost)} {currency}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bouton + formulaire */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Sorties & retours matériaux</CardTitle>
            <Button size="sm" onClick={() => setShowForm(v => !v)} disabled={materials.length === 0}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Enregistrer
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {materials.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <PackageX className="h-8 w-8 opacity-40" />
              <p className="text-sm">Aucun matériau dans le catalogue.</p>
              <p className="text-xs">Ajoutez d'abord des matériaux dans le module Matériaux.</p>
            </div>
          )}

          {showForm && (
            <form onSubmit={handleAdd} className="border rounded-lg p-4 space-y-3 bg-muted/30">
              {/* Sélection matériau */}
              <div className="space-y-1.5">
                <Label>Matériau *</Label>
                <select
                  value={selectedMat}
                  onChange={e => setSelectedMat(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                >
                  {materials.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} — stock : {fmtNum(m.stock_qty)} {m.unit}
                    </option>
                  ))}
                </select>
                {mat && mat.stock_qty <= 0 && (
                  <p className="text-xs text-destructive">⚠ Stock épuisé pour ce matériau.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Type */}
                <div className="space-y-1.5">
                  <Label htmlFor="mat_type">Type *</Label>
                  <select
                    name="type" id="mat_type" defaultValue="use" required
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {Object.entries(MOVE_TYPES).map(([v, c]) => (
                      <option key={v} value={v}>{c.label}</option>
                    ))}
                  </select>
                </div>
                {/* Quantité */}
                <div className="space-y-1.5">
                  <Label htmlFor="quantity">Quantité ({mat?.unit ?? "u"}) *</Label>
                  <Input id="quantity" name="quantity" type="number" min="0.001" step="0.001" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="unit_cost">Prix unitaire (optionnel)</Label>
                  <Input
                    id="unit_cost" name="unit_cost" type="number" min="0" step="1"
                    placeholder={mat ? String(mat.unit_cost) : ""}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notes">Notes</Label>
                  <Input id="notes" name="notes" placeholder="Bon de livraison, remarques..." />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={isPending}>
                  {isPending ? "Enregistrement..." : "Enregistrer"}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                  Annuler
                </Button>
              </div>
            </form>
          )}

          {/* Historique des mouvements du chantier */}
          {movements.length === 0 && !showForm ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Aucun mouvement enregistré sur ce chantier.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {movements.map((m, i) => {
                const cfg = MOVE_TYPES[m.type as keyof typeof MOVE_TYPES];
                if (!cfg) return null;
                const Icon = cfg.icon;
                return (
                  <li key={m.id}>
                    <div className="flex items-center gap-3 py-2.5">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                        <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{m.material_name}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${cfg.bg} ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {m.type === "use" ? "−" : "+"}{fmtNum(m.quantity)} {m.unit}
                          {m.unit_cost ? ` · ${fmtNum(m.unit_cost * m.quantity)} ${currency}` : ""}
                          {" · "}{fmtDate(m.created_at)}
                          {m.notes && ` · ${m.notes}`}
                        </p>
                      </div>
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive"
                        disabled={isPending}
                        onClick={() => handleDelete(m.id, m.material_id)}
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
    </div>
  );
}
