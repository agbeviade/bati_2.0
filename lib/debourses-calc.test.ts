import { describe, expect, it } from "vitest";
import { computeRecap, DEFAULTS, type AllInputs } from "./debourses-calc";

describe("computeRecap", () => {
  it("DEFAULTS (lin=0) donne tous les recaps à 0 ou positifs", () => {
    const recap = computeRecap(DEFAULTS);
    for (const [key, value] of Object.entries(recap)) {
      expect(value, `${key} doit être ≥ 0`).toBeGreaterThanOrEqual(0);
    }
  });

  it("recap retourne toutes les clés attendues", () => {
    const recap = computeRecap(DEFAULTS);
    expect(recap).toHaveProperty("sacs_beton");
    expect(recap).toHaveProperty("sacs_maconnerie");
    expect(recap).toHaveProperty("sable_m3");
    expect(recap).toHaveProperty("gravier_0525_m3");
    expect(recap).toHaveProperty("gravier_1525_m3");
    expect(recap).toHaveProperty("ha6_bottes");
    expect(recap).toHaveProperty("ha8_bottes");
    expect(recap).toHaveProperty("ha10_bottes");
    expect(recap).toHaveProperty("ha12_bottes");
    expect(recap).toHaveProperty("briques_plein");
    expect(recap).toHaveProperty("briques_creux");
    expect(recap).toHaveProperty("hourdis");
    expect(recap).toHaveProperty("planches_30");
    expect(recap).toHaveProperty("planches_20");
  });

  it("avec lin=20m, toutes les quantités béton/sable/gravier sont positives", () => {
    const inputs: AllInputs = {
      ...DEFAULTS,
      global: { ...DEFAULTS.global, lin: 20 },
    };
    const recap = computeRecap(inputs);

    expect(recap.sacs_beton).toBeGreaterThan(0);
    expect(recap.sable_m3).toBeGreaterThan(0);
    expect(recap.gravier_0525_m3).toBeGreaterThan(0);
    expect(recap.ha6_bottes).toBeGreaterThanOrEqual(0); // dépend du nb_barres
  });

  it("le doublement du linéaire double le béton de semelle", () => {
    const lin10 = computeRecap({ ...DEFAULTS, global: { ...DEFAULTS.global, lin: 10 } });
    const lin20 = computeRecap({ ...DEFAULTS, global: { ...DEFAULTS.global, lin: 20 } });

    // Le ratio devrait être proche de 2 (avec arrondi à l'entier supérieur sur les sacs)
    if (lin10.sacs_beton > 0) {
      const ratio = lin20.sacs_beton / lin10.sacs_beton;
      expect(ratio).toBeGreaterThan(1.5);
      expect(ratio).toBeLessThanOrEqual(2.1); // marge pour arrondis
    }
  });

  it("retourne des valeurs entières pour les comptables (sacs, bottes, planches, briques)", () => {
    const recap = computeRecap({ ...DEFAULTS, global: { ...DEFAULTS.global, lin: 25 } });
    expect(Number.isInteger(recap.sacs_beton), "sacs_beton doit être entier").toBe(true);
    expect(Number.isInteger(recap.sacs_maconnerie), "sacs_maconnerie doit être entier").toBe(true);
    expect(Number.isInteger(recap.ha6_bottes)).toBe(true);
    expect(Number.isInteger(recap.ha8_bottes)).toBe(true);
    expect(Number.isInteger(recap.ha10_bottes)).toBe(true);
    expect(Number.isInteger(recap.ha12_bottes)).toBe(true);
  });
});
