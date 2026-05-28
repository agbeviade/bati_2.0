"use client";

import { useTransition, useState, useRef, useEffect } from "react";
import { Trash2, ArrowDown, ArrowUp, PackageX, Printer, Search, X } from "lucide-react";
import { toast } from "sonner";
import {
  addProjectEntry,
  addProjectExit,
  deleteProjectMovement,
} from "@/app/(dashboard)/projects/[id]/stock-actions";
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

// Catalog: reference price only — stock is per-project, not global
type CatalogMaterial = Pick<Material, "id" | "name" | "unit" | "unit_cost">;

// Per-project stock computed from movements
type ProjectStock = Record<string, number>; // materialId → net qty

function computeProjectStock(movements: Movement[]): ProjectStock {
  return movements.reduce<ProjectStock>((acc, m) => {
    const id = m.material_id;
    const prev = acc[id] ?? 0;
    if (m.type === "purchase" || m.type === "return") acc[id] = prev + m.quantity;
    else if (m.type === "use") acc[id] = prev - m.quantity;
    return acc;
  }, {});
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function fmt(n: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}
function fmtNum(n: number) {
  return n.toLocaleString("fr-FR");
}

function printReceipt(data: {
  type: "entry" | "exit";
  projectName: string;
  materialName: string;
  unit: string;
  quantity: number;
  unitCost?: number;
  notes?: string | null;
  date: string;
  currency: string;
}) {
  const isEntry = data.type === "entry";
  const total = isEntry && data.unitCost ? data.quantity * data.unitCost : null;
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>Reçu ${isEntry ? "Entrée" : "Sortie"} stock</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 420px; margin: 40px auto; color: #111; }
  .header { text-align: center; border-bottom: 2px solid #111; padding-bottom: 16px; margin-bottom: 20px; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;
    background: ${isEntry ? "#d1fae5" : "#fee2e2"}; color: ${isEntry ? "#065f46" : "#991b1b"}; }
  .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #eee; }
  .row .label { color: #555; font-size: 13px; }
  .row .value { font-weight: 600; font-size: 13px; }
  .total { display: flex; justify-content: space-between; padding: 12px 0; font-size: 16px; font-weight: bold; border-top: 2px solid #111; margin-top: 8px; }
  .footer { text-align: center; margin-top: 32px; font-size: 11px; color: #888; }
  @media print { body { margin: 20px; } }
</style></head><body>
<div class="header">
  <p style="font-size:11px;color:#888;margin:0 0 8px">BatiFlow</p>
  <h2 style="margin:0 0 8px">REÇU DE STOCK</h2>
  <span class="badge">${isEntry ? "ENTRÉE (ACHAT)" : "SORTIE (UTILISATION)"}</span>
</div>
<div class="row"><span class="label">Chantier</span><span class="value">${data.projectName}</span></div>
<div class="row"><span class="label">Date</span><span class="value">${fmtDate(data.date)}</span></div>
<div class="row"><span class="label">Matériau</span><span class="value">${data.materialName}</span></div>
<div class="row"><span class="label">Quantité</span><span class="value">${fmtNum(data.quantity)} ${data.unit}</span></div>
${isEntry && data.unitCost ? `<div class="row"><span class="label">Prix unitaire</span><span class="value">${fmt(data.unitCost, data.currency)} / ${data.unit}</span></div>` : ""}
${data.notes ? `<div class="row"><span class="label">${isEntry ? "Notes" : "Justification"}</span><span class="value">${data.notes}</span></div>` : ""}
${total !== null ? `<div class="total"><span>TOTAL</span><span>${fmt(total, data.currency)}</span></div>` : ""}
<div class="footer">Document généré le ${new Date().toLocaleDateString("fr-FR")} — BatiFlow</div>
<script>window.onload = function(){ window.print(); }</script>
</body></html>`;
  const win = window.open("", "_blank", "width=500,height=700");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

// Combobox de recherche matériau — affiche le stock du chantier (calculé localement)
function MaterialSearch({
  materials,
  projectStock,
  selected,
  onSelect,
}: {
  materials: CatalogMaterial[];
  projectStock: ProjectStock;
  selected: CatalogMaterial | null;
  onSelect: (m: CatalogMaterial | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? materials.filter((m) => m.name.toLowerCase().includes(query.toLowerCase()))
    : materials.slice(0, 20);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
        <Input
          value={selected ? selected.name : query}
          onChange={(e) => {
            setQuery(e.target.value);
            onSelect(null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Rechercher un matériau..."
          className="pr-8 pl-8 text-sm"
        />
        {(selected || query) && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              onSelect(null);
              setOpen(false);
            }}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {open && filtered.length > 0 && !selected && (
        <div className="bg-card absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border shadow-lg">
          {filtered.map((m) => {
            const qty = projectStock[m.id] ?? 0;
            return (
              <button
                key={m.id}
                type="button"
                className="hover:bg-accent flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(m);
                  setQuery("");
                  setOpen(false);
                }}
              >
                <div className="min-w-0">
                  <p className="truncate">{m.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {fmtNum(m.unit_cost)} / {m.unit}
                  </p>
                </div>
                {qty > 0 && (
                  <span
                    className={`flex-shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${qty < 10 ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}
                  >
                    {fmtNum(qty)} {m.unit}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function MaterialsTab({
  projectId,
  projectName,
  movements: initialMovements,
  materials,
  currency,
}: {
  projectId: string;
  projectName: string;
  movements: Movement[];
  materials: CatalogMaterial[];
  currency: string;
}) {
  const [movements, setMovements] = useState(initialMovements);
  const [mode, setMode] = useState<"entry" | "exit" | null>(null);
  const [selectedMat, setSelectedMat] = useState<CatalogMaterial | null>(null);
  const [isPending, startTransition] = useTransition();

  // Formulaire entrée
  const [entryQty, setEntryQty] = useState("");
  const [entryPrice, setEntryPrice] = useState("");
  const [entryNotes, setEntryNotes] = useState("");

  // Formulaire sortie
  const [exitQty, setExitQty] = useState("");
  const [exitJustif, setExitJustif] = useState("");

  // Stock calculé depuis les mouvements de CE chantier uniquement
  const projectStock = computeProjectStock(movements);

  const totalEntries = movements
    .filter((m) => m.type === "purchase")
    .reduce((s, m) => s + m.quantity * (m.unit_cost ?? 0), 0);

  function openMode(m: "entry" | "exit") {
    setMode((prev) => (prev === m ? null : m));
    setSelectedMat(null);
    setEntryQty("");
    setEntryPrice("");
    setEntryNotes("");
    setExitQty("");
    setExitJustif("");
  }

  function handleEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMat) {
      toast.error("Choisissez un matériau.");
      return;
    }
    const qty = parseFloat(entryQty);
    const price = parseFloat(entryPrice);
    if (!qty || qty <= 0) {
      toast.error("Quantité invalide.");
      return;
    }
    if (!price || price <= 0) {
      toast.error("Prix unitaire requis.");
      return;
    }
    startTransition(async () => {
      const res = await addProjectEntry(projectId, selectedMat.id, qty, price, entryNotes);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Entrée enregistrée — budget mis à jour.");
      setMode(null);
      window.location.reload();
    });
  }

  function handleExit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMat) {
      toast.error("Choisissez un matériau.");
      return;
    }
    const qty = parseFloat(exitQty);
    if (!qty || qty <= 0) {
      toast.error("Quantité invalide.");
      return;
    }
    if (!exitJustif.trim()) {
      toast.error("La justification est obligatoire.");
      return;
    }
    const currentStock = projectStock[selectedMat.id] ?? 0;
    if (qty > currentStock) {
      toast.error(
        `Stock insuffisant dans ce chantier : ${fmtNum(currentStock)} ${selectedMat.unit} disponible.`,
      );
      return;
    }
    startTransition(async () => {
      const res = await addProjectExit(projectId, selectedMat.id, qty, exitJustif);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Sortie enregistrée.");
      setMode(null);
      window.location.reload();
    });
  }

  function handleDelete(m: Movement) {
    startTransition(async () => {
      await deleteProjectMovement(m.id, projectId, m.material_id, m.type, m.quantity, m.unit_cost);
      setMovements((prev) => prev.filter((x) => x.id !== m.id));
      toast.success("Mouvement supprimé.");
    });
  }

  const selectedProjectQty = selectedMat ? (projectStock[selectedMat.id] ?? 0) : null;

  return (
    <div className="space-y-4">
      {/* Résumé coût total */}
      {totalEntries > 0 && (
        <Card>
          <CardContent className="px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground text-sm">Total achats matériaux</span>
              <span className="text-primary font-bold">{fmt(totalEntries, currency)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Boutons actions */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={mode === "entry" ? "default" : "outline"}
          onClick={() => openMode("entry")}
          disabled={materials.length === 0}
        >
          <ArrowDown className="mr-1.5 h-3.5 w-3.5" />
          Entrée
        </Button>
        <Button
          size="sm"
          variant={mode === "exit" ? "destructive" : "outline"}
          onClick={() => openMode("exit")}
          disabled={materials.length === 0}
        >
          <ArrowUp className="mr-1.5 h-3.5 w-3.5" />
          Sortie
        </Button>
      </div>

      {/* Formulaire entrée */}
      {mode === "entry" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ArrowDown className="h-4 w-4 text-green-600" />
              Nouvelle entrée — Achat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEntry} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Matériau *</Label>
                <MaterialSearch
                  materials={materials}
                  projectStock={projectStock}
                  selected={selectedMat}
                  onSelect={setSelectedMat}
                />
                {selectedMat && selectedProjectQty !== null && selectedProjectQty > 0 && (
                  <p className="text-muted-foreground text-xs">
                    Déjà en stock sur ce chantier :{" "}
                    <span className="text-foreground font-semibold">
                      {fmtNum(selectedProjectQty)} {selectedMat.unit}
                    </span>
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Quantité{selectedMat ? ` (${selectedMat.unit})` : ""} *</Label>
                  <Input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={entryQty}
                    onChange={(e) => setEntryQty(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Prix unitaire ({currency}) *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(e.target.value)}
                    placeholder={selectedMat ? String(selectedMat.unit_cost) : "0"}
                  />
                </div>
              </div>
              {entryQty && entryPrice && parseFloat(entryQty) > 0 && parseFloat(entryPrice) > 0 && (
                <p className="text-primary text-sm font-semibold">
                  Total : {fmt(parseFloat(entryQty) * parseFloat(entryPrice), currency)}
                </p>
              )}
              <div className="space-y-1.5">
                <Label>Notes (fournisseur, bon de livraison...)</Label>
                <Input
                  value={entryNotes}
                  onChange={(e) => setEntryNotes(e.target.value)}
                  placeholder="Optionnel"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={isPending}>
                  {isPending ? "Enregistrement..." : "Enregistrer"}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setMode(null)}>
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Formulaire sortie */}
      {mode === "exit" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ArrowUp className="text-destructive h-4 w-4" />
              Nouvelle sortie — Utilisation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleExit} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Matériau *</Label>
                <MaterialSearch
                  materials={materials}
                  projectStock={projectStock}
                  selected={selectedMat}
                  onSelect={setSelectedMat}
                />
                {selectedMat && (
                  <p className="text-muted-foreground text-xs">
                    Stock disponible sur ce chantier :{" "}
                    <span
                      className={`font-semibold ${(selectedProjectQty ?? 0) <= 0 ? "text-destructive" : (selectedProjectQty ?? 0) < 10 ? "text-orange-600" : "text-foreground"}`}
                    >
                      {fmtNum(selectedProjectQty ?? 0)} {selectedMat.unit}
                    </span>
                    {(selectedProjectQty ?? 0) <= 0 && (
                      <span className="text-destructive ml-1">⚠ Aucun stock sur ce chantier</span>
                    )}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Quantité{selectedMat ? ` (${selectedMat.unit})` : ""} *</Label>
                <Input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={exitQty}
                  onChange={(e) => setExitQty(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Justification *</Label>
                <Input
                  value={exitJustif}
                  onChange={(e) => setExitJustif(e.target.value)}
                  placeholder="Ex : fondations nord, dalle RDC..."
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" variant="destructive" disabled={isPending}>
                  {isPending ? "Enregistrement..." : "Enregistrer"}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setMode(null)}>
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {materials.length === 0 && (
        <div className="text-muted-foreground flex flex-col items-center gap-2 py-10">
          <PackageX className="h-8 w-8 opacity-40" />
          <p className="text-sm">Aucun matériau dans le catalogue.</p>
        </div>
      )}

      {/* Historique */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Historique des mouvements</CardTitle>
        </CardHeader>
        <CardContent>
          {movements.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              Aucun mouvement enregistré.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {movements.map((m, i) => {
                const isEntry = m.type === "purchase";
                return (
                  <li key={m.id}>
                    <div className="flex items-center gap-3 py-2.5">
                      <div
                        className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${isEntry ? "bg-green-100" : "bg-red-100"}`}
                      >
                        {isEntry ? (
                          <ArrowDown className="h-3.5 w-3.5 text-green-700" />
                        ) : (
                          <ArrowUp className="h-3.5 w-3.5 text-red-700" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-medium">{m.material_name}</span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-xs font-medium ${isEntry ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                          >
                            {isEntry ? "Entrée" : "Sortie"}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-xs">
                          {fmtNum(m.quantity)} {m.unit}
                          {isEntry && m.unit_cost
                            ? ` · ${fmt(m.unit_cost * m.quantity, currency)}`
                            : ""}
                          {" · "}
                          {fmtDate(m.created_at)}
                          {m.notes ? ` · ${m.notes}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-foreground h-7 w-7"
                          title="Imprimer le reçu"
                          onClick={() =>
                            printReceipt({
                              type: isEntry ? "entry" : "exit",
                              projectName,
                              materialName: m.material_name,
                              unit: m.unit,
                              quantity: m.quantity,
                              unitCost: m.unit_cost ?? undefined,
                              notes: m.notes,
                              date: m.created_at,
                              currency,
                            })
                          }
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive h-7 w-7"
                          disabled={isPending}
                          onClick={() => handleDelete(m)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
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
