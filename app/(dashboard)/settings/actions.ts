"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthedProfile } from "@/lib/auth/profile";

export async function updateProfile(formData: FormData) {
  const { user, supabase } = await getAuthedProfile();

  const { error } = await supabase.from("users").update({
    full_name: (formData.get("full_name") as string)?.trim() || null,
    phone: (formData.get("phone") as string)?.trim() || null,
    specialty: (formData.get("specialty") as string)?.trim() || null,
    daily_rate: formData.get("daily_rate") ? Number(formData.get("daily_rate")) : null,
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

export async function updateCompany(formData: FormData) {
  // companyId derived server-side — never trusted from client
  const { companyId, supabase } = await getAuthedProfile();

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Le nom est requis." };

  const { error } = await supabase.from("companies").update({
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
  formData: FormData,
  type: "header" | "footer"
): Promise<{ url: string | null; error?: string }> {
  // companyId derived server-side — never trusted from client
  const { companyId } = await getAuthedProfile();

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { url: null, error: "Aucun fichier." };

  const MAX = 3 * 1024 * 1024;
  if (file.size > MAX) return { url: null, error: "Fichier trop lourd (max 3 Mo)." };

  const allowed = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
  if (!allowed.includes(file.type)) return { url: null, error: "Format non supporté (JPG, PNG, WebP, SVG)." };

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `${companyId}/${type}.${ext}`;

  const supabase = await createClient();
  const admin = createAdminClient(); // storage upload requires admin (bucket policies)
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await admin.storage
    .from("company-assets")
    .upload(path, buffer, { upsert: true, contentType: file.type });

  if (uploadError) return { url: null, error: uploadError.message };

  const { data: { publicUrl } } = admin.storage.from("company-assets").getPublicUrl(path);

  const updateData = type === "header" ? { header_url: publicUrl } : { footer_url: publicUrl };
  const { error: dbError } = await supabase.from("companies")
    .update(updateData)
    .eq("id", companyId);

  if (dbError) return { url: null, error: dbError.message };

  revalidatePath("/settings");
  return { url: publicUrl };
}

export async function removeCompanyAsset(
  type: "header" | "footer"
): Promise<{ error?: string }> {
  const { companyId, supabase } = await getAuthedProfile();
  const admin = createAdminClient(); // storage remove requires admin

  for (const ext of ["png", "jpg", "jpeg", "webp", "svg"]) {
    await admin.storage.from("company-assets").remove([`${companyId}/${type}.${ext}`]);
  }

  const clearData = type === "header" ? { header_url: null } : { footer_url: null };
  const { error } = await supabase.from("companies").update(clearData).eq("id", companyId);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  return {};
}
