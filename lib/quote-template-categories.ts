export const TEMPLATE_CATEGORIES = [
  { value: "maison_basse", label: "Maison basse (RDC)" },
  { value: "duplex", label: "Duplex (R+1)" },
  { value: "immeuble_r2", label: "Immeuble (R+2)" },
  { value: "immeuble_r3", label: "Immeuble (R+3 et +)" },
  { value: "villa_piscine", label: "Villa avec piscine" },
  { value: "commercial", label: "Bâtiment commercial" },
  { value: "boutique", label: "Boutique / Kiosque" },
  { value: "entrepot", label: "Entrepôt / Hangar" },
  { value: "cloture", label: "Clôture et portail" },
  { value: "renovation", label: "Rénovation / Finitions" },
  { value: "toiture", label: "Charpente / Toiture" },
  { value: "assainissement", label: "VRD / Assainissement" },
  { value: "fondations", label: "Fondations spéciales" },
  { value: "autre", label: "Autre" },
] as const;

export type TemplateCategoryValue = (typeof TEMPLATE_CATEGORIES)[number]["value"];

export function getCategoryLabel(value: string): string {
  return TEMPLATE_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
