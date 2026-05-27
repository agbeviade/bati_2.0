"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Sparkles, ChevronDown, ChevronUp, BookTemplate, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { createQuote, type QuoteItemInput } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { generateQuoteFromDebourseModel, generateQuoteFromTemplate } from "@/app/(dashboard)/metres/actions";

type ItemCategory = "material" | "labor" | "transport" | "equipment" | "other";

const CATEGORIES: { value: ItemCategory; label: string }[] = [
  { value: "material",  label: "Matériaux" },
  { value: "labor",     label: "Main d'oeuvre" },
  { value: "transport", label: "Transport" },
  { value: "equipment", label: "Équipement" },
  { value: "other",     label: "Autre" },
];

type LineItem = {
  id: string;
  category: ItemCategory;
  label: string;
  quantity: string;
  unit: string;
  unit_price: string;
};

function newLine(): LineItem {
  return { id: crypto.randomUUID(), category: "material", label: "", quantity: "1", unit: "u", unit_price: "0" };
}

function lineTotal(item: LineItem) {
  return (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
}

function formatAmount(n: number) {
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

export default function NewQuotePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<LineItem[]>([newLine()]);
  const [taxRate, setTaxRate] = useState("18");
  const [marginPct, setMarginPct] = useState("0");

  // AI panel
  const [aiOpen, setAiOpen] = useState(false);
  const [aiDesc, setAiDesc] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // Modeles debours secs
  const [debourseModels, setDebourseModels] = useState<{ id: string; name: string }[]>([]);
  const [selectedDebourseId, setSelectedDebourseId] = useState("");

  // Modeles de devis
  const [quoteTemplates, setQuoteTemplates] = useState<{ id: string; name: string; category: string }[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("debourses_models").select("id, name").order("created_at", { ascending: false }),
      supabase.from("quote_templates").select("id, name, category").order("category").order("name"),
    ]).then(([{ data: dm }, { data: qt }]) => {
      setDebourseModels(dm ?? []);
      setQuoteTemplates(qt ?? []);
    });
  }, []);

  const subtotal = items.reduce((s, i) => s + lineTotal(i), 0);
  const tax = subtotal * (Number(taxRate) || 0) / 100;
  const margin = subtotal * (Number(marginPct) || 0) / 100;
  const total = subtotal + tax + margin;

  function updateItem(id: string, field: keyof LineItem, value: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  }

  function removeItem(id: string) {
    if (items.length === 1) return;
    setItems(prev => prev.filter(i => i.id !== id));
  }

  function applyGeneratedItems(generated: { category: ItemCategory; label: string; quantity: number; unit: string; unit_price: number }[]) {
    const lines: LineItem[] = generated.map(it => ({
      id: crypto.randomUUID(),
      category: it.category,
      label: it.label,
      quantity: String(it.quantity),
      unit: it.unit,
      unit_price: String(it.unit_price),
    }));
    setItems(lines);
    setAiOpen(false);
    toast.success(`${lines.length} lignes générées par l'IA.`);
  }

  async function handleGenerateAI() {
    const hasTemplate = !!selectedTemplateId;
    const hasDebourse = !!selectedDebourseId;
    const hasDesc = aiDesc.trim().length >= 10;

    if (!hasTemplate && !hasDebourse && !hasDesc) {
      toast.error("Sélectionnez un modèle ou décrivez le chantier (min 10 caractères).");
      return;
    }

    setAiLoading(true);
    try {
      if (hasTemplate) {
        // Template de devis + optionnellement debours
        const result = await generateQuoteFromTemplate(
          selectedTemplateId,
          aiDesc,
          hasDebourse ? selectedDebourseId : undefined
        );
        if (result.error) { toast.error(result.error); return; }
        applyGeneratedItems(result.items);
      } else if (hasDebourse) {
        // Débours uniquement
        const result = await generateQuoteFromDebourseModel(selectedDebourseId, aiDesc);
        if (result.error) { toast.error(result.error); return; }
        applyGeneratedItems(result.items);
      } else {
        // Description libre uniquement
        const supabase = createClient();
        const { data, error } = await supabase.functions.invoke("generate-quote", {
          body: { description: aiDesc },
        });
        if (error || data?.error) { toast.error(data?.error ?? error?.message ?? "Erreur IA."); return; }
        applyGeneratedItems(data.items ?? []);
      }
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;

    const validItems = items.filter(i => i.label.trim());
    if (validItems.length === 0) {
      toast.error("Ajoutez au moins une ligne au devis.");
      return;
    }

    setLoading(true);
    const result = await createQuote({
      client_name: (form.elements.namedItem("client_name") as HTMLInputElement).value,
      project_type: (form.elements.namedItem("project_type") as HTMLInputElement).value,
      surface_m2: (form.elements.namedItem("surface_m2") as HTMLInputElement).value,
      valid_until: (form.elements.namedItem("valid_until") as HTMLInputElement).value,
      tax_rate: taxRate,
      margin_pct: marginPct,
      notes: (form.elements.namedItem("notes") as HTMLTextAreaElement).value,
      project_id: (form.elements.namedItem("project_id") as HTMLSelectElement)?.value ?? "",
      items: validItems.map((item, idx): QuoteItemInput => ({
        category: item.category,
        label: item.label.trim(),
        quantity: Number(item.quantity) || 1,
        unit: item.unit || "u",
        unit_price: Number(item.unit_price) || 0,
        sort_order: idx,
      })),
    });

    setLoading(false);
    if (result?.error) toast.error(result.error);
  }

  const generateButtonLabel = () => {
    if (aiLoading) return "Génération en cours...";
    if (selectedTemplateId && selectedDebourseId) return "Générer (template + débours)";
    if (selectedTemplateId) return "Générer depuis le modèle";
    if (selectedDebourseId) return "Générer depuis les débours";
    return "Générer avec l'IA";
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/quotes"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Nouveau devis</h2>
          <p className="text-muted-foreground text-sm">Créez un devis professionnel pour votre client.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" id="quote-form">

        {/* Génération IA */}
        <Card className="border-dashed border-purple-300 bg-purple-50/40">
          <CardHeader className="py-3 px-4">
            <button type="button" className="flex items-center gap-2 w-full text-left"
              onClick={() => setAiOpen(v => !v)}>
              <Sparkles className="h-4 w-4 text-purple-500" />
              <span className="font-semibold text-sm text-purple-800">Générer avec l&apos;IA</span>
              <span className="ml-auto">
                {aiOpen ? <ChevronUp className="h-4 w-4 text-purple-400" /> : <ChevronDown className="h-4 w-4 text-purple-400" />}
              </span>
            </button>
          </CardHeader>
          {aiOpen && (
            <CardContent className="pt-0 pb-4 px-4 space-y-4">

              {/* Modele de devis */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-purple-800 flex items-center gap-1.5">
                    <BookTemplate className="h-3.5 w-3.5" />
                    Modèle de devis
                    <span className="font-normal text-muted-foreground">(recommandé)</span>
                  </p>
                  <Link href="/quotes/templates" className="text-xs text-purple-600 hover:underline flex items-center gap-1">
                    Gérer les modèles <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                {quoteTemplates.length === 0 ? (
                  <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                    Aucun modèle disponible.{" "}
                    <Link href="/quotes/templates" className="underline text-purple-600">
                      Ajouter un modèle PDF ou image
                    </Link>
                  </p>
                ) : (
                  <select value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option value="">-- Sans modèle de devis --</option>
                    {quoteTemplates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                )}
                {selectedTemplateId && (
                  <p className="text-xs text-muted-foreground">
                    L&apos;IA lira le fichier du modèle et adaptera sa structure à votre projet.
                  </p>
                )}
              </div>

              <Separator />

              {/* Modele debours */}
              {debourseModels.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-purple-800">
                    Modèle de débours secs
                    <span className="font-normal text-muted-foreground ml-1">(optionnel)</span>
                  </p>
                  <select value={selectedDebourseId} onChange={e => setSelectedDebourseId(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <option value="">-- Sans modèle de débours --</option>
                    {debourseModels.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  {selectedDebourseId && (
                    <p className="text-xs text-muted-foreground">
                      Les quantités calculées seront utilisées telles quelles dans le devis.
                    </p>
                  )}
                </div>
              )}

              {/* Description */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-purple-800">
                  Description du projet
                  {!selectedTemplateId && !selectedDebourseId
                    ? <span className="text-red-500 ml-0.5">*</span>
                    : <span className="font-normal text-muted-foreground ml-1">(optionnel)</span>}
                </p>
                <textarea value={aiDesc} onChange={e => setAiDesc(e.target.value)} rows={3}
                  placeholder="Ex : Construction d'une villa R+1 de 180m², fondations, gros oeuvre, toiture en zinc..."
                  className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                />
              </div>

              <Button type="button" size="sm" disabled={aiLoading}
                className="bg-purple-600 hover:bg-purple-700 text-white"
                onClick={handleGenerateAI}>
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                {generateButtonLabel()}
              </Button>
            </CardContent>
          )}
        </Card>

        {/* Infos générales */}
        <Card>
          <CardHeader><CardTitle>Informations générales</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client_name">Client *</Label>
              <Input id="client_name" name="client_name" placeholder="Nom du client" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project_type">Type de projet</Label>
              <Input id="project_type" name="project_type" placeholder="Villa, immeuble, rénovation..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="surface_m2">Surface (m²)</Label>
              <Input id="surface_m2" name="surface_m2" type="number" min="0" step="0.5" placeholder="150" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valid_until">Valide jusqu&apos;au</Label>
              <Input id="valid_until" name="valid_until" type="date" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes / conditions</Label>
              <textarea id="notes" name="notes" rows={2}
                placeholder="Conditions de paiement, délai d'exécution..."
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Lignes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Lignes du devis</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => setItems(prev => [...prev, newLine()])}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />Ajouter une ligne
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="hidden md:grid grid-cols-[1fr_2fr_80px_80px_110px_110px_36px] gap-2 text-xs text-muted-foreground px-1">
              <span>Catégorie</span><span>Description</span><span>Qté</span>
              <span>Unité</span><span className="text-right">P.U.</span>
              <span className="text-right">Montant</span><span />
            </div>
            <Separator className="hidden md:block" />

            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-1 md:grid-cols-[1fr_2fr_80px_80px_110px_110px_36px] gap-2 items-center">
                <select value={item.category} onChange={e => updateItem(item.id, "category", e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <Input placeholder="Description du poste" value={item.label}
                  onChange={e => updateItem(item.id, "label", e.target.value)} className="h-9" />
                <Input type="number" min="0" step="0.01" value={item.quantity}
                  onChange={e => updateItem(item.id, "quantity", e.target.value)} className="h-9 text-right" />
                <Input placeholder="m², h..." value={item.unit}
                  onChange={e => updateItem(item.id, "unit", e.target.value)} className="h-9" />
                <Input type="number" min="0" step="100" value={item.unit_price}
                  onChange={e => updateItem(item.id, "unit_price", e.target.value)} className="h-9 text-right" />
                <div className="h-9 flex items-center justify-end px-2 text-sm font-medium text-right tabular-nums">
                  {formatAmount(lineTotal(item))}
                </div>
                <Button type="button" variant="ghost" size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-destructive"
                  onClick={() => removeItem(item.id)} disabled={items.length === 1}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}

            <Separator />

            <div className="flex flex-col items-end gap-2 pt-2">
              <div className="w-full max-w-xs space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Sous-total</span>
                  <span className="font-medium">{formatAmount(subtotal)} FCFA</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">TVA (%)</span>
                  <Input type="number" min="0" max="100" step="0.5" value={taxRate}
                    onChange={e => setTaxRate(e.target.value)} className="h-8 w-20 text-right" />
                  <span className="text-sm font-medium ml-auto">{formatAmount(tax)} FCFA</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">Marge (%)</span>
                  <Input type="number" min="0" max="100" step="0.5" value={marginPct}
                    onChange={e => setMarginPct(e.target.value)} className="h-8 w-20 text-right" />
                  <span className="text-sm font-medium ml-auto">{formatAmount(margin)} FCFA</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-base font-bold">
                  <span>Total TTC</span>
                  <span>{formatAmount(total)} FCFA</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? "Création..." : "Créer le devis"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Annuler
          </Button>
        </div>
      </form>
    </div>
  );
}
