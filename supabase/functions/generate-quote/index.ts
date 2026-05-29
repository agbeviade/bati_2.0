// Edge Function : Génération de devis BTP via Anthropic / Claude.
//
// IMPORTANT — Le system prompt et la définition du tool doivent rester
// synchronisés avec batiflow-web/lib/ai/client.ts. Toute évolution du
// prompt côté web doit être répercutée ici (et inversement).
//
// 3 chemins, mirroir de batiflow-web/app/api/ai/quote/route.ts :
//   • description seule
//   • debourse_model_id (métré pré-calculé)
//   • template_id (PDF/image) + optionnellement debourse_model_id

import Anthropic from "npm:@anthropic-ai/sdk@^0.40.0";
import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  type AllInputs,
  computeRecap,
  type DebourseRecap,
  RECAP_LABELS,
  RECAP_UNITS,
} from "../_shared/debourses-calc.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_MODEL = "claude-sonnet-4-6";

// ── Prompt système (aligné avec lib/ai/client.ts) ──────────────
const QUOTE_SYSTEM_PROMPT = `Tu es expert en devis BTP Côte d'Ivoire (Bordereau des Prix BTP CI 2024).

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

// ── Tool definition (aligné avec lib/ai/client.ts) ─────────────
const QUOTE_ITEM_CATEGORIES = ["material", "labor", "transport", "equipment", "other"] as const;

const GENERATE_QUOTE_TOOL = {
  name: "generate_quote",
  description: "Retourne un devis BTP complet avec ses lignes et des notes.",
  input_schema: {
    type: "object" as const,
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            category: { type: "string", enum: [...QUOTE_ITEM_CATEGORIES] },
            label: { type: "string" },
            quantity: { type: "number" },
            unit: { type: "string" },
            unit_price: { type: "number" },
            total: { type: "number" },
          },
          required: ["category", "label", "quantity", "unit", "unit_price", "total"],
        },
      },
      notes: { type: "string" },
    },
    required: ["items", "notes"],
  },
};

interface QuoteItem {
  category: "material" | "labor" | "transport" | "equipment" | "other";
  label: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
}

const CACHED_SYSTEM = [
  {
    type: "text" as const,
    text: QUOTE_SYSTEM_PROMPT,
    cache_control: { type: "ephemeral" as const },
  },
];

const COMMON_PARAMS = {
  model: AI_MODEL,
  max_tokens: 8192,
  tools: [GENERATE_QUOTE_TOOL],
  tool_choice: { type: "tool" as const, name: "generate_quote" },
};

function extractToolResult(response: Anthropic.Message): { items: QuoteItem[]; notes: string } {
  for (const block of response.content) {
    if (block.type === "tool_use" && block.name === "generate_quote") {
      return block.input as { items: QuoteItem[]; notes: string };
    }
  }
  throw new Error("Réponse IA invalide — tool_use absent.");
}

// ── Helper : récupère le métré formaté pour le prompt ──────────
async function fetchDebourseLines(
  supabase: ReturnType<typeof createClient>,
  debourseModelId: string,
): Promise<Array<{ label: string; quantity: number; unit: string }>> {
  const { data } = await supabase
    .from("debourses_models")
    .select("inputs")
    .eq("id", debourseModelId)
    .single();
  if (!data?.inputs) throw new Error("Modèle de débours introuvable.");

  const recap = computeRecap(data.inputs as unknown as AllInputs);
  return (Object.keys(recap) as (keyof DebourseRecap)[])
    .filter((k) => recap[k] > 0)
    .map((k) => ({ label: RECAP_LABELS[k], quantity: recap[k], unit: RECAP_UNITS[k] }));
}

// ── Chemin 1 : description libre ───────────────────────────────
async function fromDescription(ai: Anthropic, description: string) {
  return ai.messages.create({
    ...COMMON_PARAMS,
    system: CACHED_SYSTEM,
    messages: [
      {
        role: "user",
        content: `# DEVIS À GÉNÉRER

## A. MODÈLE DE DEVIS
(aucun modèle fourni — construis une structure standard BTP CI)

