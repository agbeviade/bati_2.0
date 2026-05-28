"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthedProfile } from "@/lib/auth/profile";

export async function createClient_(formData: FormData) {
  const { supabase } = await getAuthedProfile();
  // Role check is enforced inside the RPC (throws if insufficient role)

  const email = (formData.get("email") as string)?.trim();
  const full_name = (formData.get("full_name") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim() || null;
  if (!email || !full_name) return { error: "Nom et email requis." };

  // Single source of truth: same RPC as mobile
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc("create_client", {
    p_email: email,
    p_full_name: full_name,
    p_phone: phone,
  });

  if (error) return { error: error.message };

  revalidatePath("/clients");
  redirect("/clients");
}

export async function updateClient(id: string, formData: FormData) {
  const { companyId } = await getAuthedProfile();
  const admin = createAdminClient();

  // admin needed to update another user's row; scoped to company
  await admin.from("users").update({
    full_name: (formData.get("full_name") as string)?.trim() || undefined,
    phone: (formData.get("phone") as string) || null,
    email: (formData.get("email") as string)?.trim() || undefined,
  }).eq("id", id).eq("company_id", companyId);

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
}

export async function toggleClientActive(id: string, is_active: boolean) {
  const { companyId } = await getAuthedProfile();
  // admin needed to update another user's row; scoped to company
  await createAdminClient().from("users").update({ is_active }).eq("id", id).eq("company_id", companyId);
  revalidatePath("/clients");
}
