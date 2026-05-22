import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, AlertTriangle } from "lucide-react";
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
    .select("id, name, category, unit, stock_qty, min_stock_qty, unit_cost")
    .eq("company_id", profile.company_id)
    .order("name");

  const materials = (materialsData ?? []) as Pick<Material, "id" | "name" | "category" | "unit" | "stock_qty" | "min_stock_qty" | "unit_cost">[];

  const lowStock = materials.filter(m => m.min_stock_qty > 0 && m.stock_qty <= m.min_stock_qty);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Matériaux</h2>
          <p className="text-muted-foreground">
            {materials.length === 0
              ? "Aucun matériau enregistré."
              : `${materials.length} référence${materials.length > 1 ? "s" : ""}${lowStock.length > 0 ? ` · ${lowStock.length} stock faible` : ""}`}
          </p>
        </div>
        <Button asChild>
          <Link href="/materials/new">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau matériau
          </Link>
        </Button>
      </div>

      {lowStock.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-orange-200 bg-orange-50 text-orange-800">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <span className="font-medium">Stock faible :</span>{" "}
            {lowStock.map(m => m.name).join(", ")}
          </div>
        </div>
      )}

      <MaterialsList materials={materials} />
    </div>
  );
}
