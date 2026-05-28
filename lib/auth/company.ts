// Métadonnées de la company courante (currency, name, plan, …) mises en cache
// par requête. Évite les re-fetch quand layout + page + actions y accèdent.

import { cache } from "react";
import { getAuthedProfile } from "./profile";

export type CompanyMeta = {
  id: string;
  currency: string;
  name: string;
};

export const getCompanyMeta = cache(async (): Promise<CompanyMeta> => {
  const { companyId, supabase } = await getAuthedProfile();
  const { data } = await supabase
    .from("companies")
    .select("id, currency, name")
    .eq("id", companyId)
    .maybeSingle();

  // Fallback : si la company n'est pas lisible (RLS bug ou suppression),
  // on renvoie des valeurs neutres plutôt que de crasher le rendu.
  return {
    id: companyId,
    currency: (data?.currency as string | undefined) ?? "XOF",
    name: (data?.name as string | undefined) ?? "",
  };
});
