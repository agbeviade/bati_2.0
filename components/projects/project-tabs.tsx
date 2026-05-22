"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "overview",  label: "Vue générale" },
  { id: "expenses",  label: "Dépenses" },
  { id: "photos",    label: "Photos" },
  { id: "team",      label: "Équipe" },
  { id: "documents", label: "Documents" },
];

export function ProjectTabs({ projectId }: { projectId: string }) {
  const searchParams = useSearchParams();
  const active = searchParams.get("tab") ?? "overview";

  return (
    <div className="flex gap-0 border-b overflow-x-auto">
      {TABS.map((tab) => (
        <Link
          key={tab.id}
          href={`/projects/${projectId}?tab=${tab.id}`}
          className={cn(
            "px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors",
            active === tab.id
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
