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
    <div className="flex flex-col items-center justify-center space-y-4 py-24 text-center">
      <div className="bg-muted rounded-full p-4">
        <Package className="text-muted-foreground h-10 w-10" />
      </div>
      <div>
        <p className="font-medium">Aucun matériau</p>
        <p className="text-muted-foreground text-sm">Ajoutez vos matériaux pour suivre le stock.</p>
      </div>
      <Button asChild>
        <Link href="/materials/new">
          <Plus className="mr-2 h-4 w-4" />
          Ajouter un matériau
        </Link>
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
        <Link href={`/materials/${m.id}`} className="group block">
          <Card className="transition-shadow group-hover:shadow-md">
            <CardContent className="px-4 py-3">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{m.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {labelMap[m.category] ?? m.category}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-muted-foreground text-sm font-semibold">
                    {m.unit_cost > 0
                      ? `${m.unit_cost.toLocaleString("fr-FR")} / ${m.unit}`
                      : "Prix non défini"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}
    />
  );
}
