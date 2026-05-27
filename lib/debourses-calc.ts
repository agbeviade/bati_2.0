// Shared types & calculation logic for the debourses secs calculator.
// Used by both the calculator UI and the quote generation.

export interface GlobalInputs {
  lin: number;
  long_barre: number;
  botte_ha6: number; botte_ha8: number; botte_ha10: number; botte_ha12: number;
  poids_sac: number;
  briques_m2: number; hourdis_m2: number; long_planche: number;
  hauteur_montee: number; montes_par_sac: number;
  camion_sable: number; camion_g0525: number; camion_g1525: number; densite_gravier: number;
}
export interface Step1Inputs  { larg: number; ep: number; dosage: number; }
export interface Step2Inputs  { larg: number; ht: number; dosage: number; n_barres: number; esp: number; long_traverse: number; }
export interface Step3Inputs  { long: number; larg: number; prof: number; np: number; dosage: number; n_barres: number; esp: number; long_traverse: number; }
export interface Step4Inputs  { n_barres: number; ht: number; np: number; esp: number; long_etrier: number; dosage: number; sect_b: number; sect_h: number; }
export interface Step5Inputs  { ht_murs: number; }
export interface Step6Inputs  { larg: number; ht: number; dosage: number; n_barres: number; esp: number; long_traverse: number; }
export interface Step7Inputs  { ht_murs: number; }
export interface Step8Inputs  { larg: number; ht: number; dosage: number; n_barres: number; esp: number; long_traverse: number; }
export interface Step9Inputs  { larg: number; ht: number; dosage: number; n_barres: number; esp: number; long_traverse: number; }
export interface Step10Inputs { long_dall: number; larg: number; }
export interface Step11Inputs { larg_dall: number; ep: number; dosage: number; }
export interface Step12Inputs { n_barres: number; np: number; esp: number; long_etrier: number; dosage: number; sect_b: number; sect_h: number; }
export interface Step13Inputs { larg: number; ht: number; np: number; esp_etr: number; long_etrier: number; dosage: number; }
export interface Step14Inputs { esp: number; }
export interface Step15Inputs { larg_dall: number; ep: number; dosage: number; }

export interface AllInputs {
  global: GlobalInputs;
  s1: Step1Inputs; s2: Step2Inputs; s3: Step3Inputs; s4: Step4Inputs;
  s5: Step5Inputs; s6: Step6Inputs; s7: Step7Inputs; s8: Step8Inputs;
  s9: Step9Inputs; s10: Step10Inputs; s11: Step11Inputs; s12: Step12Inputs;
  s13: Step13Inputs; s14: Step14Inputs; s15: Step15Inputs;
}

export const DEFAULTS: AllInputs = {
  global: {
    lin: 0, long_barre: 12, botte_ha6: 36, botte_ha8: 21, botte_ha10: 13, botte_ha12: 9,
    poids_sac: 50,
    briques_m2: 12, hourdis_m2: 10, long_planche: 4, hauteur_montee: 0.22, montes_par_sac: 3,
    camion_sable: 6, camion_g0525: 20, camion_g1525: 25, densite_gravier: 1.5,
  },
  s1:  { larg: 0.5, ep: 0.1, dosage: 250 },
  s2:  { larg: 0.5, ht: 0.4, dosage: 350, n_barres: 4, esp: 0.25, long_traverse: 0.85 },
  s3:  { long: 0.8, larg: 0.8, prof: 0.4, np: 0, dosage: 350, n_barres: 4, esp: 0.25, long_traverse: 1.35 },
  s4:  { n_barres: 4, ht: 3.0, np: 0, esp: 0.15, long_etrier: 1.5, dosage: 350, sect_b: 0.25, sect_h: 0.25 },
  s5:  { ht_murs: 1.0 },
  s6:  { larg: 0.25, ht: 0.25, dosage: 350, n_barres: 4, esp: 0.25, long_traverse: 0.85 },
  s7:  { ht_murs: 3.0 },
  s8:  { larg: 0.25, ht: 0.25, dosage: 350, n_barres: 4, esp: 0.25, long_traverse: 0.85 },
  s9:  { larg: 0.25, ht: 0.25, dosage: 350, n_barres: 4, esp: 0.25, long_traverse: 0.85 },
  s10: { long_dall: 0, larg: 0 },
  s11: { larg_dall: 0, ep: 0.05, dosage: 350 },
  s12: { n_barres: 4, np: 0, esp: 0.15, long_etrier: 1.2, dosage: 350, sect_b: 0.25, sect_h: 0.35 },
  s13: { larg: 0.25, ht: 0.35, np: 0, esp_etr: 0.15, long_etrier: 1.0, dosage: 350 },
  s14: { esp: 0.5 },
  s15: { larg_dall: 0, ep: 0.05, dosage: 350 },
};

