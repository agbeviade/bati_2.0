"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function getProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("users").select("company_id").eq("id", user.id).single();
  if (!profile?.company_id) redirect("/onboarding");
  return { user, companyId: profile.company_id as string, supabase };
}

// ── Teams ────────────────────────────────────────────────────

export async function createTeam(formData: FormData) {
  const { companyId, supabase } = await getProfile();

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Le nom de l'équipe est requis." };
  const lead_id = (formData.get("lead_id") as string) || null;

  const { data: team, error } = await supabase.from("teams")
    .insert({ company_id: companyId, name, lead_id })
    .select("id").single();

  if (error || !team) { console.error("[createTeam]", error); return { error: error?.message }; }

  revalidatePath("/teams");
  redirect(`/teams/${team.id}`);
}

export async function updateTeam(id: string, formData: FormData) {
  const { supabase } = await getProfile();
  const name = (formData.get("name") as string)?.trim();
  const lead_id = (formData.get("lead_id") as string) || null;
  const { error } = await supabase.from("teams").update({ name, lead_id }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/teams/${id}`);
  revalidatePath("/teams");
}

export async function deleteTeam(id: string) {
  const { supabase } = await getProfile();
  await supabase.from("teams").delete().eq("id", id);
  revalidatePath("/teams");
  redirect("/teams");
}

// ── Team Members ─────────────────────────────────────────────

export async function addMemberToTeam(teamId: string, userId: string) {
  const { supabase } = await getProfile();
  const { error } = await supabase.from("team_members").insert({ team_id: teamId, user_id: userId });
  if (error) {
    if (error.code === "23505") return { error: "Ce membre est déjà dans l'équipe." };
    return { error: error.message };
  }
  revalidatePath(`/teams/${teamId}`);
}

export async function removeMemberFromTeam(teamId: string, userId: string) {
  const { supabase } = await getProfile();
  await supabase.from("team_members").delete().eq("team_id", teamId).eq("user_id", userId);
  revalidatePath(`/teams/${teamId}`);
}

// ── Attendance ───────────────────────────────────────────────

export async function checkIn(userId: string, projectId: string | null, geoLat: number | null, geoLng: number | null, teamId: string) {
  const { supabase } = await getProfile();

  const { data: open } = await supabase
    .from("attendance")
    .select("id")
    .eq("user_id", userId)
    .is("check_out", null)
    .maybeSingle();

  if (open) return { error: "Ce membre a déjà un pointage en cours." };

  const { error } = await supabase.from("attendance").insert({
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
  const { supabase } = await getProfile();
  const { error } = await supabase.from("attendance").update({
    check_out: new Date().toISOString(),
    geo_lat_out: geoLat,
    geo_lng_out: geoLng,
  }).eq("id", attendanceId);
  if (error) return { error: error.message };
  revalidatePath(`/teams/${teamId}`);
}