## B. MODÈLE DE MÉTRÉ
(aucun métré fourni — déduis les quantités de l'instruction)

## C. INSTRUCTION DU PROJET
${description}

## TÂCHE
Applique la hiérarchie du système. Sois exhaustif (gros œuvre, second œuvre, finitions, MO, transport).`,
      },
    ],
  });
}

// ── Chemin 2 : modèle de métré seul ────────────────────────────
async function fromDebourseModel(
  ai: Anthropic,
  supabase: ReturnType<typeof createClient>,
  debourseModelId: string,
  description: string,
) {
  const lignes = await fetchDebourseLines(supabase, debourseModelId);
  const lignesText = lignes.map((l) => `- ${l.label} : ${l.quantity} ${l.unit}`).join("\n");

  return ai.messages.create({
    ...COMMON_PARAMS,
    system: CACHED_SYSTEM,
    messages: [
      {
        role: "user",
        content: `# DEVIS À GÉNÉRER

## A. MODÈLE DE DEVIS
(aucun modèle fourni — construis une structure standard BTP CI couvrant tous les lots utiles)

## B. MODÈLE DE MÉTRÉ (quantités exactes — à utiliser telles quelles)
${lignesText}

## C. INSTRUCTION DU PROJET
${description || "Construction BTP en Côte d'Ivoire"}

## TÂCHE
Applique la hiérarchie du système.
- Reprends EXACTEMENT chaque ligne du métré (B) avec sa quantité.
- Ajoute la main d'œuvre adaptée (maçon, ferrailleur, manœuvre, coffreur) et le transport.
- Complète avec les postes manquants pour un devis exhaustif.`,
      },
    ],
  });
}

// ── Chemin 3 : template (PDF/image) + métré optionnel ──────────
async function fromTemplate(
  ai: Anthropic,
  supabase: ReturnType<typeof createClient>,
  templateId: string,
  description: string,
  debourseModelId: string | undefined,
) {
  const { data: tpl } = await supabase
    .from("quote_templates")
    .select("storage_path, file_type, mime_type")
    .eq("id", templateId)
    .single();
  if (!tpl?.storage_path) throw new Error("Modèle de devis introuvable.");

  // Storage download : requiert service_role car bucket privé.
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: fileData, error: dlErr } = await admin.storage
    .from("quote-templates")
    .download(tpl.storage_path as string);
  if (dlErr || !fileData) throw new Error("Impossible de télécharger le modèle.");

  const buffer = await fileData.arrayBuffer();
  // btoa attend une string binaire — conversion octet par octet.
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  const base64 = btoa(binary);

  const mimeType = tpl.mime_type as string;
  const fileType = tpl.file_type as "pdf" | "image";

  let debourseSection =
    "(aucun métré fourni — utilise les quantités du modèle ou déduis-les de l'instruction)";
  if (debourseModelId) {
    const lignes = await fetchDebourseLines(supabase, debourseModelId);
    if (lignes.length > 0) {
      debourseSection = lignes.map((l) => `- ${l.label} : ${l.quantity} ${l.unit}`).join("\n");
    }
  }

  const imageMediaType = mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  // cache_control sur le document : un même template régénéré dans
  // les 5 min ne re-paye pas l'input du PDF (~70% d'économie).
  const contentBlock =
    fileType === "pdf"
      ? {
          type: "document" as const,
          source: { type: "base64" as const, media_type: "application/pdf" as const, data: base64 },
          cache_control: { type: "ephemeral" as const },
        }
      : {
          type: "image" as const,
          source: { type: "base64" as const, media_type: imageMediaType, data: base64 },
          cache_control: { type: "ephemeral" as const },
        };

  return ai.messages.create({
    ...COMMON_PARAMS,
    system: CACHED_SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          contentBlock,
          {
            type: "text",
            text: `# DEVIS À GÉNÉRER

## A. MODÈLE DE DEVIS (structure de référence)
Voir le document ci-joint. Tu DOIS reproduire sa structure (lots, sous-sections, items, codes, unités).

## B. MODÈLE DE MÉTRÉ
${debourseSection}

## C. INSTRUCTION DU PROJET
${description || "Construction BTP en Côte d'Ivoire"}

## TÂCHE
Applique la HIÉRARCHIE STRICTE :
  1. Structure ← A (modèle de devis) — codes et titres conservés tels quels
  2. Quantités ← B si fournie pour le poste, sinon A, sinon déduction de C
  3. Prix unitaires ← toi (marché ivoirien 2024)

Signale dans \`notes\` : hypothèses, postes écartés, contradictions A vs B résolues.`,
          },
        ],
      },
    ],
  });
}

// ── Handler ────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Session invalide" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as {
      description?: string;
      template_id?: string;
      debourse_model_id?: string;
    };

    const description = body.description?.trim() ?? "";
    const templateId = body.template_id?.trim() ?? "";
    const debourseModelId = body.debourse_model_id?.trim() ?? "";

    if (!templateId && !debourseModelId && description.length < 10) {
      return new Response(
        JSON.stringify({
          error:
            "Fournissez un template_id, un debourse_model_id, ou une description (min 10 caractères).",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY non configurée côté Supabase" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const ai = new Anthropic({ apiKey });

    let response: Anthropic.Message;
    if (templateId) {
      response = await fromTemplate(
        ai,
        supabase,
        templateId,
        description,
        debourseModelId || undefined,
      );
    } else if (debourseModelId) {
      response = await fromDebourseModel(ai, supabase, debourseModelId, description);
    } else {
      response = await fromDescription(ai, description);
    }

    const result = extractToolResult(response);
    const items = result.items.map((item, i) => ({
      ...item,
      total: item.quantity * item.unit_price,
      sort_order: i,
    }));
    const subtotal = items.reduce((s, i) => s + i.total, 0);

    return new Response(JSON.stringify({ items, subtotal, notes: result.notes }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = msg.includes("introuvable") || msg.includes("télécharger") ? 422 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
