"use client";

import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type FilterOption = { value: string; label: string };

type Props<T> = {
  items: T[];
  searchKeys: (keyof T)[];
  filterKey?: keyof T;
  filterOptions?: FilterOption[];
  filterAllLabel?: string;
  renderItem: (item: T) => React.ReactNode;
  emptyState: React.ReactNode;
  placeholder?: string;
  className?: string;
};

export function SearchFilter<T>({
  items,
  searchKeys,
  filterKey,
  filterOptions = [],
  filterAllLabel = "Tous",
  renderItem,
  emptyState,
  placeholder = "Rechercher...",
  className,
}: Props<T>) {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const filtered = useMemo(() => {
    let result = items;

    if (activeFilter !== "all" && filterKey) {
      result = result.filter((item) => String(item[filterKey]) === activeFilter);
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter((item) =>
        searchKeys.some((key) => {
          const val = item[key];
          return val != null && String(val).toLowerCase().includes(q);
        })
      );
    }

    return result;
  }, [items, query, activeFilter, searchKeys, filterKey]);

  return (
    <div className={className}>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="pl-9 pr-9"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {filterOptions.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            <Badge
              variant={activeFilter === "all" ? "default" : "outline"}
              className="cursor-pointer px-3 py-1 text-xs"
              onClick={() => setActiveFilter("all")}
            >
              {filterAllLabel}
            </Badge>
            {filterOptions.map((opt) => (
              <Badge
                key={opt.value}
                variant={activeFilter === opt.value ? "default" : "outline"}
                className="cursor-pointer px-3 py-1 text-xs"
                onClick={() => setActiveFilter(opt.value)}
              >
                {opt.label}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        query || activeFilter !== "all" ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
            <Search className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Aucun résultat pour <span className="font-medium">"{query || activeFilter}"</span>
            </p>
            <Button variant="ghost" size="sm" onClick={() => { setQuery(""); setActiveFilter("all"); }}>
              Effacer les filtres
            </Button>
          </div>
        ) : emptyState
      ) : (
        <div className="space-y-2">
          {filtered.map((item, i) => (
            <div key={i}>{renderItem(item)}</div>
          ))}
        </div>
      )}
    </div>
  );
}
