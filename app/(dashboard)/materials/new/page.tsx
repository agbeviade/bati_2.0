import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NewMaterialForm } from "@/components/materials/new-material-form";
import type { CategoryRow } from "@/components/materials/category-manager";

export default async function NewMaterialPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin.from("users").select("company_id").eq("id", user.id).single();
  if (!profile?.company_id) redirect("/onboarding");

  const { data } = await admin
    .from("material_categories")
    .select("id, slug, label")
    .eq("company_id", profile.company_id)
    .order("label");

  const categories = (data ?? []) as CategoryRow[];

  return <NewMaterialForm categories={categories} />;
}
