"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Plus, FileText, ImageIcon, Trash2, Upload, X, ChevronDown, ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TEMPLATE_CATEGORIES, getCategoryLabel } from "@/lib/quote-template-categories";
import { uploadTemplate, listTemplates, deleteTemplate } from "./actions";
import type { QuoteTemplate } from "@/lib/supabase/types";

// ---- Upload form (inline) ----
function UploadForm({ onDone }: { onDone: () => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fileName, setFileName] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const result = await uploadTemplate(fd);
    setSubmitting(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Modèle ajouté.");
      formRef.current?.reset();
      setFileName("");
      onDone();
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="tpl-name">Nom du modèle *</Label>
          <Input id="tpl-name" name="name" placeholder="Ex : Villa R+1 Cocody" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tpl-cat">Catégorie *</Label>
          <select
            id="tpl-cat"
            name="category"
            required
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {TEMPLATE_CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="tpl-desc">Description <span className="text-muted-foreground">(optionnel)</span></Label>
          <Input id="tpl-desc" name="description" placeholder="Ex : Villa 4 pièces 120m², finitions standard" />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="tpl-file">Fichier (PDF ou image) *</Label>
          <label
            htmlFor="tpl-file"
            className="flex items-center gap-3 h-20 w-full rounded-md border-2 border-dashed border-input bg-background px-4 cursor-pointer hover:border-primary hover:bg-accent/40 transition-colors"
          >
            <Upload className="h-5 w-5 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground truncate">
              {fileName || "Cliquer pour choisir un fichier PDF, JPG ou PNG"}
            </span>
          </label>
          <input
            id="tpl-file"
            name="file"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            required
            className="sr-only"
            onChange={e => setFileName(e.target.files?.[0]?.name ?? "")}
          />
          <p className="text-xs text-muted-foreground">PDF ou image — max 20 Mo</p>
        </div>
      </div>
      <div className="flex gap-3">
        <Button type="submit" disabled={submitting}>
          <Upload className="h-3.5 w-3.5 mr-1.5" />
          {submitting ? "Envoi en cours..." : "Ajouter le modèle"}
        </Button>
        <Button type="button" variant="outline" onClick={onDone}>Annuler</Button>
      </div>
    </form>
  );
}

// ---- Template card ----
function TemplateCard({ tpl, onDeleted }: { tpl: QuoteTemplate; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Supprimer le modèle "${tpl.name}" ?`)) return;
    setDeleting(true);
    const result = await deleteTemplate(tpl.id);
    setDeleting(false);
    if (result.error) toast.error(result.error);
    else { toast.success("Modèle supprimé."); onDeleted(); }
  }

  return (
    <Card className="flex flex-col">
      <CardContent className="pt-4 pb-3 flex flex-col gap-2 h-full">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
            {tpl.file_type === "pdf"
              ? <FileText className="h-5 w-5 text-red-500" />
              : <ImageIcon className="h-5 w-5 text-blue-500" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight truncate">{tpl.name}</p>
            <Badge variant="secondary" className="mt-1 text-xs">
              {getCategoryLabel(tpl.category)}
            </Badge>
          </div>
        </div>
        {tpl.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{tpl.description}</p>
        )}
        <div className="flex items-center gap-2 mt-auto pt-2 border-t">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive ml-auto"
            onClick={handleDelete} disabled={deleting} title="Supprimer">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Main page ----
export default function QuoteTemplatesPage() {
  const [templates, setTemplates] = useState<QuoteTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [filterCat, setFilterCat] = useState("all");

  async function loadTemplates() {
    setLoading(true);
    const data = await listTemplates();
    setTemplates(data);
    setLoading(false);
  }

  useEffect(() => { loadTemplates(); }, []);

  const usedCategories = [...new Set(templates.map(t => t.category))];
  const filtered = filterCat === "all" ? templates : templates.filter(t => t.category === filterCat);

  // Group by category
  const grouped = filtered.reduce<Record<string, QuoteTemplate[]>>((acc, t) => {
    (acc[t.category] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/quotes"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold">Modèles de devis</h2>
            <p className="text-muted-foreground text-sm">
              Chargez vos modèles PDF ou image par catégorie de construction.
            </p>
          </div>
        </div>
        <Button onClick={() => setShowUpload(v => !v)}>
          {showUpload ? <X className="h-4 w-4 mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />}
          {showUpload ? "Annuler" : "Ajouter un modèle"}
        </Button>
      </div>

      {/* Upload form */}
      {showUpload && (
        <Card>
          <CardContent className="pt-5 pb-4">
            <h3 className="text-sm font-semibold mb-4">Nouveau modèle</h3>
            <UploadForm onDone={() => { setShowUpload(false); loadTemplates(); }} />
          </CardContent>
        </Card>
      )}

      {/* Category filter */}
      {templates.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterCat("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filterCat === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-accent border-input text-muted-foreground"
            }`}
          >
            Tous ({templates.length})
          </button>
          {usedCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filterCat === cat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-accent border-input text-muted-foreground"
              }`}
            >
              {getCategoryLabel(cat)} ({templates.filter(t => t.category === cat).length})
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="py-16 text-center text-muted-foreground text-sm">Chargement...</div>
      ) : templates.length === 0 ? (
        <div className="py-20 text-center space-y-4">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold">Aucun modèle de devis</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
              Ajoutez des modèles PDF ou image pour que l&apos;IA puisse générer des devis précis basés sur vos références.
            </p>
          </div>
          <Button onClick={() => setShowUpload(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Ajouter votre premier modèle
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Aucun modèle dans cette catégorie.
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold">{getCategoryLabel(cat)}</h3>
                <span className="text-xs text-muted-foreground">({items.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {items.map(tpl => (
                  <TemplateCard key={tpl.id} tpl={tpl} onDeleted={loadTemplates} />
                ))}
                {/* Add button per category */}
                <button
                  onClick={() => setShowUpload(true)}
                  className="h-full min-h-[120px] rounded-lg border-2 border-dashed border-input hover:border-primary hover:bg-accent/30 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-colors p-4"
                >
                  <Plus className="h-5 w-5" />
                  <span className="text-xs">Ajouter</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info footer */}
      <div className="rounded-lg bg-muted/50 border p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Comment utiliser les modèles ?</p>
        <p>Sur la page <Link href="/quotes/new" className="underline">Nouveau devis</Link>, sélectionnez un modèle dans la section IA. L&apos;IA lira votre modèle et générera un devis adapté à votre projet.</p>
        <p>Vous pouvez combiner un modèle de devis avec un modèle de débours secs pour un résultat optimal : l&apos;IA utilisera la structure du modèle et les quantités exactes du calculateur.</p>
      </div>
    </div>
  );
}
