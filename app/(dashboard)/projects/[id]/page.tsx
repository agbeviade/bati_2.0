import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/projects/status-badge";
import { ProjectTabs } from "@/components/projects/project-tabs";
import { OverviewTab } from "@/components/projects/tabs/overview-tab";
import { ExpensesTab } from "@/components/projects/tabs/expenses-tab";
import { PhotosTab } from "@/components/projects/tabs/photos-tab";
import { TeamTab } from "@/components/projects/tabs/team-tab";
import { MaterialsTab } from "@/components/projects/tabs/materials-tab";
import type { Project, Task, ProjectExpense, ProjectAssignment, User, Material, StockMovement } from "@/lib/supabase/types";
import { Suspense } from "react";

type Tab = "overview" | "materials" | "expenses" | "photos" | "team" | "documents";

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab = "overview" } = await searchParams as { tab?: Tab };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: projectData } = await admin.from("projects").select("*").eq("id", id).maybeSingle();
  if (!projectData) notFound();
  const project = projectData as Project;

  const { data: companyData } = await admin
    .from("companies").select("currency").eq("id", project.company_id).maybeSingle();
  const currency = (companyData as { currency?: string } | null)?.currency ?? "XOF";

  // Chargement conditionnel selon l'onglet actif
  let tasks: Task[] = [];
  let expenses: ProjectExpense[] = [];
  let photos: { id: string; storage_path: string; caption: string | null; taken_at: string; signedUrl?: string }[] = [];
  let assignments: { id: string; user_id: string; role_on_project: string | null; start_date: string | null; user: Pick<User, "full_name" | "role" | "avatar_url"> }[] = [];
  let availableUsers: Pick<User, "id" | "full_name" | "role">[] = [];
  let projectMovements: { id: string; material_id: string; type: string; quantity: number; unit_cost: number | null; notes: string | null; created_at: string; material_name: string; unit: string }[] = [];
  let allMaterials: Pick<Material, "id" | "name" | "unit" | "stock_qty" | "unit_cost">[] = [];

  if (tab === "overview") {
    const { data } = await admin.from("tasks").select("*").eq("project_id", id).order("created_at", { ascending: false });
    tasks = (data ?? []) as Task[];
  }

  if (tab === "materials") {
    const [{ data: movData }, { data: matData }] = await Promise.all([
      admin
        .from("stock_movements")
        .select("id, material_id, type, quantity, unit_cost, notes, created_at, materials(name, unit)")
        .eq("project_id", id)
        .in("type", ["use", "return"])
        .order("created_at", { ascending: false }),
      admin
        .from("materials")
        .select("id, name, unit, stock_qty, unit_cost")
        .eq("company_id", project.company_id)
        .order("name"),
    ]);

    projectMovements = ((movData ?? []) as unknown as Array<{
      id: string; material_id: string; type: string; quantity: number;
      unit_cost: number | null; notes: string | null; created_at: string;
      materials: { name: string; unit: string } | null;
    }>).map(m => ({
      id: m.id,
      material_id: m.material_id,
      type: m.type,
      quantity: m.quantity,
      unit_cost: m.unit_cost,
      notes: m.notes,
      created_at: m.created_at,
      material_name: m.materials?.name ?? "Matériau inconnu",
      unit: m.materials?.unit ?? "u",
    }));

    allMaterials = (matData ?? []) as Pick<Material, "id" | "name" | "unit" | "stock_qty" | "unit_cost">[];
  }

  if (tab === "expenses") {
    const { data } = await admin.from("project_expenses").select("*").eq("project_id", id).order("spent_at", { ascending: false });
    expenses = (data ?? []) as ProjectExpense[];
  }

  if (tab === "photos") {
    const { data } = await admin.from("project_photos").select("*").eq("project_id", id).order("taken_at", { ascending: false });
    const rawPhotos = (data ?? []) as { id: string; storage_path: string; caption: string | null; taken_at: string }[];

    // Génère les signed URLs
    photos = await Promise.all(
      rawPhotos.map(async (p) => {
        const { data: urlData } = await admin.storage
          .from("project-photos")
          .createSignedUrl(p.storage_path, 3600);
        return { ...p, signedUrl: urlData?.signedUrl };
      })
    );
  }

  if (tab === "team") {
    const { data: assignData } = await admin
      .from("project_assignments")
      .select("id, user_id, role_on_project, start_date")
      .eq("project_id", id);

    const assignedIds = (assignData ?? []).map(a => a.user_id);

    if (assignedIds.length > 0) {
      const { data: usersData } = await admin
        .from("users")
        .select("id, full_name, role, avatar_url")
        .in("id", assignedIds);

      const usersMap = Object.fromEntries(
        ((usersData ?? []) as Pick<User, "id" | "full_name" | "role" | "avatar_url">[]).map(u => [u.id, u])
      );

      assignments = (assignData ?? []).map(a => ({
        ...a,
        user: usersMap[a.user_id] ?? { full_name: null, role: "worker" as const, avatar_url: null },
      }));
    }

    const { data: companyUsers } = await admin
      .from("users")
      .select("id, full_name, role")
      .eq("company_id", project.company_id)
      .eq("is_active", true);

    availableUsers = ((companyUsers ?? []) as Pick<User, "id" | "full_name" | "role">[])
      .filter(u => !assignments.some(a => a.user_id === u.id));
  }

  return (
    <div className="space-y-4 max-w-4xl w-full min-w-0">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" asChild className="mt-0.5">
          <Link href="/projects"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold truncate">{project.name}</h2>
            <StatusBadge status={project.status} />
          </div>
          {project.address && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3.5 w-3.5" />{project.address}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/projects/${id}/edit`}>Modifier</Link>
        </Button>
      </div>

      {/* Barre de progression */}
      <div>
        <div className="flex items-center justify-between text-sm mb-1.5">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4" />Avancement
          </span>
          <span className="font-semibold">{project.progress_pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${project.progress_pct}%` }} />
        </div>
      </div>

      {/* Onglets */}
      <Suspense>
        <ProjectTabs projectId={id} />
      </Suspense>

      {/* Contenu */}
      {tab === "overview" && (
        <OverviewTab project={project} tasks={tasks} currency={currency} />
      )}
      {tab === "materials" && (
        <MaterialsTab
          projectId={id}
          movements={projectMovements}
          materials={allMaterials}
          currency={currency}
        />
      )}
      {tab === "expenses" && (
        <ExpensesTab projectId={id} expenses={expenses} currency={currency} />
      )}
      {tab === "photos" && (
        <PhotosTab projectId={id} companyId={project.company_id} initialPhotos={photos} />
      )}
      {tab === "team" && (
        <TeamTab projectId={id} assignments={assignments} availableUsers={availableUsers} />
      )}
      {tab === "documents" && (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
          <p className="font-medium">Documents</p>
          <p className="text-sm text-muted-foreground">Upload de documents — disponible prochainement.</p>
        </div>
      )}
    </div>
  );
}
