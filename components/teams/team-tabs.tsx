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
    <div className="flex border-b gap-1">
      {TABS.map(tab => (
        <Link
          key={tab.id}
          href={`/teams/${teamId}?tab=${tab.id}`}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
            active === tab.id
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
