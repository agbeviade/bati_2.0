import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { deleteMaterial, updateMaterial } from "@/app/(dashboard)/materials/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DeleteButton } from "@/components/ui/delete-button";
import type { Material } from "@/lib/supabase/types";
import type { CategoryRow } from "@/components/materials/category-manager";

const UNITS = ["u", "kg", "t", "m", "m²", "m³", "L", "ml", "sac", "barre", "planche", "rouleau", "boîte"];

export default async function MaterialDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { id } = await params;
  const { edit } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: matData } = await supabase.from("materials").select("*").eq("id", id).maybeSingle();
  if (!matData) notFound();
  const mat = matData as Material;

  const { data: categoriesData } = await supabase
    .from("material_categories")
    .select("id, slug, label")
    .eq("company_id", mat.company_id)
    .order("label");
  const categories = (categoriesData ?? []) as CategoryRow[];
  const categoryLabel = categories.find((c) => c.slug === mat.category)?.label ?? mat.category;

  const updateWithId = updateMaterial.bind(null, id);
  const deleteWithId = deleteMaterial.bind(null, id);

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/materials"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold truncate">{mat.name}</h2>
          </div>
          <p className="text-sm text-muted-foreground">{categoryLabel}</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/materials/${id}?edit=1`}>Modifier</Link>
        </Button>
      </div>

      {/* Prix de référence */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">Prix unitaire de référence</span>
            <span className="font-bold">{mat.unit_cost.toLocaleString("fr-FR")} / {mat.unit}</span>
          </div>
        </CardContent>
      </Card>

      {/* Edit form */}
      {edit === "1" && (
        <Card>
          <CardContent className="pt-6">
            <form action={updateWithId as unknown as (f: FormData) => void} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nom *</Label>
                <Input id="name" name="name" defaultValue={mat.name} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="category">Catégorie</Label>
                  <select
                    name="category" id="category" defaultValue={mat.category}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {categories.map(c => <option key={c.id} value={c.slug}>{c.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="unit">Unité</Label>
                  <select
                    name="unit" id="unit" defaultValue={mat.unit}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unit_cost">Prix unitaire</Label>
                <Input id="unit_cost" name="unit_cost" type="number" min="0" step="1" defaultValue={mat.unit_cost} />
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" size="sm">Enregistrer</Button>
                <Button type="button" size="sm" variant="ghost" asChild>
                  <Link href={`/materials/${id}`}>Annuler</Link>
                </Button>
              </div>
            </form>

            <div className="mt-6 pt-6 border-t">
              <DeleteButton
                onConfirm={deleteWithId}
                title="Supprimer ce matériau"
                description="Cette action est irréversible. L'historique des mouvements de stock sera également supprimé."
              />
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
