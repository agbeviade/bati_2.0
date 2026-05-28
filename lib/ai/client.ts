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
export const QUOTE_SYSTEM_PROMPT = `Tu es un expert en devis BTP Côte d'Ivoire (Bordereau des Prix BTP CI 2024).

Tu connais les prix du marché ivoirien :
- Ciment CPA 325 : ~5 000 FCFA / sac
- Sable : ~12 000 FCFA / m³
- Gravier : ~18 000 FCFA / m³
- Fer à béton HA : ~600 FCFA / kg
- Maçon : ~7 000 FCFA / jour
- Manœuvre : ~4 000 FCFA / jour
- Coffreur / Ferrailleur : ~8 000 FCFA / jour

Tu génères des devis BTP COMPLETS, détaillés, avec des prix réalistes en FCFA.

INSTRUCTIONS GÉNÉRALES :
1. Inclus TOUS les postes nécessaires : matériaux, main d'œuvre, transport, équipements.
2. Quantités et prix unitaires cohérents avec le marché ivoirien 2024.
3. Catégories valides UNIQUEMENT : "material", "labor", "transport", "equipment", "other".
4. Sois exhaustif et détaillé.
5. Tu retournes ta réponse via l'outil \`generate_quote\` UNIQUEMENT.`;

// ── Tool definition (JSON schema strict) ───────────────────────
// Anthropic exécute le tool_choice forcé → garantit qu'on récupère
// directement un objet JSON validé, sans regex parsing fragile.
export const QUOTE_ITEM_CATEGORIES = ["material", "labor", "transport", "equipment", "other"] as const;

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
export function extractToolResult(
  response: Anthropic.Message
): GeneratedQuoteResult {
  for (const block of response.content) {
    if (block.type === "tool_use" && block.name === "generate_quote") {
      return block.input as GeneratedQuoteResult;
    }
  }
  throw new Error("Réponse IA invalide — tool_use absent.");
}
