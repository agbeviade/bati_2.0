// Moteur de calcul métré BTP — toutes les fonctions sont pures (sans side effects)

export type TypeGeometrie =
  | "surface_l_h"     // L × H → m²
  | "volume_l_l_h"    // L × l × H → m³
  | "cylindre"        // π × (D/2)² × H → m³
  | "toiture_pente"   // surface_sol / cos(arctan(pente/100)) → m²
  | "toiture_croupe"  // toiture 4 pans → m²
  | "lineaire"        // L → ml
  | "unite"           // comptage → u
  | "escalier"        // nb_marches × L × (giron + contremarche) → m²
  | "trapeze";        // (a+b)/2 × H → m²

export interface DimensionsOuvrage {
  longueur?: number;
  largeur?: number;
  hauteur?: number;
  diametre?: number;
  pente?: number;        // en %
  surface_sol?: number;
  nb_marches?: number;
  giron?: number;        // profondeur d'une marche (m)
  contremarche?: number; // hauteur d'une marche (m)
  a?: number;            // grande base trapèze
  b?: number;            // petite base trapèze
}

export interface VideDeduit {
  id: string;
  nom: string;
  largeur: number;
  hauteur: number;
  surface: number; // calculé = largeur × hauteur
}

export interface ComposantRecette {
  materiau_id: string;
  materiau_nom: string;
  unite: string;
  coefficient: number;  // quantité par unité d'ouvrage
  taux_perte: number;   // ex: 0.05 = 5% de perte/chutes
  type: "materiau" | "main_oeuvre";
}

export interface ComposantRecetteCalcule extends ComposantRecette {
  quantite_nette: number;    // coefficient × qté nette ouvrage
  quantite_commande: number; // quantite_nette × (1 + taux_perte)
}

export interface OuvrageMetre {
  id: string;
  designation: string;
  type_geometrie: TypeGeometrie;
  dimensions: DimensionsOuvrage;
  vides_deduits: VideDeduit[];
  unite_principale: string;
  recette: ComposantRecette[];
  // Calculés en mémoire uniquement — jamais persistés tels quels
  quantite_brute: number;
  quantite_nette: number;
  recette_calculee: ComposantRecetteCalcule[];
}

// ---------------------------------------------------------------------------
// Fonctions de calcul pures
// ---------------------------------------------------------------------------

function s(v?: number): number {
  return v ?? 0;
}

export function calculerBrut(type: TypeGeometrie, dim: DimensionsOuvrage): number {
  switch (type) {
    case "surface_l_h":
      return s(dim.longueur) * s(dim.hauteur);

    case "volume_l_l_h":
      return s(dim.longueur) * s(dim.largeur) * s(dim.hauteur);

    case "cylindre": {
      const r = s(dim.diametre) / 2;
      if (r === 0) return 0;
      return Math.PI * r * r * s(dim.hauteur);
    }

    case "toiture_pente": {
      const pente = s(dim.pente);
      const sol = s(dim.surface_sol);
      if (sol === 0) return 0;
      if (pente === 0) return sol;
      return sol / Math.cos(Math.atan(pente / 100));
    }

    case "toiture_croupe": {
      const pente = s(dim.pente);
      const sol = s(dim.surface_sol);
      if (sol === 0) return 0;
      const facteur = pente === 0 ? 1 : 1 / Math.cos(Math.atan(pente / 100));
      return sol * facteur * 1.05; // +5% pour les noues et faîtages
    }

    case "lineaire":
      return s(dim.longueur);

    case "unite":
      return s(dim.longueur); // "longueur" utilisé comme "quantité" pour les unités

    case "escalier": {
      const nb = s(dim.nb_marches);
      const giron = s(dim.giron) || 0.28;
      const contre = s(dim.contremarche) || 0.17;
      const larg = s(dim.largeur);
      return nb * (giron + contre) * larg;
    }

    case "trapeze": {
      const a = s(dim.a ?? dim.longueur);
      const b = s(dim.b ?? dim.largeur);
      const h = s(dim.hauteur);
      if (h === 0) return 0;
      return ((a + b) / 2) * h;
    }

    default:
      return 0;
  }
}

export function calculerSurfaceVides(vides: VideDeduit[]): number {
  return vides.reduce((sum, v) => sum + s(v.largeur) * s(v.hauteur), 0);
}

export function estTypeVolume(type: TypeGeometrie): boolean {
  return type === "volume_l_l_h" || type === "cylindre";
}