export interface DebourseRecap {
  sacs_beton: number;       // ciment pour beton (sacs)
  sacs_maconnerie: number;  // ciment pour maconnerie (sacs)
  sable_m3: number;
  gravier_0525_m3: number;
  gravier_1525_m3: number;
  ha6_bottes: number;
  ha8_bottes: number;
  ha10_bottes: number;
  ha12_bottes: number;
  briques_plein: number;    // murs 15 plein (soubassement)
  briques_creux: number;    // murs 15 creux (elevation)
  hourdis: number;
  planches_30: number;
  planches_20: number;
}

function vb(lin: number, larg: number, ep: number) { return lin * larg * ep; }
function cim(v: number, dosage: number) { return v * dosage; }
function sbl(v: number) { return v * 0.4; }
function grv(v: number) { return v * 0.8; }

export function computeRecap(inp: AllInputs): DebourseRecap {
  const g  = inp.global;
  const SAC = g.poids_sac;
  const LB  = g.long_barre;
  const B6  = g.botte_ha6;
  const B8  = g.botte_ha8;
  const B10 = g.botte_ha10;
  const B12 = g.botte_ha12;
  const LP  = g.long_planche;

  const s1 = inp.s1; const s2 = inp.s2; const s3 = inp.s3; const s4 = inp.s4;
  const s5 = inp.s5; const s6 = inp.s6; const s7 = inp.s7; const s8 = inp.s8;
  const s9 = inp.s9; const s10 = inp.s10; const s11 = inp.s11; const s12 = inp.s12;
  const s13 = inp.s13; const s14 = inp.s14; const s15 = inp.s15;

  // Volumes beton
  const s1_vb  = vb(g.lin, s1.larg, s1.ep);
  const s2_vb  = vb(g.lin, s2.larg, s2.ht);
  const s3_vb  = s3.long * s3.larg * s3.prof * s3.np;
  const s4_vb  = s4.sect_b * s4.sect_h * s4.ht * s4.np;
  const s6_vb  = vb(g.lin, s6.larg, s6.ht);
  const s8_vb  = vb(g.lin, s8.larg, s8.ht);
  const s9_vb  = vb(g.lin, s9.larg, s9.ht);
  const s11_vb = s11.larg_dall * s10.long_dall * s11.ep;
  const s12_vb = s12.sect_b * s12.sect_h * s10.larg * s12.np;
  const s13_vb = s13.larg * s13.ht * s10.long_dall * s13.np;
  const s15_vb = s15.larg_dall * s10.long_dall * s15.ep;

  // Ciment beton (kg)
  const tot_cim =
    cim(s1_vb, s1.dosage) + cim(s2_vb, s2.dosage) + cim(s3_vb, s3.dosage) +
    cim(s4_vb, s4.dosage) + cim(s6_vb, s6.dosage) + cim(s8_vb, s8.dosage) +
    cim(s9_vb, s9.dosage) + cim(s11_vb, s11.dosage) + cim(s12_vb, s12.dosage) +
    cim(s13_vb, s13.dosage) + cim(s15_vb, s15.dosage);

  // Sable (m3)
  const allVb = [s1_vb, s2_vb, s3_vb, s4_vb, s6_vb, s8_vb, s9_vb, s11_vb, s12_vb, s13_vb, s15_vb];
  const tot_sbl = allVb.reduce((a, b) => a + sbl(b), 0);

  // Gravier
  const vb_0525 = [s1_vb, s2_vb, s3_vb, s11_vb, s15_vb];
  const vb_1525 = [s4_vb, s6_vb, s8_vb, s9_vb, s12_vb, s13_vb];
  const tot_grv_0525 = vb_0525.reduce((a, b) => a + grv(b), 0);
  const tot_grv_1525 = vb_1525.reduce((a, b) => a + grv(b), 0);

  // Maconnerie
  const s5_montes   = g.hauteur_montee > 0 ? s5.ht_murs / g.hauteur_montee : 0;
  const s5_sac_mac  = g.montes_par_sac > 0 ? s5_montes / g.montes_par_sac : 0;
  const s7_montes   = g.hauteur_montee > 0 ? s7.ht_murs / g.hauteur_montee : 0;
  const s7_sac_mac  = g.montes_par_sac > 0 ? s7_montes / g.montes_par_sac : 0;

  // Armatures
  const ha10_s2 = g.lin * s2.n_barres / LB / B10;
  const ha6_s2  = (g.lin / s2.esp) * s2.long_traverse / LB / B6;
  const ha10_s3 = s3.np * s3.n_barres * s3.long / LB / B10;
  const ha6_s3  = s3.np * (s3.long / s3.esp) * s3.long_traverse / LB / B6;
  const ha12_s4 = s4.n_barres * s4.ht * s4.np / LB / B12;
  const ha6_s4  = (s4.ht * s4.np) / s4.esp * s4.long_etrier / LB / B6;
  const ha10_s6 = g.lin * s6.n_barres / LB / B10;
  const ha6_s6  = (g.lin / s6.esp) * s6.long_traverse / LB / B6;
  const ha10_s8 = g.lin * s8.n_barres / LB / B10;
  const ha6_s8  = (g.lin / s8.esp) * s8.long_traverse / LB / B6;
  const ha10_s9 = g.lin * s9.n_barres / LB / B10;
  const ha6_s9  = (g.lin / s9.esp) * s9.long_traverse / LB / B6;
  const ha12_s12 = s12.n_barres * s10.larg * s12.np / LB / B12;
  const ha6_s12  = (s10.larg * s12.np) / s12.esp * s12.long_etrier / LB / B6;
  const ha10_s13 = s10.long_dall * 2 * s13.np / LB / B10;
  const ha6_s13  = (s13.ht * s13.np) / s13.esp_etr * s13.long_etrier / LB / B6;
  const s10_long = s10.long_dall;
  const ha8_s14  = s10_long > 0 ? s10_long / s14.esp / B8 : 0;
  const ha6_s14  = s10.larg > 0 ? s10.larg / s14.esp / B6 : 0;

  const tot_ha6  = ha6_s2 + ha6_s3 + ha6_s4 + ha6_s6 + ha6_s8 + ha6_s9 + ha6_s12 + ha6_s13 + ha6_s14;
  const tot_ha10 = ha10_s2 + ha10_s3 + ha10_s6 + ha10_s8 + ha10_s9 + ha10_s13;
  const tot_ha12 = ha12_s4 + ha12_s12;

  // Coffrage
  const pl30 = LP > 0 ? (g.lin / LP) * 2 * 2 : 0; // etapes 3 + 6
  const pl20 = LP > 0 ? (g.lin / LP) * 2 : 0;

  return {
    sacs_beton:       Math.ceil(tot_cim / SAC),
    sacs_maconnerie:  Math.ceil(s5_sac_mac + s7_sac_mac),
    sable_m3:         Math.round(tot_sbl * 100) / 100,
    gravier_0525_m3:  Math.round(tot_grv_0525 * 100) / 100,
    gravier_1525_m3:  Math.round(tot_grv_1525 * 100) / 100,
    ha6_bottes:       Math.ceil(tot_ha6),
    ha8_bottes:       Math.ceil(ha8_s14),
    ha10_bottes:      Math.ceil(tot_ha10),
    ha12_bottes:      Math.ceil(tot_ha12),
    briques_plein:    Math.ceil(g.lin * s5.ht_murs * g.briques_m2),
    briques_creux:    Math.ceil(g.lin * s7.ht_murs * g.briques_m2),
    hourdis:          Math.ceil(s10.long_dall * s10.larg * g.hourdis_m2),
    planches_30:      Math.ceil(pl30),
    planches_20:      Math.ceil(pl20),
  };
}

