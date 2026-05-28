"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { updateProject, deleteProject } from "../../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteButton } from "@/components/ui/delete-button";
import type { Project, ProjectStatus } from "@/lib/supabase/types";

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "planned", label: "Planifié" },
  { value: "in_progress", label: "En cours" },
  { value: "paused", label: "Pausé" },
  { value: "completed", label: "Terminé" },
  { value: "canceled", label: "Annulé" },
];

export default function EditProjectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("projects")
      .select("*")
      .eq("id", params.id)
      .single()
      .then(({ data }) => setProject(data as Project | null));
  }, [params.id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const result = await updateProject(params.id, new FormData(e.currentTarget));
    setLoading(false);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Chantier mis à jour.");
      router.push(`/projects/${params.id}`);
    }
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/projects/${params.id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Modifier le chantier</h2>
          <p className="text-muted-foreground text-sm">{project.name}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom *</Label>
              <Input id="name" name="name" defaultValue={project.name} required minLength={2} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Statut</Label>
              <select
                id="status"
                name="status"
                defaultValue={project.status}
                className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="progress_pct">Avancement (%)</Label>
              <Input
                id="progress_pct"
                name="progress_pct"
                type="number"
                min="0"
                max="100"
                defaultValue={project.progress_pct}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                defaultValue={project.description ?? ""}
                rows={3}
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[80px] w-full resize-none rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Adresse</Label>
              <Input id="address" name="address" defaultValue={project.address ?? ""} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budget">Budget</Label>
                <Input
                  id="budget"
                  name="budget"
                  type="number"
                  min="0"
                  step="1000"
                  defaultValue={project.budget ?? ""}
                />
              </div>
              <div />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Date de début</Label>
                <Input
                  id="start_date"
                  name="start_date"
                  type="date"
                  defaultValue={project.start_date ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Date de fin prévue</Label>
                <Input
                  id="end_date"
                  name="end_date"
                  type="date"
                  defaultValue={project.end_date ?? ""}
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex items-center justify-between gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? "Sauvegarde..." : "Enregistrer"}
            </Button>
            <DeleteButton
              onConfirm={() => deleteProject(params.id)}
              title="Supprimer le chantier"
              description="Cette action est irréversible. Toutes les données associées (tâches, photos, dépenses) seront supprimées."
            />
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
