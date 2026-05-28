import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Project, Quote } from "@/lib/supabase/types";
import NewInvoiceForm from "./form";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ quote_id?: string }>;
}) {
  const { quote_id } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("company_id").eq("id", user.id).single();
  if (!profile?.company_id) redirect("/onboarding");

  let prefill: { client_name?: string; amount?: number; project_id?: string; quote_id?: string } = {};
  if (quote_id) {
    const { data: quoteData } = await supabase
      .from("quotes")
      .select("id, client_name, total, project_id")
      .eq("id", quote_id)
      .eq("company_id", profile.company_id)
      .maybeSingle();
    if (quoteData) {
      const q = quoteData as Pick<Quote, "id" | "client_name" | "total" | "project_id">;
      prefill = { client_name: q.client_name ?? undefined, amount: q.total, project_id: q.project_id ?? undefined, quote_id: q.id };
    }
  }

  const { data: projectsData } = await supabase
    .from("projects")
    .select("id, name")
    .eq("company_id", profile.company_id)
    .in("status", ["planned", "in_progress"]);

  const { data: quotesData } = await supabase
    .from("quotes")
    .select("id, quote_number, client_name, total")
    .eq("company_id", profile.company_id)
    .eq("status", "approved");

  return (
    <NewInvoiceForm
      prefill={prefill}
      projects={(projectsData ?? []) as Pick<Project, "id" | "name">[]}
      approvedQuotes={(quotesData ?? []) as Pick<Quote, "id" | "quote_number" | "client_name" | "total">[]}
    />
  );
}
