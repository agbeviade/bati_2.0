import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { QuoteStatusBadge } from "@/components/quotes/quote-status-badge";
import type { Quote } from "@/lib/supabase/types";

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);
}

export default async function ClientQuotesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "client") redirect("/dashboard");

  const { data } = await supabase
    .from("quotes")
    .select("id, quote_number, project_type, total, status, valid_until, created_at")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false });

  const quotes = (data ?? []) as Quote[];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Mes devis</h2>
      {quotes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <FileText className="text-muted-foreground mb-3 h-10 w-10" />
            <p className="font-medium">Aucun devis pour le moment</p>
            <p className="text-muted-foreground mt-1 text-sm">Vos devis apparaîtront ici</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {quotes.map((q) => (
            <Card key={q.id} className="transition-shadow hover:shadow-md">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{q.quote_number}</span>
                      <QuoteStatusBadge status={q.status} />
                    </div>
                    {q.project_type && (
                      <p className="text-muted-foreground mt-0.5 text-sm">{q.project_type}</p>
                    )}
                    <div className="text-muted-foreground mt-1 flex flex-wrap gap-3 text-xs">
                      <span>Créé le {new Date(q.created_at).toLocaleDateString("fr-FR")}</span>
                      {q.valid_until && (
                        <span>
                          Valide jusqu'au {new Date(q.valid_until).toLocaleDateString("fr-FR")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-bold">{fmt(q.total)} XOF</p>
                    <Link
                      href={`/quotes/${q.id}/print`}
                      target="_blank"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Télécharger PDF
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
