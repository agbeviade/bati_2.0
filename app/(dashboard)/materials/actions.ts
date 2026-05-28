"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthedProfile } from "@/lib/auth/profile";
import { logger } from "@/lib/logger";
import type { MaterialCategory, MovementType } from "@/lib/supabase/types";

export async function createMaterial(formData: FormData) {
  const { user, companyId, supabase } = await getAuthedProfile();

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Le nom est requis." };

  const { data: material, error } = await supabase
    .from("materials")
    .insert({
      company_id: companyId,
      name,
      category: (formData.get("category") as MaterialCategory) || "other",
      unit: (formData.get("unit") as string)?.trim() || "u",
      unit_cost: Number(formData.get("unit_cost")) || 0,
    })
    .select("id")
    .single();

  if (error || !material) {
    logger.error("createMaterial failed", error, { companyId });
    return { error: error?.message };
  }

  revalidatePath("/materials");
  revalidatePath("/dashboard");
  redirect(`/materials/${material.id}`);
}

export async function updateMaterial(id: string, formData: FormData) {
  const { supabase } = await getAuthedProfile();
  const name = (formData.get("name") as string)?.trim();

  const { error } = await supabase
    .from("materials")
    .update({
      name,
      category: (formData.get("category") as MaterialCategory) || "other",
      unit: (formData.get("unit") as string)?.trim() || "u",
      unit_cost: Number(formData.get("unit_cost")) || 0,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`/materials/${id}`);
  revalidatePath("/materials");
}

export async function deleteMaterial(id: string) {
  const { supabase } = await getAuthedProfile();
  await supabase.from("materials").delete().eq("id", id);
  revalidatePath("/materials");
  revalidatePath("/dashboard");
  redirect("/materials");
}

export async function addMovement(materialId: string, formData: FormData) {
  const { user, supabase } = await getAuthedProfile();
  const type = formData.get("type") as MovementType;
  const quantity = Number(formData.get("quantity"));

  if (!quantity || quantity <= 0) return { error: "Quantité invalide." };

  const { error } = await supabase.from("stock_movements").insert({
    material_id: materialId,
    type,
    quantity,
    unit_cost: Number(formData.get("unit_cost")) || null,
    notes: (formData.get("notes") as string)?.trim() || null,
    project_id: (formData.get("project_id") as string) || null,
    created_by: user.id,
  });

  if (error) return { error: error.message };
  revalidatePath(`/materials/${materialId}`);
  revalidatePath("/materials");
  revalidatePath("/dashboard");
}

export async function deleteMovement(movementId: string, materialId: string) {
  const { supabase } = await getAuthedProfile();
  await supabase.from("stock_movements").delete().eq("id", movementId);
  revalidatePath(`/materials/${materialId}`);
  revalidatePath("/materials");
  revalidatePath("/dashboard");
}
