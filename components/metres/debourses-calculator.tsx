"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface GlobalInputs { lin: number; }
interface Step1Inputs { larg: number; ep: number; dosage: number; }
interface Step2Inputs { larg: number; ht: number; dosage: number; n_barres: number; esp: number; long_traverse: number; }
interface Step3Inputs { larg: number; ep: number; dosage: number; n_barres: number; esp: number; long_traverse: number; }
interface Step4Inputs { n_barres: number; ht: number; np: number; esp: number; long_etrier: number; dosage: number; sect_b: number; sect_h: number; }
interface Step5Inputs { ht_murs: number; }
interface Step6Inputs { larg: number; ht: number; dosage: number; n_barres: number; esp: number; long_traverse: number; }
interface Step7Inputs { ht_murs: number; }
interface Step8Inputs { larg: number; ht: number; dosage: number; n_barres: number; esp: number; long_traverse: number; }
interface Step9Inputs { larg: number; ht: number; dosage: number; n_barres: number; esp: number; long_traverse: number; }
interface Step10Inputs { larg: number; }
interface Step11Inputs { larg_dall: number; ep: number; dosage: number; }
interface Step12Inputs { n_barres: number; np: number; esp: number; long_etrier: number; dosage: number; sect_b: number; sect_h: number; }
interface Step13Inputs { larg: number; ht: number; np: number; esp_etr: number; long_etrier: number; dosage: number; }
interface Step14Inputs { esp: number; }
interface Step15Inputs { larg_dall: number; ep: number; dosage: number; }

interface AllInputs {
  global: GlobalInputs;
  s1: Step1Inputs; s2: Step2Inputs; s3: Step3Inputs; s4: Step4Inputs;
  s5: Step5Inputs; s6: Step6Inputs; s7: Step7Inputs; s8: Step8Inputs;
  s9: Step9Inputs; s10: Step10Inputs; s11: Step11Inputs; s12: Step12Inputs;
  s13: Step13Inputs; s14: Step14Inputs; s15: Step15Inputs;
}

// ─── Calc helpers ─────────────────────────────────────────────────────────────

function vb(lin: number, larg: number, ep: number) { return lin * larg * ep; }
function cim(v: number, dosage: number) { return v * dosage; }
function sacs(kg: number) { return kg / 50; }
function t(kg: number) { return kg / 50 / 20; }
function sbl(v: number) { return v * 0.4; }
function grv(v: number) { return v * 0.8; }
function fmt(n: number, d = 2) { return isFinite(n) && !isNaN(n) ? n.toFixed(d) : "0.00"; }
function fmtI(n: number) { return isFinite(n) && !isNaN(n) ? Math.ceil(n).toString() : "0"; }

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULTS: AllInputs = {
  global: { lin: 0 },
  s1: { larg: 0.5, ep: 0.1, dosage: 250 },
  s2: { larg: 0.5, ht: 0.4, dosage: 350, n_barres: 4, esp: 0.25, long_traverse: 0.85 },
  s3: { larg: 1.0, ep: 0.15, dosage: 350, n_barres: 4, esp: 0.25, long_traverse: 1.35 },
  s4: { n_barres: 4, ht: 3.0, np: 0, esp: 0.15, long_etrier: 1.5, dosage: 350, sect_b: 0.25, sect_h: 0.25 },
  s5: { ht_murs: 1.0 },
  s6: { larg: 0.25, ht: 0.25, dosage: 350, n_barres: 4, esp: 0.25, long_traverse: 0.85 },
  s7: { ht_murs: 3.0 },
  s8: { larg: 0.25, ht: 0.25, dosage: 350, n_barres: 4, esp: 0.25, long_traverse: 0.85 },
  s9: { larg: 0.25, ht: 0.25, dosage: 350, n_barres: 4, esp: 0.25, long_traverse: 0.85 },
  s10: { larg: 0 },
  s11: { larg_dall: 0, ep: 0.05, dosage: 350 },
  s12: { n_barres: 4, np: 0, esp: 0.15, long_etrier: 1.2, dosage: 350, sect_b: 0.25, sect_h: 0.35 },
  s13: { larg: 0.25, ht: 0.35, np: 0, esp_etr: 0.15, long_etrier: 1.0, dosage: 350 },
  s14: { esp: 0.5 },
  s15: { larg_dall: 0, ep: 0.05, dosage: 350 },
};

