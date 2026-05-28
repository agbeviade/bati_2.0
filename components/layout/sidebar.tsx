"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  HardHat,
  FileText,
  Package,
  Warehouse,
  Users,
  UserCircle,
  Receipt,
  Bell,
  Settings,
  BarChart3,
  Ruler,
  BookTemplate,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/projects", label: "Chantiers", icon: HardHat },
  { href: "/quotes", label: "Devis", icon: FileText },
  { href: "/quotes/templates", label: "Modèles de devis", icon: BookTemplate },
  { href: "/materials", label: "Matériaux", icon: Package },
  { href: "/stock", label: "Stock", icon: Warehouse },
  { href: "/metres", label: "Métrés", icon: Ruler },
  { href: "/teams", label: "Équipes", icon: Users },
  { href: "/clients", label: "Clients", icon: UserCircle },
  { href: "/invoices", label: "Factures", icon: Receipt },
  { href: "/reports", label: "Rapports", icon: BarChart3 },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Paramètres", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="bg-card sticky top-0 hidden h-screen w-64 flex-col border-r lg:flex">
      <div className="border-b p-6">
        <Link href="/dashboard" className="text-xl font-bold">
          BatiFlow
        </Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent hover:text-accent-foreground text-muted-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
