"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface GlobalInputs {
  lin: number;     // linÃ©aire (m)
}

interface Step1Inputs { larg: number; ep: number; dosage: number; }
interface Step2Inputs { larg: number; ht: number; dosage: number; n_barres: number; esp: number; long_traverse: number; }
interface Step3Inputs { larg: number; ep: number; dosage: number; n_barres: number; esp: number; long_traverse: number; }
interface Step4Inputs { n_barres: number; ht: number; np: number; esp: number; long_etrier: number; dosage: number; sect_b: number; sect_h: number; }
interface Step5Inputs { ht_murs: number; dosage: number; ep: number; }
interface Step6Inputs { larg: number; ht: number; dosage: number; n_barres: number; esp: number; long_traverse: number; }
interface Step7Inputs { ht_murs: number; dosage: number; ep: number; }
interface Step8Inputs { larg: number; ht: number; dosage: number; n_barres: number; esp: number; long_traverse: number; }
interface Step9Inputs { larg: number; ht: number; dosage: number; n_barres: number; esp: number; long_traverse: number; }
interface Step10Inputs { larg: number; }
interface Step11Inputs { larg_dall: number; ep: number; dosage: number; }
interface Step12Inputs { n_barres: number; ht: number; np: number; esp: number; long_etrier: number; dosage: number; sect_b: number; sect_h: number; }
interface Step13Inputs { larg: number; ht: number; np: number; esp_etr: number; long_etrier: number; dosage: number; }
interface Step14Inputs { esp: number; }
interface Step15Inputs { larg_dall: number; ep: number; dosage: number; }

interface AllInputs {
  global: GlobalInputs;
  s1: Step1Inputs;
  s2: Step2Inputs;
  s3: Step3Inputs;
  s4: Step4Inputs;
  s5: Step5Inputs;
  s6: Step6Inputs;
  s7: Step7Inputs;
  s8: Step8Inputs;
  s9: Step9Inputs;
  s10: Step10Inputs;
  s11: Step11Inputs;
  s12: Step12Inputs;
  s13: Step13Inputs;
  s14: Step14Inputs;
  s15: Step15Inputs;
}

// â”€â”€â”€ Calculation helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function vb(lin: number, larg: number, ep: number) { return lin * larg * ep; }
function ciment_kg(v: number, dosage: number) { return v * dosage; }
function sacs(kg: number) { return kg / 50; }
function tonnes(kg: number) { return kg / 50 / 20; }
function sable(v: number) { return v * 0.4; }
function gravier(v: number) { return v * 0.8; }
function fmt(n: number, d = 2) { return isFinite(n) ? n.toFixed(d) : "0.00"; }
function fmtI(n: number) { return isFinite(n) ? Math.ceil(n).toString() : "0"; }

// â”€â”€â”€ Default values â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const defaults: AllInputs = {
  global: { lin: 0 },
  s1: { larg: 0.5, ep: 0.1, dosage: 250 },
  s2: { larg: 0.5, ht: 0.4, dosage: 350, n_barres: 4, esp: 0.25, long_traverse: 0.85 },
  s3: { larg: 1.0, ep: 0.15, dosage: 350, n_barres: 4, esp: 0.25, long_traverse: 1.35 },
  s4: { n_barres: 4, ht: 3.0, np: 0, esp: 0.15, long_etrier: 1.5, dosage: 350, sect_b: 0.25, sect_h: 0.25 },
  s5: { ht_murs: 1.0, dosage: 0, ep: 0.15 },
  s6: { larg: 0.25, ht: 0.25, dosage: 350, n_barres: 4, esp: 0.25, long_traverse: 0.85 },
  s7: { ht_murs: 3.0, dosage: 0, ep: 0.15 },
  s8: { larg: 0.25, ht: 0.25, dosage: 350, n_barres: 4, esp: 0.25, long_traverse: 0.85 },
  s9: { larg: 0.25, ht: 0.25, dosage: 350, n_barres: 4, esp: 0.25, long_traverse: 0.85 },
  s10: { larg: 0 },
  s11: { larg_dall: 0, ep: 0.05, dosage: 350 },
  s12: { n_barres: 4, ht: 0.4, np: 0, esp: 0.15, long_etrier: 1.2, dosage: 350, sect_b: 0.25, sect_h: 0.35 },
  s13: { larg: 0.25, ht: 0.35, np: 0, esp_etr: 0.15, long_etrier: 1.0, dosage: 350 },
  s14: { esp: 0.5 },
  s15: { larg_dall: 0, ep: 0.05, dosage: 350 },
};

