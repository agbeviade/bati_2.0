"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { QuoteStatus, QuoteItemCategory } from "@/lib/supabase/types";

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
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
  const user = await getUser();
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id) redirect("/onboarding");

  const { count } = await admin
    .from("quotes")
    .select("id", { count: "exact", head: true })
    .eq("company_id", profile.company_id);

  const quote_number = nextQuoteNumber(count ?? 0);

  const { data: quote, error: quoteError } = await admin
    .from("quotes")
    .insert({
      company_id: profile.company_id,
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
    const { error: itemsError } = await admin.from("quote_items").insert(
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
    if (itemsError) {
      console.error("[createQuote items]", itemsError);
    }
  }

  revalidatePath("/quotes");
  redirect(`/quotes/${quote.id}`);
}

export async function updateQuoteStatus(id: string, status: QuoteStatus) {
  await getUser();
  const admin = createAdminClient();

  const { error } = await admin.from("quotes").update({ status }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/quotes/${id}`);
  revalidatePath("/quotes");
}

export async function deleteQuote(id: string) {
  await getUser();
  const admin = createAdminClient();

  await admin.from("quotes").delete().eq("id", id);

  revalidatePath("/quotes");
  redirect("/quotes");
}

export async function addQuoteItem(quoteId: string, item: QuoteItemInput) {
  await getUser();
  const admin = createAdminClient();

  const { error } = await admin.from("quote_items").insert({
    quote_id: quoteId,
    ...item,
  });

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
  await getUser();
  const admin = createAdminClient();

  const { error } = await admin.from("quotes").update({
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
  await getUser();
  const admin = createAdminClient();

  await admin.from("quote_items").delete().eq("id", itemId);
  revalidatePath(`/quotes/${quoteId}`);
}
