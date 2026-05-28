"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Plus, FileText, ImageIcon, Trash2, Upload, X, ChevronDown, ArrowLeft } from "lucide-react";
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
            className="border-input bg-background focus-visible:ring-ring h-9 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
          >
            {TEMPLATE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="tpl-desc">
            Description <span className="text-muted-foreground">(optionnel)</span>
          </Label>
          <Input
            id="tpl-desc"
            name="description"
            placeholder="Ex : Villa 4 pièces 120m², finitions standard"
          />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="tpl-file">Fichier (PDF ou image) *</Label>
          <label
            htmlFor="tpl-file"
            className="border-input bg-background hover:border-primary hover:bg-accent/40 flex h-20 w-full cursor-pointer items-center gap-3 rounded-md border-2 border-dashed px-4 transition-colors"
          >
            <Upload className="text-muted-foreground h-5 w-5 shrink-0" />
            <span className="text-muted-foreground truncate text-sm">
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
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
          />
          <p className="text-muted-foreground text-xs">PDF ou image — max 20 Mo</p>
        </div>
      </div>
      <div className="flex gap-3">
        <Button type="submit" disabled={submitting}>
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          {submitting ? "Envoi en cours..." : "Ajouter le modèle"}
        </Button>
        <Button type="button" variant="outline" onClick={onDone}>
          Annuler
        </Button>
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
    else {
      toast.success("Modèle supprimé.");
      onDeleted();
    }
  }

  return (
    <Card className="flex flex-col">
      <CardContent className="flex h-full flex-col gap-2 pt-4 pb-3">
        <div className="flex items-start gap-3">
          <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-md">
            {tpl.file_type === "pdf" ? (
              <FileText className="h-5 w-5 text-red-500" />
            ) : (
              <ImageIcon className="h-5 w-5 text-blue-500" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm leading-tight font-semibold">{tpl.name}</p>
            <Badge variant="secondary" className="mt-1 text-xs">
              {getCategoryLabel(tpl.category)}
            </Badge>
          </div>
        </div>
        {tpl.description && (
          <p className="text-muted-foreground line-clamp-2 text-xs">{tpl.description}</p>
        )}
        <div className="mt-auto flex items-center gap-2 border-t pt-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive ml-auto h-7 w-7"
            onClick={handleDelete}
            disabled={deleting}
            title="Supprimer"
          >
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

  useEffect(() => {
    loadTemplates();
  }, []);

  const usedCategories = [...new Set(templates.map((t) => t.category))];
  const filtered =
    filterCat === "all" ? templates : templates.filter((t) => t.category === filterCat);

  // Group by category
  const grouped = filtered.reduce<Record<string, QuoteTemplate[]>>((acc, t) => {
    (acc[t.category] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/quotes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold">Modèles de devis</h2>
            <p className="text-muted-foreground text-sm">
              Chargez vos modèles PDF ou image par catégorie de construction.
            </p>
          </div>
        </div>
        <Button onClick={() => setShowUpload((v) => !v)}>
          {showUpload ? <X className="mr-1.5 h-4 w-4" /> : <Plus className="mr-1.5 h-4 w-4" />}
          {showUpload ? "Annuler" : "Ajouter un modèle"}
        </Button>
      </div>

      {/* Upload form */}
      {showUpload && (
        <Card>
          <CardContent className="pt-5 pb-4">
            <h3 className="mb-4 text-sm font-semibold">Nouveau modèle</h3>
            <UploadForm
              onDone={() => {
                setShowUpload(false);
                loadTemplates();
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Category filter */}
      {templates.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterCat("all")}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              filterCat === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background hover:bg-accent border-input text-muted-foreground"
            }`}
          >
            Tous ({templates.length})
          </button>
          {usedCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                filterCat === cat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-accent border-input text-muted-foreground"
              }`}
            >
              {getCategoryLabel(cat)} ({templates.filter((t) => t.category === cat).length})
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="text-muted-foreground py-16 text-center text-sm">Chargement...</div>
      ) : templates.length === 0 ? (
        <div className="space-y-4 py-20 text-center">
          <div className="bg-muted mx-auto flex h-16 w-16 items-center justify-center rounded-full">
            <FileText className="text-muted-foreground h-8 w-8" />
          </div>
          <div>
            <p className="font-semibold">Aucun modèle de devis</p>
            <p className="text-muted-foreground mx-auto mt-1 max-w-xs text-sm">
              Ajoutez des modèles PDF ou image pour que l&apos;IA puisse générer des devis précis
              basés sur vos références.
            </p>
          </div>
          <Button onClick={() => setShowUpload(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Ajouter votre premier modèle
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center text-sm">
          Aucun modèle dans cette catégorie.
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <div className="mb-3 flex items-center gap-2">
                <h3 className="text-sm font-semibold">{getCategoryLabel(cat)}</h3>
                <span className="text-muted-foreground text-xs">({items.length})</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {items.map((tpl) => (
                  <TemplateCard key={tpl.id} tpl={tpl} onDeleted={loadTemplates} />
                ))}
                {/* Add button per category */}
                <button
                  onClick={() => setShowUpload(true)}
                  className="border-input hover:border-primary hover:bg-accent/30 text-muted-foreground hover:text-primary flex h-full min-h-[120px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 transition-colors"
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
      <div className="bg-muted/50 text-muted-foreground space-y-1 rounded-lg border p-4 text-xs">
        <p className="text-foreground font-medium">Comment utiliser les modèles ?</p>
        <p>
          Sur la page{" "}
          <Link href="/quotes/new" className="underline">
            Nouveau devis
          </Link>
          , sélectionnez un modèle dans la section IA. L&apos;IA lira votre modèle et générera un
          devis adapté à votre projet.
        </p>
        <p>
          Vous pouvez combiner un modèle de devis avec un modèle de débours secs pour un résultat
          optimal : l&apos;IA utilisera la structure du modèle et les quantités exactes du
          calculateur.
        </p>
      </div>
    </div>
  );
}
