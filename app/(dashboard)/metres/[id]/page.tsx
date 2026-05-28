import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OuvrageForm } from "@/components/metres/ouvrage-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditOuvragePage({ params }: Props) {
  const { id } = await params;

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

  const [{ data: ouvrage }, { data: projects }, { data: materials }, { data: ouvrageTypes }] =
    await Promise.all([
      supabase
        .from("project_ouvrages")
        .select("*")
        .eq("id", id)
        .eq("company_id", profile.company_id)
        .single(),
      supabase
        .from("projects")
        .select("id, name")
        .eq("company_id", profile.company_id)
        .order("name"),
      supabase
        .from("materials")
        .select("id, name, unit, unit_cost")
        .eq("company_id", profile.company_id)
        .order("name"),
      supabase
        .from("ouvrage_types")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("designation"),
    ]);

  if (!ouvrage) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/metres">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Modifier l&apos;ouvrage</h1>
          <p className="text-muted-foreground text-sm">
            Les quantités se recalculent en temps réel à chaque modification
          </p>
        </div>
      </div>
      <OuvrageForm
        projects={projects ?? []}
        materials={materials ?? []}
        ouvrageTypes={ouvrageTypes ?? []}
        initialData={ouvrage}
      />
    </div>
  );
}
