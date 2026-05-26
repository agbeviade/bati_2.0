"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { QuoteStatus, QuoteItemCategory } from "@/lib/supabase/types";

async function getProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("users").select("company_id").eq("id", user.id).single();
  if (!profile?.company_id) redirect("/onboarding");
  return { user, companyId: profile.company_id as string, supabase };
}

function nextQuoteNumber(count: number): string {
  const year = new Date().getFullYear();
  return `DEVIS-${year}-${String(count + 1).padStart(3, "0")}`;
}

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
  const { user, companyId, supabase } = await getProfile();

  const { count } = await supabase
    .from("quotes")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);

  const quote_number = nextQuoteNumber(count ?? 0);

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
    console.error("[createQuote]", quoteError);
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
      }))
    );
    if (itemsError) console.error("[createQuote items]", itemsError);
  }

  revalidatePath("/quotes");
  revalidatePath("/dashboard");
  redirect(`/quotes/${quote.id}`);
}

export async function updateQuoteStatus(id: string, status: QuoteStatus) {
  const { supabase } = await getProfile();
  const { error } = await supabase.from("quotes").update({ status }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/quotes/${id}`);
  revalidatePath("/quotes");
  revalidatePath("/dashboard");
}

export async function deleteQuote(id: string) {
  const { supabase } = await getProfile();
  await supabase.from("quotes").delete().eq("id", id);
  revalidatePath("/quotes");
  revalidatePath("/dashboard");
  redirect("/quotes");
}

export async function addQuoteItem(quoteId: string, item: QuoteItemInput) {
  const { supabase } = await getProfile();
  const { error } = await supabase.from("quote_items").insert({ quote_id: quoteId, ...item });
  if (error) return { error: error.message };
  revalidatePath(`/quotes/${quoteId}`);
}

export async function updateQuoteMeta(id: string, data: {
  client_name: string;
  project_type: string;
  surface_m2: string;
  valid_until: string;
  tax_rate: string;
  margin_pct: string;
  notes: string;
}) {
  const { supabase } = await getProfile();
  const { error } = await supabase.from("quotes").update({
    client_name: data.client_name || null,
    project_type: data.project_type || null,
    surface_m2: data.surface_m2 ? Number(data.surface_m2) : null,
    valid_until: data.valid_until || null,
    tax_rate: Number(data.tax_rate) || 0,
    margin_pct: Number(data.margin_pct) || 0,
    notes: data.notes || null,
  }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/quotes/${id}`);
  revalidatePath("/quotes");
}

export async function deleteQuoteItem(itemId: string, quoteId: string) {
  const { supabase } = await getProfile();
  await supabase.from("quote_items").delete().eq("id", itemId);
  revalidatePath(`/quotes/${quoteId}`);
}
