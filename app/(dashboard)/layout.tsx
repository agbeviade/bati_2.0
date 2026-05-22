import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Toaster } from "@/components/ui/sonner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("full_name, company_id")
    .eq("id", user.id)
    .maybeSingle();

  const typedProfile = profile as { full_name?: string; company_id?: string | null } | null;

  if (!typedProfile?.company_id) {
    redirect("/onboarding");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar
          email={user.email!}
          fullName={typedProfile?.full_name}
        />
        <main className="flex-1 p-6 bg-muted/30">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}
