import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OuvragesList } from "@/components/metres/ouvrages-list";
import { GenerateQuoteButton } from "@/components/metres/generate-quote-button";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function MetresPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin.from("users").select("company_id").eq("id", user.id).single();
  if (!profile?.company_id) redirect("/onboarding");

  const [{ data: ouvrages }, { data: projects }] = await Promise.all([
    admin
      .from("project_ouvrages")
      .select("*")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: false }),
    admin
      .from("projects")
      .select("id, name")
      .eq("company_id", profile.company_id)
      .order("name"),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Métrés</h1>
          <p className="text-muted-foreground text-sm">
            Calcul automatique des quantités de matériaux par ouvrage
          </p>
        </div>
        <Button asChild>
          <Link href="/metres/new">
            <Plus className="h-4 w-4 mr-2" />
            Nouvel ouvrage
          </Link>
        </Button>
      </div>

      {(ouvrages ?? []).length > 0 && (
        <GenerateQuoteButton
          ouvrages={ouvrages ?? []}
          projects={projects ?? []}
        />
      )}

      <OuvragesList
        ouvrages={ouvrages ?? []}
        projects={projects ?? []}
      />
    </div>
  );
}
