"use client";

import { useState, useMemo } from "react";
import { Search, X, ChevronLeft, ChevronRight } from "lucide-react";
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
  pageSize?: number;
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
  pageSize,
}: Props<T>) {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [page, setPage] = useState(1);

  // Reset la page courante quand le filtre/query change.
  // Pattern recommandé React 19 (store info from previous render) — évite
  // useEffect + setState qui déclenche un re-render en cascade.
  const filterKey = `${query}|${activeFilter}`;
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (lastFilterKey !== filterKey) {
    setLastFilterKey(filterKey);
    setPage(1);
  }

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
        }),
      );
    }
    return result;
  }, [items, query, activeFilter, searchKeys, filterKey]);

  const hasQuery = query.trim() !== "";
  const totalPages = pageSize && !hasQuery ? Math.max(1, Math.ceil(filtered.length / pageSize)) : 1;
  const paginated =
    pageSize && !hasQuery ? filtered.slice((page - 1) * pageSize, page * pageSize) : filtered;

  return (
    <div className={className}>
      <div className="mb-4 flex flex-col gap-3">
        <div className="relative w-full">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="pr-9 pl-9"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {filterOptions.length > 0 && (
          <div className="[scrollbar-width:none] overflow-x-auto pb-1 md:overflow-x-visible md:pb-0 [&::-webkit-scrollbar]:hidden">
            <div className="flex w-max gap-1.5 md:w-auto md:flex-wrap">
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
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        query || activeFilter !== "all" ? (
          <div className="flex flex-col items-center justify-center space-y-3 py-16 text-center">
            <Search className="text-muted-foreground h-8 w-8" />
            <p className="text-muted-foreground text-sm">
              Aucun résultat pour <span className="font-medium">"{query || activeFilter}"</span>
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQuery("");
                setActiveFilter("all");
              }}
            >
              Effacer les filtres
            </Button>
          </div>
        ) : (
          emptyState
        )
      ) : (
        <>
          <div className="space-y-2">
            {paginated.map((item, i) => (
              <div key={i}>{renderItem(item)}</div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-muted-foreground text-sm">
                {(page - 1) * pageSize! + 1}–{Math.min(page * pageSize!, filtered.length)} sur{" "}
                {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
