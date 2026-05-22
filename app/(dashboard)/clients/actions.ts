"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

export async function createClient_(formData: FormData) {
  const user = await getAuthenticatedUser();
  const admin = createAdminClient();
  const { data: profile } = await admin.from("users").select("company_id").eq("id", user.id).single();
  if (!profile?.company_id) redirect("/onboarding");

  const email = (formData.get("email") as string)?.trim();
  const full_name = (formData.get("full_name") as string)?.trim();
  if (!email || !full_name) return { error: "Nom et email requis." };

  // Créer le compte auth Supabase
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password: Math.random().toString(36).slice(-10),
    email_confirm: true,
    user_metadata: { full_name },
  });
  if (authError || !authData.user) return { error: authError?.message ?? "Impossible de créer le compte." };

  // Insérer dans users avec role client
  await admin.from("users").insert({
    id: authData.user.id,
    company_id: profile.company_id,
    role: "client",
    full_name,
    phone: (formData.get("phone") as string) || null,
    email,
    is_active: true,
  });

  revalidatePath("/clients");
  redirect("/clients");
}

export async function updateClient(id: string, formData: FormData) {
  await getAuthenticatedUser();
  const admin = createAdminClient();

  await admin.from("users").update({
    full_name: (formData.get("full_name") as string)?.trim() || undefined,
    phone: (formData.get("phone") as string) || null,
    email: (formData.get("email") as string)?.trim() || undefined,
  }).eq("id", id);

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
}

export async function toggleClientActive(id: string, is_active: boolean) {
  await getAuthenticatedUser();
  await createAdminClient().from("users").update({ is_active }).eq("id", id);
  revalidatePath("/clients");
}
