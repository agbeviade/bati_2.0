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
    <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
      <div className="p-4 rounded-full bg-muted">
        <Users className="h-10 w-10 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium">Aucune équipe</p>
        <p className="text-sm text-muted-foreground">Créez votre première équipe pour organiser vos ouvriers.</p>
      </div>
      <Button asChild>
        <Link href="/teams/new"><Plus className="h-4 w-4 mr-2" />Créer une équipe</Link>
      </Button>
    </div>
  );

  return (
    <SearchFilter
      items={teams}
      searchKeys={["name", "leadName"]}
      placeholder="Rechercher par nom, chef d'équipe..."
      emptyState={emptyState}
      renderItem={(team) => (
        <Link href={`/teams/${team.id}`} className="block group">
          <Card className="transition-shadow group-hover:shadow-md">
            <CardContent className="py-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{team.name}</p>
                <div className="flex items-center gap-4 mt-1">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {team.memberCount} membre{team.memberCount !== 1 ? "s" : ""}
                  </span>
                  {team.leadName && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
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
