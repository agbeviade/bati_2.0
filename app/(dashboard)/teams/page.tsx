import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { TeamsList } from "@/components/teams/teams-list";
import type { Team, User } from "@/lib/supabase/types";

export default async function TeamsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("company_id").eq("id", user.id).single();
  if (!profile?.company_id) redirect("/onboarding");

  const { data: teamsData } = await supabase
    .from("teams")
    .select("id, name, lead_id, created_at")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  const teams = (teamsData ?? []) as Pick<Team, "id" | "name" | "lead_id" | "created_at">[];

  const teamIds = teams.map(t => t.id);
  const memberCounts: Record<string, number> = {};
  const leadNames: Record<string, string | null> = {};

  if (teamIds.length > 0) {
    const { data: members } = await supabase
      .from("team_members")
      .select("team_id")
      .in("team_id", teamIds);

    for (const m of members ?? []) {
      memberCounts[m.team_id] = (memberCounts[m.team_id] ?? 0) + 1;
    }

    const leadIds = teams.map(t => t.lead_id).filter(Boolean) as string[];
    if (leadIds.length > 0) {
      const { data: leads } = await supabase
        .from("users")
        .select("id, full_name")
        .in("id", leadIds);
      for (const l of (leads ?? []) as Pick<User, "id" | "full_name">[]) {
        leadNames[l.id] = l.full_name;
      }
    }
  }

  const teamRows = teams.map(t => ({
    id: t.id,
    name: t.name,
    memberCount: memberCounts[t.id] ?? 0,
    leadName: t.lead_id ? (leadNames[t.lead_id] ?? null) : null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Équipes</h2>
          <p className="text-muted-foreground">
            {teams.length === 0
              ? "Aucune équipe pour l'instant."
              : `${teams.length} équipe${teams.length > 1 ? "s" : ""}`}
          </p>
        </div>
        <Button asChild className="self-start sm:self-auto">
          <Link href="/teams/new">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle équipe
          </Link>
        </Button>
      </div>

      <TeamsList teams={teamRows} />
    </div>
  );
}
