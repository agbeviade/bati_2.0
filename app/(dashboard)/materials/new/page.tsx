import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewMaterialForm } from "@/components/materials/new-material-form";
import type { CategoryRow } from "@/components/materials/category-manager";

export default async function NewMaterialPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("company_id").eq("id", user.id).single();
  if (!profile?.company_id) redirect("/onboarding");

  const { data } = await supabase
    .from("material_categories")
    .select("id, slug, label")
    .eq("company_id", profile.company_id)
    .order("label");

  const categories = (data ?? []) as CategoryRow[];

  return <NewMaterialForm categories={categories} />;
}
