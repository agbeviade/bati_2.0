"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Tab = "members" | "attendance";

const TABS: { id: Tab; label: string }[] = [
  { id: "members", label: "Membres" },
  { id: "attendance", label: "Pointage" },
];

export function TeamTabs({ teamId }: { teamId: string }) {
  const searchParams = useSearchParams();
  const active = (searchParams.get("tab") ?? "members") as Tab;

  return (
    <div className="flex gap-1 border-b">
      {TABS.map((tab) => (
        <Link
          key={tab.id}
          href={`/teams/${teamId}?tab=${tab.id}`}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            active === tab.id
              ? "border-primary text-primary"
              : "text-muted-foreground hover:text-foreground border-transparent"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
