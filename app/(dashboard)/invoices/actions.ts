"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { InvoiceStatus, PaymentMethod } from "@/lib/supabase/types";

async function getProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("users").select("company_id").eq("id", user.id).single();
  if (!profile?.company_id) redirect("/onboarding");
  return { user, companyId: profile.company_id as string, supabase };
}

function nextInvoiceNumber(count: number): string {
  const year = new Date().getFullYear();
  return `FAC-${year}-${String(count + 1).padStart(3, "0")}`;
}

export async function createInvoice(formData: FormData) {
  const { user, companyId, supabase } = await getProfile();

  const { count } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);

  const invoice_number = nextInvoiceNumber(count ?? 0);

  const client_name = (formData.get("client_name") as string)?.trim() || null;
  const amount = Number(formData.get("amount")) || 0;
  const due_date = (formData.get("due_date") as string) || null;
  const notes = (formData.get("notes") as string)?.trim() || null;
  const project_id = (formData.get("project_id") as string) || null;
  const quote_id = (formData.get("quote_id") as string) || null;

  const { data: invoice, error } = await supabase.from("invoices").insert({
    company_id: companyId,
    invoice_number,
    client_name,
    amount,
    due_date,
    notes,
    project_id,
    quote_id,
    created_by: user.id,
  }).select("id").single();

  if (error || !invoice) {
    console.error("[createInvoice]", error);
    return { error: error?.message };
  }

  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  redirect(`/invoices/${invoice.id}`);
}

export async function updateInvoiceStatus(id: string, status: InvoiceStatus) {
  const { supabase } = await getProfile();
  const update: { status: InvoiceStatus; paid_at?: string } = { status };
  if (status === "paid") update.paid_at = new Date().toISOString();
  const { error } = await supabase.from("invoices").update(update).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
}

export async function deleteInvoice(id: string) {
  const { supabase } = await getProfile();
  await supabase.from("invoices").delete().eq("id", id);
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  redirect("/invoices");
}

export async function addPayment(invoiceId: string, formData: FormData) {
  const { supabase } = await getProfile();
  const amount = Number(formData.get("amount"));
  const method = (formData.get("method") as PaymentMethod) || "cash";
  const reference = (formData.get("reference") as string)?.trim() || null;
  const paid_at = (formData.get("paid_at") as string) || new Date().toISOString();
  if (!amount || amount <= 0) return { error: "Montant invalide." };
  const { error } = await supabase.from("payments").insert({ invoice_id: invoiceId, amount, method, reference, paid_at });
  if (error) return { error: error.message };
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/dashboard");
}

export async function deletePayment(paymentId: string, invoiceId: string) {
  const { supabase } = await getProfile();
  await supabase.from("payments").delete().eq("id", paymentId);
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/dashboard");
}