// ─── UI primitives (defined OUTSIDE main component so refs are stable) ────────

function NumInput({ label, defaultValue, onChange, unit, step = "0.01", min = "0" }: {
  label: string;
  defaultValue: number;
  onChange: (v: number) => void;
  unit?: string;
  step?: string;
  min?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}{unit ? ` (${unit})` : ""}</Label>
      <Input
        type="number"
        min={min}
        step={step}
        defaultValue={defaultValue || ""}
        onChange={e => onChange(e.target.valueAsNumber)}
        className="h-8 text-sm"
      />
    </div>
  );
}

function ResultRow({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex items-center justify-between py-0.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}{unit ? ` ${unit}` : ""}</span>
    </div>
  );
}

function ResultBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md bg-muted/40 px-3 py-2 mt-3 space-y-0.5 border">
      {children}
    </div>
  );
}

type SectionKey = "fondation" | "elevation" | "dalle";

function Section({ sKey, title, isOpen, onToggle, children }: {
  sKey: SectionKey;
  title: string;
  isOpen: boolean;
  onToggle: (k: SectionKey) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => onToggle(sKey)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/60 transition-colors"
      >
        <span className="font-semibold text-sm tracking-wide uppercase text-primary">{title}</span>
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {isOpen && <div className="p-4 space-y-6">{children}</div>}
    </div>
  );
}

