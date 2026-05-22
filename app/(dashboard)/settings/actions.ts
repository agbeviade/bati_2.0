"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

export async function updateProfile(formData: FormData) {
  const user = await getUser();

  const full_name = (formData.get("full_name") as string)?.trim() || null;
  const phone = (formData.get("phone") as string)?.trim() || null;
  const specialty = (formData.get("specialty") as string)?.trim() || null;
  const daily_rate = formData.get("daily_rate") ? Number(formData.get("daily_rate")) : null;

  const { error } = await createAdminClient().from("users").update({
    full_name,
    phone,
    specialty,
    daily_rate,
  }).eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function updatePassword(formData: FormData) {
  const password = (formData.get("password") as string)?.trim();
  const confirm = (formData.get("confirm") as string)?.trim();

  if (!password || password.length < 6) return { error: "Le mot de passe doit contenir au moins 6 caractères." };
  if (password !== confirm) return { error: "Les mots de passe ne correspondent pas." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
}

export async function updateCompany(companyId: string, formData: FormData) {
  await getUser();

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Le nom est requis." };

  const { error } = await createAdminClient().from("companies").update({
    name,
    address: (formData.get("address") as string)?.trim() || null,
    phone: (formData.get("phone") as string)?.trim() || null,
    email: (formData.get("email") as string)?.trim() || null,
    currency: (formData.get("currency") as string) || "XOF",
  }).eq("id", companyId);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}
