import { NextRequest, NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  AI_MODEL,
  GENERATE_QUOTE_TOOL,
  QUOTE_SYSTEM_PROMPT,
  extractToolResult,
  getAI,
  type GeneratedQuoteResult,
} from "@/lib/ai/client";
import { recordAiUsage } from "@/lib/ai/log";

// admin client réservé au storage download (templates en bucket privé)

type ApiResponse = GeneratedQuoteResult & { error?: string };

// ── Bloc system commun (cache_control) ─────────────────────────
// Bloc array partagé entre les 3 chemins → réutilise le cache.
const CACHED_SYSTEM: Anthropic.MessageCreateParams["system"] = [
  { type: "text", text: QUOTE_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
];

const COMMON_PARAMS = {
  model: AI_MODEL,
  max_tokens: 8192,
  tools: [GENERATE_QUOTE_TOOL],
  tool_choice: { type: "tool" as const, name: "generate_quote" },
};

// ── Chemin 1 : description libre ───────────────────────────────
async function fromDescription(description: string): Promise<Anthropic.Message> {
  const ai = getAI();
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

// ── Chemin 2 : modèle de débours secs ──────────────────────────
async function fromDebourseModel(modelId: string, description: string): Promise<Anthropic.Message> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("debourses_models")
    .select("inputs")
    .eq("id", modelId)
    .single();
  if (!data?.inputs) throw new Error("Modèle de débours introuvable.");

  const { computeRecap, RECAP_LABELS, RECAP_UNITS } = await import("@/lib/debourses-calc");
  const recap = computeRecap(data.inputs as unknown as Parameters<typeof computeRecap>[0]);
  const lignes = (Object.keys(recap) as (keyof typeof recap)[])
    .filter((k) => recap[k] > 0)
    .map((k) => ({ label: RECAP_LABELS[k], quantity: recap[k], unit: RECAP_UNITS[k] }));

  const lignesText = lignes.map((l) => `- ${l.label} : ${l.quantity} ${l.unit}`).join("\n");

  const ai = getAI();
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

// ── Chemin 3 : modèle de devis (PDF / image) ──────────────────
async function fromTemplate(
  templateId: string,
  description: string,
  debourseModelId?: string,
): Promise<Anthropic.Message> {
  const supabase = await createClient();
  const admin = createAdminClient(); // storage download requires admin

  const { data: tpl } = await supabase
    .from("quote_templates")
    .select("storage_path, file_type, mime_type")
    .eq("id", templateId)
    .single();
  if (!tpl?.storage_path) throw new Error("Modèle de devis introuvable.");

  const { data: fileData, error: dlErr } = await admin.storage
    .from("quote-templates")
    .download(tpl.storage_path);
  if (dlErr || !fileData) throw new Error("Impossible de télécharger le modèle.");

  const buffer = await fileData.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const mimeType = tpl.mime_type as string;
  const fileType = tpl.file_type as "pdf" | "image";

  let debourseContext: Array<{ label: string; quantity: number; unit: string }> | undefined;
  if (debourseModelId) {
    const { data: dm } = await supabase
      .from("debourses_models")
      .select("inputs")
      .eq("id", debourseModelId)
      .single();
    if (dm?.inputs) {
      const { computeRecap, RECAP_LABELS, RECAP_UNITS } = await import("@/lib/debourses-calc");
      const recap = computeRecap(dm.inputs as unknown as Parameters<typeof computeRecap>[0]);
      debourseContext = (Object.keys(recap) as (keyof typeof recap)[])
        .filter((k) => recap[k] > 0)
        .map((k) => ({ label: RECAP_LABELS[k], quantity: recap[k], unit: RECAP_UNITS[k] }));
    }
  }

  const debourseSection =
    debourseContext && debourseContext.length > 0
      ? debourseContext.map((l) => `- ${l.label} : ${l.quantity} ${l.unit}`).join("\n")
      : "(aucun métré fourni — utilise les quantités du modèle ou déduis-les de l'instruction)";

  const imageMediaType = mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  // cache_control sur le document : un même template régénéré dans
  // les 5 min ne re-paye pas l'input du PDF (~70% d'économie sur ce bloc).
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

  const ai = getAI();
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
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle();
  const companyId = (profile as { company_id?: string | null } | null)?.company_id ?? null;

  const body = (await request.json()) as {
    description?: string;
    template_id?: string;
    debourse_model_id?: string;
  };

  const description = body.description?.trim() ?? "";
  const templateId = body.template_id?.trim() ?? "";
  const debourseModelId = body.debourse_model_id?.trim() ?? "";

  if (!templateId && !debourseModelId && description.length < 10) {
    return NextResponse.json(
      {
        error:
          "Fournissez un template_id, un debourse_model_id, ou une description (min 10 caractères).",
      },
      { status: 400 },
    );
  }

  const kind = templateId
    ? "quote_from_template"
    : debourseModelId
      ? "quote_from_debourses"
      : "quote_from_description";

  const startedAt = Date.now();
  let response: Anthropic.Message;

  try {
    if (templateId) {
      response = await fromTemplate(templateId, description, debourseModelId || undefined);
    } else if (debourseModelId) {
      response = await fromDebourseModel(debourseModelId, description);
    } else {
      response = await fromDescription(description);
    }
  } catch (e) {
    await recordAiUsage({ companyId, userId: user.id, kind, model: AI_MODEL, startedAt, error: e });
    const msg = e instanceof Error ? e.message : String(e);
    // 422 si l'erreur est métier (modèle introuvable), 500 sinon
    const status = msg.includes("introuvable") || msg.includes("télécharger") ? 422 : 500;
    return NextResponse.json({ error: msg }, { status });
  }

  await recordAiUsage({ companyId, userId: user.id, kind, model: AI_MODEL, startedAt, response });

  try {
    const result = extractToolResult(response);
    return NextResponse.json<ApiResponse>(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
