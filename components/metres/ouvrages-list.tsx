"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Plus } from "lucide-react";
import { deleteOuvrage } from "@/app/(dashboard)/metres/actions";
import { LABELS_GEOMETRIE, type TypeGeometrie } from "@/lib/calcul-ouvrage";
import type { ProjectOuvrage } from "@/lib/supabase/types";

interface Props {
  ouvrages: ProjectOuvrage[];
  projects: { id: string; name: string }[];
}

export function OuvragesList({ ouvrages, projects }: Props) {
  const [filterProjectId, setFilterProjectId] = useState("");
  const [pending, startTransition] = useTransition();

  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p.name]));

  const filtered = filterProjectId
    ? ouvrages.filter((o) => o.project_id === filterProjectId)
    : ouvrages;

  function handleDelete(id: string) {
    if (!confirm("Supprimer cet ouvrage ?")) return;
    startTransition(async () => {
      await deleteOuvrage(id);
    });
  }

  if (ouvrages.length === 0) {
    return (
      <div className="text-muted-foreground py-16 text-center">
        <p className="mb-4">Aucun ouvrage pour l&apos;instant.</p>
        <Button asChild>
          <Link href="/metres/new">
            <Plus className="mr-2 h-4 w-4" />
            Créer le premier ouvrage
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtre projet */}
      {projects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterProjectId("")}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
              filterProjectId === ""
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            Tous
          </button>
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => setFilterProjectId(p.id)}
              className={`rounded-full px-3 py-1 text-sm transition-colors ${
                filterProjectId === p.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* Liste */}
      <div className="grid gap-3">
        {filtered.map((ouvrage) => (
          <Card key={ouvrage.id} className="transition-shadow hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="truncate font-semibold">{ouvrage.designation}</span>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {LABELS_GEOMETRIE[ouvrage.type_geometrie as TypeGeometrie] ??
                        ouvrage.type_geometrie}
                    </Badge>
                  </div>
                  {ouvrage.project_id && (
                    <p className="text-muted-foreground mb-2 text-xs">
                      {projectMap[ouvrage.project_id] ?? "—"}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <span className="text-muted-foreground whitespace-nowrap">
                      Brut :{" "}
                      <span className="text-foreground font-medium">
                        {ouvrage.quantite_brute.toFixed(2)} {ouvrage.unite_principale}
                      </span>
                    </span>
                    <span className="text-muted-foreground whitespace-nowrap">
                      Net :{" "}
                      <span className="text-foreground font-medium">
                        {ouvrage.quantite_nette.toFixed(2)} {ouvrage.unite_principale}
                      </span>
                    </span>
                    {ouvrage.recette_calculee?.length > 0 && (
                      <span className="text-muted-foreground whitespace-nowrap">
                        {ouvrage.recette_calculee.length} matériau
                        {ouvrage.recette_calculee.length > 1 ? "x" : ""}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/metres/${ouvrage.id}`}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(ouvrage.id)}
                    disabled={pending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
