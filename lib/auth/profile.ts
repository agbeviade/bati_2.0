// Helper unifié pour les Server Actions et pages dashboard.
// - Vérifie l'auth, redirige vers /login si non authentifié.
// - Charge le profil (company_id + role), redirige vers /onboarding si pas de company.
// - Mémoïsé par requête via React `cache()` — un seul appel DB même si invoqué
//   plusieurs fois dans la même Server Action / page.
//
// Remplace les ~10 copies de `getProfile()` éparpillées dans app/(dashboard)/*.

import { cache } from "react";
import { redirect } from "next/navigation";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/supabase/types";

export type AuthedProfile = {
  user: SupabaseUser;
  userId: string;
  companyId: string;
  role: UserRole;
  // Per-request Supabase client. Type left as ReturnType for tooling brevity.
  supabase: Awaited<ReturnType<typeof createClient>>;
};

/**
 * Récupère l'utilisateur authentifié + sa company.
 *
 * Redirige :
 * - `/login`      si pas de session
 * - `/onboarding` si l'utilisateur n'a pas encore créé/rejoint de company
 *
 * Le résultat est mémoïsé pour la durée de la requête.
 */
export const getAuthedProfile = cache(async (): Promise<AuthedProfile> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id) redirect("/onboarding");

  return {
    user,
    userId: user.id,
    companyId: profile.company_id,
    role: profile.role as UserRole,
    supabase,
  };
});
