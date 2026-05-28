"use client";

import Link from "next/link";
import { Plus, HardHat, MapPin, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/projects/status-badge";
import { SearchFilter } from "@/components/ui/search-filter";
import type { Project } from "@/lib/supabase/types";

type ProjectRow = Pick<Project, "id" | "name" | "status" | "address" | "budget" | "spent" | "progress_pct" | "start_date" | "end_date">;

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}
function formatAmount(amount: number | null, currency: string) {
  if (amount == null) return null;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

const STATUS_OPTIONS = [
  { value: "planned",     label: "Planifiés" },
  { value: "in_progress", label: "En cours" },
  { value: "paused",      label: "En pause" },
  { value: "completed",   label: "Terminés" },
  { value: "canceled",    label: "Annulés" },
];

export function ProjectsList({ projects, currency }: { projects: ProjectRow[]; currency: string }) {
  const emptyState = (
    <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
      <div className="p-4 rounded-full bg-muted">
        <HardHat className="h-10 w-10 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium">Aucun chantier</p>
        <p className="text-sm text-muted-foreground">Créez votre premier chantier pour commencer.</p>
      </div>
      <Button asChild>
        <Link href="/projects/new"><Plus className="h-4 w-4 mr-2" />Créer un chantier</Link>
      </Button>
    </div>
  );

  return (
    <SearchFilter
      items={projects}
      pageSize={20}
      searchKeys={["name", "address"]}
      filterKey="status"
      filterOptions={STATUS_OPTIONS}
      filterAllLabel="Tous"
      placeholder="Rechercher par nom, adresse..."
      emptyState={emptyState}
      renderItem={(project) => (
        <Link href={`/projects/${project.id}`} className="block group">
          <Card className="h-full transition-shadow group-hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base leading-tight line-clamp-2">{project.name}</CardTitle>
                <StatusBadge status={project.status} />
              </div>
              {project.address && (
                <CardDescription className="flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{project.address}</span>
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Avancement</span>
                  <span className="font-medium">{project.progress_pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${project.progress_pct}%` }} />
                </div>
              </div>
              {project.budget !== null && (
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground shrink-0">Budget</span>
                  <span className="font-medium text-right break-words min-w-0">{formatAmount(project.budget, currency)}</span>
                </div>
              )}
              {(project.start_date || project.end_date) && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(project.start_date) ?? "—"} → {formatDate(project.end_date) ?? "—"}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </Link>
      )}
    />
  );
}
