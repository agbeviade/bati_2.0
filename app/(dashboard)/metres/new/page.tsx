import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OuvrageForm } from "@/components/metres/ouvrage-form";

interface Props {
  searchParams: Promise<{ project_id?: string }>;
}

export default async function NewOuvragePage({ searchParams }: Props) {
  const { project_id } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("company_id").eq("id", user.id).single();
  if (!profile?.company_id) redirect("/onboarding");

  const [{ data: projects }, { data: materials }, { data: ouvrageTypes }] = await Promise.all([
    supabase.from("projects").select("id, name").eq("company_id", profile.company_id).order("name"),
    supabase.from("materials").select("id, name, unit, unit_cost").eq("company_id", profile.company_id).order("name"),
    supabase.from("ouvrage_types").select("*").eq("company_id", profile.company_id).order("designation"),
  ]);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/metres"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nouvel ouvrage</h1>
          <p className="text-muted-foreground text-sm">
            Saisissez les dimensions — les quantités se calculent en temps réel
          </p>
        </div>
      </div>
      <OuvrageForm
        projects={projects ?? []}
        materials={materials ?? []}
        ouvrageTypes={ouvrageTypes ?? []}
        initialProjectId={project_id}
      />
    </div>
  );
}
