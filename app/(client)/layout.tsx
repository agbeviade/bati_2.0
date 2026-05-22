import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { LogOut, Construction } from "lucide-react";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users").select("full_name, role, company_id").eq("id", user.id).maybeSingle();

  // Only clients can access this portal
  if (!profile || profile.role !== "client") redirect("/dashboard");

  const { data: company } = profile.company_id
    ? await admin.from("companies").select("name").eq("id", profile.company_id).maybeSingle()
    : { data: null };

  return (
    <html lang="fr">
      <body className="min-h-screen bg-slate-50 font-sans">
        <header className="bg-white border-b px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Construction className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-sm">BatiFlow</span>
              {company?.name && <span className="text-xs text-muted-foreground ml-2">— {company.name}</span>}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">{profile.full_name ?? user.email}</span>
            <form action="/auth/signout" method="post">
              <button type="submit" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            </form>
          </div>
        </header>
        <nav className="bg-white border-b px-6">
          <div className="flex gap-6">
            {[
              { href: "/portal/quotes", label: "Mes devis" },
              { href: "/portal/invoices", label: "Mes factures" },
            ].map(({ href, label }) => (
              <Link key={href} href={href} className="py-3 text-sm font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent hover:border-primary transition-colors">
                {label}
              </Link>
            ))}
          </div>
        </nav>
        <main className="p-6 max-w-5xl mx-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
