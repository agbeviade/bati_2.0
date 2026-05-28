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
        content: `Génère un devis BTP COMPLET pour ce projet :\n\nDescription : ${description}`,
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
        content: `Génère un devis BTP COMPLET pour ce projet.

Description : ${description || "Construction BTP en Côte d'Ivoire"}

Quantités de matériaux calculées par le calculateur de débours secs :
${lignesText}

INSTRUCTIONS SPÉCIFIQUES :
1. Reprends TOUTES les lignes matériaux avec leurs quantités EXACTES (ne les modifie pas).
2. Attribue un prix unitaire réaliste (marché ivoirien 2024).
3. Ajoute la main d'œuvre adaptée (maçon, ferrailleur, manœuvre, coffreur).
4. Ajoute le transport si nécessaire.`,
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
      ? `\nQuantités exactes calculées (à utiliser telles quelles) :\n${debourseContext.map((l) => `- ${l.label} : ${l.quantity} ${l.unit}`).join("\n")}\n`
      : "";

  const imageMediaType = mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  const contentBlock =
    fileType === "pdf"
      ? {
          type: "document" as const,
          source: { type: "base64" as const, media_type: "application/pdf" as const, data: base64 },
        }
      : {
          type: "image" as const,
          source: { type: "base64" as const, media_type: imageMediaType, data: base64 },
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
            text: `Analyse ce modèle de devis BTP et génère un devis COMPLET pour :

Description du projet : ${description || "Construction BTP en Côte d'Ivoire"}
${debourseSection}
INSTRUCTIONS :
${
  debourseContext?.length
    ? "1. Pour les matériaux listés ci-dessus, utilise les quantités EXACTES.\n2. Adapte les autres postes selon le modèle.\n3. Prix réalistes marché ivoirien 2024."
    : "1. Inspire-toi de la structure du modèle.\n2. Adapte les quantités au projet.\n3. Prix réalistes marché ivoirien 2024."
}`,
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
