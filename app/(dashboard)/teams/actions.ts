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

// ── Teams ────────────────────────────────────────────────────

export async function createTeam(formData: FormData) {
  const user = await getUser();
  const admin = createAdminClient();

  const { data: profile } = await admin.from("users").select("company_id").eq("id", user.id).single();
  if (!profile?.company_id) redirect("/onboarding");

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Le nom de l'équipe est requis." };

  const lead_id = (formData.get("lead_id") as string) || null;

  const { data: team, error } = await admin.from("teams")
    .insert({ company_id: profile.company_id, name, lead_id })
    .select("id").single();

  if (error || !team) { console.error("[createTeam]", error); return { error: error?.message }; }

  revalidatePath("/teams");
  redirect(`/teams/${team.id}`);
}

export async function updateTeam(id: string, formData: FormData) {
  await getUser();
  const name = (formData.get("name") as string)?.trim();
  const lead_id = (formData.get("lead_id") as string) || null;

  const { error } = await createAdminClient().from("teams").update({ name, lead_id }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/teams/${id}`);
  revalidatePath("/teams");
}

export async function deleteTeam(id: string) {
  await getUser();
  await createAdminClient().from("teams").delete().eq("id", id);
  revalidatePath("/teams");
  redirect("/teams");
}

// ── Team Members ─────────────────────────────────────────────

export async function addMemberToTeam(teamId: string, userId: string) {
  await getUser();
  const { error } = await createAdminClient().from("team_members").insert({ team_id: teamId, user_id: userId });
  if (error) {
    if (error.code === "23505") return { error: "Ce membre est déjà dans l'équipe." };
    return { error: error.message };
  }
  revalidatePath(`/teams/${teamId}`);
}

export async function removeMemberFromTeam(teamId: string, userId: string) {
  await getUser();
  await createAdminClient().from("team_members")
    .delete().eq("team_id", teamId).eq("user_id", userId);
  revalidatePath(`/teams/${teamId}`);
}

// ── Attendance ───────────────────────────────────────────────

export async function checkIn(userId: string, projectId: string | null, geoLat: number | null, geoLng: number | null, teamId: string) {
  await getUser();

  // Vérifie qu'il n'y a pas déjà un pointage ouvert
  const admin = createAdminClient();
  const { data: open } = await admin
    .from("attendance")
    .select("id")
    .eq("user_id", userId)
    .is("check_out", null)
    .maybeSingle();

  if (open) return { error: "Ce membre a déjà un pointage en cours." };

  const { error } = await admin.from("attendance").insert({
    user_id: userId,
    project_id: projectId || null,
    check_in: new Date().toISOString(),
    geo_lat_in: geoLat,
    geo_lng_in: geoLng,
  });

  if (error) return { error: error.message };
  revalidatePath(`/teams/${teamId}`);
}

export async function checkOut(attendanceId: string, geoLat: number | null, geoLng: number | null, teamId: string) {
  await getUser();

  const { error } = await createAdminClient().from("attendance").update({
    check_out: new Date().toISOString(),
    geo_lat_out: geoLat,
    geo_lng_out: geoLng,
  }).eq("id", attendanceId);

  if (error) return { error: error.message };
  revalidatePath(`/teams/${teamId}`);
}
