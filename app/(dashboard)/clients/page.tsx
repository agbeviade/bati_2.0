import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { ClientsList } from "@/components/clients/clients-list";

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin.from("users").select("company_id").eq("id", user.id).single();
  if (!profile?.company_id) redirect("/onboarding");

  const { data: clients } = await admin
    .from("users")
    .select("id, full_name, email, phone, is_active, created_at")
    .eq("company_id", profile.company_id)
    .eq("role", "client")
    .order("full_name");

  const list = (clients ?? []) as { id: string; full_name: string | null; email: string | null; phone: string | null; is_active: boolean; created_at: string }[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Clients</h2>
          <p className="text-muted-foreground text-sm">
            {list.length === 0
              ? "Aucun client pour l'instant."
              : `${list.length} client${list.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button asChild className="self-start sm:self-auto">
          <Link href="/clients/new"><Plus className="h-4 w-4 mr-2" />Nouveau client</Link>
        </Button>
      </div>

      <ClientsList clients={list} />
    </div>
  );
}
