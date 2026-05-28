"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { generateQuoteFromMetres } from "@/app/(dashboard)/metres/generate-quote-action";
import { Sparkles, Loader2 } from "lucide-react";
import type { ProjectOuvrage } from "@/lib/supabase/types";

interface Props {
  ouvrages: ProjectOuvrage[];
  projects: { id: string; name: string }[];
}

export function GenerateQuoteButton({ ouvrages, projects }: Props) {
  const [selectedProject, setSelectedProject] = useState(projects[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const projectOuvrages = selectedProject
    ? ouvrages.filter((o) => o.project_id === selectedProject)
    : ouvrages;

  function handleGenerate() {
    if (projectOuvrages.length === 0) return;
    setError(null);
    startTransition(async () => {
      const res = await generateQuoteFromMetres(
        projectOuvrages.map((o) => o.id),
        selectedProject,
      );
      if (res?.error) setError(res.error);
    });
  }

  if (ouvrages.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {projects.length > 1 && (
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="border-input bg-background h-9 rounded-md border px-3 text-sm"
          disabled={isPending}
        >
          <option value="">Tous les ouvrages</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}

      <Button
        variant="outline"
        className="border-violet-300 text-violet-700 hover:bg-violet-50"
        onClick={handleGenerate}
        disabled={isPending || projectOuvrages.length === 0}
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="mr-2 h-4 w-4" />
        )}
        {isPending
          ? "Génération du devis..."
          : `Générer devis IA (${projectOuvrages.length} ouvrage${projectOuvrages.length > 1 ? "s" : ""})`}
      </Button>

      {error && <span className="text-destructive text-sm">{error}</span>}
    </div>
  );
}
