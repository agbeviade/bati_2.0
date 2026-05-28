import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Receipt, Mail, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { QuoteStatusBadge } from "@/components/quotes/quote-status-badge";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { updateClient, toggleClientActive } from "../actions";
import type { Quote, Invoice } from "@/lib/supabase/types";

function fmt(n: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single();
  if (!profile?.company_id) redirect("/onboarding");

  const { data: client } = await supabase
    .from("users")
    .select("id, full_name, email, phone, is_active, created_at")
    .eq("id", id)
    .eq("company_id", profile.company_id)
    .eq("role", "client")
    .maybeSingle();
  if (!client) notFound();

  // Devis et factures liés à ce client
  const [{ data: quotesData }, { data: invoicesData }] = await Promise.all([
    supabase
      .from("quotes")
      .select("id, quote_number, client_name, total, status, created_at")
      .eq("company_id", profile.company_id)
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("invoices")
      .select("id, invoice_number, client_name, amount, status, due_date")
      .eq("company_id", profile.company_id)
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
  ]);
  const quotes = (quotesData ?? []) as Quote[];
  const invoices = (invoicesData ?? []) as Invoice[];

  const updateAction = updateClient.bind(null, id);
  const toggleAction = toggleClientActive.bind(null, id, !client.is_active);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/clients">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{client.full_name}</h1>
            {!client.is_active && (
              <Badge variant="outline" className="text-muted-foreground">
                Inactif
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm">
            Client depuis le {new Date(client.created_at).toLocaleDateString("fr-FR")}
          </p>
        </div>
        <form action={toggleAction}>
          <Button type="submit" variant="outline" size="sm">
            {client.is_active ? "Désactiver" : "Réactiver"}
          </Button>
        </form>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Édition profil */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informations</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateAction} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Nom complet</Label>
                <Input id="full_name" name="full_name" defaultValue={client.full_name ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" defaultValue={client.email ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Téléphone</Label>
                <Input id="phone" name="phone" defaultValue={client.phone ?? ""} />
              </div>
              <Button type="submit" size="sm">
                Enregistrer
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="space-y-3">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{quotes.length}</p>
                  <p className="text-muted-foreground text-xs">Devis</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50">
                  <Receipt className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {fmt(invoices.reduce((s, i) => s + (i.status === "paid" ? i.amount : 0), 0))}{" "}
                    XOF
                  </p>
                  <p className="text-muted-foreground text-xs">Encaissé</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Devis */}
      {quotes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Devis ({quotes.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {quotes.map((q) => (
                <Link
                  key={q.id}
                  href={`/quotes/${q.id}`}
                  className="hover:bg-muted/50 flex items-center gap-4 px-6 py-3 transition-colors"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{q.quote_number}</p>
                    <p className="text-muted-foreground text-xs">
                      {new Date(q.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <span className="text-sm font-semibold">{fmt(q.total)} XOF</span>
                  <QuoteStatusBadge status={q.status} />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Factures */}
      {invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-4 w-4" />
              Factures ({invoices.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {invoices.map((i) => (
                <Link
                  key={i.id}
                  href={`/invoices/${i.id}`}
                  className="hover:bg-muted/50 flex items-center gap-4 px-6 py-3 transition-colors"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{i.invoice_number}</p>
                    {i.due_date && (
                      <p className="text-muted-foreground text-xs">
                        Échéance : {new Date(i.due_date).toLocaleDateString("fr-FR")}
                      </p>
                    )}
                  </div>
                  <span className="text-sm font-semibold">{fmt(i.amount)} XOF</span>
                  <InvoiceStatusBadge status={i.status} />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
