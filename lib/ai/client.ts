import Anthropic from "@anthropic-ai/sdk";

// Singleton — réutilise la connexion entre les appels serveur
let _client: Anthropic | null = null;

export function getAI(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY manquant dans les variables d'environnement");
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

export const AI_MODEL = "claude-sonnet-4-6";

// ── Prompt système (long, stable) ─────────────────────────────
// Stable → cacheable via cache_control ephemeral. Réutilisé sur
// les 3 chemins (description / debourses / template) pour que les
// requêtes successives bénéficient du cache (~90% de réduction
// sur les tokens d'entrée du système).
export const QUOTE_SYSTEM_PROMPT = `Tu es expert en devis BTP Côte d'Ivoire (Bordereau des Prix BTP CI 2024).

## RÔLE
Tu génères un devis chiffré COMPLET à partir de jusqu'à 3 sources :
  A. Un MODÈLE DE DEVIS (PDF/image) — fournit la STRUCTURE (lots, sous-sections, items, unités).
  B. Un MODÈLE DE MÉTRÉ (débours secs) — fournit les QUANTITÉS EXACTES de matériaux.
  C. Une INSTRUCTION libre — décrit le projet et ses spécificités.

## HIÉRARCHIE STRICTE (ordre de priorité)
1. STRUCTURE : suit EXACTEMENT le modèle de devis (A) quand il est fourni. N'ajoute, ne supprime, ne renomme AUCUN poste sans raison documentée dans les notes.
2. QUANTITÉS :
   - Si métré (B) fournit une quantité pour un poste → utilise-la TELLE QUELLE (jamais d'arrondi, jamais de recalcul).
   - Sinon, prends la quantité du modèle (A) si présente.
   - Sinon, déduis-la de l'instruction (C) en explicitant l'hypothèse en note.
3. PRIX UNITAIRES : toujours toi. Marché ivoirien 2024, FCFA, sans arrondi excessif.
4. CONTRADICTION entre A et B (même poste, quantité différente) → priorité au MÉTRÉ (B). Mentionne-le dans les notes.

## CONNAISSANCES PRIX (FCFA, marché Abidjan 2024)
- Ciment CPA 325 : ~5 000 / sac (50 kg)
- Sable : ~12 000 / m³ ; Gravier 5/15 : ~18 000 / m³ ; Gravier 15/25 : ~20 000 / m³
- Fer à béton HA : ~600 / kg ; Fil de fer recuit : ~1 500 / kg
- Béton dosé 350 kg/m³ (matériaux seuls) : ~95 000 / m³
- Agglos creux 15 : ~250 / u ; Agglos plein 15 : ~300 / u
- Maçon : 7 000 / j ; Coffreur : 8 000 / j ; Ferrailleur : 8 000 / j ; Manœuvre : 4 000 / j ; Chef de chantier : 15 000 / j
- Carrelage grès cérame 60×60 : 5 000–9 000 / m² (pose : ~4 000 / m²)
- Peinture intérieure 2 couches (fourniture + pose) : ~2 500 / m²

## RÈGLES DE FORMATAGE
- Si un modèle de devis est fourni, conserve les codes (1.1.1, 2.2.3…) et titres de lots tels quels, même imparfaits.
- Unités normalisées : m2, m3, ml, u, fft, kg, ens, j, sac.
- Aucun poste avec quantity=0. Quantité incertaine → exclus la ligne et mentionne-la en note.
- Catégories valides : "material", "labor", "transport", "equipment", "other".

## TVA & TOTAUX
Ne calcule PAS les sous-totaux ni la TVA : c'est fait côté code. Renvoie uniquement les lignes.

## SORTIE
Tu réponds UNIQUEMENT via l'outil \`generate_quote\`. Aucun texte libre.
Le champ \`notes\` liste en bullet points :
  - Hypothèses prises (quantités déduites, postes ajoutés)
  - Postes du modèle écartés et raison
  - Contradictions A vs B résolues`;

// ── Tool definition (JSON schema strict) ───────────────────────
// Anthropic exécute le tool_choice forcé → garantit qu'on récupère
// directement un objet JSON validé, sans regex parsing fragile.
export const QUOTE_ITEM_CATEGORIES = [
  "material",
  "labor",
  "transport",
  "equipment",
  "other",
] as const;

export type GeneratedQuoteItem = {
  category: (typeof QUOTE_ITEM_CATEGORIES)[number];
  label: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
};

export type GeneratedQuoteResult = {
  items: GeneratedQuoteItem[];
  notes: string;
};

export const GENERATE_QUOTE_TOOL: Anthropic.Tool = {
  name: "generate_quote",
  description: "Retourne un devis BTP complet avec ses lignes et des notes.",
  input_schema: {
    type: "object" as const,
    properties: {
      items: {
        type: "array",
        description: "Lignes du devis. Au moins 1 ligne.",
        items: {
          type: "object",
          properties: {
            category: {
              type: "string",
              enum: [...QUOTE_ITEM_CATEGORIES],
              description: "Catégorie de la ligne.",
            },
            label: { type: "string", description: "Libellé du poste." },
            quantity: { type: "number", description: "Quantité." },
            unit: { type: "string", description: "Unité (sac, m³, kg, jour, etc.)." },
            unit_price: { type: "number", description: "Prix unitaire en FCFA." },
            total: { type: "number", description: "Total ligne (quantity × unit_price) en FCFA." },
          },
          required: ["category", "label", "quantity", "unit", "unit_price", "total"],
        },
      },
      notes: { type: "string", description: "Notes / conditions / clauses." },
    },
    required: ["items", "notes"],
  },
};

// ── Helpers ───────────────────────────────────────────────────

/**
 * Extrait le résultat d'un tool_use forcé.
 * Lance si la réponse ne contient pas de tool_use (ne devrait jamais
 * arriver avec tool_choice forcé, mais on garde la garde).
 */
export function extractToolResult(response: Anthropic.Message): GeneratedQuoteResult {
  for (const block of response.content) {
    if (block.type === "tool_use" && block.name === "generate_quote") {
      return block.input as GeneratedQuoteResult;
    }
  }
  throw new Error("Réponse IA invalide — tool_use absent.");
}
