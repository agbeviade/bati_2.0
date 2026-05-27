"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { TypeGeometrie, DimensionsOuvrage, VideDeduit, ComposantRecette, ComposantRecetteCalcule } from "@/lib/calcul-ouvrage";
import type { Json } from "@/lib/supabase/types";

async function getProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("users").select("company_id").eq("id", user.id).single();
  if (!profile?.company_id) redirect("/onboarding");
  return { userId: user.id, companyId: profile.company_id as string, supabase };
}

function toJson<T>(v: T): Json {
  return v as unknown as Json;
}

export async function createOuvrage(data: {
  project_id: string;
  designation: string;
  type_geometrie: TypeGeometrie;
  dimensions: DimensionsOuvrage;
  vides_deduits: VideDeduit[];
  quantite_brute: number;
  quantite_nette: number;
  unite_principale: string;
  recette: ComposantRecette[];
  recette_calculee: ComposantRecetteCalcule[];
  type_id?: string;
}) {
  const { companyId, supabase } = await getProfile();

  const { error } = await supabase.from("project_ouvrages").insert({
    company_id: companyId,
    project_id: data.project_id,
    type_id: data.type_id ?? null,
    designation: data.designation,
    type_geometrie: data.type_geometrie,
    dimensions: toJson(data.dimensions),
    vides_deduits: toJson(data.vides_deduits),
    quantite_brute: data.quantite_brute,
    quantite_nette: data.quantite_nette,
    unite_principale: data.unite_principale,
    recette: toJson(data.recette),
    recette_calculee: toJson(data.recette_calculee),
  });

  if (error) return { error: error.message };

  revalidatePath("/metres");
  redirect("/metres");
}

export async function updateOuvrage(id: string, data: {
  designation: string;
  type_geometrie: TypeGeometrie;
  dimensions: DimensionsOuvrage;
  vides_deduits: VideDeduit[];
  quantite_brute: number;
  quantite_nette: number;
  unite_principale: string;
  recette: ComposantRecette[];
  recette_calculee: ComposantRecetteCalcule[];
}) {
  const { supabase } = await getProfile();

  const { error } = await supabase.from("project_ouvrages").update({
    designation: data.designation,
    type_geometrie: data.type_geometrie,
    dimensions: toJson(data.dimensions),
    vides_deduits: toJson(data.vides_deduits),
    quantite_brute: data.quantite_brute,
    quantite_nette: data.quantite_nette,
    unite_principale: data.unite_principale,
    recette: toJson(data.recette),
    recette_calculee: toJson(data.recette_calculee),
  }).eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/metres");
  redirect("/metres");
}

export async function deleteOuvrage(id: string) {
  const { supabase } = await getProfile();
  const { error } = await supabase.from("project_ouvrages").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/metres");
}

// --- Modeles debourses secs ---

export async function saveModel(name: string, inputs: object) {
  const { companyId, supabase } = await getProfile();
  const trimmed = name.trim();
  if (!trimmed) return { error: "Le nom est requis." };
  const { error } = await supabase.from("debourses_models").insert({
    company_id: companyId,
    name: trimmed,
    inputs: inputs as Json,
  });
  if (error) return { error: error.message };
  revalidatePath("/metres");
  return { success: true };
}

export async function listModels(): Promise<{ id: string; name: string; created_at: string }[]> {
  const { supabase } = await getProfile();
  const { data } = await supabase
    .from("debourses_models")
    .select("id, name, created_at")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function loadModel(id: string) {
  const { supabase } = await getProfile();
  const { data } = await supabase
    .from("debourses_models")
    .select("inputs")
    .eq("id", id)
    .single();
  return data?.inputs ?? null;
}

export async function deleteModel(id: string) {
  const { supabase } = await getProfile();
  await supabase.from("debourses_models").delete().eq("id", id);
  revalidatePath("/metres");
}

export async function generateQuoteFromDebourseModel(
  modelId: string,
  description: string
): Promise<{
  items: Array<{
    category: "material" | "labor" | "transport" | "equipment" | "other";
    label: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total: number;
  }>;
  notes: string;
  error?: string;
}> {
  const { supabase } = await getProfile();
  const { data } = await supabase
    .from("debourses_models").select("inputs").eq("id", modelId).single();
  if (!data?.inputs) return { items: [], notes: "", error: "Modele introuvable." };

  const { computeRecap, RECAP_LABELS, RECAP_UNITS } = await import("@/lib/debourses-calc");
  const recap = computeRecap(data.inputs as unknown as Parameters<typeof computeRecap>[0]);
  const lignes = (Object.keys(recap) as (keyof typeof recap)[])
    .filter(k => recap[k] > 0)
    .map(k => ({ label: RECAP_LABELS[k], quantity: recap[k], unit: RECAP_UNITS[k] }));

  const { genererDevisDepuisDebourses } = await import("./ai-actions");
  return genererDevisDepuisDebourses(lignes, description);
}

export async function generateQuoteFromTemplate(
  templateId: string,
  description: string,
  debourseModelId?: string
): Promise<{
  items: Array<{
    category: "material" | "labor" | "transport" | "equipment" | "other";
    label: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total: number;
  }>;
  notes: string;
  error?: string;
}> {
  const { getTemplateAsBase64 } = await import("@/app/(dashboard)/quotes/templates/actions");
  const { base64, mimeType, fileType, error: fetchError } = await getTemplateAsBase64(templateId);
  if (fetchError) return { items: [], notes: "", error: fetchError };

  let debourseContext: Array<{ label: string; quantity: number; unit: string }> | undefined;
  if (debourseModelId) {
    const { supabase } = await getProfile();
    const { data } = await supabase.from("debourses_models").select("inputs").eq("id", debourseModelId).single();
    if (data?.inputs) {
      const { computeRecap, RECAP_LABELS, RECAP_UNITS } = await import("@/lib/debourses-calc");
      const recap = computeRecap(data.inputs as unknown as Parameters<typeof computeRecap>[0]);
      debourseContext = (Object.keys(recap) as (keyof typeof recap)[])
        .filter(k => recap[k] > 0)
        .map(k => ({ label: RECAP_LABELS[k], quantity: recap[k], unit: RECAP_UNITS[k] }));
    }
  }

  const { genererDevisDepuisTemplate } = await import("./ai-actions");
  return genererDevisDepuisTemplate(base64, mimeType, fileType as "pdf" | "image", description, debourseContext);
}

export async function saveOuvrageType(data: {
  designation: string;
  type_geometrie: TypeGeometrie;
  unite_principale: string;
  recette: ComposantRecette[];
}) {
  const { companyId, supabase } = await getProfile();

  const { error } = await supabase.from("ouvrage_types").insert({
    company_id: companyId,
    designation: data.designation,
    type_geometrie: data.type_geometrie,
    unite_principale: data.unite_principale,
    recette: toJson(data.recette),
  });

  if (error) return { error: error.message };
  revalidatePath("/metres");
  return { success: true };
}
