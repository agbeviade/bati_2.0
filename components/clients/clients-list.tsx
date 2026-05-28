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
    <div className="flex flex-col items-center justify-center space-y-4 py-24 text-center">
      <div className="bg-muted rounded-full p-4">
        <UserCircle className="text-muted-foreground h-10 w-10" />
      </div>
      <div>
        <p className="font-medium">Aucun client</p>
        <p className="text-muted-foreground text-sm">
          Ajoutez vos clients pour leur partager devis et factures.
        </p>
      </div>
      <Button asChild>
        <Link href="/clients/new">
          <Plus className="mr-2 h-4 w-4" />
          Nouveau client
        </Link>
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
        <Card className="transition-shadow hover:shadow-md">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                <span className="text-primary text-sm font-bold">
                  {c.full_name
                    ?.split(" ")
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase() ?? "?"}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{c.full_name ?? "—"}</span>
                  {!c.is_active && (
                    <Badge variant="outline" className="text-muted-foreground text-xs">
                      Inactif
                    </Badge>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-4">
                  {c.email && (
                    <span className="text-muted-foreground flex items-center gap-1 text-xs">
                      <Mail className="h-3 w-3" />
                      {c.email}
                    </span>
                  )}
                  {c.phone && (
                    <span className="text-muted-foreground flex items-center gap-1 text-xs">
                      <Phone className="h-3 w-3" />
                      {c.phone}
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