// â”€â”€â”€ Section toggle state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type SectionKey = "fondation" | "elevation" | "dalle";

// â”€â”€â”€ Main component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function DeboursesCalculator() {
  const [inputs, setInputs] = useState<AllInputs>(defaults);
  const [open, setOpen] = useState<Record<SectionKey, boolean>>({ fondation: true, elevation: false, dalle: false });

  const set = useCallback(<K extends keyof AllInputs>(step: K) =>
    (field: string, val: number) => {
      setInputs(prev => ({
        ...prev,
        [step]: { ...(prev[step] as object), [field]: isNaN(val) ? 0 : val },
      }));
    }, []);

  const g = inputs.global;

  // â”€â”€ Step 1 : BÃ©ton propretÃ© â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const s1 = inputs.s1;
  const s1_vb = vb(g.lin, s1.larg, s1.ep);
  const s1_cim = ciment_kg(s1_vb, s1.dosage);
  const s1_sable = sable(s1_vb);
  const s1_gravier = gravier(s1_vb);

  // â”€â”€ Step 2 : Semelles filantes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const s2 = inputs.s2;
  const s2_vb = vb(g.lin, s2.larg, s2.ht);
  const s2_cim = ciment_kg(s2_vb, s2.dosage);
  const s2_sable = sable(s2_vb);
  const s2_gravier = gravier(s2_vb);
  const s2_ha10 = g.lin * s2.n_barres / 12 / 13;
  const s2_ha6 = (g.lin / s2.esp) * s2.long_traverse / 12 / 36;

  // â”€â”€ Step 3 : Paillasses â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const s3 = inputs.s3;
  const s3_vb = vb(g.lin, s3.larg, s3.ep);
  const s3_cim = ciment_kg(s3_vb, s3.dosage);
  const s3_sable = sable(s3_vb);
  const s3_gravier = gravier(s3_vb);
  const s3_ha10 = g.lin * s3.n_barres / 12 / 13;
  const s3_ha6 = (g.lin / s3.esp) * s3.long_traverse / 12 / 36;
  const s3_pl30 = (g.lin / 4) * 2;
  const s3_pl20 = g.lin / 4;

  // â”€â”€ Step 4 : Poteaux â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const s4 = inputs.s4;
  const s4_vb = s4.sect_b * s4.sect_h * s4.ht * s4.np;
  const s4_cim = ciment_kg(s4_vb, s4.dosage);
  const s4_sable = sable(s4_vb);
  const s4_gravier = gravier(s4_vb);
  const s4_ha12 = s4.n_barres * s4.ht * s4.np / 12 / 9;
  const s4_ha6 = (s4.ht * s4.np) / s4.esp * s4.long_etrier / 12 / 36;

  // â”€â”€ Step 5 : Murs 15 plein â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const s5 = inputs.s5;
  const s5_briques = g.lin * s5.ht_murs * 12;

  // â”€â”€ Step 6 : Chainage bas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const s6 = inputs.s6;
  const s6_vb = vb(g.lin, s6.larg, s6.ht);
  const s6_cim = ciment_kg(s6_vb, s6.dosage);
  const s6_sable = sable(s6_vb);
  const s6_gravier = gravier(s6_vb);
  const s6_ha10 = g.lin * s6.n_barres / 12 / 13;
  const s6_ha6 = (g.lin / s6.esp) * s6.long_traverse / 12 / 36;

  // â”€â”€ Step 7 : Murs 15 creux â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const s7 = inputs.s7;
  const s7_briques = g.lin * s7.ht_murs * 12;

  // â”€â”€ Step 8 : Chainage haut RDC â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const s8 = inputs.s8;
  const s8_vb = vb(g.lin, s8.larg, s8.ht);
  const s8_cim = ciment_kg(s8_vb, s8.dosage);
  const s8_sable = sable(s8_vb);
  const s8_gravier = gravier(s8_vb);
  const s8_ha10 = g.lin * s8.n_barres / 12 / 13;
  const s8_ha6 = (g.lin / s8.esp) * s8.long_traverse / 12 / 36;

  // â”€â”€ Step 9 : Chainage dalle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const s9 = inputs.s9;
  const s9_vb = vb(g.lin, s9.larg, s9.ht);
  const s9_cim = ciment_kg(s9_vb, s9.dosage);
  const s9_sable = sable(s9_vb);
  const s9_gravier = gravier(s9_vb);
  const s9_ha10 = g.lin * s9.n_barres / 12 / 13;
  const s9_ha6 = (g.lin / s9.esp) * s9.long_traverse / 12 / 36;

  // â”€â”€ Step 10 : Hourdis â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const s10 = inputs.s10;
  const s10_hourdis = g.lin * s10.larg * 10;

  // â”€â”€ Step 11 : BÃ©ton compression â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const s11 = inputs.s11;
  const s11_vb = s11.larg_dall * g.lin * s11.ep * 2;
  const s11_cim = ciment_kg(s11_vb, s11.dosage);
  const s11_sable = sable(s11_vb);
  const s11_gravier = gravier(s11_vb);

  // â”€â”€ Step 12 : Poutres â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const s12 = inputs.s12;
  const s12_vb = s12.sect_b * s12.sect_h * g.lin * s12.np;
  const s12_cim = ciment_kg(s12_vb, s12.dosage);
  const s12_sable = sable(s12_vb);
  const s12_gravier = gravier(s12_vb);
  const s12_ha12 = s12.n_barres * s12.ht * s12.np / 12 / 9;
  const s12_ha6 = (s12.ht * s12.np) / s12.esp * s12.long_etrier / 12 / 36;

  // â”€â”€ Step 13 : Nervures â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const s13 = inputs.s13;
  const s13_n_nerv = s10.larg > 0 ? Math.floor(s10.larg / 0.5) : 0;
  const s13_vb = s13.larg * s13.ht * g.lin * s13.np;
  const s13_cim = ciment_kg(s13_vb, s13.dosage);
  const s13_sable = sable(s13_vb);
  const s13_gravier = gravier(s13_vb);
  const s13_ha10 = g.lin * 2 * s13.np / 12 / 13;
  const s13_ha6 = (s13.ht * s13.np) / s13.esp_etr * s13.long_etrier / 12 / 36;

  // â”€â”€ Step 14 : Quadrillage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const s14 = inputs.s14;
  const s14_ha8_long = g.lin / s14.esp / 21;
  const s14_ha6_trans = s10.larg > 0 ? s10.larg / s14.esp / 36 : 0;

  // â”€â”€ Step 15 : Coulage dalle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const s15 = inputs.s15;
  const s15_surf = s15.larg_dall * g.lin;
  const s15_vb = s15_surf * s15.ep;
  const s15_cim = ciment_kg(s15_vb, s15.dosage);
  const s15_sable = sable(s15_vb);
  const s15_gravier = gravier(s15_vb);

  // â”€â”€ RECAP â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const total_cim_kg = s1_cim + s2_cim + s3_cim + s4_cim + s6_cim + s8_cim + s9_cim + s11_cim + s12_cim + s13_cim + s15_cim;
  const total_sable = s1_sable + s2_sable + s3_sable + s4_sable + s6_sable + s8_sable + s9_sable + s11_sable + s12_sable + s13_sable + s15_sable;
  const total_gravier = s1_gravier + s2_gravier + s3_gravier + s4_gravier + s6_gravier + s8_gravier + s9_gravier + s11_gravier + s12_gravier + s13_gravier + s15_gravier;
  const total_briques = s5_briques + s7_briques;
  const total_ha6 = s2_ha6 + s3_ha6 + s6_ha6 + s8_ha6 + s9_ha6 + s12_ha6 + s13_ha6;
  const total_ha8 = s14_ha8_long;
  const total_ha10 = s2_ha10 + s3_ha10 + s6_ha10 + s8_ha10 + s9_ha10 + s13_ha10;
  const total_ha12 = s4_ha12 + s12_ha12;
  const total_pl20 = s3_pl20;
  const total_pl30 = s3_pl30;
  const total_hourdis = s10_hourdis;

  // â”€â”€â”€ UI helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function NumInput({ label, defaultValue, onChange, unit, step = "0.01", min = "0" }: {
    label: string; defaultValue: number; onChange: (v: number) => void;
    unit?: string; step?: string; min?: string;
  }) {
    return (
      <div className="space-y-1">
        <Label className="text-xs">{label}{unit ? ` (${unit})` : ""}</Label>
        <Input
          type="number" min={min} step={step}
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

  function Section({ sKey, title, children }: { sKey: SectionKey; title: string; children: React.ReactNode }) {
    const isOpen = open[sKey];
    return (
      <div className="border rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen(o => ({ ...o, [sKey]: !o[sKey] }))}
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
          <Badge variant="outline" className="text-xs shrink-0">Ã‰tape {num}</Badge>
          <span className="text-sm font-medium">{title}</span>
        </div>
        {children}
      </div>
    );
  }

  function BetonInputs({ vals, onChange, showDosage = true }: {
    vals: { larg?: number; ep?: number; ht?: number; dosage: number };
    onChange: (f: string, v: number) => void;
    showDosage?: boolean;
  }) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {vals.larg !== undefined && <NumInput label="Largeur" unit="m" defaultValue={vals.larg} onChange={v => onChange("larg", v)} />}
        {vals.ep !== undefined && <NumInput label="Ã‰paisseur" unit="m" defaultValue={vals.ep} onChange={v => onChange("ep", v)} step="0.01" />}
        {vals.ht !== undefined && <NumInput label="Hauteur" unit="m" defaultValue={vals.ht} onChange={v => onChange("ht", v)} />}
        {showDosage && <NumInput label="Dosage" unit="kg/mÂ³" defaultValue={vals.dosage} onChange={v => onChange("dosage", v)} step="1" />}
      </div>
    );
  }

  function ArmatureInputs({ vals, onChange, type = "chainages" }: {
    vals: { n_barres: number; esp: number; long_traverse: number };
    onChange: (f: string, v: number) => void;
    type?: "chainages" | "poteaux";
  }) {
    if (type === "poteaux") return null;
    return (
      <div className="grid grid-cols-3 gap-3 mt-2">
        <NumInput label="Nbre barres HA10" defaultValue={vals.n_barres} onChange={v => onChange("n_barres", v)} step="1" min="1" />
        <NumInput label="Esp. traverses" unit="m" defaultValue={vals.esp} onChange={v => onChange("esp", v)} />
        <NumInput label="Long. traverse" unit="m" defaultValue={vals.long_traverse} onChange={v => onChange("long_traverse", v)} />
      </div>
    );
  }

  // â”€â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return (
    <div className="space-y-6">
      {/* Global linÃ©aire */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">ParamÃ¨tre global</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs">
            <NumInput label="LinÃ©aire total" unit="m" defaultValue={g.lin} onChange={v => set("global")("lin", v)} step="0.5" />
          </div>
        </CardContent>
      </Card>

      {/* FONDATION */}
      <Section sKey="fondation" title="Fondation â€” Ã‰tapes 1 Ã  6">

        {/* Ã‰tape 1 */}
        <StepCard num={1} title="BÃ©ton de propretÃ©">
          <BetonInputs vals={{ larg: s1.larg, ep: s1.ep, dosage: s1.dosage }} onChange={set("s1")} />
          <ResultBlock>
            <ResultRow label="Volume bÃ©ton" value={fmt(s1_vb)} unit="mÂ³" />
            <ResultRow label="Ciment" value={`${fmt(s1_cim)} kg â€” ${fmt(tonnes(s1_cim))} t`} />
            <ResultRow label="Sable" value={fmt(s1_sable)} unit="mÂ³" />
            <ResultRow label="Gravier 05/25" value={fmt(s1_gravier)} unit="mÂ³" />
          </ResultBlock>
        </StepCard>

        {/* Ã‰tape 2 */}
        <StepCard num={2} title="Semelles filantes">
          <BetonInputs vals={{ larg: s2.larg, ht: s2.ht, dosage: s2.dosage }} onChange={set("s2")} />
          <ArmatureInputs vals={{ n_barres: s2.n_barres, esp: s2.esp, long_traverse: s2.long_traverse }} onChange={set("s2")} />
          <ResultBlock>
            <ResultRow label="Volume bÃ©ton" value={fmt(s2_vb)} unit="mÂ³" />
            <ResultRow label="Ciment" value={`${fmt(s2_cim)} kg â€” ${fmt(tonnes(s2_cim))} t`} />
            <ResultRow label="Sable" value={fmt(s2_sable)} unit="mÂ³" />
            <ResultRow label="Gravier 05/25" value={fmt(s2_gravier)} unit="mÂ³" />
            <ResultRow label="HAÃ˜10 (barres long.)" value={`${fmtI(s2_ha10)} bottes`} />
            <ResultRow label="HAÃ˜6 (traverses)" value={`${fmtI(s2_ha6)} bottes`} />
          </ResultBlock>
        </StepCard>

        {/* Ã‰tape 3 */}
        <StepCard num={3} title="Paillasses">
          <BetonInputs vals={{ larg: s3.larg, ep: s3.ep, dosage: s3.dosage }} onChange={set("s3")} />
          <ArmatureInputs vals={{ n_barres: s3.n_barres, esp: s3.esp, long_traverse: s3.long_traverse }} onChange={set("s3")} />
          <ResultBlock>
            <ResultRow label="Volume bÃ©ton" value={fmt(s3_vb)} unit="mÂ³" />
            <ResultRow label="Ciment" value={`${fmt(s3_cim)} kg â€” ${fmt(tonnes(s3_cim))} t`} />
            <ResultRow label="Sable" value={fmt(s3_sable)} unit="mÂ³" />
            <ResultRow label="Gravier 05/25" value={fmt(s3_gravier)} unit="mÂ³" />
            <ResultRow label="HAÃ˜10" value={`${fmtI(s3_ha10)} bottes`} />
            <ResultRow label="HAÃ˜6" value={`${fmtI(s3_ha6)} bottes`} />
            <ResultRow label="Planches larg. 30" value={`${fmtI(s3_pl30)} unitÃ©s`} />
            <ResultRow label="Planches larg. 20" value={`${fmtI(s3_pl20)} unitÃ©s`} />
          </ResultBlock>
        </StepCard>

        {/* Ã‰tape 4 */}
        <StepCard num={4} title="Poteaux (fondation)">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <NumInput label="Nbre poteaux" defaultValue={s4.np} onChange={v => set("s4")("np", v)} step="1" />
            <NumInput label="Hauteur" unit="m" defaultValue={s4.ht} onChange={v => set("s4")("ht", v)} />
            <NumInput label="Dosage" unit="kg/mÂ³" defaultValue={s4.dosage} onChange={v => set("s4")("dosage", v)} step="1" />
            <NumInput label="Section b" unit="m" defaultValue={s4.sect_b} onChange={v => set("s4")("sect_b", v)} />
            <NumInput label="Section h" unit="m" defaultValue={s4.sect_h} onChange={v => set("s4")("sect_h", v)} />
            <NumInput label="Nbre HA12" defaultValue={s4.n_barres} onChange={v => set("s4")("n_barres", v)} step="1" />
            <NumInput label="Esp. Ã©triers" unit="m" defaultValue={s4.esp} onChange={v => set("s4")("esp", v)} />
            <NumInput label="Long. Ã©trier" unit="m" defaultValue={s4.long_etrier} onChange={v => set("s4")("long_etrier", v)} />
          </div>
          <ResultBlock>
            <ResultRow label="Volume bÃ©ton" value={fmt(s4_vb)} unit="mÂ³" />
            <ResultRow label="Ciment" value={`${fmt(s4_cim)} kg â€” ${fmt(tonnes(s4_cim))} t`} />
            <ResultRow label="Sable" value={fmt(s4_sable)} unit="mÂ³" />
            <ResultRow label="Gravier 15/25" value={fmt(s4_gravier)} unit="mÂ³" />
            <ResultRow label="HAÃ˜12 (barres long.)" value={`${fmtI(s4_ha12)} bottes`} />
            <ResultRow label="HAÃ˜6 (Ã©triers)" value={`${fmtI(s4_ha6)} bottes`} />
          </ResultBlock>
        </StepCard>

        {/* Ã‰tape 5 */}
        <StepCard num={5} title="Murs 15 plein (soubassement)">
          <div className="grid grid-cols-2 gap-3 max-w-xs">
            <NumInput label="Hauteur murs" unit="m" defaultValue={s5.ht_murs} onChange={v => set("s5")("ht_murs", v)} />
          </div>
          <ResultBlock>
            <ResultRow label="Briques" value={`${fmtI(s5_briques)} unitÃ©s`} />
          </ResultBlock>
        </StepCard>

        {/* Ã‰tape 6 */}
        <StepCard num={6} title="Chainage bas">
          <BetonInputs vals={{ larg: s6.larg, ht: s6.ht, dosage: s6.dosage }} onChange={set("s6")} />
          <ArmatureInputs vals={{ n_barres: s6.n_barres, esp: s6.esp, long_traverse: s6.long_traverse }} onChange={set("s6")} />
          <ResultBlock>
            <ResultRow label="Volume bÃ©ton" value={fmt(s6_vb)} unit="mÂ³" />
            <ResultRow label="Ciment" value={`${fmt(s6_cim)} kg â€” ${fmt(tonnes(s6_cim))} t`} />
            <ResultRow label="Sable" value={fmt(s6_sable)} unit="mÂ³" />
            <ResultRow label="Gravier 15/25" value={fmt(s6_gravier)} unit="mÂ³" />
            <ResultRow label="HAÃ˜10" value={`${fmtI(s6_ha10)} bottes`} />
            <ResultRow label="HAÃ˜6" value={`${fmtI(s6_ha6)} bottes`} />
          </ResultBlock>
        </StepCard>

      </Section>

      {/* Ã‰LÃ‰VATION */}
      <Section sKey="elevation" title="Ã‰lÃ©vation â€” Ã‰tapes 7 Ã  8">

        {/* Ã‰tape 7 */}
        <StepCard num={7} title="Murs 15 creux (Ã©lÃ©vation)">
          <div className="max-w-xs">
            <NumInput label="Hauteur murs" unit="m" defaultValue={s7.ht_murs} onChange={v => set("s7")("ht_murs", v)} />
          </div>
          <ResultBlock>
            <ResultRow label="Briques" value={`${fmtI(s7_briques)} unitÃ©s`} />
          </ResultBlock>
        </StepCard>

        {/* Ã‰tape 8 */}
        <StepCard num={8} title="Chainage haut RDC">
          <BetonInputs vals={{ larg: s8.larg, ht: s8.ht, dosage: s8.dosage }} onChange={set("s8")} />
          <ArmatureInputs vals={{ n_barres: s8.n_barres, esp: s8.esp, long_traverse: s8.long_traverse }} onChange={set("s8")} />
          <ResultBlock>
            <ResultRow label="Volume bÃ©ton" value={fmt(s8_vb)} unit="mÂ³" />
            <ResultRow label="Ciment" value={`${fmt(s8_cim)} kg â€” ${fmt(tonnes(s8_cim))} t`} />
            <ResultRow label="Sable" value={fmt(s8_sable)} unit="mÂ³" />
            <ResultRow label="Gravier 15/25" value={fmt(s8_gravier)} unit="mÂ³" />
            <ResultRow label="HAÃ˜10" value={`${fmtI(s8_ha10)} bottes`} />
            <ResultRow label="HAÃ˜6" value={`${fmtI(s8_ha6)} bottes`} />
          </ResultBlock>
        </StepCard>

      </Section>

      {/* PLANCHER HAUT */}
      <Section sKey="dalle" title="Plancher haut (dalle) â€” Ã‰tapes 9 Ã  15">

        {/* Ã‰tape 9 */}
        <StepCard num={9} title="Chainage dalle">
          <BetonInputs vals={{ larg: s9.larg, ht: s9.ht, dosage: s9.dosage }} onChange={set("s9")} />
          <ArmatureInputs vals={{ n_barres: s9.n_barres, esp: s9.esp, long_traverse: s9.long_traverse }} onChange={set("s9")} />
          <ResultBlock>
            <ResultRow label="Volume bÃ©ton" value={fmt(s9_vb)} unit="mÂ³" />
            <ResultRow label="Ciment" value={`${fmt(s9_cim)} kg â€” ${fmt(tonnes(s9_cim))} t`} />
            <ResultRow label="Sable" value={fmt(s9_sable)} unit="mÂ³" />
            <ResultRow label="Gravier 15/25" value={fmt(s9_gravier)} unit="mÂ³" />
            <ResultRow label="HAÃ˜10" value={`${fmtI(s9_ha10)} bottes`} />
            <ResultRow label="HAÃ˜6" value={`${fmtI(s9_ha6)} bottes`} />
          </ResultBlock>
        </StepCard>

        {/* Ã‰tape 10 */}
        <StepCard num={10} title="Hourdis">
          <div className="max-w-xs">
            <NumInput label="Largeur dalle" unit="m" defaultValue={s10.larg} onChange={v => set("s10")("larg", v)} />
          </div>
          <ResultBlock>
            <ResultRow label="Hourdis" value={`${fmtI(s10_hourdis)} unitÃ©s`} />
            <ResultRow label="Nervures potentielles" value={`${s13_n_nerv} (tous les 0.50 m)`} />
          </ResultBlock>
        </StepCard>

        {/* Ã‰tape 11 */}
        <StepCard num={11} title="BÃ©ton de compression">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <NumInput label="Largeur dalle" unit="m" defaultValue={s11.larg_dall} onChange={v => set("s11")("larg_dall", v)} />
            <NumInput label="Ã‰paisseur" unit="m" defaultValue={s11.ep} onChange={v => set("s11")("ep", v)} />
            <NumInput label="Dosage" unit="kg/mÂ³" defaultValue={s11.dosage} onChange={v => set("s11")("dosage", v)} step="1" />
          </div>
          <ResultBlock>
            <ResultRow label="Volume bÃ©ton" value={fmt(s11_vb)} unit="mÂ³" />
            <ResultRow label="Ciment" value={`${fmt(s11_cim)} kg â€” ${fmt(tonnes(s11_cim))} t`} />
            <ResultRow label="Sable" value={fmt(s11_sable)} unit="mÂ³" />
            <ResultRow label="Gravier 05/25" value={fmt(s11_gravier)} unit="mÂ³" />
          </ResultBlock>
        </StepCard>

        {/* Ã‰tape 12 */}
        <StepCard num={12} title="Poutres">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <NumInput label="Nbre poutres" defaultValue={s12.np} onChange={v => set("s12")("np", v)} step="1" />
            <NumInput label="Section b" unit="m" defaultValue={s12.sect_b} onChange={v => set("s12")("sect_b", v)} />
            <NumInput label="Section h" unit="m" defaultValue={s12.sect_h} onChange={v => set("s12")("sect_h", v)} />
            <NumInput label="Nbre HA12" defaultValue={s12.n_barres} onChange={v => set("s12")("n_barres", v)} step="1" />
            <NumInput label="Hauteur" unit="m" defaultValue={s12.ht} onChange={v => set("s12")("ht", v)} />
            <NumInput label="Dosage" unit="kg/mÂ³" defaultValue={s12.dosage} onChange={v => set("s12")("dosage", v)} step="1" />
            <NumInput label="Esp. Ã©triers" unit="m" defaultValue={s12.esp} onChange={v => set("s12")("esp", v)} />
            <NumInput label="Long. Ã©trier" unit="m" defaultValue={s12.long_etrier} onChange={v => set("s12")("long_etrier", v)} />
          </div>
          <ResultBlock>
            <ResultRow label="Volume bÃ©ton" value={fmt(s12_vb)} unit="mÂ³" />
            <ResultRow label="Ciment" value={`${fmt(s12_cim)} kg â€” ${fmt(tonnes(s12_cim))} t`} />
            <ResultRow label="Sable" value={fmt(s12_sable)} unit="mÂ³" />
            <ResultRow label="Gravier 15/25" value={fmt(s12_gravier)} unit="mÂ³" />
            <ResultRow label="HAÃ˜12" value={`${fmtI(s12_ha12)} bottes`} />
            <ResultRow label="HAÃ˜6 (Ã©triers)" value={`${fmtI(s12_ha6)} bottes`} />
          </ResultBlock>
        </StepCard>

        {/* Ã‰tape 13 */}
        <StepCard num={13} title="Nervures">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <NumInput label="Nbre nervures" defaultValue={s13.np} onChange={v => set("s13")("np", v)} step="1" />
            <NumInput label="Larg. nervure" unit="m" defaultValue={s13.larg} onChange={v => set("s13")("larg", v)} />
            <NumInput label="Ht nervure" unit="m" defaultValue={s13.ht} onChange={v => set("s13")("ht", v)} />
            <NumInput label="Dosage" unit="kg/mÂ³" defaultValue={s13.dosage} onChange={v => set("s13")("dosage", v)} step="1" />
            <NumInput label="Esp. Ã©triers" unit="m" defaultValue={s13.esp_etr} onChange={v => set("s13")("esp_etr", v)} />
            <NumInput label="Long. Ã©trier" unit="m" defaultValue={s13.long_etrier} onChange={v => set("s13")("long_etrier", v)} />
          </div>
          <ResultBlock>
            <ResultRow label="Volume bÃ©ton" value={fmt(s13_vb)} unit="mÂ³" />
            <ResultRow label="Ciment" value={`${fmt(s13_cim)} kg â€” ${fmt(tonnes(s13_cim))} t`} />
            <ResultRow label="Sable" value={fmt(s13_sable)} unit="mÂ³" />
            <ResultRow label="Gravier 15/25" value={fmt(s13_gravier)} unit="mÂ³" />
            <ResultRow label="HAÃ˜10 (2 barres)" value={`${fmtI(s13_ha10)} bottes`} />
            <ResultRow label="HAÃ˜6 (Ã©triers)" value={`${fmtI(s13_ha6)} bottes`} />
          </ResultBlock>
        </StepCard>

        {/* Ã‰tape 14 */}
        <StepCard num={14} title="Quadrillage (treillis soudÃ©)">
          <div className="max-w-xs">
            <NumInput label="Espacement" unit="m" defaultValue={s14.esp} onChange={v => set("s14")("esp", v)} />
          </div>
          <p className="text-xs text-muted-foreground">Longueur dalle = linÃ©aire Ã— 2 ; Largeur = Ã©tape 10</p>
          <ResultBlock>
            <ResultRow label="HAÃ˜8 longitudinal" value={`${fmtI(s14_ha8_long)} bottes`} />
            <ResultRow label="HAÃ˜6 transversal" value={`${fmtI(s14_ha6_trans)} bottes`} />
          </ResultBlock>
        </StepCard>

        {/* Ã‰tape 15 */}
        <StepCard num={15} title="Coulage dalle">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <NumInput label="Largeur dalle" unit="m" defaultValue={s15.larg_dall} onChange={v => set("s15")("larg_dall", v)} />
            <NumInput label="Ã‰paisseur" unit="m" defaultValue={s15.ep} onChange={v => set("s15")("ep", v)} />
            <NumInput label="Dosage" unit="kg/mÂ³" defaultValue={s15.dosage} onChange={v => set("s15")("dosage", v)} step="1" />
          </div>
          <ResultBlock>
            <ResultRow label="Surface dalle" value={fmt(s15_surf)} unit="mÂ²" />
            <ResultRow label="Volume bÃ©ton" value={fmt(s15_vb)} unit="mÂ³" />
            <ResultRow label="Ciment" value={`${fmt(s15_cim)} kg â€” ${fmt(tonnes(s15_cim))} t`} />
            <ResultRow label="Sable" value={fmt(s15_sable)} unit="mÂ³" />
            <ResultRow label="Gravier 05/25" value={fmt(s15_gravier)} unit="mÂ³" />
          </ResultBlock>
        </StepCard>

      </Section>

      {/* RÃ‰CAPITULATIF */}
      <Card className="border-2 border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base uppercase tracking-wide text-primary">RÃ©capitulatif â€” DÃ©boursÃ©s secs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-1 mt-2">Liant & granulats</p>
              <ResultRow label="Ciment total" value={`${fmt(total_cim_kg)} kg = ${fmt(total_cim_kg / 1000)} t`} />
              <ResultRow label="Sacs (50 kg)" value={`${fmtI(sacs(total_cim_kg))} sacs`} />
              <ResultRow label="Sable" value={`${fmt(total_sable)} mÂ³`} />
              <ResultRow label="â†’ Voyages sable (6 mÂ³)" value={`${fmtI(total_sable / 6)} voyages`} />
              <ResultRow label="Gravier 05/25" value={`${fmt(total_gravier)} mÂ³`} />
              <ResultRow label="â†’ Voyages 05/25 (20 t)" value={`${fmtI(total_gravier * 1.5 / 20)} voyages`} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-1 mt-2">MaÃ§onnerie & charpente</p>
              <ResultRow label="Briques" value={`${fmtI(total_briques)} unitÃ©s`} />
              <ResultRow label="Hourdis" value={`${fmtI(total_hourdis)} unitÃ©s`} />
              <ResultRow label="Planches larg. 30" value={`${fmtI(total_pl30)} unitÃ©s`} />
              <ResultRow label="Planches larg. 20" value={`${fmtI(total_pl20)} unitÃ©s`} />
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-1 mt-2">Armatures</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8">
                <ResultRow label="HAÃ˜6" value={`${fmtI(total_ha6)} bottes`} />
                <ResultRow label="HAÃ˜8" value={`${fmtI(total_ha8)} bottes`} />
                <ResultRow label="HAÃ˜10" value={`${fmtI(total_ha10)} bottes`} />
                <ResultRow label="HAÃ˜12" value={`${fmtI(total_ha12)} bottes`} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

