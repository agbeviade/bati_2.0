"use server";

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

  const { data: profile } = await supabase.from("users").select("company_id").eq("id", user.id).single();
  if (!profile?.company_id) redirect("/onboarding");

  // Charger les ouvrages sélectionnés
  const { data: ouvrages } = await supabase
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
    const { data: proj } = await supabase.from("projects").select("name").eq("id", projectId).single();
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

  // Numéro de devis — RPC atomique
  const { data: quote_number, error: numErr } = await supabase.rpc("next_document_number", {
    p_kind: "quote",
  });
  if (numErr || !quote_number) {
    return { error: "Impossible de générer le numéro de devis." };
  }

  // Créer le devis
  const { data: quote, error: quoteError } = await supabase
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
  await supabase.from("quote_items").insert(
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
