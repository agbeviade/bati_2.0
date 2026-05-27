import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ProjectsList } from "@/components/projects/projects-list";
import type { Project } from "@/lib/supabase/types";

function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatAmount(amount: number | null, currency: string) {
  if (amount === null || amount === undefined) return null;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function ProjectsPage() {
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

  const { data: company } = await supabase
    .from("companies")
    .select("currency")
    .eq("id", profile.company_id)
    .single();

  const currency = company?.currency ?? "XOF";

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, status, address, budget, spent, progress_pct, start_date, end_date")
    .order("created_at", { ascending: false });

  const projectList = (projects ?? []) as Pick<
    Project,
    "id" | "name" | "status" | "address" | "budget" | "spent" | "progress_pct" | "start_date" | "end_date"
  >[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Chantiers</h2>
          <p className="text-muted-foreground">
            {projectList.length === 0
              ? "Aucun chantier pour l'instant."
              : `${projectList.length} chantier${projectList.length > 1 ? "s" : ""}`}
          </p>
        </div>
        <Button asChild className="self-start sm:self-auto">
          <Link href="/projects/new">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau chantier
          </Link>
        </Button>
      </div>

      <ProjectsList projects={projectList} currency={currency} />
    </div>
  );
}
