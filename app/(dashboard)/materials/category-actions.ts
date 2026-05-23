"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getCompanyId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const admin = createAdminClient();
  const { data: profile } = await admin.from("users").select("company_id").eq("id", user.id).single();
  if (!profile?.company_id) redirect("/onboarding");
  return profile.company_id as string;
}

function toSlug(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export async function createCategory(formData: FormData) {
  const companyId = await getCompanyId();
  const label = (formData.get("label") as string)?.trim();
  if (!label) return { error: "Le libellé est requis." };

  const slug = toSlug(label);
  const { error } = await createAdminClient().from("material_categories").insert({
    company_id: companyId,
    slug,
    label,
  });

  if (error) {
    if (error.code === "23505") return { error: "Cette catégorie existe déjà." };
    return { error: error.message };
  }

  revalidatePath("/materials");
}

export async function updateCategory(id: string, formData: FormData) {
  await getCompanyId();
  const label = (formData.get("label") as string)?.trim();
  if (!label) return { error: "Le libellé est requis." };

  const { error } = await createAdminClient()
    .from("material_categories")
    .update({ label })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/materials");
}

export async function deleteCategory(id: string) {
  const companyId = await getCompanyId();
  const admin = createAdminClient();

  const { data: cat } = await admin
    .from("material_categories")
    .select("slug")
    .eq("id", id)
    .single();
  if (!cat) return { error: "Catégorie introuvable." };

  const { count } = await admin
    .from("materials")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("category", cat.slug);

  if (count && count > 0)
    return { error: `Impossible : ${count} matériau${count > 1 ? "x" : ""} utilisent cette catégorie.` };

  await admin.from("material_categories").delete().eq("id", id);
  revalidatePath("/materials");
}
