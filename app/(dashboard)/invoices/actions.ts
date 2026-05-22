"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { InvoiceStatus, PaymentMethod } from "@/lib/supabase/types";

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

function nextInvoiceNumber(count: number): string {
  const year = new Date().getFullYear();
  return `FAC-${year}-${String(count + 1).padStart(3, "0")}`;
}

export async function createInvoice(formData: FormData) {
  const user = await getUser();
  const admin = createAdminClient();

  const { data: profile } = await admin.from("users").select("company_id").eq("id", user.id).single();
  if (!profile?.company_id) redirect("/onboarding");

  const { count } = await admin
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("company_id", profile.company_id);

  const invoice_number = nextInvoiceNumber(count ?? 0);

  const client_name = (formData.get("client_name") as string)?.trim() || null;
  const amount = Number(formData.get("amount")) || 0;
  const due_date = (formData.get("due_date") as string) || null;
  const notes = (formData.get("notes") as string)?.trim() || null;
  const project_id = (formData.get("project_id") as string) || null;
  const quote_id = (formData.get("quote_id") as string) || null;

  const { data: invoice, error } = await admin.from("invoices").insert({
    company_id: profile.company_id,
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
  redirect(`/invoices/${invoice.id}`);
}

export async function updateInvoiceStatus(id: string, status: InvoiceStatus) {
  await getUser();
  const admin = createAdminClient();

  const update: { status: InvoiceStatus; paid_at?: string } = { status };
  if (status === "paid") update.paid_at = new Date().toISOString();

  const { error } = await admin.from("invoices").update(update).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/invoices/${id}`);
  revalidatePath("/invoices");
}

export async function deleteInvoice(id: string) {
  await getUser();
  await createAdminClient().from("invoices").delete().eq("id", id);
  revalidatePath("/invoices");
  redirect("/invoices");
}

export async function addPayment(invoiceId: string, formData: FormData) {
  await getUser();
  const admin = createAdminClient();

  const amount = Number(formData.get("amount"));
  const method = (formData.get("method") as PaymentMethod) || "cash";
  const reference = (formData.get("reference") as string)?.trim() || null;
  const paid_at = (formData.get("paid_at") as string) || new Date().toISOString();

  if (!amount || amount <= 0) return { error: "Montant invalide." };

  const { error } = await admin.from("payments").insert({
    invoice_id: invoiceId,
    amount,
    method,
    reference,
    paid_at,
  });

  if (error) return { error: error.message };
  revalidatePath(`/invoices/${invoiceId}`);
}

export async function deletePayment(paymentId: string, invoiceId: string) {
  await getUser();
  await createAdminClient().from("payments").delete().eq("id", paymentId);
  revalidatePath(`/invoices/${invoiceId}`);
}
