"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthedProfile } from "@/lib/auth/profile";
import { logger } from "@/lib/logger";
import { parseFormData } from "@/lib/schemas/form";
import { AddPaymentSchema, CreateInvoiceSchema } from "@/lib/schemas/invoice";
import type { InvoiceStatus } from "@/lib/supabase/types";

export async function createInvoice(formData: FormData) {
  const { user, companyId, supabase } = await getAuthedProfile();

  const { data: invoice_number, error: numErr } = await supabase.rpc("next_document_number", {
    p_kind: "invoice",
  });
  if (numErr || !invoice_number) {
    logger.error("createInvoice number generation failed", numErr, { companyId });
    return { error: "Impossible de générer le numéro de facture." };
  }

  const parsed = parseFormData(CreateInvoiceSchema, formData);
  if (!parsed.ok) return { error: parsed.error };
  const input = parsed.data;

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      company_id: companyId,
      invoice_number,
      client_name: input.client_name,
      amount: input.amount,
      due_date: input.due_date,
      notes: input.notes,
      project_id: input.project_id,
      quote_id: input.quote_id,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !invoice) {
    logger.error("createInvoice insert failed", error, { companyId });
    return { error: error?.message };
  }

  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  redirect(`/invoices/${invoice.id}`);
}

export async function updateInvoiceStatus(id: string, status: InvoiceStatus) {
  const { supabase } = await getAuthedProfile();
  const update: { status: InvoiceStatus; paid_at?: string } = { status };
  if (status === "paid") update.paid_at = new Date().toISOString();
  const { error } = await supabase.from("invoices").update(update).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
}

export async function deleteInvoice(id: string) {
  const { supabase } = await getAuthedProfile();
  await supabase.from("invoices").delete().eq("id", id);
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  redirect("/invoices");
}

export async function addPayment(invoiceId: string, formData: FormData) {
  const { supabase } = await getAuthedProfile();

  const parsed = parseFormData(AddPaymentSchema, formData);
  if (!parsed.ok) return { error: parsed.error };
  const input = parsed.data;

  const { error } = await supabase.from("payments").insert({
    invoice_id: invoiceId,
    amount: input.amount,
    method: input.method,
    reference: input.reference,
    paid_at: input.paid_at || new Date().toISOString(),
  });
  if (error) return { error: error.message };
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/dashboard");
}

export async function deletePayment(paymentId: string, invoiceId: string) {
  const { supabase } = await getAuthedProfile();
  await supabase.from("payments").delete().eq("id", paymentId);
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/dashboard");
}
