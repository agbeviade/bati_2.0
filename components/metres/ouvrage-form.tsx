"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  calculerOuvrage,
  estTypeVolume,
  getUnitePrincipale,
  LABELS_GEOMETRIE,
  ICONES_GEOMETRIE,
  CHAMPS_PAR_TYPE,
  type TypeGeometrie,
  type DimensionsOuvrage,
  type VideDeduit,
  type ComposantRecette,
} from "@/lib/calcul-ouvrage";
import { createOuvrage, updateOuvrage, saveOuvrageType } from "@/app/(dashboard)/metres/actions";
import {
  suggestRecette,
  extractMetresFromImage,
  analyserCoherence,
} from "@/app/(dashboard)/metres/ai-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Plus,
  Trash2,
  Save,
  BookOpen,
  Sparkles,
  Camera,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import type { ProjectOuvrage, OuvrageType } from "@/lib/supabase/types";

// ---------------------------------------------------------------------------
// Types locaux (incluent une clé React pour la liste)
// ---------------------------------------------------------------------------

interface LocalVide extends Omit<VideDeduit, "id" | "surface"> {
  _key: string;
}

interface LocalComposant extends ComposantRecette {
  _key: string;
}

interface Props {
  projects: { id: string; name: string }[];
  materials: { id: string; name: string; unit: string; unit_cost: number }[];
  ouvrageTypes: OuvrageType[];
  initialProjectId?: string;
  initialData?: ProjectOuvrage;
}

// ---------------------------------------------------------------------------
// Composant
// ---------------------------------------------------------------------------

