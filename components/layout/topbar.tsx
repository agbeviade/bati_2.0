"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  LogOut,
  User,
  Menu,
  X,
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
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/projects", label: "Chantiers", icon: HardHat },
  { href: "/quotes", label: "Devis", icon: FileText },
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

interface TopbarProps {
  email: string;
  fullName?: string | null;
}

export function Topbar({ email, fullName }: TopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = (fullName || email)
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <header className="bg-card sticky top-0 z-30 flex h-16 min-w-0 items-center justify-between border-b px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <button
            className="hover:bg-accent rounded-md p-2 transition-colors lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-sm font-semibold lg:text-base">
            Bonjour {fullName?.split(" ")[0] || ""} 👋
          </h1>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{initials || "?"}</AvatarFallback>
              </Avatar>
              <span className="hidden text-sm sm:inline">{fullName || email}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/settings">
                <User className="mr-2 h-4 w-4" />
                Paramètres
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Overlay mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          {/* Drawer */}
          <aside className="bg-card absolute top-0 left-0 flex h-full w-72 flex-col border-r shadow-xl">
            <div className="flex items-center justify-between border-b p-5">
              <span className="text-xl font-bold">BatiFlow</span>
              <button
                onClick={() => setMobileOpen(false)}
                className="hover:bg-accent rounded-md p-1.5 transition-colors"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent hover:text-accent-foreground text-muted-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
