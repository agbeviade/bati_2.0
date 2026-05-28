"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Save, FolderOpen, Trash2 } from "lucide-react";
import { saveModel, loadModel, deleteModel } from "@/app/(dashboard)/metres/actions";
import type { AllInputs } from "@/lib/debourses-calc";
import { DEFAULTS as CALC_DEFAULTS } from "@/lib/debourses-calc";

// --- Calc helpers -------------------------------------------------------------

function vb(lin: number, larg: number, ep: number) {
  return lin * larg * ep;
}
function cim(v: number, dosage: number) {
  return v * dosage;
}
function sbl(v: number) {
  return v * 0.4;
}
function grv(v: number) {
  return v * 0.8;
}
function fmt(n: number, d = 2) {
  return isFinite(n) && !isNaN(n) ? n.toFixed(d) : "0.00";
}
function fmtI(n: number) {
  return isFinite(n) && !isNaN(n) ? Math.ceil(n).toString() : "0";
}

// --- Defaults ----------------------------------------------------------------

const DEFAULTS: AllInputs = CALC_DEFAULTS;

// --- UI primitives (defined OUTSIDE main component so refs are stable) --------

function NumInput({
  label,
  defaultValue,
  onChange,
  unit,
  step = "0.01",
  min = "0",
}: {
  label: string;
  defaultValue: number;
  onChange: (v: number) => void;
  unit?: string;
  step?: string;
  min?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">
        {label}
        {unit ? ` (${unit})` : ""}
      </Label>
      <Input
        type="number"
        min={min}
        step={step}
        defaultValue={defaultValue || ""}
        onChange={(e) => onChange(e.target.valueAsNumber)}
        className="h-8 text-sm"
      />
    </div>
  );
}

function ResultRow({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex items-center justify-between py-0.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">
        {value}
        {unit ? ` ${unit}` : ""}
      </span>
    </div>
  );
}

function ResultBlock({ children }: { children: React.ReactNode }) {
  return <div className="bg-muted/40 mt-3 space-y-0.5 rounded-md border px-3 py-2">{children}</div>;
}

type SectionKey = "fondation" | "elevation" | "dalle";

function Section({
  sKey,
  title,
  isOpen,
  onToggle,
  children,
}: {
  sKey: SectionKey;
  title: string;
  isOpen: boolean;
  onToggle: (k: SectionKey) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <button
        type="button"
        onClick={() => onToggle(sKey)}
        className="bg-muted/30 hover:bg-muted/60 flex w-full items-center justify-between px-4 py-3 transition-colors"
      >
        <span className="text-primary text-sm font-semibold tracking-wide uppercase">{title}</span>
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {isOpen && <div className="space-y-6 p-4">{children}</div>}
    </div>
  );
}

function StepCard({
  num,
  title,
  children,
}: {
  num: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="shrink-0 text-xs">
          Etape {num}
        </Badge>
        <span className="text-sm font-medium">{title}</span>
      </div>
      {children}
    </div>
  );
}

// --- Main component -----------------------------------------------------------

export type ModelMeta = { id: string; name: string; created_at: string };

