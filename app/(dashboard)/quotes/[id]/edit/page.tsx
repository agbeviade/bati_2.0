"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { DeleteButton } from "@/components/ui/delete-button";
import { toast } from "sonner";
import { updateQuoteMeta, addQuoteItem, deleteQuoteItem, type QuoteItemInput } from "../../actions";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Quote, QuoteItem } from "@/lib/supabase/types";

type ItemCategory = "material" | "labor" | "transport" | "equipment" | "other";

const CATEGORIES: { value: ItemCategory; label: string }[] = [
  { value: "material", label: "Matériaux" },
  { value: "labor", label: "Main d'œuvre" },
  { value: "transport", label: "Transport" },
  { value: "equipment", label: "Équipement" },
  { value: "other", label: "Autre" },
];

const CATEGORY_LABEL: Record<string, string> = {
  material: "Matériaux", labor: "Main d'œuvre", transport: "Transport",
  equipment: "Équipement", other: "Autre",
};

type NewLine = { id: string; category: ItemCategory; label: string; quantity: string; unit: string; unit_price: string };

function newLine(): NewLine {
  return { id: crypto.randomUUID(), category: "material", label: "", quantity: "1", unit: "u", unit_price: "0" };
}

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);
}

export default function EditQuotePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [existingItems, setExistingItems] = useState<QuoteItem[]>([]);
  const [newItems, setNewItems] = useState<NewLine[]>([]);

  const [taxRate, setTaxRate] = useState("18");
  const [marginPct, setMarginPct] = useState("0");

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("quotes").select("*").eq("id", params.id).single(),
      supabase.from("quote_items").select("*").eq("quote_id", params.id).order("sort_order"),
    ]).then(([{ data: q }, { data: items }]) => {
      if (q) {
        setQuote(q as Quote);
        setTaxRate(String((q as Quote).tax_rate ?? 18));
        setMarginPct(String((q as Quote).margin_pct ?? 0));
      }
      setExistingItems((items ?? []) as QuoteItem[]);
    });
  }, [params.id]);

  function updateNew(id: string, field: keyof NewLine, value: string) {
    setNewItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  }

  async function handleSaveMeta(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    startTransition(async () => {
      const result = await updateQuoteMeta(params.id, {
        client_name: (form.elements.namedItem("client_name") as HTMLInputElement).value,
        project_type: (form.elements.namedItem("project_type") as HTMLInputElement).value,
        surface_m2: (form.elements.namedItem("surface_m2") as HTMLInputElement).value,
        valid_until: (form.elements.namedItem("valid_until") as HTMLInputElement).value,
        tax_rate: taxRate,
        margin_pct: marginPct,
        notes: (form.elements.namedItem("notes") as HTMLTextAreaElement).value,
      });
      if (result?.error) { toast.error(result.error); return; }
      toast.success("Devis mis à jour.");
    });
  }

  async function handleAddLines() {
    const valid = newItems.filter(i => i.label.trim());
    if (valid.length === 0) { toast.error("Aucune ligne valide."); return; }
    startTransition(async () => {
      for (const [idx, item] of valid.entries()) {
        const result = await addQuoteItem(params.id, {
          category: item.category,
          label: item.label.trim(),
          quantity: Number(item.quantity) || 1,
          unit: item.unit || "u",
          unit_price: Number(item.unit_price) || 0,
          sort_order: existingItems.length + idx,
        });
        if (result?.error) { toast.error(result.error); return; }
      }
      setNewItems([]);
      // Refresh existing items
      const supabase = createClient();
      const { data } = await supabase.from("quote_items").select("*").eq("quote_id", params.id).order("sort_order");
      setExistingItems((data ?? []) as QuoteItem[]);
      toast.success("Lignes ajoutées.");
    });
  }

  if (!quote) {
    return <div className="flex items-center justify-center py-24"><p className="text-muted-foreground">Chargement...</p></div>;
  }

  const allItemsTotal = existingItems.reduce((s, i) => s + i.total, 0)
    + newItems.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0);
  const tax = allItemsTotal * (Number(taxRate) || 0) / 100;
  const margin = allItemsTotal * (Number(marginPct) || 0) / 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/quotes/${params.id}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Modifier {quote.quote_number}</h2>
          <p className="text-muted-foreground text-sm">{quote.client_name ?? "—"}</p>
        </div>
      </div>

      {/* Métadonnées */}
      <Card>
        <CardHeader><CardTitle>Informations générales</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSaveMeta} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="client_name">Client *</Label>
              <Input id="client_name" name="client_name" defaultValue={quote.client_name ?? ""} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="project_type">Type de projet</Label>
              <Input id="project_type" name="project_type" defaultValue={quote.project_type ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="surface_m2">Surface (m²)</Label>
              <Input id="surface_m2" name="surface_m2" type="number" min="0" step="0.5" defaultValue={quote.surface_m2 ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="valid_until">Valide jusqu'au</Label>
              <Input id="valid_until" name="valid_until" type="date" defaultValue={quote.valid_until ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label>TVA (%)</Label>
              <Input type="number" min="0" max="100" step="0.5" value={taxRate} onChange={e => setTaxRate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Marge (%)</Label>
              <Input type="number" min="0" max="100" step="0.5" value={marginPct} onChange={e => setMarginPct(e.target.value)} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes" name="notes" rows={2}
                defaultValue={quote.notes ?? ""}
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" size="sm" disabled={isPending}>Enregistrer les infos</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Lignes existantes */}
      <Card>
        <CardHeader><CardTitle>Lignes existantes</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {existingItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Aucune ligne.</p>
          ) : (
            existingItems.map((item, i) => (
              <div key={item.id}>
                <div className="flex items-center gap-3 py-2 text-sm">
                  <span className="text-xs text-muted-foreground w-20 flex-shrink-0">{CATEGORY_LABEL[item.category]}</span>
                  <span className="flex-1 truncate">{item.label}</span>
                  <span className="text-muted-foreground w-12 text-right flex-shrink-0">{item.quantity}×</span>
                  <span className="text-muted-foreground w-8 flex-shrink-0">{item.unit}</span>
                  <span className="font-medium w-24 text-right flex-shrink-0">{fmt(item.total)}</span>
                  <div className="flex-shrink-0">
                    <DeleteButton
                      variant="icon"
                      disabled={isPending}
                      onConfirm={async () => {
                        await deleteQuoteItem(item.id, params.id);
                        setExistingItems(prev => prev.filter(i => i.id !== item.id));
                        toast.success("Ligne supprimée.");
                      }}
                      title="Supprimer cette ligne"
                      description="La ligne sera retirée définitivement du devis."
                    />
                  </div>
                </div>
                {i < existingItems.length - 1 && <Separator />}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Nouvelles lignes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Ajouter des lignes</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={() => setNewItems(prev => [...prev, newLine()])}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />Ajouter une ligne
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {newItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">Cliquez sur "Ajouter une ligne" pour compléter le devis.</p>
          ) : (
            <>
              {newItems.map(item => (
                <div key={item.id} className="grid grid-cols-1 md:grid-cols-[1fr_2fr_80px_80px_110px_110px_36px] gap-2 items-center">
                  <select value={item.category} onChange={e => updateNew(item.id, "category", e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                  <Input placeholder="Description" value={item.label} onChange={e => updateNew(item.id, "label", e.target.value)} className="h-9" />
                  <Input type="number" min="0" value={item.quantity} onChange={e => updateNew(item.id, "quantity", e.target.value)} className="h-9 text-right" />
                  <Input placeholder="u" value={item.unit} onChange={e => updateNew(item.id, "unit", e.target.value)} className="h-9" />
                  <Input type="number" min="0" step="100" value={item.unit_price} onChange={e => updateNew(item.id, "unit_price", e.target.value)} className="h-9 text-right" />
                  <div className="h-9 flex items-center justify-end px-2 text-sm font-medium tabular-nums">
                    {fmt((Number(item.quantity) || 0) * (Number(item.unit_price) || 0))}
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive"
                    onClick={() => setNewItems(prev => prev.filter(i => i.id !== item.id))}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between items-center text-sm pt-1">
                <span className="text-muted-foreground">Total estimé</span>
                <span className="font-bold">{fmt(allItemsTotal + tax + margin)}</span>
              </div>
              <Button size="sm" onClick={handleAddLines} disabled={isPending}>
                Enregistrer les nouvelles lignes
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button variant="outline" asChild>
          <Link href={`/quotes/${params.id}`}>← Retour au devis</Link>
        </Button>
      </div>
    </div>
  );
}
