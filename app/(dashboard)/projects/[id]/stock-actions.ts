"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("users").select("company_id").eq("id", user.id).single();
  if (!profile?.company_id) redirect("/onboarding");
  return { user, supabase };
}

export async function addProjectEntry(
  projectId: string,
  materialId: string,
  quantity: number,
  unitCost: number,
  notes?: string
): Promise<{ id?: string; error?: string }> {
  const { user } = await getProfile();
  const admin = createAdminClient();

  const { data, error } = await admin
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

  // Déduire du budget du chantier
  const totalCost = quantity * unitCost;
  if (totalCost > 0) {
    const { data: proj } = await admin
      .from("projects").select("spent").eq("id", projectId).single();
    await admin
      .from("projects")
      .update({ spent: (proj?.spent ?? 0) + totalCost })
      .eq("id", projectId);
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
  return { id: data.id };
}

export async function addProjectExit(
  projectId: string,
  materialId: string,
  quantity: number,
  justification: string
): Promise<{ id?: string; error?: string }> {
  const { user } = await getProfile();
  const admin = createAdminClient();

  const { data, error } = await admin
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
  return { id: data.id };
}

export async function deleteProjectMovement(
  movementId: string,
  projectId: string,
  type: string,
  quantity: number,
  unitCost: number | null
): Promise<void> {
  await getProfile();
  const admin = createAdminClient();

  await admin.from("stock_movements").delete().eq("id", movementId);

  // Inverser l'impact budget si c'était une entrée
  if (type === "purchase" && unitCost && quantity > 0) {
    const totalCost = quantity * unitCost;
    const { data: proj } = await admin
      .from("projects").select("spent").eq("id", projectId).single();
    await admin
      .from("projects")
      .update({ spent: Math.max(0, (proj?.spent ?? 0) - totalCost) })
      .eq("id", projectId);
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/dashboard");
}
