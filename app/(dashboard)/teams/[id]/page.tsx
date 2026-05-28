import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { TeamTabs } from "@/components/teams/team-tabs";
import { MembersTab } from "@/components/teams/tabs/members-tab";
import { AttendanceTab } from "@/components/teams/tabs/attendance-tab";
import type { Team, User, Attendance } from "@/lib/supabase/types";

type Tab = "members" | "attendance";

export default async function TeamDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab = "members" } = (await searchParams) as { tab?: Tab };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: teamData } = await supabase.from("teams").select("*").eq("id", id).maybeSingle();
  if (!teamData) notFound();
  const team = teamData as Team;

  // Always load members (needed for both tabs)
  const { data: membersData } = await supabase
    .from("team_members")
    .select("user_id")
    .eq("team_id", id);

  const memberIds = (membersData ?? []).map(m => m.user_id);

  type MemberUser = Pick<User, "id" | "full_name" | "role" | "avatar_url">;
  let memberUsers: MemberUser[] = [];
  if (memberIds.length > 0) {
    const { data } = await supabase
      .from("users")
      .select("id, full_name, role, avatar_url")
      .in("id", memberIds);
    memberUsers = (data ?? []) as MemberUser[];
  }

  const memberUserMap = Object.fromEntries(memberUsers.map(u => [u.id, u]));

  const members = memberIds.map(uid => ({
    user_id: uid,
    user: memberUserMap[uid] ?? { full_name: null, role: "worker" as const, avatar_url: null },
    openAttendance: null as Pick<Attendance, "id" | "check_in" | "project_id"> | null,
  }));

  if (tab === "members") {
    const { data: companyUsers } = await supabase
      .from("users")
      .select("id, full_name, role")
      .eq("company_id", team.company_id)
      .eq("is_active", true);

    const availableUsers = ((companyUsers ?? []) as Pick<User, "id" | "full_name" | "role">[])
      .filter(u => !memberIds.includes(u.id));

    return (
      <PageShell team={team}>
        <MembersTab
          teamId={id}
          leadId={team.lead_id}
          members={members}
          availableUsers={availableUsers}
        />
      </PageShell>
    );
  }

  // attendance tab
  if (memberIds.length > 0) {
    const { data: openData } = await supabase
      .from("attendance")
      .select("id, user_id, check_in, project_id")
      .in("user_id", memberIds)
      .is("check_out", null);

    for (const entry of (openData ?? []) as (Pick<Attendance, "id" | "user_id" | "check_in" | "project_id">)[]) {
      const m = members.find(m => m.user_id === entry.user_id);
      if (m) m.openAttendance = { id: entry.id, check_in: entry.check_in, project_id: entry.project_id };
    }
  }

  const { data: projectsData } = await supabase
    .from("projects")
    .select("id, name")
    .eq("company_id", team.company_id)
    .eq("status", "in_progress");

  const projects = (projectsData ?? []) as { id: string; name: string }[];

  const { data: historyData } = await supabase
    .from("attendance")
    .select("id, user_id, check_in, check_out, hours_worked, project_id")
    .in("user_id", memberIds.length > 0 ? memberIds : ["00000000-0000-0000-0000-000000000000"])
    .order("check_in", { ascending: false })
    .limit(30);

  const history = ((historyData ?? []) as Pick<Attendance, "id" | "user_id" | "check_in" | "check_out" | "hours_worked" | "project_id">[])
    .map(h => ({
      ...h,
      user: memberUserMap[h.user_id] ? { full_name: memberUserMap[h.user_id].full_name } : null,
    }));

  return (
    <PageShell team={team}>
      <AttendanceTab
        teamId={id}
        members={members}
        projects={projects}
        history={history}
      />
    </PageShell>
  );
}

function PageShell({ team, children }: { team: Team; children: React.ReactNode }) {
  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="mt-0.5">
          <Link href="/teams"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold truncate">{team.name}</h2>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/teams/${team.id}/edit`}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Modifier
          </Link>
        </Button>
      </div>

      <Suspense>
        <TeamTabs teamId={team.id} />
      </Suspense>

      {children}
    </div>
  );
}
