"use server";

import { revalidatePath } from "next/cache";
import { getAuthedProfile } from "@/lib/auth/profile";

function toSlug(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export async function createCategory(formData: FormData) {
  const { companyId, supabase } = await getAuthedProfile();
  const label = (formData.get("label") as string)?.trim();
  if (!label) return { error: "Le libellé est requis." };

  const slug = toSlug(label);
  const { error } = await supabase.from("material_categories").insert({
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
  const { supabase } = await getAuthedProfile();
  const label = (formData.get("label") as string)?.trim();
  if (!label) return { error: "Le libellé est requis." };

  const { error } = await supabase.from("material_categories").update({ label }).eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/materials");
}

export async function deleteCategory(id: string) {
  const { companyId, supabase } = await getAuthedProfile();

  const { data: cat } = await supabase
    .from("material_categories")
    .select("slug")
    .eq("id", id)
    .single();
  if (!cat) return { error: "Catégorie introuvable." };

  const { count } = await supabase
    .from("materials")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("category", cat.slug);

  if (count && count > 0)
    return {
      error: `Impossible : ${count} matériau${count > 1 ? "x" : ""} utilisent cette catégorie.`,
    };

  await supabase.from("material_categories").delete().eq("id", id);
  revalidatePath("/materials");
}
