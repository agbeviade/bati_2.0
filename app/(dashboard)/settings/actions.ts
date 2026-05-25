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

export async function uploadCompanyAsset(
  companyId: string,
  formData: FormData,
  type: "header" | "footer"
): Promise<{ url: string | null; error?: string }> {
  await getUser();

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { url: null, error: "Aucun fichier." };

  const MAX = 3 * 1024 * 1024;
  if (file.size > MAX) return { url: null, error: "Fichier trop lourd (max 3 Mo)." };

  const allowed = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
  if (!allowed.includes(file.type)) return { url: null, error: "Format non supporté (JPG, PNG, WebP, SVG)." };

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `${companyId}/${type}.${ext}`;

  const admin = createAdminClient();
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await admin.storage
    .from("company-assets")
    .upload(path, buffer, { upsert: true, contentType: file.type });

  if (uploadError) return { url: null, error: uploadError.message };

  const { data: { publicUrl } } = admin.storage.from("company-assets").getPublicUrl(path);

  const updateData = type === "header"
    ? { header_url: publicUrl }
    : { footer_url: publicUrl };
  const { error: dbError } = await admin.from("companies")
    .update(updateData)
    .eq("id", companyId);

  if (dbError) return { url: null, error: dbError.message };

  revalidatePath("/settings");
  return { url: publicUrl };
}

export async function removeCompanyAsset(
  companyId: string,
  type: "header" | "footer"
): Promise<{ error?: string }> {
  await getUser();
  const admin = createAdminClient();

  // On essaie les extensions courantes
  for (const ext of ["png", "jpg", "jpeg", "webp", "svg"]) {
    await admin.storage.from("company-assets").remove([`${companyId}/${type}.${ext}`]);
  }

  const clearData = type === "header" ? { header_url: null } : { footer_url: null };
  const { error } = await admin.from("companies")
    .update(clearData)
    .eq("id", companyId);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return {};
}
