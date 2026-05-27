import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent } from "@/components/ui/card";
import { StockList } from "@/components/stock/stock-list";
import type { Material } from "@/lib/supabase/types";
import type { CategoryRow } from "@/components/materials/category-manager";

export default async function StockPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin.from("users").select("company_id").eq("id", user.id).single();
  if (!profile?.company_id) redirect("/onboarding");

  const { data: company } = await admin.from("companies").select("currency").eq("id", profile.company_id).single();
  const currency = (company as { currency?: string } | null)?.currency ?? "XOF";

  const [{ data: materialsData }, { data: categoriesData }] = await Promise.all([
    admin
      .from("materials")
      .select("id, name, category, unit, stock_qty, unit_cost")
      .eq("company_id", profile.company_id)
      .order("name"),
    admin
      .from("material_categories")
      .select("id, slug, label")
      .eq("company_id", profile.company_id)
      .order("label"),
  ]);

  const materials = (materialsData ?? []) as Pick<Material, "id" | "name" | "category" | "unit" | "stock_qty" | "unit_cost">[];
  const categories = (categoriesData ?? []) as CategoryRow[];

  const outOfStock = materials.filter(m => m.stock_qty <= 0).length;
  const lowStock = materials.filter(m => m.stock_qty > 0 && m.stock_qty < 10).length;
  const totalValue = materials.reduce((s, m) => s + m.stock_qty * m.unit_cost, 0);

  function fmt(n: number) {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Stock</h2>
          <p className="text-muted-foreground">{materials.length} références</p>
        </div>
        <Link href="/materials" className="text-sm text-primary underline underline-offset-2 self-start sm:self-auto">
          Gérer le catalogue →
        </Link>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="px-4 pt-3 pb-3">
            <p className="text-xs text-muted-foreground">Références</p>
            <p className="text-2xl font-bold">{materials.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="px-4 pt-3 pb-3">
            <p className="text-xs text-muted-foreground">Valeur totale</p>
            <p className="text-lg font-bold text-primary break-all">{fmt(totalValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="px-4 pt-3 pb-3">
            <p className="text-xs text-muted-foreground">Stock faible</p>
            <p className={`text-2xl font-bold ${lowStock > 0 ? "text-orange-600" : "text-muted-foreground"}`}>{lowStock}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="px-4 pt-3 pb-3">
            <p className="text-xs text-muted-foreground">Épuisé</p>
            <p className={`text-2xl font-bold ${outOfStock > 0 ? "text-destructive" : "text-muted-foreground"}`}>{outOfStock}</p>
          </CardContent>
        </Card>
      </div>

      <StockList materials={materials} categories={categories} currency={currency} />
    </div>
  );
}
