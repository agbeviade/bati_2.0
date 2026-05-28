"use client";

import Link from "next/link";
import { Users, UserCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SearchFilter } from "@/components/ui/search-filter";

export type TeamRow = {
  id: string;
  name: string;
  memberCount: number;
  leadName: string | null;
};

export function TeamsList({ teams }: { teams: TeamRow[] }) {
  const emptyState = (
    <div className="flex flex-col items-center justify-center space-y-4 py-24 text-center">
      <div className="bg-muted rounded-full p-4">
        <Users className="text-muted-foreground h-10 w-10" />
      </div>
      <div>
        <p className="font-medium">Aucune équipe</p>
        <p className="text-muted-foreground text-sm">
          Créez votre première équipe pour organiser vos ouvriers.
        </p>
      </div>
      <Button asChild>
        <Link href="/teams/new">
          <Plus className="mr-2 h-4 w-4" />
          Créer une équipe
        </Link>
      </Button>
    </div>
  );

  return (
    <SearchFilter
      items={teams}
      pageSize={20}
      searchKeys={["name", "leadName"]}
      placeholder="Rechercher par nom, chef d'équipe..."
      emptyState={emptyState}
      renderItem={(team) => (
        <Link href={`/teams/${team.id}`} className="group block">
          <Card className="transition-shadow group-hover:shadow-md">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{team.name}</p>
                <div className="mt-1 flex items-center gap-4">
                  <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <Users className="h-3.5 w-3.5" />
                    {team.memberCount} membre{team.memberCount !== 1 ? "s" : ""}
                  </span>
                  {team.leadName && (
                    <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                      <UserCheck className="h-3.5 w-3.5" />
                      {team.leadName}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}
    />
  );
}
