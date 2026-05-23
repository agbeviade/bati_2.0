import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { MaterialsList } from "@/components/materials/materials-list";
import type { Material } from "@/lib/supabase/types";

export default async function MaterialsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin.from("users").select("company_id").eq("id", user.id).single();
  if (!profile?.company_id) redirect("/onboarding");

  const { data: materialsData } = await admin
    .from("materials")
    .select("id, name, category, unit, stock_qty, unit_cost")
    .eq("company_id", profile.company_id)
    .order("name");

  const materials = (materialsData ?? []) as Pick<Material, "id" | "name" | "category" | "unit" | "stock_qty" | "unit_cost">[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Matériaux</h2>
          <p className="text-muted-foreground">
            {materials.length === 0
              ? "Aucun matériau enregistré."
              : `${materials.length} référence${materials.length > 1 ? "s" : ""}`}
          </p>
        </div>
        <Button asChild>
          <Link href="/materials/new">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau matériau
          </Link>
        </Button>
      </div>

      <MaterialsList materials={materials} />
    </div>
  );
}
