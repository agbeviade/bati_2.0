import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogOut, Construction } from "lucide-react";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, role, company_id")
    .eq("id", user.id)
    .maybeSingle();

  // Only clients can access this portal
  if (!profile || profile.role !== "client") redirect("/dashboard");

  const { data: company } = profile.company_id
    ? await supabase.from("companies").select("name").eq("id", profile.company_id).maybeSingle()
    : { data: null };

  return (
    <html lang="fr">
      <body className="min-h-screen bg-slate-50 font-sans">
        <header className="flex items-center justify-between border-b bg-white px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <Construction className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="text-sm font-bold">BatiFlow</span>
              {company?.name && (
                <span className="text-muted-foreground ml-2 text-xs">— {company.name}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground hidden text-sm sm:block">
              {profile.full_name ?? user.email}
            </span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            </form>
          </div>
        </header>
        <nav className="border-b bg-white px-6">
          <div className="flex gap-6">
            {[
              { href: "/portal/quotes", label: "Mes devis" },
              { href: "/portal/invoices", label: "Mes factures" },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-muted-foreground hover:text-foreground hover:border-primary border-b-2 border-transparent py-3 text-sm font-medium transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
        </nav>
        <main className="mx-auto max-w-5xl p-6">{children}</main>
      </body>
    </html>
  );
}
