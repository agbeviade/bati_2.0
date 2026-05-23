"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { createMaterial } from "@/app/(dashboard)/materials/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CategoryRow } from "@/components/materials/category-manager";

const UNITS = [
  "unité", "sac", "kg", "tonne", "m", "m²", "m³", "L", "ml",
  "barre", "botte", "rouleau", "panneau", "plaque", "bidon", "pot", "seau", "ensemble",
];

export function NewMaterialForm({ categories }: { categories: CategoryRow[] }) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const result = await createMaterial(new FormData(e.currentTarget));
    setLoading(false);
    if (result?.error) toast.error(result.error);
  }

  return (
    <div className="space-y-4 max-w-lg">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/materials"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h2 className="text-2xl font-bold">Nouveau matériau</h2>
      </div>

      <Card>
        <CardHeader><CardTitle>Informations</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nom *</Label>
              <Input id="name" name="name" placeholder="Ciment CPA 42.5, Fer 10mm..." required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="category">Catégorie</Label>
                <select
                  name="category"
                  id="category"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.slug}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unit">Unité *</Label>
                <select
                  name="unit"
                  id="unit"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="unit_cost">Prix unitaire</Label>
              <Input id="unit_cost" name="unit_cost" type="number" min="0" step="1" placeholder="0" />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Création..." : "Créer le matériau"}
              </Button>
              <Button type="button" variant="ghost" asChild>
                <Link href="/materials">Annuler</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