function StepCard({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs shrink-0">Etape {num}</Badge>
        <span className="text-sm font-medium">{title}</span>
      </div>
      {children}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DeboursesCalculator() {
  const [inputs, setInputs] = useState<AllInputs>(DEFAULTS);
  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    fondation: true, elevation: false, dalle: false,
  });

  const toggleSection = useCallback((k: SectionKey) => {
    setOpen(o => ({ ...o, [k]: !o[k] }));
  }, []);

  const upd = useCallback(<K extends keyof AllInputs>(step: K, field: string, val: number) => {
    setInputs(prev => ({
      ...prev,
      [step]: { ...(prev[step] as object), [field]: isNaN(val) ? 0 : val },
    }));
  }, []);

  const g = inputs.global;

  // ── Step 1 ─ Beton proprete ───────────────────────────────────────────────
  const s1 = inputs.s1;
  const s1_vb = vb(g.lin, s1.larg, s1.ep);
  const s1_cim = cim(s1_vb, s1.dosage);

  // ── Step 2 ─ Semelles filantes ────────────────────────────────────────────
  const s2 = inputs.s2;
  const s2_vb = vb(g.lin, s2.larg, s2.ht);
  const s2_cim = cim(s2_vb, s2.dosage);
  const s2_ha10 = g.lin * s2.n_barres / 12 / 13;
  const s2_ha6  = (g.lin / s2.esp) * s2.long_traverse / 12 / 36;

  // ── Step 3 ─ Paillasses ───────────────────────────────────────────────────
  const s3 = inputs.s3;
  const s3_vb = vb(g.lin, s3.larg, s3.ep);
  const s3_cim = cim(s3_vb, s3.dosage);
  const s3_ha10 = g.lin * s3.n_barres / 12 / 13;
  const s3_ha6  = (g.lin / s3.esp) * s3.long_traverse / 12 / 36;
  const s3_pl30 = (g.lin / 4) * 2;
  const s3_pl20 = g.lin / 4;

  // ── Step 4 ─ Poteaux ──────────────────────────────────────────────────────
  const s4 = inputs.s4;
  const s4_vb  = s4.sect_b * s4.sect_h * s4.ht * s4.np;
  const s4_cim = cim(s4_vb, s4.dosage);
  const s4_ha12 = s4.n_barres * s4.ht * s4.np / 12 / 9;
  const s4_ha6  = (s4.ht * s4.np) / s4.esp * s4.long_etrier / 12 / 36;

  // ── Step 5 ─ Murs 15 plein ────────────────────────────────────────────────
  const s5 = inputs.s5;
  const s5_briques = g.lin * s5.ht_murs * 12;

  // ── Step 6 ─ Chainage bas ─────────────────────────────────────────────────
  const s6 = inputs.s6;
  const s6_vb  = vb(g.lin, s6.larg, s6.ht);
  const s6_cim = cim(s6_vb, s6.dosage);
  const s6_ha10 = g.lin * s6.n_barres / 12 / 13;
  const s6_ha6  = (g.lin / s6.esp) * s6.long_traverse / 12 / 36;

  // ── Step 7 ─ Murs 15 creux ────────────────────────────────────────────────
  const s7 = inputs.s7;
  const s7_briques = g.lin * s7.ht_murs * 12;

  // ── Step 8 ─ Chainage haut RDC ────────────────────────────────────────────
  const s8 = inputs.s8;
  const s8_vb  = vb(g.lin, s8.larg, s8.ht);
  const s8_cim = cim(s8_vb, s8.dosage);
  const s8_ha10 = g.lin * s8.n_barres / 12 / 13;
  const s8_ha6  = (g.lin / s8.esp) * s8.long_traverse / 12 / 36;

  // ── Step 9 ─ Chainage dalle ───────────────────────────────────────────────
  const s9 = inputs.s9;
  const s9_vb  = vb(g.lin, s9.larg, s9.ht);
  const s9_cim = cim(s9_vb, s9.dosage);
  const s9_ha10 = g.lin * s9.n_barres / 12 / 13;
  const s9_ha6  = (g.lin / s9.esp) * s9.long_traverse / 12 / 36;

  // ── Step 10 ─ Hourdis ────────────────────────────────────────────────────
  const s10 = inputs.s10;
  const s10_hourdis = g.lin * s10.larg * 10;
  const s10_n_nerv  = s10.larg > 0 ? Math.floor(s10.larg / 0.5) : 0;

  // ── Step 11 ─ Beton compression ──────────────────────────────────────────
  const s11 = inputs.s11;
  const s11_vb  = s11.larg_dall * g.lin * s11.ep * 2;
  const s11_cim = cim(s11_vb, s11.dosage);

  // ── Step 12 ─ Poutres ─────────────────────────────────────────────────────
  const s12 = inputs.s12;
  const s12_vb  = s12.sect_b * s12.sect_h * g.lin * s12.np;
  const s12_cim = cim(s12_vb, s12.dosage);
  // longueur des barres = lin (portée), pas ht (hauteur de section)
  const s12_ha12 = s12.n_barres * g.lin * s12.np / 12 / 9;
  const s12_ha6  = (g.lin * s12.np) / s12.esp * s12.long_etrier / 12 / 36;

  // ── Step 13 ─ Nervures ────────────────────────────────────────────────────
  const s13 = inputs.s13;
  const s13_vb  = s13.larg * s13.ht * g.lin * s13.np;
  const s13_cim = cim(s13_vb, s13.dosage);
  const s13_ha10 = g.lin * 2 * s13.np / 12 / 13;
  const s13_ha6  = (s13.ht * s13.np) / s13.esp_etr * s13.long_etrier / 12 / 36;

  // ── Step 14 ─ Quadrillage ─────────────────────────────────────────────────
  const s14 = inputs.s14;
  const s14_ha8_long  = g.lin / s14.esp / 21;
  const s14_ha6_trans = s10.larg > 0 ? s10.larg / s14.esp / 36 : 0;

  // ── Step 15 ─ Coulage dalle ───────────────────────────────────────────────
  const s15 = inputs.s15;
  const s15_surf = s15.larg_dall * g.lin;
  const s15_vb   = s15_surf * s15.ep;
  const s15_cim  = cim(s15_vb, s15.dosage);

  // ── Recapitulatif ─────────────────────────────────────────────────────────
  const vb_0525 = [s1_vb, s2_vb, s3_vb, s11_vb, s15_vb];   // proprete, semelles, paillasses, compression, dalle
  const vb_1525 = [s4_vb, s6_vb, s8_vb, s9_vb, s12_vb, s13_vb]; // poteaux, chainages, poutres, nervures
  const allCim = [s1_cim, s2_cim, s3_cim, s4_cim, s6_cim, s8_cim, s9_cim, s11_cim, s12_cim, s13_cim, s15_cim];
  const tot_cim = allCim.reduce((a, b) => a + b, 0);
  const allVb = [...vb_0525, ...vb_1525];
  const tot_sbl   = allVb.reduce((a, b) => a + sbl(b), 0);
  const tot_grv_0525 = vb_0525.reduce((a, b) => a + grv(b), 0);
  const tot_grv_1525 = vb_1525.reduce((a, b) => a + grv(b), 0);
  const tot_briques = s5_briques + s7_briques;
  const tot_ha6  = s2_ha6 + s3_ha6 + s6_ha6 + s8_ha6 + s9_ha6 + s12_ha6 + s13_ha6 + s14_ha6_trans;
  const tot_ha8  = s14_ha8_long;
  const tot_ha10 = s2_ha10 + s3_ha10 + s6_ha10 + s8_ha10 + s9_ha10 + s13_ha10;
  const tot_ha12 = s4_ha12 + s12_ha12;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Lineaire global */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Parametre global</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs">
            <NumInput label="Lineaire total" unit="m" defaultValue={g.lin}
              onChange={v => upd("global", "lin", v)} step="0.5" />
          </div>
        </CardContent>
      </Card>

      {/* FONDATION */}
      <Section sKey="fondation" title="Fondation — Etapes 1 a 6"
        isOpen={open.fondation} onToggle={toggleSection}>

        <StepCard num={1} title="Beton de proprete">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <NumInput label="Largeur" unit="m" defaultValue={s1.larg} onChange={v => upd("s1", "larg", v)} />
            <NumInput label="Epaisseur" unit="m" defaultValue={s1.ep} onChange={v => upd("s1", "ep", v)} />
            <NumInput label="Dosage" unit="kg/m3" defaultValue={s1.dosage} onChange={v => upd("s1", "dosage", v)} step="1" />
          </div>
          <ResultBlock>
            <ResultRow label="Volume beton" value={fmt(s1_vb)} unit="m3" />
            <ResultRow label="Ciment" value={`${fmt(s1_cim)} kg  —  ${fmt(t(s1_cim))} t`} />
            <ResultRow label="Sable" value={fmt(sbl(s1_vb))} unit="m3" />
            <ResultRow label="Gravier 05/25" value={fmt(grv(s1_vb))} unit="m3" />
          </ResultBlock>
        </StepCard>

        <StepCard num={2} title="Semelles filantes">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <NumInput label="Largeur" unit="m" defaultValue={s2.larg} onChange={v => upd("s2", "larg", v)} />
            <NumInput label="Hauteur" unit="m" defaultValue={s2.ht} onChange={v => upd("s2", "ht", v)} />
            <NumInput label="Dosage" unit="kg/m3" defaultValue={s2.dosage} onChange={v => upd("s2", "dosage", v)} step="1" />
            <NumInput label="Nbre barres HA10" defaultValue={s2.n_barres} onChange={v => upd("s2", "n_barres", v)} step="1" min="1" />
            <NumInput label="Esp. traverses" unit="m" defaultValue={s2.esp} onChange={v => upd("s2", "esp", v)} />
            <NumInput label="Long. traverse" unit="m" defaultValue={s2.long_traverse} onChange={v => upd("s2", "long_traverse", v)} />
          </div>
          <ResultBlock>
            <ResultRow label="Volume beton" value={fmt(s2_vb)} unit="m3" />
            <ResultRow label="Ciment" value={`${fmt(s2_cim)} kg  —  ${fmt(t(s2_cim))} t`} />
            <ResultRow label="Sable" value={fmt(sbl(s2_vb))} unit="m3" />
            <ResultRow label="Gravier 05/25" value={fmt(grv(s2_vb))} unit="m3" />
            <ResultRow label="HA10 (barres long.)" value={`${fmtI(s2_ha10)} bottes`} />
            <ResultRow label="HA6 (traverses)" value={`${fmtI(s2_ha6)} bottes`} />
          </ResultBlock>
        </StepCard>

        <StepCard num={3} title="Paillasses">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <NumInput label="Largeur" unit="m" defaultValue={s3.larg} onChange={v => upd("s3", "larg", v)} />
            <NumInput label="Epaisseur" unit="m" defaultValue={s3.ep} onChange={v => upd("s3", "ep", v)} />
            <NumInput label="Dosage" unit="kg/m3" defaultValue={s3.dosage} onChange={v => upd("s3", "dosage", v)} step="1" />
            <NumInput label="Nbre barres HA10" defaultValue={s3.n_barres} onChange={v => upd("s3", "n_barres", v)} step="1" min="1" />
            <NumInput label="Esp. traverses" unit="m" defaultValue={s3.esp} onChange={v => upd("s3", "esp", v)} />
            <NumInput label="Long. traverse" unit="m" defaultValue={s3.long_traverse} onChange={v => upd("s3", "long_traverse", v)} />
          </div>
          <ResultBlock>
            <ResultRow label="Volume beton" value={fmt(s3_vb)} unit="m3" />
            <ResultRow label="Ciment" value={`${fmt(s3_cim)} kg  —  ${fmt(t(s3_cim))} t`} />
            <ResultRow label="Sable" value={fmt(sbl(s3_vb))} unit="m3" />
            <ResultRow label="Gravier 05/25" value={fmt(grv(s3_vb))} unit="m3" />
            <ResultRow label="HA10" value={`${fmtI(s3_ha10)} bottes`} />
            <ResultRow label="HA6" value={`${fmtI(s3_ha6)} bottes`} />
            <ResultRow label="Planches larg. 30" value={`${fmtI(s3_pl30)} u`} />
            <ResultRow label="Planches larg. 20" value={`${fmtI(s3_pl20)} u`} />
          </ResultBlock>
        </StepCard>

        <StepCard num={4} title="Poteaux (fondation)">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <NumInput label="Nbre poteaux" defaultValue={s4.np} onChange={v => upd("s4", "np", v)} step="1" />
            <NumInput label="Hauteur" unit="m" defaultValue={s4.ht} onChange={v => upd("s4", "ht", v)} />
            <NumInput label="Dosage" unit="kg/m3" defaultValue={s4.dosage} onChange={v => upd("s4", "dosage", v)} step="1" />
            <NumInput label="Section b" unit="m" defaultValue={s4.sect_b} onChange={v => upd("s4", "sect_b", v)} />
            <NumInput label="Section h" unit="m" defaultValue={s4.sect_h} onChange={v => upd("s4", "sect_h", v)} />
            <NumInput label="Nbre HA12" defaultValue={s4.n_barres} onChange={v => upd("s4", "n_barres", v)} step="1" />
            <NumInput label="Esp. etriers" unit="m" defaultValue={s4.esp} onChange={v => upd("s4", "esp", v)} />
            <NumInput label="Long. etrier" unit="m" defaultValue={s4.long_etrier} onChange={v => upd("s4", "long_etrier", v)} />
          </div>
          <ResultBlock>
            <ResultRow label="Volume beton" value={fmt(s4_vb)} unit="m3" />
            <ResultRow label="Ciment" value={`${fmt(s4_cim)} kg  —  ${fmt(t(s4_cim))} t`} />
            <ResultRow label="Sable" value={fmt(sbl(s4_vb))} unit="m3" />
            <ResultRow label="Gravier 15/25" value={fmt(grv(s4_vb))} unit="m3" />
            <ResultRow label="HA12 (barres long.)" value={`${fmtI(s4_ha12)} bottes`} />
            <ResultRow label="HA6 (etriers)" value={`${fmtI(s4_ha6)} bottes`} />
          </ResultBlock>
        </StepCard>

        <StepCard num={5} title="Murs 15 plein (soubassement)">
          <div className="max-w-xs">
            <NumInput label="Hauteur murs" unit="m" defaultValue={s5.ht_murs} onChange={v => upd("s5", "ht_murs", v)} />
          </div>
          <ResultBlock>
            <ResultRow label="Briques" value={`${fmtI(s5_briques)} u`} />
          </ResultBlock>
        </StepCard>

        <StepCard num={6} title="Chainage bas">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <NumInput label="Largeur" unit="m" defaultValue={s6.larg} onChange={v => upd("s6", "larg", v)} />
            <NumInput label="Hauteur" unit="m" defaultValue={s6.ht} onChange={v => upd("s6", "ht", v)} />
            <NumInput label="Dosage" unit="kg/m3" defaultValue={s6.dosage} onChange={v => upd("s6", "dosage", v)} step="1" />
            <NumInput label="Nbre barres HA10" defaultValue={s6.n_barres} onChange={v => upd("s6", "n_barres", v)} step="1" min="1" />
            <NumInput label="Esp. traverses" unit="m" defaultValue={s6.esp} onChange={v => upd("s6", "esp", v)} />
            <NumInput label="Long. traverse" unit="m" defaultValue={s6.long_traverse} onChange={v => upd("s6", "long_traverse", v)} />
          </div>
          <ResultBlock>
            <ResultRow label="Volume beton" value={fmt(s6_vb)} unit="m3" />
            <ResultRow label="Ciment" value={`${fmt(s6_cim)} kg  —  ${fmt(t(s6_cim))} t`} />
            <ResultRow label="Sable" value={fmt(sbl(s6_vb))} unit="m3" />
            <ResultRow label="Gravier 15/25" value={fmt(grv(s6_vb))} unit="m3" />
            <ResultRow label="HA10" value={`${fmtI(s6_ha10)} bottes`} />
            <ResultRow label="HA6" value={`${fmtI(s6_ha6)} bottes`} />
          </ResultBlock>
        </StepCard>

      </Section>

      {/* ELEVATION */}
      <Section sKey="elevation" title="Elevation — Etapes 7 a 8"
        isOpen={open.elevation} onToggle={toggleSection}>

        <StepCard num={7} title="Murs 15 creux (elevation)">
          <div className="max-w-xs">
            <NumInput label="Hauteur murs" unit="m" defaultValue={s7.ht_murs} onChange={v => upd("s7", "ht_murs", v)} />
          </div>
          <ResultBlock>
            <ResultRow label="Briques" value={`${fmtI(s7_briques)} u`} />
          </ResultBlock>
        </StepCard>

        <StepCard num={8} title="Chainage haut RDC">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <NumInput label="Largeur" unit="m" defaultValue={s8.larg} onChange={v => upd("s8", "larg", v)} />
            <NumInput label="Hauteur" unit="m" defaultValue={s8.ht} onChange={v => upd("s8", "ht", v)} />
            <NumInput label="Dosage" unit="kg/m3" defaultValue={s8.dosage} onChange={v => upd("s8", "dosage", v)} step="1" />
            <NumInput label="Nbre barres HA10" defaultValue={s8.n_barres} onChange={v => upd("s8", "n_barres", v)} step="1" min="1" />
            <NumInput label="Esp. traverses" unit="m" defaultValue={s8.esp} onChange={v => upd("s8", "esp", v)} />
            <NumInput label="Long. traverse" unit="m" defaultValue={s8.long_traverse} onChange={v => upd("s8", "long_traverse", v)} />
          </div>
          <ResultBlock>
            <ResultRow label="Volume beton" value={fmt(s8_vb)} unit="m3" />
            <ResultRow label="Ciment" value={`${fmt(s8_cim)} kg  —  ${fmt(t(s8_cim))} t`} />
            <ResultRow label="Sable" value={fmt(sbl(s8_vb))} unit="m3" />
            <ResultRow label="Gravier 15/25" value={fmt(grv(s8_vb))} unit="m3" />
            <ResultRow label="HA10" value={`${fmtI(s8_ha10)} bottes`} />
            <ResultRow label="HA6" value={`${fmtI(s8_ha6)} bottes`} />
          </ResultBlock>
        </StepCard>

      </Section>

      {/* PLANCHER HAUT */}
      <Section sKey="dalle" title="Plancher haut (dalle) — Etapes 9 a 15"
        isOpen={open.dalle} onToggle={toggleSection}>

        <StepCard num={9} title="Chainage dalle">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <NumInput label="Largeur" unit="m" defaultValue={s9.larg} onChange={v => upd("s9", "larg", v)} />
            <NumInput label="Hauteur" unit="m" defaultValue={s9.ht} onChange={v => upd("s9", "ht", v)} />
            <NumInput label="Dosage" unit="kg/m3" defaultValue={s9.dosage} onChange={v => upd("s9", "dosage", v)} step="1" />
            <NumInput label="Nbre barres HA10" defaultValue={s9.n_barres} onChange={v => upd("s9", "n_barres", v)} step="1" min="1" />
            <NumInput label="Esp. traverses" unit="m" defaultValue={s9.esp} onChange={v => upd("s9", "esp", v)} />
            <NumInput label="Long. traverse" unit="m" defaultValue={s9.long_traverse} onChange={v => upd("s9", "long_traverse", v)} />
          </div>
          <ResultBlock>
            <ResultRow label="Volume beton" value={fmt(s9_vb)} unit="m3" />
            <ResultRow label="Ciment" value={`${fmt(s9_cim)} kg  —  ${fmt(t(s9_cim))} t`} />
            <ResultRow label="Sable" value={fmt(sbl(s9_vb))} unit="m3" />
            <ResultRow label="Gravier 15/25" value={fmt(grv(s9_vb))} unit="m3" />
            <ResultRow label="HA10" value={`${fmtI(s9_ha10)} bottes`} />
            <ResultRow label="HA6" value={`${fmtI(s9_ha6)} bottes`} />
          </ResultBlock>
        </StepCard>

        <StepCard num={10} title="Hourdis">
          <div className="max-w-xs">
            <NumInput label="Largeur dalle" unit="m" defaultValue={s10.larg} onChange={v => upd("s10", "larg", v)} />
          </div>
          <ResultBlock>
            <ResultRow label="Hourdis" value={`${fmtI(s10_hourdis)} u`} />
            <ResultRow label="Nervures potentielles" value={`${s10_n_nerv} (tous les 0.50 m)`} />
          </ResultBlock>
        </StepCard>

        <StepCard num={11} title="Beton de compression">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <NumInput label="Largeur dalle" unit="m" defaultValue={s11.larg_dall} onChange={v => upd("s11", "larg_dall", v)} />
            <NumInput label="Epaisseur" unit="m" defaultValue={s11.ep} onChange={v => upd("s11", "ep", v)} />
            <NumInput label="Dosage" unit="kg/m3" defaultValue={s11.dosage} onChange={v => upd("s11", "dosage", v)} step="1" />
          </div>
          <ResultBlock>
            <ResultRow label="Volume beton" value={fmt(s11_vb)} unit="m3" />
            <ResultRow label="Ciment" value={`${fmt(s11_cim)} kg  —  ${fmt(t(s11_cim))} t`} />
            <ResultRow label="Sable" value={fmt(sbl(s11_vb))} unit="m3" />
            <ResultRow label="Gravier 05/25" value={fmt(grv(s11_vb))} unit="m3" />
          </ResultBlock>
        </StepCard>

        <StepCard num={12} title="Poutres">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <NumInput label="Nbre poutres" defaultValue={s12.np} onChange={v => upd("s12", "np", v)} step="1" />
            <NumInput label="Section b" unit="m" defaultValue={s12.sect_b} onChange={v => upd("s12", "sect_b", v)} />
            <NumInput label="Section h" unit="m" defaultValue={s12.sect_h} onChange={v => upd("s12", "sect_h", v)} />
            <NumInput label="Nbre HA12" defaultValue={s12.n_barres} onChange={v => upd("s12", "n_barres", v)} step="1" />
            <NumInput label="Dosage" unit="kg/m3" defaultValue={s12.dosage} onChange={v => upd("s12", "dosage", v)} step="1" />
            <NumInput label="Esp. etriers" unit="m" defaultValue={s12.esp} onChange={v => upd("s12", "esp", v)} />
            <NumInput label="Long. etrier" unit="m" defaultValue={s12.long_etrier} onChange={v => upd("s12", "long_etrier", v)} />
          </div>
          <ResultBlock>
            <ResultRow label="Volume beton" value={fmt(s12_vb)} unit="m3" />
            <ResultRow label="Ciment" value={`${fmt(s12_cim)} kg  —  ${fmt(t(s12_cim))} t`} />
            <ResultRow label="Sable" value={fmt(sbl(s12_vb))} unit="m3" />
            <ResultRow label="Gravier 15/25" value={fmt(grv(s12_vb))} unit="m3" />
            <ResultRow label="HA12" value={`${fmtI(s12_ha12)} bottes`} />
            <ResultRow label="HA6 (etriers)" value={`${fmtI(s12_ha6)} bottes`} />
          </ResultBlock>
        </StepCard>

        <StepCard num={13} title="Nervures">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <NumInput label="Nbre nervures" defaultValue={s13.np} onChange={v => upd("s13", "np", v)} step="1" />
            <NumInput label="Larg. nervure" unit="m" defaultValue={s13.larg} onChange={v => upd("s13", "larg", v)} />
            <NumInput label="Ht nervure" unit="m" defaultValue={s13.ht} onChange={v => upd("s13", "ht", v)} />
            <NumInput label="Dosage" unit="kg/m3" defaultValue={s13.dosage} onChange={v => upd("s13", "dosage", v)} step="1" />
            <NumInput label="Esp. etriers" unit="m" defaultValue={s13.esp_etr} onChange={v => upd("s13", "esp_etr", v)} />
            <NumInput label="Long. etrier" unit="m" defaultValue={s13.long_etrier} onChange={v => upd("s13", "long_etrier", v)} />
          </div>
          <ResultBlock>
            <ResultRow label="Volume beton" value={fmt(s13_vb)} unit="m3" />
            <ResultRow label="Ciment" value={`${fmt(s13_cim)} kg  —  ${fmt(t(s13_cim))} t`} />
            <ResultRow label="Sable" value={fmt(sbl(s13_vb))} unit="m3" />
            <ResultRow label="Gravier 15/25" value={fmt(grv(s13_vb))} unit="m3" />
            <ResultRow label="HA10 (2 barres)" value={`${fmtI(s13_ha10)} bottes`} />
            <ResultRow label="HA6 (etriers)" value={`${fmtI(s13_ha6)} bottes`} />
          </ResultBlock>
        </StepCard>

        <StepCard num={14} title="Quadrillage (treillis soude)">
          <div className="max-w-xs">
            <NumInput label="Espacement" unit="m" defaultValue={s14.esp} onChange={v => upd("s14", "esp", v)} />
          </div>
          <p className="text-xs text-muted-foreground">Longueur dalle = lineaire ; Largeur = etape 10</p>
          <ResultBlock>
            <ResultRow label="HA8 longitudinal" value={`${fmtI(s14_ha8_long)} bottes`} />
            <ResultRow label="HA6 transversal" value={`${fmtI(s14_ha6_trans)} bottes`} />
          </ResultBlock>
        </StepCard>

        <StepCard num={15} title="Coulage dalle">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <NumInput label="Largeur dalle" unit="m" defaultValue={s15.larg_dall} onChange={v => upd("s15", "larg_dall", v)} />
            <NumInput label="Epaisseur" unit="m" defaultValue={s15.ep} onChange={v => upd("s15", "ep", v)} />
            <NumInput label="Dosage" unit="kg/m3" defaultValue={s15.dosage} onChange={v => upd("s15", "dosage", v)} step="1" />
          </div>
          <ResultBlock>
            <ResultRow label="Surface dalle" value={fmt(s15_surf)} unit="m2" />
            <ResultRow label="Volume beton" value={fmt(s15_vb)} unit="m3" />
            <ResultRow label="Ciment" value={`${fmt(s15_cim)} kg  —  ${fmt(t(s15_cim))} t`} />
            <ResultRow label="Sable" value={fmt(sbl(s15_vb))} unit="m3" />
            <ResultRow label="Gravier 05/25" value={fmt(grv(s15_vb))} unit="m3" />
          </ResultBlock>
        </StepCard>

      </Section>

      {/* RECAPITULATIF */}
      <Card className="border-2 border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base uppercase tracking-wide text-primary">
            Recapitulatif — Debourses secs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-1 mt-2">Liant &amp; granulats</p>
              <ResultRow label="Ciment total" value={`${fmt(tot_cim)} kg = ${fmt(tot_cim / 1000)} t`} />
              <ResultRow label="Sacs (50 kg)" value={`${fmtI(sacs(tot_cim))} sacs`} />
              <ResultRow label="Sable" value={`${fmt(tot_sbl)} m3`} />
              <ResultRow label="Voyages sable (6 m3)" value={`${fmtI(tot_sbl / 6)} voyages`} />
              <ResultRow label="Gravier 05/25" value={`${fmt(tot_grv_0525)} m3`} />
              <ResultRow label="Voyages 05/25 (20 t)" value={`${fmtI(tot_grv_0525 * 1.5 / 20)} voyages`} />
              <ResultRow label="Gravier 15/25" value={`${fmt(tot_grv_1525)} m3`} />
              <ResultRow label="Voyages 15/25 (25 t)" value={`${fmtI(tot_grv_1525 * 1.5 / 25)} voyages`} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-1 mt-2">Maconnerie &amp; coffrage</p>
              <ResultRow label="Briques" value={`${fmtI(tot_briques)} u`} />
              <ResultRow label="Hourdis" value={`${fmtI(s10_hourdis)} u`} />
              <ResultRow label="Planches larg. 30" value={`${fmtI(s3_pl30)} u`} />
              <ResultRow label="Planches larg. 20" value={`${fmtI(s3_pl20)} u`} />
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-1 mt-2">Armatures</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8">
                <ResultRow label="HA6" value={`${fmtI(tot_ha6)} bottes`} />
                <ResultRow label="HA8" value={`${fmtI(tot_ha8)} bottes`} />
                <ResultRow label="HA10" value={`${fmtI(tot_ha10)} bottes`} />
                <ResultRow label="HA12" value={`${fmtI(tot_ha12)} bottes`} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
