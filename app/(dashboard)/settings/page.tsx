import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm, CompanyForm } from "@/components/settings/settings-form";
import { CompanyAssetsForm } from "@/components/settings/company-assets-form";
import type { User, Company } from "@/lib/supabase/types";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("users")
    .select("full_name, phone, specialty, daily_rate, company_id")
    .eq("id", user.id)
    .single();

  const profile = profileData as Pick<User, "full_name" | "phone" | "specialty" | "daily_rate"> & { company_id: string };
  if (!profile?.company_id) redirect("/onboarding");

  const { data: companyData } = await supabase
    .from("companies")
    .select("id, name, address, phone, email, currency, plan, subscription_status, header_url, footer_url")
    .eq("id", profile.company_id)
    .single();

  if (!companyData) redirect("/onboarding");
  const company = companyData as Pick<Company, "id" | "name" | "address" | "phone" | "email" | "currency" | "plan" | "subscription_status" | "header_url" | "footer_url">;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold">Paramètres</h2>
        <p className="text-muted-foreground">Gérez votre profil et les informations de votre entreprise.</p>
      </div>

      <ProfileForm profile={profile} />
      <CompanyForm company={company} />
      <CompanyAssetsForm
        companyId={company.id}
        headerUrl={company.header_url}
        footerUrl={company.footer_url}
      />
    </div>
  );
}
