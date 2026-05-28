import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getAI,
  AI_MODEL,
  QUOTE_SYSTEM_PROMPT,
  GENERATE_QUOTE_TOOL,
  extractToolResult,
} from "@/lib/ai/client";
import { recordAiUsage } from "@/lib/ai/log";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  // Récupère le company_id pour scoper le log (RLS rejettera sinon)
  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle();
  const companyId = (profile as { company_id?: string | null } | null)?.company_id ?? null;

  const body = (await request.json()) as { description?: string };
  const description = body.description?.trim() ?? "";
  if (description.length < 10) {
    return NextResponse.json(
      { error: "Description trop courte (minimum 10 caractères)." },
      { status: 400 },
    );
  }

  const startedAt = Date.now();
  const ai = getAI();
  let response;
  try {
    response = await ai.messages.create({
      model: AI_MODEL,
      max_tokens: 8192,
      // System prompt en bloc array + cache_control → ~90% de réduction
      // sur les tokens d'entrée du système à partir de la 2e requête.
      system: [{ type: "text", text: QUOTE_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      tools: [GENERATE_QUOTE_TOOL],
      // Force l'IA à répondre via le tool → JSON validé, plus de regex parsing.
      tool_choice: { type: "tool", name: "generate_quote" },
      messages: [
        {
          role: "user",
          content: `Génère un devis BTP COMPLET pour ce projet :\n\nDescription : ${description}`,
        },
      ],
    });
  } catch (e) {
    await recordAiUsage({
      companyId,
      userId: user.id,
      kind: "quote_from_description",
      model: AI_MODEL,
      startedAt,
      error: e,
    });
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  await recordAiUsage({
    companyId,
    userId: user.id,
    kind: "quote_from_description",
    model: AI_MODEL,
    startedAt,
    response,
  });

  try {
    const result = extractToolResult(response);
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
