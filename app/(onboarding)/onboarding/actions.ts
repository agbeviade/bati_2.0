"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export async function createCompany(formData: FormData) {
  // Vérification auth via le client utilisateur
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const name = (formData.get("name") as string)?.trim();
  const phone = (formData.get("phone") as string) || null;
  const address = (formData.get("address") as string) || null;
  const email = (formData.get("email") as string) || null;
  const currency = (formData.get("currency") as string) || "XOF";

  if (!name || name.length < 2) {
    return { error: "Le nom de l'entreprise est requis (2 caractères minimum)." };
  }

  // Opérations DB via admin client (service role, bypass RLS — identité vérifiée ci-dessus)
  const admin = createAdminClient();

  const { data: company, error: companyError } = await admin
    .from("companies")
    .insert({
      name,
      phone,
      address,
      email,
      currency,
    })
    .select("id")
    .single();

  if (companyError || !company) {
    logger.error("onboarding company insert failed", companyError, { userId: user.id });
    return {
      error: `Impossible de créer l'entreprise. (${companyError?.message ?? "erreur inconnue"})`,
    };
  }

  const { error: userError } = await admin
    .from("users")
    .update({ company_id: company.id, role: "admin" })
    .eq("id", user.id);

  if (userError) {
    logger.error("onboarding user update failed", userError, {
      userId: user.id,
      companyId: company.id,
    });
    return { error: `Impossible de mettre à jour votre profil. (${userError.message})` };
  }

  redirect("/dashboard");
}
