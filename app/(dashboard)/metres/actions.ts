"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { TypeGeometrie, DimensionsOuvrage, VideDeduit, ComposantRecette, ComposantRecetteCalcule } from "@/lib/calcul-ouvrage";
import type { Json } from "@/lib/supabase/types";

async function getContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const admin = createAdminClient();
  const { data: profile } = await admin.from("users").select("company_id").eq("id", user.id).single();
  if (!profile?.company_id) redirect("/onboarding");
  return { userId: user.id, companyId: profile.company_id, admin };
}

// Supabase attend Json pour les colonnes jsonb — on cast via unknown
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
  const { companyId, admin } = await getContext();

  const { error } = await admin.from("project_ouvrages").insert({
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
  const { admin } = await getContext();

  const { error } = await admin.from("project_ouvrages").update({
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
  const { admin } = await getContext();
  const { error } = await admin.from("project_ouvrages").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/metres");
}

export async function saveOuvrageType(data: {
  designation: string;
  type_geometrie: TypeGeometrie;
  unite_principale: string;
  recette: ComposantRecette[];
}) {
  const { companyId, admin } = await getContext();

  const { error } = await admin.from("ouvrage_types").insert({
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