export function DeboursesCalculator({ models = [] }: { models?: ModelMeta[] }) {
  const [inputs, setInputs] = useState<AllInputs>(DEFAULTS);
  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    fondation: true,
    elevation: false,
    dalle: false,
  });
  const [modelName, setModelName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const toggleSection = useCallback((k: SectionKey) => {
    setOpen((o) => ({ ...o, [k]: !o[k] }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!modelName.trim()) {
      setSaveMsg("Saisissez un nom.");
      return;
    }
    setSaving(true);
    setSaveMsg(null);
    const res = await saveModel(modelName.trim(), inputs);
    setSaving(false);
    if (res?.error) setSaveMsg("Erreur : " + res.error);
    else {
      setSaveMsg("Modele enregistre !");
      setModelName("");
    }
  }, [modelName, inputs]);

  const handleLoad = useCallback((rawInputs: unknown) => {
    if (!rawInputs || typeof rawInputs !== "object") return;
    setInputs((prev) => ({ ...prev, ...(rawInputs as Partial<AllInputs>) }));
    setSaveMsg("Modele charge.");
  }, []);

  const upd = useCallback(<K extends keyof AllInputs>(step: K, field: string, val: number) => {
    setInputs((prev) => ({
      ...prev,
      [step]: { ...(prev[step] as object), [field]: isNaN(val) ? 0 : val },
    }));
  }, []);

  const g = inputs.global;
  const SAC = g.poids_sac;
  const LB = g.long_barre;
  const B6 = g.botte_ha6;
  const B8 = g.botte_ha8;
  const B10 = g.botte_ha10;
  const B12 = g.botte_ha12;
  const BPM2 = g.briques_m2;
  const HPM2 = g.hourdis_m2;
  const LP = g.long_planche;

  // -- Step 1 - Beton proprete -----------------------------------------------
  const s1 = inputs.s1;
  const s1_vb = vb(g.lin, s1.larg, s1.ep);
  const s1_cim = cim(s1_vb, s1.dosage);

  // -- Step 2 - Semelles filantes --------------------------------------------
  const s2 = inputs.s2;
  const s2_vb = vb(g.lin, s2.larg, s2.ht);
  const s2_cim = cim(s2_vb, s2.dosage);
  const s2_ha10 = (g.lin * s2.n_barres) / LB / B10;
  const s2_ha6 = ((g.lin / s2.esp) * s2.long_traverse) / LB / B6;

  // -- Step 3 - Paillasses ---------------------------------------------------
  const s3 = inputs.s3;
  const s3_vb = s3.long * s3.larg * s3.prof * s3.np;
  const s3_cim = cim(s3_vb, s3.dosage);
  const s3_ha10 = (g.lin * s3.n_barres) / LB / B10;
  const s3_ha6 = ((g.lin / s3.esp) * s3.long_traverse) / LB / B6;
  const s3_pl30 = (g.lin / LP) * 2;
  const s3_pl20 = g.lin / LP;

  // -- Step 4 - Poteaux ------------------------------------------------------
  const s4 = inputs.s4;
  const s4_vb = s4.sect_b * s4.sect_h * s4.ht * s4.np;
  const s4_cim = cim(s4_vb, s4.dosage);
  const s4_ha12 = (s4.n_barres * s4.ht * s4.np) / LB / B12;
  const s4_ha6 = (((s4.ht * s4.np) / s4.esp) * s4.long_etrier) / LB / B6;

  // -- Step 5 - Murs 15 plein ------------------------------------------------
  const s5 = inputs.s5;
  const s5_briques = g.lin * s5.ht_murs * BPM2;
  const s5_montes = g.hauteur_montee > 0 ? s5.ht_murs / g.hauteur_montee : 0;
  const s5_sac_mac = g.montes_par_sac > 0 ? s5_montes / g.montes_par_sac : 0;

  // -- Step 6 - Chainage bas -------------------------------------------------
  const s6 = inputs.s6;
  const s6_vb = vb(g.lin, s6.larg, s6.ht);
  const s6_cim = cim(s6_vb, s6.dosage);
  const s6_ha10 = (g.lin * s6.n_barres) / LB / B10;
  const s6_ha6 = ((g.lin / s6.esp) * s6.long_traverse) / LB / B6;
  const s6_pl30 = (g.lin / LP) * 2;
  const s6_pl20 = g.lin / LP;

  // -- Step 7 - Murs 15 creux ------------------------------------------------
  const s7 = inputs.s7;
  const s7_briques = g.lin * s7.ht_murs * BPM2;
  const s7_montes = g.hauteur_montee > 0 ? s7.ht_murs / g.hauteur_montee : 0;
  const s7_sac_mac = g.montes_par_sac > 0 ? s7_montes / g.montes_par_sac : 0;

  // -- Step 8 - Chainage haut RDC --------------------------------------------
  const s8 = inputs.s8;
  const s8_vb = vb(g.lin, s8.larg, s8.ht);
  const s8_cim = cim(s8_vb, s8.dosage);
  const s8_ha10 = (g.lin * s8.n_barres) / LB / B10;
  const s8_ha6 = ((g.lin / s8.esp) * s8.long_traverse) / LB / B6;

  // -- Step 9 - Chainage dalle -----------------------------------------------
  const s9 = inputs.s9;
  const s9_vb = vb(g.lin, s9.larg, s9.ht);
  const s9_cim = cim(s9_vb, s9.dosage);
  const s9_ha10 = (g.lin * s9.n_barres) / LB / B10;
  const s9_ha6 = ((g.lin / s9.esp) * s9.long_traverse) / LB / B6;

  // -- Step 10 - Hourdis ----------------------------------------------------
  const s10 = inputs.s10;
  const s10_surf = s10.long_dall * s10.larg;
  const s10_hourdis = s10_surf * HPM2;
  const s10_n_nerv = s10.larg > 0 ? Math.floor(s10.larg / 0.5) : 0;

  // -- Step 11 - Beton compression ------------------------------------------
  const s11 = inputs.s11;
  const s11_vb = s11.larg_dall * s10.long_dall * s11.ep * 2;
  const s11_cim = cim(s11_vb, s11.dosage);

  // -- Step 12 - Poutres -----------------------------------------------------
  const s12 = inputs.s12;
  const s12_vb = s12.sect_b * s12.sect_h * g.lin * s12.np;
  const s12_cim = cim(s12_vb, s12.dosage);
  const s12_ha12 = (s12.n_barres * g.lin * s12.np) / LB / B12;
  const s12_ha6 = (((g.lin * s12.np) / s12.esp) * s12.long_etrier) / LB / B6;

  // -- Step 13 - Nervures ----------------------------------------------------
  const s13 = inputs.s13;
  const s13_vb = s13.larg * s13.ht * g.lin * s13.np;
  const s13_cim = cim(s13_vb, s13.dosage);
  const s13_ha10 = (g.lin * 2 * s13.np) / LB / B10;
  const s13_ha6 = (((s13.ht * s13.np) / s13.esp_etr) * s13.long_etrier) / LB / B6;

  // -- Step 14 - Quadrillage -------------------------------------------------
  const s14 = inputs.s14;
  const s14_ha8_long = s10.long_dall > 0 ? s10.long_dall / s14.esp / B8 : 0;
  const s14_ha6_trans = s10.larg > 0 ? s10.larg / s14.esp / B6 : 0;

  // -- Step 15 - Coulage dalle -----------------------------------------------
  const s15 = inputs.s15;
  const s15_surf = s15.larg_dall * s10.long_dall;
  const s15_vb = s15_surf * s15.ep;
  const s15_cim = cim(s15_vb, s15.dosage);

  // -- Recapitulatif ---------------------------------------------------------
  const vb_0525 = [s1_vb, s2_vb, s3_vb, s11_vb, s15_vb]; // proprete, semelles, paillasses, compression, dalle
  const vb_1525 = [s4_vb, s6_vb, s8_vb, s9_vb, s12_vb, s13_vb]; // poteaux, chainages, poutres, nervures
  const allCim = [
    s1_cim,
    s2_cim,
    s3_cim,
    s4_cim,
    s6_cim,
    s8_cim,
    s9_cim,
    s11_cim,
    s12_cim,
    s13_cim,
    s15_cim,
  ];
  const tot_cim = allCim.reduce((a, b) => a + b, 0);
  const allVb = [...vb_0525, ...vb_1525];
  const tot_sbl = allVb.reduce((a, b) => a + sbl(b), 0);
  const tot_grv_0525 = vb_0525.reduce((a, b) => a + grv(b), 0);
  const tot_grv_1525 = vb_1525.reduce((a, b) => a + grv(b), 0);
  const tot_briques = s5_briques + s7_briques;
  const tot_pl30 = s3_pl30 + s6_pl30;
  const tot_pl20 = s3_pl20 + s6_pl20;
  const tot_ha6 = s2_ha6 + s3_ha6 + s6_ha6 + s8_ha6 + s9_ha6 + s12_ha6 + s13_ha6 + s14_ha6_trans;
  const tot_ha8 = s14_ha8_long;
  const tot_ha10 = s2_ha10 + s3_ha10 + s6_ha10 + s8_ha10 + s9_ha10 + s13_ha10;
  const tot_ha12 = s4_ha12 + s12_ha12;

  // --- Render ---------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Barre modeles */}
      {models.length > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <FolderOpen className="text-muted-foreground h-4 w-4 shrink-0" />
              <span className="shrink-0 text-sm font-medium">Charger un modele :</span>
              {models.map((m) => (
                <div key={m.id} className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => loadModel(m.id).then(handleLoad)}
                  >
                    {m.name}
                  </Button>
                  <button
                    onClick={() => deleteModel(m.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    title="Supprimer ce modele"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Parametres globaux */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Parametres globaux</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs">
            <NumInput
              label="Lineaire total"
              unit="m"
              defaultValue={g.lin}
              onChange={(v) => upd("global", "lin", v)}
              step="0.5"
            />
          </div>
          <div>
            <p className="text-muted-foreground mb-2 text-xs font-semibold uppercase">
              Barres & bottes
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <NumInput
                label="Poids sac ciment"
                unit="kg"
                defaultValue={g.poids_sac}
                onChange={(v) => upd("global", "poids_sac", v)}
                step="1"
                min="1"
              />
              <NumInput
                label="Long. d'une barre"
                unit="m"
                defaultValue={g.long_barre}
                onChange={(v) => upd("global", "long_barre", v)}
                step="0.5"
                min="1"
              />
              <NumInput
                label="Barres/botte HA6"
                defaultValue={g.botte_ha6}
                onChange={(v) => upd("global", "botte_ha6", v)}
                step="1"
                min="1"
              />
              <NumInput
                label="Barres/botte HA8"
                defaultValue={g.botte_ha8}
                onChange={(v) => upd("global", "botte_ha8", v)}
                step="1"
                min="1"
              />
              <NumInput
                label="Barres/botte HA10"
                defaultValue={g.botte_ha10}
                onChange={(v) => upd("global", "botte_ha10", v)}
                step="1"
                min="1"
              />
              <NumInput
                label="Barres/botte HA12"
                defaultValue={g.botte_ha12}
                onChange={(v) => upd("global", "botte_ha12", v)}
                step="1"
                min="1"
              />
            </div>
          </div>
          <div>
            <p className="text-muted-foreground mb-2 text-xs font-semibold uppercase">
              Maconnerie & hourdis
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <NumInput
                label="Briques/m2"
                defaultValue={g.briques_m2}
                onChange={(v) => upd("global", "briques_m2", v)}
                step="1"
                min="1"
              />
              <NumInput
                label="Hourdis/m2"
                defaultValue={g.hourdis_m2}
                onChange={(v) => upd("global", "hourdis_m2", v)}
                step="1"
                min="1"
              />
              <NumInput
                label="Long. d'une planche"
                unit="m"
                defaultValue={g.long_planche}
                onChange={(v) => upd("global", "long_planche", v)}
                step="0.5"
                min="1"
              />
              <NumInput
                label="Ht. 1 montee brique"
                unit="m"
                defaultValue={g.hauteur_montee}
                onChange={(v) => upd("global", "hauteur_montee", v)}
                step="0.01"
                min="0.01"
              />
              <NumInput
                label="Montees / sac ciment"
                defaultValue={g.montes_par_sac}
                onChange={(v) => upd("global", "montes_par_sac", v)}
                step="1"
                min="1"
              />
            </div>
          </div>
          <div>
            <p className="text-muted-foreground mb-2 text-xs font-semibold uppercase">Transport</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <NumInput
                label="Camion sable"
                unit="m3"
                defaultValue={g.camion_sable}
                onChange={(v) => upd("global", "camion_sable", v)}
                step="1"
                min="1"
              />
              <NumInput
                label="Camion gravier 05/25"
                unit="t"
                defaultValue={g.camion_g0525}
                onChange={(v) => upd("global", "camion_g0525", v)}
                step="1"
                min="1"
              />
              <NumInput
                label="Camion gravier 15/25"
                unit="t"
                defaultValue={g.camion_g1525}
                onChange={(v) => upd("global", "camion_g1525", v)}
                step="1"
                min="1"
              />
              <NumInput
                label="Densite gravier"
                unit="t/m3"
                defaultValue={g.densite_gravier}
                onChange={(v) => upd("global", "densite_gravier", v)}
                step="0.1"
                min="0.1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FONDATION */}
      <Section
        sKey="fondation"
        title="Fondation - Etapes 1 a 6"
        isOpen={open.fondation}
        onToggle={toggleSection}
      >
        <StepCard num={1} title="Beton de proprete">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <NumInput
              label="Largeur"
              unit="m"
              defaultValue={s1.larg}
              onChange={(v) => upd("s1", "larg", v)}
            />
            <NumInput
              label="Epaisseur"
              unit="m"
              defaultValue={s1.ep}
              onChange={(v) => upd("s1", "ep", v)}
            />
            <NumInput
              label="Dosage"
              unit="kg/m3"
              defaultValue={s1.dosage}
              onChange={(v) => upd("s1", "dosage", v)}
              step="1"
            />
          </div>
          <ResultBlock>
            <ResultRow label="Volume beton" value={fmt(s1_vb)} unit="m3" />
            <ResultRow label="Ciment" value={`${fmt(s1_cim)} kg  -  ${fmtI(s1_cim / SAC)} sacs`} />
            <ResultRow label="Sable" value={fmt(sbl(s1_vb))} unit="m3" />
            <ResultRow label="Gravier 05/25" value={fmt(grv(s1_vb))} unit="m3" />
          </ResultBlock>
        </StepCard>

        <StepCard num={2} title="Semelles filantes">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <NumInput
              label="Largeur"
              unit="m"
              defaultValue={s2.larg}
              onChange={(v) => upd("s2", "larg", v)}
            />
            <NumInput
              label="Hauteur"
              unit="m"
              defaultValue={s2.ht}
              onChange={(v) => upd("s2", "ht", v)}
            />
            <NumInput
              label="Dosage"
              unit="kg/m3"
              defaultValue={s2.dosage}
              onChange={(v) => upd("s2", "dosage", v)}
              step="1"
            />
            <NumInput
              label="Nbre barres HA10"
              defaultValue={s2.n_barres}
              onChange={(v) => upd("s2", "n_barres", v)}
              step="1"
              min="1"
            />
            <NumInput
              label="Esp. traverses"
              unit="m"
              defaultValue={s2.esp}
              onChange={(v) => upd("s2", "esp", v)}
            />
            <NumInput
              label="Long. traverse"
              unit="m"
              defaultValue={s2.long_traverse}
              onChange={(v) => upd("s2", "long_traverse", v)}
            />
          </div>
          <ResultBlock>
            <ResultRow label="Volume beton" value={fmt(s2_vb)} unit="m3" />
            <ResultRow label="Ciment" value={`${fmt(s2_cim)} kg  -  ${fmtI(s2_cim / SAC)} sacs`} />
            <ResultRow label="Sable" value={fmt(sbl(s2_vb))} unit="m3" />
            <ResultRow label="Gravier 05/25" value={fmt(grv(s2_vb))} unit="m3" />
            <ResultRow label="HA10 (barres long.)" value={`${fmtI(s2_ha10)} bottes`} />
            <ResultRow label="HA6 (traverses)" value={`${fmtI(s2_ha6)} bottes`} />
          </ResultBlock>
        </StepCard>

        <StepCard num={3} title="Paillasses (plots isoles)">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <NumInput
              label="Nbre paillasses"
              defaultValue={s3.np}
              onChange={(v) => upd("s3", "np", v)}
              step="1"
            />
            <NumInput
              label="Longueur"
              unit="m"
              defaultValue={s3.long}
              onChange={(v) => upd("s3", "long", v)}
            />
            <NumInput
              label="Largeur"
              unit="m"
              defaultValue={s3.larg}
              onChange={(v) => upd("s3", "larg", v)}
            />
            <NumInput
              label="Profondeur"
              unit="m"
              defaultValue={s3.prof}
              onChange={(v) => upd("s3", "prof", v)}
            />
            <NumInput
              label="Dosage"
              unit="kg/m3"
              defaultValue={s3.dosage}
              onChange={(v) => upd("s3", "dosage", v)}
              step="1"
            />
            <NumInput
              label="Nbre barres HA10"
              defaultValue={s3.n_barres}
              onChange={(v) => upd("s3", "n_barres", v)}
              step="1"
              min="1"
            />
            <NumInput
              label="Esp. traverses"
              unit="m"
              defaultValue={s3.esp}
              onChange={(v) => upd("s3", "esp", v)}
            />
            <NumInput
              label="Long. traverse"
              unit="m"
              defaultValue={s3.long_traverse}
              onChange={(v) => upd("s3", "long_traverse", v)}
            />
          </div>
          <ResultBlock>
            <ResultRow label="Volume beton" value={fmt(s3_vb)} unit="m3" />
            <ResultRow label="Ciment" value={`${fmt(s3_cim)} kg  -  ${fmtI(s3_cim / SAC)} sacs`} />
            <ResultRow label="Sable" value={fmt(sbl(s3_vb))} unit="m3" />
            <ResultRow label="Gravier 05/25" value={fmt(grv(s3_vb))} unit="m3" />
            <ResultRow label="HA10" value={`${fmtI(s3_ha10)} bottes`} />
            <ResultRow label="HA6" value={`${fmtI(s3_ha6)} bottes`} />
            <ResultRow label="Planches larg. 30" value={`${fmtI(s3_pl30)} u`} />
            <ResultRow label="Planches larg. 20" value={`${fmtI(s3_pl20)} u`} />
          </ResultBlock>
        </StepCard>

        <StepCard num={4} title="Poteaux (fondation)">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <NumInput
              label="Nbre poteaux"
              defaultValue={s4.np}
              onChange={(v) => upd("s4", "np", v)}
              step="1"
            />
            <NumInput
              label="Hauteur"
              unit="m"
              defaultValue={s4.ht}
              onChange={(v) => upd("s4", "ht", v)}
            />
            <NumInput
              label="Dosage"
              unit="kg/m3"
              defaultValue={s4.dosage}
              onChange={(v) => upd("s4", "dosage", v)}
              step="1"
            />
            <NumInput
              label="Section b"
              unit="m"
              defaultValue={s4.sect_b}
              onChange={(v) => upd("s4", "sect_b", v)}
            />
            <NumInput
              label="Section h"
              unit="m"
              defaultValue={s4.sect_h}
              onChange={(v) => upd("s4", "sect_h", v)}
            />
            <NumInput
              label="Nbre HA12"
              defaultValue={s4.n_barres}
              onChange={(v) => upd("s4", "n_barres", v)}
              step="1"
            />
            <NumInput
              label="Esp. etriers"
              unit="m"
              defaultValue={s4.esp}
              onChange={(v) => upd("s4", "esp", v)}
            />
            <NumInput
              label="Long. etrier"
              unit="m"
              defaultValue={s4.long_etrier}
              onChange={(v) => upd("s4", "long_etrier", v)}
            />
          </div>
          <ResultBlock>
            <ResultRow label="Volume beton" value={fmt(s4_vb)} unit="m3" />
            <ResultRow label="Ciment" value={`${fmt(s4_cim)} kg  -  ${fmtI(s4_cim / SAC)} sacs`} />
            <ResultRow label="Sable" value={fmt(sbl(s4_vb))} unit="m3" />
            <ResultRow label="Gravier 15/25" value={fmt(grv(s4_vb))} unit="m3" />
            <ResultRow label="HA12 (barres long.)" value={`${fmtI(s4_ha12)} bottes`} />
            <ResultRow label="HA6 (etriers)" value={`${fmtI(s4_ha6)} bottes`} />
          </ResultBlock>
        </StepCard>

        <StepCard num={5} title="Murs 15 plein (soubassement)">
          <div className="max-w-xs">
            <NumInput
              label="Hauteur murs"
              unit="m"
              defaultValue={s5.ht_murs}
              onChange={(v) => upd("s5", "ht_murs", v)}
            />
          </div>
          <ResultBlock>
            <ResultRow label="Briques" value={`${fmtI(s5_briques)} u`} />
            <ResultRow label="Montees" value={`${fmtI(s5_montes)} montees`} />
            <ResultRow label="Ciment maconnerie" value={`${fmtI(s5_sac_mac)} sacs`} />
          </ResultBlock>
        </StepCard>

        <StepCard num={6} title="Chainage bas">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <NumInput
              label="Largeur"
              unit="m"
              defaultValue={s6.larg}
              onChange={(v) => upd("s6", "larg", v)}
            />
            <NumInput
              label="Hauteur"
              unit="m"
              defaultValue={s6.ht}
              onChange={(v) => upd("s6", "ht", v)}
            />
            <NumInput
              label="Dosage"
              unit="kg/m3"
              defaultValue={s6.dosage}
              onChange={(v) => upd("s6", "dosage", v)}
              step="1"
            />
            <NumInput
              label="Nbre barres HA10"
              defaultValue={s6.n_barres}
              onChange={(v) => upd("s6", "n_barres", v)}
              step="1"
              min="1"
            />
            <NumInput
              label="Esp. traverses"
              unit="m"
              defaultValue={s6.esp}
              onChange={(v) => upd("s6", "esp", v)}
            />
            <NumInput
              label="Long. traverse"
              unit="m"
              defaultValue={s6.long_traverse}
              onChange={(v) => upd("s6", "long_traverse", v)}
            />
          </div>
          <ResultBlock>
            <ResultRow label="Volume beton" value={fmt(s6_vb)} unit="m3" />
            <ResultRow label="Ciment" value={`${fmt(s6_cim)} kg  -  ${fmtI(s6_cim / SAC)} sacs`} />
            <ResultRow label="Sable" value={fmt(sbl(s6_vb))} unit="m3" />
            <ResultRow label="Gravier 15/25" value={fmt(grv(s6_vb))} unit="m3" />
            <ResultRow label="HA10" value={`${fmtI(s6_ha10)} bottes`} />
            <ResultRow label="HA6" value={`${fmtI(s6_ha6)} bottes`} />
            <ResultRow label="Planches larg. 30" value={`${fmtI(s6_pl30)} u`} />
            <ResultRow label="Planches larg. 20" value={`${fmtI(s6_pl20)} u`} />
          </ResultBlock>
        </StepCard>
      </Section>

      {/* ELEVATION */}
      <Section
        sKey="elevation"
        title="Elevation - Etapes 7 a 8"
        isOpen={open.elevation}
        onToggle={toggleSection}
      >
        <StepCard num={7} title="Murs 15 creux (elevation)">
          <div className="max-w-xs">
            <NumInput
              label="Hauteur murs"
              unit="m"
              defaultValue={s7.ht_murs}
              onChange={(v) => upd("s7", "ht_murs", v)}
            />
          </div>
          <ResultBlock>
            <ResultRow label="Briques" value={`${fmtI(s7_briques)} u`} />
            <ResultRow label="Montees" value={`${fmtI(s7_montes)} montees`} />
            <ResultRow label="Ciment maconnerie" value={`${fmtI(s7_sac_mac)} sacs`} />
          </ResultBlock>
        </StepCard>

        <StepCard num={8} title="Chainage haut RDC">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <NumInput
              label="Largeur"
              unit="m"
              defaultValue={s8.larg}
              onChange={(v) => upd("s8", "larg", v)}
            />
            <NumInput
              label="Hauteur"
              unit="m"
              defaultValue={s8.ht}
              onChange={(v) => upd("s8", "ht", v)}
            />
            <NumInput
              label="Dosage"
              unit="kg/m3"
              defaultValue={s8.dosage}
              onChange={(v) => upd("s8", "dosage", v)}
              step="1"
            />
            <NumInput
              label="Nbre barres HA10"
              defaultValue={s8.n_barres}
              onChange={(v) => upd("s8", "n_barres", v)}
              step="1"
              min="1"
            />
            <NumInput
              label="Esp. traverses"
              unit="m"
              defaultValue={s8.esp}
              onChange={(v) => upd("s8", "esp", v)}
            />
            <NumInput
              label="Long. traverse"
              unit="m"
              defaultValue={s8.long_traverse}
              onChange={(v) => upd("s8", "long_traverse", v)}
            />
          </div>
          <ResultBlock>
            <ResultRow label="Volume beton" value={fmt(s8_vb)} unit="m3" />
            <ResultRow label="Ciment" value={`${fmt(s8_cim)} kg  -  ${fmtI(s8_cim / SAC)} sacs`} />
            <ResultRow label="Sable" value={fmt(sbl(s8_vb))} unit="m3" />
            <ResultRow label="Gravier 15/25" value={fmt(grv(s8_vb))} unit="m3" />
            <ResultRow label="HA10" value={`${fmtI(s8_ha10)} bottes`} />
            <ResultRow label="HA6" value={`${fmtI(s8_ha6)} bottes`} />
          </ResultBlock>
        </StepCard>
      </Section>

      {/* PLANCHER HAUT */}
      <Section
        sKey="dalle"
        title="Plancher haut (dalle) - Etapes 9 a 15"
        isOpen={open.dalle}
        onToggle={toggleSection}
      >
        <StepCard num={9} title="Chainage dalle">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <NumInput
              label="Largeur"
              unit="m"
              defaultValue={s9.larg}
              onChange={(v) => upd("s9", "larg", v)}
            />
            <NumInput
              label="Hauteur"
              unit="m"
              defaultValue={s9.ht}
              onChange={(v) => upd("s9", "ht", v)}
            />
            <NumInput
              label="Dosage"
              unit="kg/m3"
              defaultValue={s9.dosage}
              onChange={(v) => upd("s9", "dosage", v)}
              step="1"
            />
            <NumInput
              label="Nbre barres HA10"
              defaultValue={s9.n_barres}
              onChange={(v) => upd("s9", "n_barres", v)}
              step="1"
              min="1"
            />
            <NumInput
              label="Esp. traverses"
              unit="m"
              defaultValue={s9.esp}
              onChange={(v) => upd("s9", "esp", v)}
            />
            <NumInput
              label="Long. traverse"
              unit="m"
              defaultValue={s9.long_traverse}
              onChange={(v) => upd("s9", "long_traverse", v)}
            />
          </div>
          <ResultBlock>
            <ResultRow label="Volume beton" value={fmt(s9_vb)} unit="m3" />
            <ResultRow label="Ciment" value={`${fmt(s9_cim)} kg  -  ${fmtI(s9_cim / SAC)} sacs`} />
            <ResultRow label="Sable" value={fmt(sbl(s9_vb))} unit="m3" />
            <ResultRow label="Gravier 15/25" value={fmt(grv(s9_vb))} unit="m3" />
            <ResultRow label="HA10" value={`${fmtI(s9_ha10)} bottes`} />
            <ResultRow label="HA6" value={`${fmtI(s9_ha6)} bottes`} />
          </ResultBlock>
        </StepCard>

        <StepCard num={10} title="Hourdis">
          <div className="grid max-w-xs grid-cols-2 gap-3">
            <NumInput
              label="Longueur dalle"
              unit="m"
              defaultValue={s10.long_dall}
              onChange={(v) => upd("s10", "long_dall", v)}
            />
            <NumInput
              label="Largeur dalle"
              unit="m"
              defaultValue={s10.larg}
              onChange={(v) => upd("s10", "larg", v)}
            />
          </div>
          <ResultBlock>
            <ResultRow label="Surface dalle" value={fmt(s10_surf)} unit="m2" />
            <ResultRow label="Hourdis" value={`${fmtI(s10_hourdis)} u`} />
            <ResultRow label="Nervures potentielles" value={`${s10_n_nerv} (tous les 0.50 m)`} />
          </ResultBlock>
        </StepCard>

        <StepCard num={11} title="Beton de compression">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <NumInput
              label="Largeur dalle"
              unit="m"
              defaultValue={s11.larg_dall}
              onChange={(v) => upd("s11", "larg_dall", v)}
            />
            <NumInput
              label="Epaisseur"
              unit="m"
              defaultValue={s11.ep}
              onChange={(v) => upd("s11", "ep", v)}
            />
            <NumInput
              label="Dosage"
              unit="kg/m3"
              defaultValue={s11.dosage}
              onChange={(v) => upd("s11", "dosage", v)}
              step="1"
            />
          </div>
          <ResultBlock>
            <ResultRow label="Volume beton" value={fmt(s11_vb)} unit="m3" />
            <ResultRow
              label="Ciment"
              value={`${fmt(s11_cim)} kg  -  ${fmtI(s11_cim / SAC)} sacs`}
            />
            <ResultRow label="Sable" value={fmt(sbl(s11_vb))} unit="m3" />
            <ResultRow label="Gravier 05/25" value={fmt(grv(s11_vb))} unit="m3" />
          </ResultBlock>
        </StepCard>

        <StepCard num={12} title="Poutres">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <NumInput
              label="Nbre poutres"
              defaultValue={s12.np}
              onChange={(v) => upd("s12", "np", v)}
              step="1"
            />
            <NumInput
              label="Section b"
              unit="m"
              defaultValue={s12.sect_b}
              onChange={(v) => upd("s12", "sect_b", v)}
            />
            <NumInput
              label="Section h"
              unit="m"
              defaultValue={s12.sect_h}
              onChange={(v) => upd("s12", "sect_h", v)}
            />
            <NumInput
              label="Nbre HA12"
              defaultValue={s12.n_barres}
              onChange={(v) => upd("s12", "n_barres", v)}
              step="1"
            />
            <NumInput
              label="Dosage"
              unit="kg/m3"
              defaultValue={s12.dosage}
              onChange={(v) => upd("s12", "dosage", v)}
              step="1"
            />
            <NumInput
              label="Esp. etriers"
              unit="m"
              defaultValue={s12.esp}
              onChange={(v) => upd("s12", "esp", v)}
            />
            <NumInput
              label="Long. etrier"
              unit="m"
              defaultValue={s12.long_etrier}
              onChange={(v) => upd("s12", "long_etrier", v)}
            />
          </div>
          <ResultBlock>
            <ResultRow label="Volume beton" value={fmt(s12_vb)} unit="m3" />
            <ResultRow
              label="Ciment"
              value={`${fmt(s12_cim)} kg  -  ${fmtI(s12_cim / SAC)} sacs`}
            />
            <ResultRow label="Sable" value={fmt(sbl(s12_vb))} unit="m3" />
            <ResultRow label="Gravier 15/25" value={fmt(grv(s12_vb))} unit="m3" />
            <ResultRow label="HA12" value={`${fmtI(s12_ha12)} bottes`} />
            <ResultRow label="HA6 (etriers)" value={`${fmtI(s12_ha6)} bottes`} />
          </ResultBlock>
        </StepCard>

        <StepCard num={13} title="Nervures">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <NumInput
              label="Nbre nervures"
              defaultValue={s13.np}
              onChange={(v) => upd("s13", "np", v)}
              step="1"
            />
            <NumInput
              label="Larg. nervure"
              unit="m"
              defaultValue={s13.larg}
              onChange={(v) => upd("s13", "larg", v)}
            />
            <NumInput
              label="Ht nervure"
              unit="m"
              defaultValue={s13.ht}
              onChange={(v) => upd("s13", "ht", v)}
            />
            <NumInput
              label="Dosage"
              unit="kg/m3"
              defaultValue={s13.dosage}
              onChange={(v) => upd("s13", "dosage", v)}
              step="1"
            />
            <NumInput
              label="Esp. etriers"
              unit="m"
              defaultValue={s13.esp_etr}
              onChange={(v) => upd("s13", "esp_etr", v)}
            />
            <NumInput
              label="Long. etrier"
              unit="m"
              defaultValue={s13.long_etrier}
              onChange={(v) => upd("s13", "long_etrier", v)}
            />
          </div>
          <ResultBlock>
            <ResultRow label="Volume beton" value={fmt(s13_vb)} unit="m3" />
            <ResultRow
              label="Ciment"
              value={`${fmt(s13_cim)} kg  -  ${fmtI(s13_cim / SAC)} sacs`}
            />
            <ResultRow label="Sable" value={fmt(sbl(s13_vb))} unit="m3" />
            <ResultRow label="Gravier 15/25" value={fmt(grv(s13_vb))} unit="m3" />
            <ResultRow label="HA10 (2 barres)" value={`${fmtI(s13_ha10)} bottes`} />
            <ResultRow label="HA6 (etriers)" value={`${fmtI(s13_ha6)} bottes`} />
          </ResultBlock>
        </StepCard>

        <StepCard num={14} title="Quadrillage (treillis soude)">
          <div className="max-w-xs">
            <NumInput
              label="Espacement"
              unit="m"
              defaultValue={s14.esp}
              onChange={(v) => upd("s14", "esp", v)}
            />
          </div>
          <p className="text-muted-foreground text-xs">
            Longueur &amp; largeur repris depuis l'etape 10
          </p>
          <ResultBlock>
            <ResultRow label="HA8 longitudinal" value={`${fmtI(s14_ha8_long)} bottes`} />
            <ResultRow label="HA6 transversal" value={`${fmtI(s14_ha6_trans)} bottes`} />
          </ResultBlock>
        </StepCard>

        <StepCard num={15} title="Coulage dalle">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <NumInput
              label="Largeur dalle"
              unit="m"
              defaultValue={s15.larg_dall}
              onChange={(v) => upd("s15", "larg_dall", v)}
            />
            <NumInput
              label="Epaisseur"
              unit="m"
              defaultValue={s15.ep}
              onChange={(v) => upd("s15", "ep", v)}
            />
            <NumInput
              label="Dosage"
              unit="kg/m3"
              defaultValue={s15.dosage}
              onChange={(v) => upd("s15", "dosage", v)}
              step="1"
            />
          </div>
          <ResultBlock>
            <ResultRow label="Surface dalle" value={fmt(s15_surf)} unit="m2" />
            <ResultRow label="Volume beton" value={fmt(s15_vb)} unit="m3" />
            <ResultRow
              label="Ciment"
              value={`${fmt(s15_cim)} kg  -  ${fmtI(s15_cim / SAC)} sacs`}
            />
            <ResultRow label="Sable" value={fmt(sbl(s15_vb))} unit="m3" />
            <ResultRow label="Gravier 05/25" value={fmt(grv(s15_vb))} unit="m3" />
          </ResultBlock>
        </StepCard>
      </Section>

      {/* RECAPITULATIF */}
      <Card className="border-primary/30 border-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-primary text-base tracking-wide uppercase">
            Recapitulatif - Debourses secs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground mt-2 mb-1 text-xs font-semibold uppercase">
                Liant &amp; granulats
              </p>
              <ResultRow
                label="Ciment total"
                value={`${fmt(tot_cim)} kg = ${fmt(tot_cim / 1000)} t  -  ${fmtI(tot_cim / SAC)} sacs`}
              />
              <ResultRow label="Sable" value={`${fmt(tot_sbl)} m3`} />
              <ResultRow
                label={`Voyages sable (${g.camion_sable} m3)`}
                value={`${fmtI(tot_sbl / g.camion_sable)} voyages`}
              />
              <ResultRow label="Gravier 05/25" value={`${fmt(tot_grv_0525)} m3`} />
              <ResultRow
                label={`Voyages 05/25 (${g.camion_g0525} t)`}
                value={`${fmtI((tot_grv_0525 * g.densite_gravier) / g.camion_g0525)} voyages`}
              />
              <ResultRow label="Gravier 15/25" value={`${fmt(tot_grv_1525)} m3`} />
              <ResultRow
                label={`Voyages 15/25 (${g.camion_g1525} t)`}
                value={`${fmtI((tot_grv_1525 * g.densite_gravier) / g.camion_g1525)} voyages`}
              />
            </div>
            <div>
              <p className="text-muted-foreground mt-2 mb-1 text-xs font-semibold uppercase">
                Maconnerie &amp; coffrage
              </p>
              <ResultRow label="Briques" value={`${fmtI(tot_briques)} u`} />
              <ResultRow label="Hourdis" value={`${fmtI(s10_hourdis)} u`} />
              <ResultRow label="Planches larg. 30" value={`${fmtI(tot_pl30)} u`} />
              <ResultRow label="Planches larg. 20" value={`${fmtI(tot_pl20)} u`} />
            </div>
            <div className="sm:col-span-2">
              <p className="text-muted-foreground mt-2 mb-1 text-xs font-semibold uppercase">
                Armatures
              </p>
              <div className="grid grid-cols-2 gap-x-8 sm:grid-cols-4">
                <ResultRow label="HA6" value={`${fmtI(tot_ha6)} bottes`} />
                <ResultRow label="HA8" value={`${fmtI(tot_ha8)} bottes`} />
                <ResultRow label="HA10" value={`${fmtI(tot_ha10)} bottes`} />
                <ResultRow label="HA12" value={`${fmtI(tot_ha12)} bottes`} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sauvegarder comme modele */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <Save className="text-muted-foreground h-4 w-4 shrink-0" />
            <span className="shrink-0 text-sm font-medium">Enregistrer comme modele :</span>
            <Input
              placeholder="Nom du modele (ex: Villa 3 pieces)"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="h-8 min-w-[200px] flex-1 text-sm"
            />
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
            {saveMsg && (
              <span
                className={`text-xs ${saveMsg.startsWith("Erreur") ? "text-destructive" : "text-green-600"}`}
              >
                {saveMsg}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
