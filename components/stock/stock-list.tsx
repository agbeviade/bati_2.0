"use client";

import Link from "next/link";
import { AlertTriangle, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SearchFilter } from "@/components/ui/search-filter";
import type { Material } from "@/lib/supabase/types";
import type { CategoryRow } from "@/components/materials/category-manager";

type StockRow = Pick<Material, "id" | "name" | "category" | "unit" | "stock_qty" | "unit_cost">;

function stockStatus(qty: number): "out" | "low" | "ok" {
  if (qty <= 0) return "out";
  if (qty < 10) return "low";
  return "ok";
}

const STATUS_COLORS = {
  out: "bg-red-100 text-red-700 border-red-200",
  low: "bg-orange-100 text-orange-700 border-orange-200",
  ok: "bg-green-100 text-green-700 border-green-200",
};
const STATUS_LABELS = {
  out: "Épuisé",
  low: "Faible",
  ok: "En stock",
};

function fmt(n: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

export function StockList({
  materials,
  categories,
  currency,
}: {
  materials: StockRow[];
  categories: CategoryRow[];
  currency: string;
}) {
  const labelMap = Object.fromEntries(categories.map((c) => [c.slug, c.label]));
  const filterOptions = categories.map((c) => ({ value: c.slug, label: c.label }));

  // Trier : épuisé → faible → ok
  const ORDER = { out: 0, low: 1, ok: 2 };
  const sorted = [...materials].sort(
    (a, b) => ORDER[stockStatus(a.stock_qty)] - ORDER[stockStatus(b.stock_qty)],
  );

  const emptyState = (
    <div className="flex flex-col items-center justify-center space-y-4 py-24 text-center">
      <div className="bg-muted rounded-full p-4">
        <Package className="text-muted-foreground h-10 w-10" />
      </div>
      <p className="font-medium">Aucun matériau dans le catalogue</p>
      <Link href="/materials" className="text-primary text-sm underline underline-offset-2">
        Ajouter des matériaux →
      </Link>
    </div>
  );

  return (
    <SearchFilter
      items={sorted}
      searchKeys={["name"]}
      filterKey="category"
      filterOptions={filterOptions}
      filterAllLabel="Tous"
      placeholder="Rechercher un matériau..."
      pageSize={50}
      emptyState={emptyState}
      renderItem={(m) => {
        const status = stockStatus(m.stock_qty);
        const value = m.stock_qty * m.unit_cost;
        return (
          <Link href={`/materials/${m.id}`} className="group block">
            <Card className="transition-shadow group-hover:shadow-md">
              <CardContent className="px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  {/* Indicateur statut */}
                  <div
                    className={`h-8 w-2 flex-shrink-0 rounded-full ${status === "out" ? "bg-red-500" : status === "low" ? "bg-orange-400" : "bg-green-500"}`}
                  />

                  {/* Nom + catégorie */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium">{m.name}</p>
                      {status !== "ok" && (
                        <span
                          className={`flex flex-shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}
                        >
                          {status === "out" && <AlertTriangle className="h-3 w-3" />}
                          {STATUS_LABELS[status]}
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {labelMap[m.category] ?? m.category}
                    </p>
                  </div>

                  {/* Stock */}
                  <div className="flex-shrink-0 text-right">
                    <p
                      className={`text-sm font-bold ${status === "out" ? "text-destructive" : status === "low" ? "text-orange-600" : "text-foreground"}`}
                    >
                      {m.stock_qty.toLocaleString("fr-FR")} {m.unit}
                    </p>
                    {value > 0 && (
                      <p className="text-muted-foreground text-xs">{fmt(value, currency)}</p>
                    )}
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