export function getUnitePrincipale(type: TypeGeometrie): string {
  if (estTypeVolume(type)) return "m³";
  if (type === "lineaire") return "ml";
  if (type === "unite") return "u";
  return "m²";
}

export function calculerOuvrage(
  ouvrage: Omit<OuvrageMetre, "quantite_brute" | "quantite_nette" | "recette_calculee">
): OuvrageMetre {
  const brut = calculerBrut(ouvrage.type_geometrie, ouvrage.dimensions);

  // Les vides ne s'appliquent qu'aux surfaces (pas aux volumes)
  const deduction = estTypeVolume(ouvrage.type_geometrie)
    ? 0
    : calculerSurfaceVides(ouvrage.vides_deduits);

  const nette = Math.max(0, brut - deduction);

  const recette_calculee: ComposantRecetteCalcule[] = ouvrage.recette.map((c) => {
    const quantite_nette = nette * c.coefficient;
    return {
      ...c,
      quantite_nette,
      quantite_commande: quantite_nette * (1 + (c.taux_perte ?? 0)),
    };
  });

  return {
    ...ouvrage,
    quantite_brute: brut,
    quantite_nette: nette,
    recette_calculee,
  };
}

// ---------------------------------------------------------------------------
// Métadonnées UI
// ---------------------------------------------------------------------------

export const LABELS_GEOMETRIE: Record<TypeGeometrie, string> = {
  surface_l_h: "Surface (L × H)",
  volume_l_l_h: "Volume (L × l × H)",
  cylindre: "Cylindre (∅ × H)",
  toiture_pente: "Toiture inclinée (2 pans)",
  toiture_croupe: "Toiture 4 pans",
  lineaire: "Linéaire (ml)",
  unite: "Unité (u)",
  escalier: "Escalier",
  trapeze: "Trapèze",
};

export const ICONES_GEOMETRIE: Record<TypeGeometrie, string> = {
  surface_l_h: "▭",
  volume_l_l_h: "▬",
  cylindre: "⬤",
  toiture_pente: "△",
  toiture_croupe: "◇",
  lineaire: "—",
  unite: "#",
  escalier: "⬒",
  trapeze: "⬡",
};

export interface ChampDimension {
  key: keyof DimensionsOuvrage;
  label: string;
  placeholder?: string;
  step?: string;
}

export const CHAMPS_PAR_TYPE: Record<TypeGeometrie, ChampDimension[]> = {
  surface_l_h: [
    { key: "longueur", label: "Longueur (m)", placeholder: "ex: 10" },
    { key: "hauteur", label: "Hauteur / Largeur (m)", placeholder: "ex: 3" },
  ],
  volume_l_l_h: [
    { key: "longueur", label: "Longueur (m)", placeholder: "ex: 5" },
    { key: "largeur", label: "Largeur (m)", placeholder: "ex: 4" },
    { key: "hauteur", label: "Épaisseur / Profondeur (m)", placeholder: "ex: 0.15" },
  ],
  cylindre: [
    { key: "diametre", label: "Diamètre (m)", placeholder: "ex: 0.30" },
    { key: "hauteur", label: "Hauteur (m)", placeholder: "ex: 3" },
  ],
  toiture_pente: [
    { key: "surface_sol", label: "Surface au sol (m²)", placeholder: "ex: 80" },
    { key: "pente", label: "Pente (%)", placeholder: "ex: 35" },
  ],
  toiture_croupe: [
    { key: "surface_sol", label: "Surface au sol (m²)", placeholder: "ex: 80" },
    { key: "pente", label: "Pente (%)", placeholder: "ex: 35" },
  ],
  lineaire: [
    { key: "longueur", label: "Longueur (m)", placeholder: "ex: 25" },
  ],
  unite: [
    { key: "longueur", label: "Quantité", placeholder: "ex: 3", step: "1" },
  ],
  escalier: [
    { key: "nb_marches", label: "Nombre de marches", placeholder: "ex: 14", step: "1" },
    { key: "giron", label: "Giron (m)", placeholder: "0.28" },
    { key: "contremarche", label: "Contremarche (m)", placeholder: "0.17" },
    { key: "largeur", label: "Largeur escalier (m)", placeholder: "ex: 1.20" },
  ],
  trapeze: [
    { key: "a", label: "Grande base a (m)", placeholder: "ex: 8" },
    { key: "b", label: "Petite base b (m)", placeholder: "ex: 5" },
    { key: "hauteur", label: "Hauteur (m)", placeholder: "ex: 4" },
  ],
};
