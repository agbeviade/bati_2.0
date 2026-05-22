"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MaterialCategory, MovementType } from "@/lib/supabase/types";

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

export async function createMaterial(formData: FormData) {
  const user = await getUser();
  const admin = createAdminClient();

  const { data: profile } = await admin.from("users").select("company_id").eq("id", user.id).single();
  if (!profile?.company_id) redirect("/onboarding");

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Le nom est requis." };

  const { data: material, error } = await admin.from("materials").insert({
    company_id: profile.company_id,
    name,
    category: (formData.get("category") as MaterialCategory) || "other",
    unit: (formData.get("unit") as string)?.trim() || "u",
    min_stock_qty: Number(formData.get("min_stock_qty")) || 0,
    unit_cost: Number(formData.get("unit_cost")) || 0,
  }).select("id").single();

  if (error || !material) {
    console.error("[createMaterial]", error);
    return { error: error?.message };
  }

  // Stock initial optionnel
  const initial_qty = Number(formData.get("initial_qty"));
  if (initial_qty > 0) {
    await admin.from("stock_movements").insert({
      material_id: material.id,
      type: "purchase" as MovementType,
      quantity: initial_qty,
      unit_cost: Number(formData.get("unit_cost")) || 0,
      notes: "Stock initial",
      created_by: user.id,
    });
  }

  revalidatePath("/materials");
  redirect(`/materials/${material.id}`);
}

export async function updateMaterial(id: string, formData: FormData) {
  await getUser();
  const name = (formData.get("name") as string)?.trim();

  const { error } = await createAdminClient().from("materials").update({
    name,
    category: (formData.get("category") as MaterialCategory) || "other",
    unit: (formData.get("unit") as string)?.trim() || "u",
    min_stock_qty: Number(formData.get("min_stock_qty")) || 0,
    unit_cost: Number(formData.get("unit_cost")) || 0,
  }).eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`/materials/${id}`);
  revalidatePath("/materials");
}

export async function deleteMaterial(id: string) {
  await getUser();
  await createAdminClient().from("materials").delete().eq("id", id);
  revalidatePath("/materials");
  redirect("/materials");
}

export async function addMovement(materialId: string, formData: FormData) {
  const user = await getUser();
  const type = formData.get("type") as MovementType;
  const quantity = Number(formData.get("quantity"));

  if (!quantity || quantity <= 0) return { error: "Quantité invalide." };

  const signedQty = type === "use" ? quantity : quantity;

  const { error } = await createAdminClient().from("stock_movements").insert({
    material_id: materialId,
    type,
    quantity: signedQty,
    unit_cost: Number(formData.get("unit_cost")) || null,
    notes: (formData.get("notes") as string)?.trim() || null,
    project_id: (formData.get("project_id") as string) || null,
    created_by: user.id,
  });

  if (error) return { error: error.message };
  revalidatePath(`/materials/${materialId}`);
  revalidatePath("/materials");
}

export async function deleteMovement(movementId: string, materialId: string) {
  await getUser();
  await createAdminClient().from("stock_movements").delete().eq("id", movementId);
  revalidatePath(`/materials/${materialId}`);
  revalidatePath("/materials");
}
