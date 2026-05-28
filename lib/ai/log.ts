// Helper pour enregistrer une utilisation IA dans la table ai_logs.
// Non bloquant : si le log échoue, on continue (l'IA est plus importante
// que la métrique).

import type Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export type AiLogContext = {
  companyId: string | null;
  userId: string | null;
  kind: string;
  model: string;
  startedAt: number;
  response?: Anthropic.Message;
  error?: unknown;
};

export async function recordAiUsage(ctx: AiLogContext): Promise<void> {
  try {
    const supabase = await createClient();
    const durationMs = Date.now() - ctx.startedAt;

    const usage = ctx.response?.usage;
    const errorMsg = ctx.error
      ? ctx.error instanceof Error
        ? ctx.error.message
        : String(ctx.error)
      : null;

    await supabase.from("ai_logs").insert({
      company_id: ctx.companyId,
      user_id: ctx.userId,
      kind: ctx.kind,
      model: ctx.model,
      input_tokens: usage?.input_tokens ?? 0,
      output_tokens: usage?.output_tokens ?? 0,
      cache_creation_input_tokens: usage?.cache_creation_input_tokens ?? 0,
      cache_read_input_tokens: usage?.cache_read_input_tokens ?? 0,
      success: !ctx.error,
      error: errorMsg,
      duration_ms: durationMs,
    });
  } catch (err) {
    // Ne jamais faire échouer l'appel principal à cause du logging
    logger.warn("recordAiUsage failed (non-fatal)", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
