import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { User } from "@/lib/supabase/types";
import NewTeamForm from "./form";

export default async function NewTeamPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin.from("users").select("company_id").eq("id", user.id).single();
  if (!profile?.company_id) redirect("/onboarding");

  const { data: usersData } = await admin
    .from("users")
    .select("id, full_name, role")
    .eq("company_id", profile.company_id)
    .eq("is_active", true)
    .in("role", ["admin", "manager", "foreman"]);

  return <NewTeamForm leads={(usersData ?? []) as Pick<User, "id" | "full_name" | "role">[]} />;
}