// Maps recap keys to the exact material names in the DB
export const RECAP_TO_MATERIAL: Record<keyof DebourseRecap, string> = {
  sacs_beton:      "Ciment (sac 50 kg)",
  sacs_maconnerie: "Ciment (sac 50 kg)",
  sable_m3:        "Sable",
  gravier_0525_m3: "Gravier 05/25",
  gravier_1525_m3: "Gravier 15/25",
  ha6_bottes:      "HA6 (botte)",
  ha8_bottes:      "HA8 (botte)",
  ha10_bottes:     "HA10 (botte)",
  ha12_bottes:     "HA12 (botte)",
  briques_plein:   "Brique 15 plein",
  briques_creux:   "Brique 15 creux",
  hourdis:         "Hourdis",
  planches_30:     "Planche coffrage larg. 30",
  planches_20:     "Planche coffrage larg. 20",
};

export const RECAP_LABELS: Record<keyof DebourseRecap, string> = {
  sacs_beton:      "Ciment beton",
  sacs_maconnerie: "Ciment maconnerie",
  sable_m3:        "Sable",
  gravier_0525_m3: "Gravier 05/25",
  gravier_1525_m3: "Gravier 15/25",
  ha6_bottes:      "Acier HA6",
  ha8_bottes:      "Acier HA8",
  ha10_bottes:     "Acier HA10",
  ha12_bottes:     "Acier HA12",
  briques_plein:   "Briques 15 plein (soubassement)",
  briques_creux:   "Briques 15 creux (elevation)",
  hourdis:         "Hourdis",
  planches_30:     "Planches coffrage larg. 30",
  planches_20:     "Planches coffrage larg. 20",
};

export const RECAP_UNITS: Record<keyof DebourseRecap, string> = {
  sacs_beton: "sac", sacs_maconnerie: "sac",
  sable_m3: "m3", gravier_0525_m3: "m3", gravier_1525_m3: "m3",
  ha6_bottes: "botte", ha8_bottes: "botte", ha10_bottes: "botte", ha12_bottes: "botte",
  briques_plein: "u", briques_creux: "u", hourdis: "u",
  planches_30: "u", planches_20: "u",
};
