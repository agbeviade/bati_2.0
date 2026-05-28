// Reproduit computeRecap pour verifier les quantites du modele Villa RDC

const inputs = {
  global: {
    lin: 134.96,
    long_barre: 12,
    botte_ha6: 36,
    botte_ha8: 21,
    botte_ha10: 13,
    botte_ha12: 9,
    poids_sac: 50,
    briques_m2: 12,
    hourdis_m2: 10,
    long_planche: 4,
    hauteur_montee: 0.22,
    montes_par_sac: 3,
    camion_sable: 6,
    camion_g0525: 20,
    camion_g1525: 25,
    densite_gravier: 1.5,
  },
  s1: { larg: 0.8, ep: 0.1, dosage: 250 },
  s2: { larg: 0.8, ht: 0.2, dosage: 350, n_barres: 4, esp: 0.2, long_traverse: 0.85 },
  s3: {
    long: 0.8,
    larg: 0.8,
    prof: 0.4,
    np: 25,
    dosage: 350,
    n_barres: 4,
    esp: 0.25,
    long_traverse: 1.35,
  },
  s4: {
    n_barres: 4,
    ht: 1.5,
    np: 25,
    esp: 0.15,
    long_etrier: 1.0,
    dosage: 350,
    sect_b: 0.25,
    sect_h: 0.25,
  },
  s5: { ht_murs: 1.0 },
  s6: { larg: 0.2, ht: 0.15, dosage: 350, n_barres: 4, esp: 0.2, long_traverse: 0.7 },
  s7: { ht_murs: 3.0 },
  s8: { larg: 0.2, ht: 0.15, dosage: 350, n_barres: 4, esp: 0.2, long_traverse: 0.7 },
  s9: { larg: 0.2, ht: 0.15, dosage: 350, n_barres: 4, esp: 0.2, long_traverse: 0.7 },
  s10: { long_dall: 20.3, larg: 9.15 },
  s11: { larg_dall: 9.15, ep: 0.05, dosage: 350 },
  s12: { n_barres: 4, np: 3, esp: 0.15, long_etrier: 1.2, dosage: 350, sect_b: 0.25, sect_h: 0.35 },
  s13: { larg: 0.1, ht: 0.2, np: 18, esp_etr: 0.2, long_etrier: 0.7, dosage: 350 },
  s14: { esp: 0.2 },
  s15: { larg_dall: 9.15, ep: 0.12, dosage: 350 },
};

const g = inputs.global;
const LB = g.long_barre,
  B6 = g.botte_ha6,
  B8 = g.botte_ha8,
  B10 = g.botte_ha10,
  B12 = g.botte_ha12;
const { s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15 } = inputs;

const vb = (lin, larg, ep) => lin * larg * ep;
const cim = (v, d) => v * d;
const sbl = (v) => v * 0.4;
const grv = (v) => v * 0.8;

const vb1 = vb(g.lin, s1.larg, s1.ep);
const vb2 = vb(g.lin, s2.larg, s2.ht);
const vb3 = s3.long * s3.larg * s3.prof * s3.np;
const vb4 = s4.sect_b * s4.sect_h * s4.ht * s4.np;
const vb6 = vb(g.lin, s6.larg, s6.ht);
const vb8 = vb(g.lin, s8.larg, s8.ht);
const vb9 = vb(g.lin, s9.larg, s9.ht);
const vb11 = s11.larg_dall * s10.long_dall * s11.ep;
const vb12 = s12.sect_b * s12.sect_h * s10.larg * s12.np;
const vb13 = s13.larg * s13.ht * s10.long_dall * s13.np;
const vb15 = s15.larg_dall * s10.long_dall * s15.ep;

console.log("=== VOLUMES BETON (m3) ===");
console.log(`S1  beton proprete   : ${vb1.toFixed(2)}`);
console.log(`S2  semelles filantes: ${vb2.toFixed(2)}`);
console.log(`S3  paillasses       : ${vb3.toFixed(2)}`);
console.log(`S4  poteaux          : ${vb4.toFixed(2)}`);
console.log(`S6  chainage bas     : ${vb6.toFixed(2)}`);
console.log(`S8  chainage haut    : ${vb8.toFixed(2)}`);
console.log(`S9  chainage dalle   : ${vb9.toFixed(2)}`);
console.log(`S11 compression      : ${vb11.toFixed(2)}`);
console.log(`S12 poutres          : ${vb12.toFixed(2)}`);
console.log(`S13 nervures         : ${vb13.toFixed(2)}`);
console.log(`S15 coulage dalle    : ${vb15.toFixed(2)}`);

