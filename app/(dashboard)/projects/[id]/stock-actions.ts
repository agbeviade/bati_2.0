"use server";

import { revalidatePath } from "next/cache";
import { getAuthedProfile } from "@/lib/auth/profile";

// Stock is per-project — movements are scoped to a project_id.
// materials.stock_qty is NOT used; compute stock from movements filtered by project.

export async function addProjectEntry(
  projectId: string,
  materialId: string,
  quantity: number,
  unitCost: number,
  notes?: string
): Promise<{ id?: string; error?: string }> {
  const { user, supabase } = await getAuthedProfile();

  const { data, error } = await supabase
    .from("stock_movements")
    .insert({
      material_id: materialId,
      project_id: projectId,
      type: "purchase",
      quantity,
      unit_cost: unitCost,
      notes: notes?.trim() || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Update project.spent (budget impact)
  const totalCost = quantity * unitCost;
  if (totalCost > 0) {
    const { data: proj } = await supabase
      .from("projects").select("spent").eq("id", projectId).single();
    await supabase
      .from("projects")
      .update({ spent: (proj?.spent ?? 0) + totalCost })
      .eq("id", projectId);
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/stock");
  revalidatePath("/dashboard");
  return { id: data.id };
}

export async function addProjectExit(
  projectId: string,
  materialId: string,
  quantity: number,
  justification: string
): Promise<{ id?: string; error?: string }> {
  const { user, supabase } = await getAuthedProfile();

  const { data, error } = await supabase
    .from("stock_movements")
    .insert({
      material_id: materialId,
      project_id: projectId,
      type: "use",
      quantity,
      notes: justification?.trim() || null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/stock");
  return { id: data.id };
}

export async function deleteProjectMovement(
  movementId: string,
  projectId: string,
  materialId: string,
  type: string,
  quantity: number,
  unitCost: number | null
): Promise<void> {
  const { supabase } = await getAuthedProfile();

  await supabase.from("stock_movements").delete().eq("id", movementId);

  // Reverse budget impact if it was a purchase
  if (type === "purchase" && unitCost && quantity > 0) {
    const totalCost = quantity * unitCost;
    const { data: proj2 } = await supabase
      .from("projects").select("spent").eq("id", projectId).single();
    await supabase
      .from("projects")
      .update({ spent: Math.max(0, (proj2?.spent ?? 0) - totalCost) })
      .eq("id", projectId);
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/stock");
  revalidatePath("/dashboard");
}
