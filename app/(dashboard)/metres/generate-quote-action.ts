"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { genererDevisDepuisMetres } from "./ai-actions";
import type { ProjectOuvrage } from "@/lib/supabase/types";
import type { ComposantRecetteCalcule } from "@/lib/calcul-ouvrage";

export async function generateQuoteFromMetres(
  ouvrageIds: string[],
  projectId: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin.from("users").select("company_id").eq("id", user.id).single();
  if (!profile?.company_id) redirect("/onboarding");

  // Charger les ouvrages sélectionnés
  const { data: ouvrages } = await admin
    .from("project_ouvrages")
    .select("*")
    .in("id", ouvrageIds)
    .eq("company_id", profile.company_id);

  if (!ouvrages || ouvrages.length === 0) {
    return { error: "Aucun ouvrage sélectionné." };
  }

  // Charger le nom du projet
  let projectName = "Projet BatiFlow";
  if (projectId) {
    const { data: proj } = await admin.from("projects").select("name").eq("id", projectId).single();
    if (proj?.name) projectName = proj.name;
  }

  // Appel IA pour générer les lignes de devis
  const aiResult = await genererDevisDepuisMetres(
    (ouvrages as ProjectOuvrage[]).map((o) => ({
      designation: o.designation,
      type_geometrie: o.type_geometrie as Parameters<typeof genererDevisDepuisMetres>[0][0]["type_geometrie"],
      quantite_nette: o.quantite_nette,
      unite_principale: o.unite_principale,
      recette_calculee: (o.recette_calculee as ComposantRecetteCalcule[]).map((c) => ({
        materiau_nom: c.materiau_nom,
        unite: c.unite,
        quantite_commande: c.quantite_commande,
        type: c.type,
      })),
    })),
    projectName
  );

  if (aiResult.error || aiResult.items.length === 0) {
    return { error: aiResult.error ?? "L'IA n'a pas pu générer de devis." };
  }

  // Calculer les totaux
  const subtotal = aiResult.items.reduce((s, i) => s + i.total, 0);
  const tax_rate = 18; // TVA standard CI
  const tax_amount = subtotal * (tax_rate / 100);
  const total = subtotal + tax_amount;

  // Numéro de devis
  const { count } = await admin
    .from("quotes")
    .select("id", { count: "exact", head: true })
    .eq("company_id", profile.company_id);
  const year = new Date().getFullYear();
  const quote_number = `DEVIS-${year}-${String((count ?? 0) + 1).padStart(3, "0")}`;

  // Créer le devis
  const { data: quote, error: quoteError } = await admin
    .from("quotes")
    .insert({
      company_id: profile.company_id,
      quote_number,
      project_id: projectId || null,
      project_type: "Travaux BTP",
      subtotal,
      tax_rate,
      tax_amount,
      margin_pct: 0,
      total,
      notes: aiResult.notes,
      ai_generated: true,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (quoteError || !quote) {
    return { error: quoteError?.message ?? "Erreur création devis" };
  }

  // Insérer les lignes
  await admin.from("quote_items").insert(
    aiResult.items.map((item, i) => ({
      quote_id: quote.id,
      category: item.category,
      label: item.label,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
      total: item.total,
      sort_order: i,
    }))
  );

  redirect(`/quotes/${quote.id}`);
}
