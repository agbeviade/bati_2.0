"use client";

import Link from "next/link";
import { UserCircle, Mail, Phone, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchFilter } from "@/components/ui/search-filter";

export type ClientRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
};

const STATUS_OPTIONS = [
  { value: "true", label: "Actifs" },
  { value: "false", label: "Inactifs" },
];

export function ClientsList({ clients }: { clients: ClientRow[] }) {
  const emptyState = (
    <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
      <div className="p-4 rounded-full bg-muted">
        <UserCircle className="h-10 w-10 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium">Aucun client</p>
        <p className="text-sm text-muted-foreground">Ajoutez vos clients pour leur partager devis et factures.</p>
      </div>
      <Button asChild>
        <Link href="/clients/new"><Plus className="h-4 w-4 mr-2" />Nouveau client</Link>
      </Button>
    </div>
  );

  return (
    <SearchFilter
      items={clients}
      pageSize={20}
      searchKeys={["full_name", "email", "phone"]}
      filterKey="is_active"
      filterOptions={STATUS_OPTIONS}
      filterAllLabel="Tous"
      placeholder="Rechercher par nom, email, téléphone..."
      emptyState={emptyState}
      renderItem={(c) => (
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-primary font-bold text-sm">
                  {c.full_name?.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() ?? "?"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{c.full_name ?? "—"}</span>
                  {!c.is_active && (
                    <Badge variant="outline" className="text-xs text-muted-foreground">Inactif</Badge>
                  )}
                </div>
                <div className="flex gap-4 mt-1 flex-wrap">
                  {c.email && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />{c.email}
                    </span>
                  )}
                  {c.phone && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />{c.phone}
                    </span>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm" asChild className="shrink-0">
                <Link href={`/clients/${c.id}`}>Voir</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    />
  );
}