const tot_cim = [vb1, vb2, vb3, vb4, vb6, vb8, vb9, vb11, vb12, vb13, vb15].reduce(
  (a, b, i) => a + b * [250, 350, 350, 350, 350, 350, 350, 350, 350, 350, 350][i],
  0,
);

const allVb = [vb1, vb2, vb3, vb4, vb6, vb8, vb9, vb11, vb12, vb13, vb15];
const tot_sbl = allVb.reduce((a, b) => a + sbl(b), 0);
const tot_g0525 = [vb1, vb2, vb3, vb11, vb15].reduce((a, b) => a + grv(b), 0);
const tot_g1525 = [vb4, vb6, vb8, vb9, vb12, vb13].reduce((a, b) => a + grv(b), 0);

console.log("\n=== RECAP ===");
console.log(`Ciment beton    : ${Math.ceil(tot_cim / 50)} sacs  (${Math.round(tot_cim)} kg)`);
const sac_mac = Math.ceil(
  s5.ht_murs / g.hauteur_montee / g.montes_par_sac +
    s7.ht_murs / g.hauteur_montee / g.montes_par_sac,
);
console.log(`Ciment maconner.: ${sac_mac} sacs`);
console.log(`Sable           : ${tot_sbl.toFixed(1)} m3`);
console.log(`Gravier 05/25   : ${tot_g0525.toFixed(1)} m3`);
console.log(`Gravier 15/25   : ${tot_g1525.toFixed(1)} m3`);

const ha10 =
  (g.lin * s2.n_barres) / LB / B10 +
  (s3.np * s3.n_barres * s3.long) / LB / B10 +
  (g.lin * s6.n_barres) / LB / B10 +
  (g.lin * s8.n_barres) / LB / B10 +
  (g.lin * s9.n_barres) / LB / B10 +
  (s10.long_dall * 2 * s13.np) / LB / B10;
const ha12 =
  (s4.n_barres * s4.ht * s4.np) / LB / B12 + (s12.n_barres * s10.larg * s12.np) / LB / B12;
const ha8 = s10.long_dall / s14.esp / B8;
const ha6 =
  ((g.lin / s2.esp) * s2.long_traverse) / LB / B6 +
  (s3.np * (s3.long / s3.esp) * s3.long_traverse) / LB / B6 +
  (((s4.ht * s4.np) / s4.esp) * s4.long_etrier) / LB / B6 +
  ((g.lin / s6.esp) * s6.long_traverse) / LB / B6 +
  ((g.lin / s8.esp) * s8.long_traverse) / LB / B6 +
  ((g.lin / s9.esp) * s9.long_traverse) / LB / B6 +
  (((s10.larg * s12.np) / s12.esp) * s12.long_etrier) / LB / B6 +
  (((s13.ht * s13.np) / s13.esp_etr) * s13.long_etrier) / LB / B6 +
  s10.larg / s14.esp / B6;

console.log(`HA6             : ${Math.ceil(ha6)} bottes`);
console.log(`HA8             : ${Math.ceil(ha8)} bottes`);
console.log(`HA10            : ${Math.ceil(ha10)} bottes`);
console.log(`HA12            : ${Math.ceil(ha12)} bottes`);
console.log(`Briques plein   : ${Math.ceil(g.lin * s5.ht_murs * g.briques_m2)} u`);
console.log(`Briques creux   : ${Math.ceil(g.lin * s7.ht_murs * g.briques_m2)} u`);
console.log(`Hourdis         : ${Math.ceil(s10.long_dall * s10.larg * g.hourdis_m2)} u`);

console.log("\n=== FORMULES CORRIGEES ===");
console.log(`S11 compression: sans x2 -> ${vb11.toFixed(2)} m3`);
console.log(`S12 poutres: 3 poutres x larg_dall (${s10.larg}m) -> ${vb12.toFixed(2)} m3`);
console.log(`S13 nervures: long_dall (${s10.long_dall}m) au lieu de lin -> ${vb13.toFixed(2)} m3`);
