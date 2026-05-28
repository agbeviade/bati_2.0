"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthedProfile } from "@/lib/auth/profile";
import { logger } from "@/lib/logger";
import type { QuoteStatus, QuoteItemCategory } from "@/lib/supabase/types";

export type QuoteItemInput = {
  category: QuoteItemCategory;
  label: string;
  quantity: number;
  unit: string;
  unit_price: number;
  sort_order: number;
};

export async function createQuote(data: {
  client_name: string;
  project_type: string;
  surface_m2: string;
  valid_until: string;
  tax_rate: string;
  margin_pct: string;
  notes: string;
  project_id: string;
  items: QuoteItemInput[];
}) {
  const { user, companyId, supabase } = await getAuthedProfile();

  const { data: quote_number, error: numErr } = await supabase.rpc("next_document_number", {
    p_kind: "quote",
  });
  if (numErr || !quote_number) {
    logger.error("createQuote number generation failed", numErr, { companyId });
    return { error: "Impossible de générer le numéro de devis." };
  }

  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .insert({
      company_id: companyId,
      quote_number,
      client_name: data.client_name || null,
      project_type: data.project_type || null,
      surface_m2: data.surface_m2 ? Number(data.surface_m2) : null,
      valid_until: data.valid_until || null,
      tax_rate: Number(data.tax_rate) || 0,
      margin_pct: Number(data.margin_pct) || 0,
      notes: data.notes || null,
      project_id: data.project_id || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (quoteError || !quote) {
    logger.error("createQuote insert failed", quoteError, { companyId });
    return { error: `Impossible de créer le devis. (${quoteError?.message})` };
  }

  if (data.items.length > 0) {
    const { error: itemsError } = await supabase.from("quote_items").insert(
      data.items.map((item) => ({
        quote_id: quote.id,
        category: item.category,
        label: item.label,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        sort_order: item.sort_order,
      })),
    );
    if (itemsError)
      logger.error("createQuote items insert failed", itemsError, { quoteId: quote.id });
  }

  revalidatePath("/quotes");
  revalidatePath("/dashboard");
  redirect(`/quotes/${quote.id}`);
}

export async function updateQuoteStatus(id: string, status: QuoteStatus) {
  const { supabase } = await getAuthedProfile();
  const { error } = await supabase.from("quotes").update({ status }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/quotes/${id}`);
  revalidatePath("/quotes");
  revalidatePath("/dashboard");
}

export async function deleteQuote(id: string) {
  const { supabase } = await getAuthedProfile();
  await supabase.from("quotes").delete().eq("id", id);
  revalidatePath("/quotes");
  revalidatePath("/dashboard");
  redirect("/quotes");
}

export async function addQuoteItem(quoteId: string, item: QuoteItemInput) {
  const { supabase } = await getAuthedProfile();
  const { error } = await supabase.from("quote_items").insert({ quote_id: quoteId, ...item });
  if (error) return { error: error.message };
  revalidatePath(`/quotes/${quoteId}`);
}

export async function updateQuoteMeta(
  id: string,
  data: {
    client_name: string;
    project_type: string;
    surface_m2: string;
    valid_until: string;
    tax_rate: string;
    margin_pct: string;
    notes: string;
  },
) {
  const { supabase } = await getAuthedProfile();
  const { error } = await supabase
    .from("quotes")
    .update({
      client_name: data.client_name || null,
      project_type: data.project_type || null,
      surface_m2: data.surface_m2 ? Number(data.surface_m2) : null,
      valid_until: data.valid_until || null,
      tax_rate: Number(data.tax_rate) || 0,
      margin_pct: Number(data.margin_pct) || 0,
      notes: data.notes || null,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/quotes/${id}`);
  revalidatePath("/quotes");
}

export async function deleteQuoteItem(itemId: string, quoteId: string) {
  const { supabase } = await getAuthedProfile();
  await supabase.from("quote_items").delete().eq("id", itemId);
  revalidatePath(`/quotes/${quoteId}`);
}
