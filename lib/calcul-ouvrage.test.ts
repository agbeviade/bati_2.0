import { describe, expect, it } from "vitest";
import {
  calculerBrut,
  calculerOuvrage,
  calculerSurfaceVides,
  estTypeVolume,
  getUnitePrincipale,
  type DimensionsOuvrage,
  type VideDeduit,
} from "./calcul-ouvrage";

describe("calculerBrut", () => {
  it("surface_l_h : L × H", () => {
    expect(calculerBrut("surface_l_h", { longueur: 10, hauteur: 3 })).toBe(30);
  });

  it("surface_l_h : retourne 0 si une dimension manque", () => {
    expect(calculerBrut("surface_l_h", { longueur: 10 })).toBe(0);
    expect(calculerBrut("surface_l_h", {})).toBe(0);
  });

  it("volume_l_l_h : L × l × H", () => {
    expect(calculerBrut("volume_l_l_h", { longueur: 2, largeur: 3, hauteur: 4 })).toBe(24);
  });

  it("cylindre : π × r² × H", () => {
    const result = calculerBrut("cylindre", { diametre: 2, hauteur: 5 });
    expect(result).toBeCloseTo(Math.PI * 1 * 1 * 5, 6);
  });

  it("cylindre : retourne 0 si diamètre = 0", () => {
    expect(calculerBrut("cylindre", { diametre: 0, hauteur: 5 })).toBe(0);
  });

  it("toiture_pente : pente nulle = surface_sol", () => {
    expect(calculerBrut("toiture_pente", { surface_sol: 100, pente: 0 })).toBe(100);
  });

  it("toiture_pente : pente 30% augmente la surface", () => {
    const result = calculerBrut("toiture_pente", { surface_sol: 100, pente: 30 });
    expect(result).toBeGreaterThan(100);
    expect(result).toBeCloseTo(100 / Math.cos(Math.atan(0.3)), 6);
  });

  it("toiture_croupe : applique le bonus 5%", () => {
    const pente = calculerBrut("toiture_pente", { surface_sol: 100, pente: 30 });
    const croupe = calculerBrut("toiture_croupe", { surface_sol: 100, pente: 30 });
    expect(croupe).toBeCloseTo(pente * 1.05, 6);
  });

  it("lineaire : retourne la longueur", () => {
    expect(calculerBrut("lineaire", { longueur: 12.5 })).toBe(12.5);
  });

  it("unite : retourne la quantité dans 'longueur'", () => {
    expect(calculerBrut("unite", { longueur: 8 })).toBe(8);
  });

  it("escalier : nb × (giron + contremarche) × largeur", () => {
    expect(
      calculerBrut("escalier", { nb_marches: 15, giron: 0.3, contremarche: 0.18, largeur: 1.2 }),
    ).toBeCloseTo(15 * (0.3 + 0.18) * 1.2);
  });

  it("escalier : defaults giron/contremarche si omis", () => {
    const r = calculerBrut("escalier", { nb_marches: 10, largeur: 1 });
    expect(r).toBeCloseTo(10 * (0.28 + 0.17) * 1);
  });

  it("trapeze : (a+b)/2 × H", () => {
    expect(calculerBrut("trapeze", { a: 4, b: 6, hauteur: 2 })).toBe(10);
  });

  it("trapeze : fallback longueur/largeur si a/b omis", () => {
    expect(calculerBrut("trapeze", { longueur: 4, largeur: 6, hauteur: 2 })).toBe(10);
  });

  it("type inconnu retourne 0", () => {
    // @ts-expect-error — test du fallback
    expect(calculerBrut("inexistant", { longueur: 5 } as DimensionsOuvrage)).toBe(0);
  });
});

describe("calculerSurfaceVides", () => {
  it("somme les surfaces des vides", () => {
    const vides: VideDeduit[] = [
      { id: "1", nom: "Porte", largeur: 0.9, hauteur: 2.1, surface: 0 },
      { id: "2", nom: "Fenêtre", largeur: 1.2, hauteur: 1.0, surface: 0 },
    ];
    expect(calculerSurfaceVides(vides)).toBeCloseTo(0.9 * 2.1 + 1.2 * 1.0);
  });

  it("liste vide → 0", () => {
    expect(calculerSurfaceVides([])).toBe(0);
  });
});

describe("estTypeVolume / getUnitePrincipale", () => {
  it("volumes identifiés", () => {
    expect(estTypeVolume("volume_l_l_h")).toBe(true);
    expect(estTypeVolume("cylindre")).toBe(true);
    expect(estTypeVolume("surface_l_h")).toBe(false);
  });

  it("unités principales correctes", () => {
    expect(getUnitePrincipale("volume_l_l_h")).toBe("m³");
    expect(getUnitePrincipale("cylindre")).toBe("m³");
    expect(getUnitePrincipale("lineaire")).toBe("ml");
    expect(getUnitePrincipale("unite")).toBe("u");
    expect(getUnitePrincipale("surface_l_h")).toBe("m²");
    expect(getUnitePrincipale("escalier")).toBe("m²");
  });
});

describe("calculerOuvrage", () => {
  it("calcule brut, nette (avec déduction vides) et recette", () => {
    const result = calculerOuvrage({
      id: "test",
      designation: "Mur béton",
      type_geometrie: "surface_l_h",
      dimensions: { longueur: 10, hauteur: 3 },
      vides_deduits: [{ id: "v1", nom: "Porte", largeur: 1, hauteur: 2, surface: 2 }],
      unite_principale: "m²",
      recette: [
        {
          materiau_id: "m1",
          materiau_nom: "Ciment",
          unite: "sac",
          coefficient: 0.5,
          taux_perte: 0.05,
          type: "materiau",
        },
      ],
    });

    expect(result.quantite_brute).toBe(30);
    expect(result.quantite_nette).toBe(28); // 30 - 2
    expect(result.recette_calculee[0].quantite_nette).toBeCloseTo(14); // 28 * 0.5
    expect(result.recette_calculee[0].quantite_commande).toBeCloseTo(14 * 1.05);
  });

  it("vides ignorés pour les volumes", () => {
    const result = calculerOuvrage({
      id: "test",
      designation: "Dalle",
      type_geometrie: "volume_l_l_h",
      dimensions: { longueur: 5, largeur: 4, hauteur: 0.2 },
      vides_deduits: [{ id: "v1", nom: "Trémie", largeur: 1, hauteur: 1, surface: 1 }],
      unite_principale: "m³",
      recette: [],
    });

    expect(result.quantite_brute).toBe(4);
    expect(result.quantite_nette).toBe(4); // pas de déduction sur volume
  });

  it("nette ≥ 0 même si vides > brut", () => {
    const result = calculerOuvrage({
      id: "test",
      designation: "Mur",
      type_geometrie: "surface_l_h",
      dimensions: { longueur: 2, hauteur: 2 },
      vides_deduits: [{ id: "v1", nom: "Porte", largeur: 3, hauteur: 3, surface: 9 }],
      unite_principale: "m²",
      recette: [],
    });

    expect(result.quantite_brute).toBe(4);
    expect(result.quantite_nette).toBe(0); // clamp à 0
  });
});