export function OuvrageForm({
  projects,
  materials,
  ouvrageTypes,
  initialProjectId,
  initialData,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [savedType, setSavedType] = useState(false);

  // --- États AI ---
  const [aiLoading, setAiLoading] = useState<"recette" | "photo" | "coherence" | null>(null);
  const [coherence, setCoherence] = useState<{
    alerte: string | null;
    niveau: "ok" | "warning" | "error";
  } | null>(null);

  // --- État du formulaire ---
  const [designation, setDesignation] = useState(initialData?.designation ?? "");
  const [projectId, setProjectId] = useState(initialProjectId ?? initialData?.project_id ?? "");
  const [type, setType] = useState<TypeGeometrie>(
    (initialData?.type_geometrie as TypeGeometrie) ?? "surface_l_h",
  );
  const [dimensions, setDimensions] = useState<DimensionsOuvrage>(
    (initialData?.dimensions as DimensionsOuvrage) ?? {},
  );
  const [vides, setVides] = useState<LocalVide[]>(
    initialData?.vides_deduits?.map((v) => ({
      _key: v.id,
      nom: v.nom,
      largeur: v.largeur,
      hauteur: v.hauteur,
    })) ?? [],
  );
  const [recette, setRecette] = useState<LocalComposant[]>(
    initialData?.recette?.map((c, i) => ({ ...c, _key: `${c.materiau_id}-${i}` })) ?? [],
  );

  // --- Calcul en temps réel (synchrone, pas de useEffect) ---
  const computed = calculerOuvrage({
    id: initialData?.id ?? "",
    designation,
    type_geometrie: type,
    dimensions,
    vides_deduits: vides.map((v) => ({
      id: v._key,
      nom: v.nom,
      largeur: Number(v.largeur) || 0,
      hauteur: Number(v.hauteur) || 0,
      surface: (Number(v.largeur) || 0) * (Number(v.hauteur) || 0),
    })),
    unite_principale: getUnitePrincipale(type),
    recette,
  });

  // --- Handlers dimensions ---
  function setDim(key: keyof DimensionsOuvrage, value: string) {
    setDimensions((prev) => ({ ...prev, [key]: value === "" ? undefined : Number(value) }));
  }

  // --- Handlers vides ---
  function addVide() {
    setVides((prev) => [...prev, { _key: crypto.randomUUID(), nom: "", largeur: 0, hauteur: 0 }]);
  }
  function updateVide(key: string, field: keyof LocalVide, value: string) {
    setVides((prev) =>
      prev.map((v) =>
        v._key === key ? { ...v, [field]: field === "nom" ? value : Number(value) || 0 } : v,
      ),
    );
  }
  function removeVide(key: string) {
    setVides((prev) => prev.filter((v) => v._key !== key));
  }

  // --- Handlers recette ---
  function addComposant() {
    const mat = materials[0];
    if (!mat) return;
    setRecette((prev) => [
      ...prev,
      {
        _key: crypto.randomUUID(),
        materiau_id: mat.id,
        materiau_nom: mat.name,
        unite: mat.unit,
        coefficient: 0,
        taux_perte: 0,
        type: "materiau",
      },
    ]);
  }
  function updateComposant(key: string, field: string, value: string) {
    setRecette((prev) =>
      prev.map((c) => {
        if (c._key !== key) return c;
        if (field === "materiau_id") {
          const mat = materials.find((m) => m.id === value);
          if (!mat) return c;
          return { ...c, materiau_id: mat.id, materiau_nom: mat.name, unite: mat.unit };
        }
        if (field === "type") return { ...c, type: value as "materiau" | "main_oeuvre" };
        return { ...c, [field]: Number(value) || 0 };
      }),
    );
  }
  function removeComposant(key: string) {
    setRecette((prev) => prev.filter((c) => c._key !== key));
  }

  // --- AI Feature 1 : Suggestion de recette ---
  async function handleSuggestRecette() {
    if (!designation.trim()) return;
    setAiLoading("recette");
    const result = await suggestRecette(designation, type, materials);
    setAiLoading(null);
    if (result.recette.length > 0) {
      setRecette(result.recette.map((c, i) => ({ ...c, _key: `ai-${i}-${Date.now()}` })));
      setCoherence(null);
    } else {
      setServerError(
        "L'IA n'a pas trouvé de recette pour ces matériaux. Ajoutez d'abord vos matériaux en stock.",
      );
    }
  }

  // --- AI Feature 2 : Extraction depuis photo ---
  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 3 * 1024 * 1024; // 3 MB
    if (file.size > MAX_SIZE) {
      setServerError(
        `Image trop lourde (${(file.size / 1024 / 1024).toFixed(1)} Mo). Maximum : 3 Mo.`,
      );
      e.target.value = "";
      return;
    }

    setAiLoading("photo");

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      const mime = file.type as "image/jpeg" | "image/png" | "image/webp";
      const result = await extractMetresFromImage(base64, mime);
      setAiLoading(null);

      if (result.ouvrages.length > 0) {
        const first = result.ouvrages[0];
        setDesignation(first.designation);
        setType(first.type_geometrie);
        setDimensions(first.dimensions as DimensionsOuvrage);
        setVides([]);
        setCoherence(null);
      } else {
        setServerError("Impossible d'extraire des métrés depuis cette image.");
      }
      e.target.value = "";
    };
    reader.readAsDataURL(file);
  }

  // --- AI Feature 3 : Analyse de cohérence ---
  async function handleAnalyserCoherence() {
    if (computed.quantite_nette <= 0 || computed.recette_calculee.length === 0) return;
    setAiLoading("coherence");
    const result = await analyserCoherence(
      designation,
      type,
      computed.quantite_nette,
      computed.unite_principale,
      computed.recette_calculee,
    );
    setAiLoading(null);
    setCoherence(result);
  }

  // --- Appliquer un type/recette sauvegardé ---
  function applyOuvrageType(typeId: string) {
    const ot = ouvrageTypes.find((t) => t.id === typeId);
    if (!ot) return;
    setType(ot.type_geometrie as TypeGeometrie);
    setDesignation(ot.designation);
    setRecette(ot.recette.map((c, i) => ({ ...c, _key: `${c.materiau_id}-${i}` })));
  }

  // --- Sauvegarde recette comme modèle ---
  function handleSaveType() {
    startTransition(async () => {
      const res = await saveOuvrageType({
        designation,
        type_geometrie: type,
        unite_principale: computed.unite_principale,
        recette,
      });
      if (res?.error) setServerError(res.error);
      else setSavedType(true);
    });
  }

  // --- Soumission ---
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);

    const payload = {
      project_id: projectId,
      designation,
      type_geometrie: type,
      dimensions,
      vides_deduits: computed.vides_deduits,
      quantite_brute: computed.quantite_brute,
      quantite_nette: computed.quantite_nette,
      unite_principale: computed.unite_principale,
      recette,
      recette_calculee: computed.recette_calculee,
    };

    startTransition(async () => {
      const res = initialData
        ? await updateOuvrage(initialData.id, payload)
        : await createOuvrage(payload);
      if (res?.error) setServerError(res.error);
    });
  }

  const unite = computed.unite_principale;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {serverError && (
        <div className="bg-destructive/10 text-destructive rounded-md px-4 py-3 text-sm">
          {serverError}
        </div>
      )}

      {/* ---- Infos générales ---- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informations générales</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Désignation *</Label>
            <div className="flex gap-2">
              <Input
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="ex: Mur en agglos 15cm, Dalle de sol..."
                required
                className="flex-1"
              />
              {/* AI Feature 2 — Analyser une photo */}
              <label
                className={cn(
                  "flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors",
                  "border-violet-300 text-violet-700 hover:bg-violet-50",
                  aiLoading === "photo" && "pointer-events-none opacity-60",
                )}
              >
                {aiLoading === "photo" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
                Photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </label>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Chantier</Label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="border-input bg-background h-10 w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">— Sans chantier —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Appliquer un modèle */}
          {ouvrageTypes.length > 0 && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Appliquer un modèle de recette</Label>
              <div className="flex gap-2">
                <select
                  className="border-input bg-background h-10 flex-1 rounded-md border px-3 py-2 text-sm"
                  defaultValue=""
                  onChange={(e) => e.target.value && applyOuvrageType(e.target.value)}
                >
                  <option value="">— Choisir un modèle —</option>
                  {ouvrageTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.designation}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---- Type de géométrie ---- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Type de géométrie</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {(Object.keys(LABELS_GEOMETRIE) as TypeGeometrie[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setType(t);
                  setDimensions({});
                  setVides([]);
                }}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border p-3 text-xs transition-colors",
                  type === t
                    ? "border-primary bg-primary/10 text-primary font-semibold"
                    : "border-border hover:border-primary/50 hover:bg-accent text-muted-foreground",
                )}
              >
                <span className="text-lg">{ICONES_GEOMETRIE[t]}</span>
                <span className="text-center leading-tight">{LABELS_GEOMETRIE[t]}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ---- Dimensions + Résultat ---- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dimensions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {CHAMPS_PAR_TYPE[type].map((champ) => (
              <div key={champ.key} className="space-y-1.5">
                <Label>{champ.label}</Label>
                <Input
                  type="number"
                  min="0"
                  step={champ.step ?? "0.01"}
                  placeholder={champ.placeholder}
                  value={dimensions[champ.key] ?? ""}
                  onChange={(e) => setDim(champ.key, e.target.value)}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Résumé calculé */}
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              Résultat calculé
              <Badge variant="outline" className="font-mono text-xs">
                {unite}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between border-b py-2">
              <span className="text-muted-foreground text-sm">Quantité brute</span>
              <span className="font-mono text-lg font-semibold">
                {computed.quantite_brute.toFixed(3)} {unite}
              </span>
            </div>
            {!estTypeVolume(type) && vides.length > 0 && (
              <div className="text-destructive/80 flex items-center justify-between border-b py-2">
                <span className="text-sm">− Vides déduits</span>
                <span className="font-mono">
                  {computed.vides_deduits.reduce((s, v) => s + v.largeur * v.hauteur, 0).toFixed(3)}{" "}
                  m²
                </span>
              </div>
            )}
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium">Quantité nette</span>
              <span className="text-primary font-mono text-xl font-bold">
                {computed.quantite_nette.toFixed(3)} {unite}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ---- Vides déduits (surface seulement) ---- */}
      {!estTypeVolume(type) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Vides déduits</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addVide}>
                <Plus className="mr-1 h-4 w-4" />
                Ajouter
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {vides.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-sm">
                Aucun vide — cliquez sur &quot;Ajouter&quot; pour déduire une porte, fenêtre,
                portail...
              </p>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[420px] space-y-2">
                  <div className="text-muted-foreground grid grid-cols-12 gap-2 px-1 text-xs">
                    <span className="col-span-5">Désignation</span>
                    <span className="col-span-3">Largeur (m)</span>
                    <span className="col-span-3">Hauteur (m)</span>
                    <span className="col-span-1" />
                  </div>
                  {vides.map((v) => (
                    <div key={v._key} className="grid grid-cols-12 items-center gap-2">
                      <Input
                        className="col-span-5 h-8 text-sm"
                        placeholder="ex: Porte principale"
                        value={v.nom}
                        onChange={(e) => updateVide(v._key, "nom", e.target.value)}
                      />
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="col-span-3 h-8 text-sm"
                        placeholder="0.90"
                        value={v.largeur || ""}
                        onChange={(e) => updateVide(v._key, "largeur", e.target.value)}
                      />
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="col-span-3 h-8 text-sm"
                        placeholder="2.10"
                        value={v.hauteur || ""}
                        onChange={(e) => updateVide(v._key, "hauteur", e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive col-span-1 h-8 w-8"
                        onClick={() => removeVide(v._key)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ---- Recette matériaux ---- */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recette matériaux</CardTitle>
            <div className="flex gap-2">
              {/* AI Feature 1 — Suggérer recette */}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-violet-300 text-violet-700 hover:bg-violet-50"
                onClick={handleSuggestRecette}
                disabled={!designation.trim() || aiLoading === "recette" || materials.length === 0}
              >
                {aiLoading === "recette" ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-1 h-4 w-4" />
                )}
                IA
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addComposant}
                disabled={materials.length === 0}
              >
                <Plus className="mr-1 h-4 w-4" />
                Ajouter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {recette.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              Aucun matériau — cliquez sur &quot;Ajouter&quot; pour définir la recette
            </p>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[520px] space-y-2">
                <div className="text-muted-foreground grid grid-cols-12 gap-2 px-1 text-xs">
                  <span className="col-span-4">Matériau</span>
                  <span className="col-span-2">Unité</span>
                  <span className="col-span-2">Coeff.</span>
                  <span className="col-span-2">Perte %</span>
                  <span className="col-span-1">Type</span>
                  <span className="col-span-1" />
                </div>
                {recette.map((c) => (
                  <div key={c._key} className="grid grid-cols-12 items-center gap-2">
                    <select
                      className="border-input bg-background col-span-4 h-8 rounded-md border px-2 text-sm"
                      value={c.materiau_id}
                      onChange={(e) => updateComposant(c._key, "materiau_id", e.target.value)}
                    >
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                    <span className="text-muted-foreground col-span-2 px-1 text-sm">{c.unite}</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.001"
                      className="col-span-2 h-8 text-sm"
                      placeholder="0.00"
                      value={c.coefficient || ""}
                      onChange={(e) => updateComposant(c._key, "coefficient", e.target.value)}
                    />
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      className="col-span-2 h-8 text-sm"
                      placeholder="5"
                      value={c.taux_perte ? c.taux_perte * 100 : ""}
                      onChange={(e) =>
                        updateComposant(c._key, "taux_perte", String(Number(e.target.value) / 100))
                      }
                    />
                    <select
                      className="border-input bg-background col-span-1 h-8 rounded-md border px-1 text-xs"
                      value={c.type}
                      onChange={(e) => updateComposant(c._key, "type", e.target.value)}
                    >
                      <option value="materiau">Mat.</option>
                      <option value="main_oeuvre">MO</option>
                    </select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive col-span-1 h-8 w-8"
                      onClick={() => removeComposant(c._key)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---- Récapitulatif ---- */}
      {/* AI Feature 3 — Analyse de cohérence */}
      {computed.recette_calculee.length > 0 && computed.quantite_nette > 0 && (
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-violet-300 text-violet-700 hover:bg-violet-50"
            onClick={handleAnalyserCoherence}
            disabled={aiLoading === "coherence"}
          >
            {aiLoading === "coherence" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Analyser la cohérence
          </Button>
          {coherence && (
            <div
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm",
                coherence.niveau === "ok" && "bg-green-50 text-green-700",
                coherence.niveau === "warning" && "bg-amber-50 text-amber-700",
                coherence.niveau === "error" && "bg-red-50 text-red-700",
              )}
            >
              {coherence.niveau === "ok" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0" />
              )}
              {coherence.alerte ?? "Métrés cohérents ✓"}
            </div>
          )}
        </div>
      )}

      {computed.recette_calculee.length > 0 && computed.quantite_nette > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-primary text-base">Récapitulatif des besoins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {computed.recette_calculee.map((c) => (
                <div key={c.materiau_id} className="grid grid-cols-3 gap-2 py-2.5 text-sm">
                  <div className="font-medium">{c.materiau_nom}</div>
                  <div className="text-muted-foreground text-center">
                    Besoin net :{" "}
                    <span className="text-foreground font-mono">
                      {c.quantite_nette.toFixed(3)} {c.unite}
                    </span>
                  </div>
                  <div className="text-right">
                    À commander :{" "}
                    <span className="text-primary font-mono font-semibold">
                      {c.quantite_commande.toFixed(3)} {c.unite}
                    </span>
                    {c.taux_perte > 0 && (
                      <span className="text-muted-foreground ml-1 text-xs">
                        (+{(c.taux_perte * 100).toFixed(0)}%)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---- Actions ---- */}
      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSaveType}
          disabled={isPending || !designation || recette.length === 0}
        >
          <BookOpen className="mr-2 h-4 w-4" />
          {savedType ? "Modèle sauvegardé ✓" : "Sauvegarder comme modèle"}
        </Button>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/metres")}
            disabled={isPending}
          >
            Annuler
          </Button>
          <Button type="submit" disabled={isPending || !designation || !projectId}>
            <Save className="mr-2 h-4 w-4" />
            {isPending ? "Sauvegarde..." : initialData ? "Mettre à jour" : "Enregistrer l'ouvrage"}
          </Button>
        </div>
      </div>
    </form>
  );
}
