"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { QuoteTemplate } from "@/lib/supabase/types";

async function getProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("users").select("company_id").eq("id", user.id).single();
  if (!profile?.company_id) redirect("/onboarding");
  return { userId: user.id, companyId: profile.company_id as string, supabase };
}

const BUCKET = "quote-templates";
const MAX_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export async function uploadTemplate(formData: FormData): Promise<{ error?: string }> {
  const { companyId } = await getProfile();

  const name = (formData.get("name") as string)?.trim();
  const category = (formData.get("category") as string) || "autre";
  const description = (formData.get("description") as string)?.trim() || null;
  const file = formData.get("file") as File | null;

  if (!name) return { error: "Le nom est requis." };
  if (!file || file.size === 0) return { error: "Aucun fichier." };
  if (file.size > MAX_SIZE) return { error: "Fichier trop lourd (max 20 Mo)." };
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Format non supporté. Utilisez PDF, JPG, PNG ou WebP." };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
  const fileType = file.type === "application/pdf" ? "pdf" : "image";
  const storagePath = `${companyId}/${Date.now()}-${name.replace(/[^a-z0-9]/gi, "_")}.${ext}`;

  const admin = createAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType: file.type, upsert: false });

  if (uploadError) return { error: uploadError.message };

  const { error: dbError } = await admin.from("quote_templates").insert({
    company_id: companyId,
    name,
    category,
    description,
    storage_path: storagePath,
    file_type: fileType,
    mime_type: file.type,
  });

  if (dbError) {
    await admin.storage.from(BUCKET).remove([storagePath]);
    return { error: dbError.message };
  }

  revalidatePath("/quotes/templates");
  return {};
}

export async function listTemplates(): Promise<QuoteTemplate[]> {
  const { supabase } = await getProfile();
  const { data } = await supabase
    .from("quote_templates")
    .select("*")
    .order("category")
    .order("name");
  return data ?? [];
}

export async function deleteTemplate(id: string): Promise<{ error?: string }> {
  const { supabase } = await getProfile();
  const admin = createAdminClient();

  const { data } = await supabase
    .from("quote_templates").select("storage_path").eq("id", id).single();

  if (data?.storage_path) {
    await admin.storage.from(BUCKET).remove([data.storage_path]);
  }

  const { error } = await supabase.from("quote_templates").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/quotes/templates");
  return {};
}

export async function getTemplatePublicUrl(storagePath: string): Promise<string> {
  const admin = createAdminClient();
  const { data } = admin.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function getTemplateAsBase64(
  id: string
): Promise<{ base64: string; mimeType: string; fileType: string; error?: string }> {
  const { supabase } = await getProfile();
  const admin = createAdminClient();

  const { data: tmpl } = await supabase
    .from("quote_templates")
    .select("storage_path, mime_type, file_type")
    .eq("id", id)
    .single();

  if (!tmpl?.storage_path) return { base64: "", mimeType: "", fileType: "", error: "Template introuvable." };

  const { data: fileData, error } = await admin.storage
    .from(BUCKET)
    .download(tmpl.storage_path);

  if (error || !fileData) return { base64: "", mimeType: "", fileType: "", error: error?.message ?? "Téléchargement échoué." };

  const buffer = Buffer.from(await fileData.arrayBuffer());
  return {
    base64: buffer.toString("base64"),
    mimeType: tmpl.mime_type ?? "application/pdf",
    fileType: tmpl.file_type ?? "pdf",
  };
}
