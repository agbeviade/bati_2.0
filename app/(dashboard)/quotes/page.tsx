import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { QuotesList } from "@/components/quotes/quotes-list";
import type { Quote } from "@/lib/supabase/types";

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

export default async function QuotesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin.from("users").select("company_id").eq("id", user.id).single();
  if (!profile?.company_id) redirect("/onboarding");

  const { data: company } = await admin.from("companies").select("currency").eq("id", profile.company_id).single();
  const currency = (company as { currency?: string } | null)?.currency ?? "XOF";

  const { data: quotesData } = await admin
    .from("quotes")
    .select("id, quote_number, client_name, project_type, total, status, valid_until, created_at")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  const quotes = (quotesData ?? []) as Pick<Quote, "id" | "quote_number" | "client_name" | "project_type" | "total" | "status" | "valid_until" | "created_at">[];

  const stats = {
    total: quotes.length,
    draft: quotes.filter(q => q.status === "draft").length,
    sent: quotes.filter(q => q.status === "sent").length,
    approved: quotes.filter(q => q.status === "approved").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Devis</h2>
          <p className="text-muted-foreground">
            {stats.total === 0 ? "Aucun devis pour l'instant." : `${stats.total} devis — ${stats.approved} approuvé${stats.approved > 1 ? "s" : ""}`}
          </p>
        </div>
        <Button asChild>
          <Link href="/quotes/new">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau devis
          </Link>
        </Button>
      </div>

      {/* Stats rapides */}
      {stats.total > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Brouillons", value: stats.draft, color: "text-muted-foreground" },
            { label: "Envoyés", value: stats.sent, color: "text-blue-600" },
            { label: "Approuvés", value: stats.approved, color: "text-green-600" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-4 text-center">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <QuotesList quotes={quotes} currency={currency} />
    </div>
  );
}
