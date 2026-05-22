"use client";

import Link from "next/link";
import { Package, AlertTriangle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchFilter } from "@/components/ui/search-filter";

export type MaterialRow = {
  id: string;
  name: string;
  category: string;
  unit: string;
  stock_qty: number;
  min_stock_qty: number;
  unit_cost: number;
};

const CATEGORY_LABELS: Record<string, string> = {
  cement: "Ciment", steel: "Acier/Fer", wood: "Bois", sand_gravel: "Sable/Gravier",
  paint: "Peinture", electrical: "Électricité", plumbing: "Plomberie",
  tools: "Outillage", other: "Autre",
};

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }));

export function MaterialsList({ materials }: { materials: MaterialRow[] }) {
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
      filterOptions={CATEGORY_OPTIONS}
      filterAllLabel="Tous"
      placeholder="Rechercher par nom..."
      emptyState={emptyState}
      renderItem={(m) => {
        const isLow = m.min_stock_qty > 0 && m.stock_qty <= m.min_stock_qty;
        return (
          <Link href={`/materials/${m.id}`} className="block group">
            <Card className={`transition-shadow group-hover:shadow-md ${isLow ? "border-orange-200" : ""}`}>
              <CardContent className="py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{m.name}</p>
                      {isLow && <AlertTriangle className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[m.category] ?? m.category}</p>
                  </div>
                  <div className="text-sm">
                    <span className={`font-semibold ${isLow ? "text-orange-600" : ""}`}>
                      {m.stock_qty.toLocaleString("fr-FR")} {m.unit}
                    </span>
                    {m.min_stock_qty > 0 && (
                      <p className="text-xs text-muted-foreground">min {m.min_stock_qty} {m.unit}</p>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {m.unit_cost > 0 ? `${m.unit_cost.toLocaleString("fr-FR")} / ${m.unit}` : "Prix non défini"}
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-xs">
                      {CATEGORY_LABELS[m.category] ?? m.category}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      }}
    />
  );
}
