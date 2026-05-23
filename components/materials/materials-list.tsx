"use client";

import Link from "next/link";
import { Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchFilter } from "@/components/ui/search-filter";
import type { CategoryRow } from "@/components/materials/category-manager";

export type MaterialRow = {
  id: string;
  name: string;
  category: string;
  unit: string;
  stock_qty: number;
  unit_cost: number;
};

export function MaterialsList({
  materials,
  categories,
}: {
  materials: MaterialRow[];
  categories: CategoryRow[];
}) {
  const labelMap = Object.fromEntries(categories.map((c) => [c.slug, c.label]));
  const filterOptions = categories.map((c) => ({ value: c.slug, label: c.label }));
  const emptyState = (
    <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
      <div className="p-4 rounded-full bg-muted">
        <Package className="h-10 w-10 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium">Aucun matériau</p>
        <p className="text-sm text-muted-foreground">Ajoutez vos matériaux pour suivre le stock.</p>
      </div>
      <Button asChild>
        <Link href="/materials/new"><Plus className="h-4 w-4 mr-2" />Ajouter un matériau</Link>
      </Button>
    </div>
  );

  return (
    <SearchFilter
      items={materials}
      searchKeys={["name"]}
      filterKey="category"
      filterOptions={filterOptions}
      filterAllLabel="Tous"
      placeholder="Rechercher par nom..."
      pageSize={100}
      emptyState={emptyState}
      renderItem={(m) => (
        <Link href={`/materials/${m.id}`} className="block group">
          <Card className="transition-shadow group-hover:shadow-md">
            <CardContent className="py-4 flex items-center gap-4">
              <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                <div className="min-w-0">
                  <p className="font-medium text-sm">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{labelMap[m.category] ?? m.category}</p>
                </div>
                <div className="text-sm font-semibold">
                  {m.stock_qty.toLocaleString("fr-FR")} {m.unit}
                </div>
                <div className="text-sm text-muted-foreground text-right">
                  {m.unit_cost > 0 ? `${m.unit_cost.toLocaleString("fr-FR")} FCFA / ${m.unit}` : "Prix non défini"}
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}
    />
  );
}
