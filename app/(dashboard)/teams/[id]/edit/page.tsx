import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateTeam, deleteTeam } from "@/app/(dashboard)/teams/actions";
import { DeleteButton } from "@/components/ui/delete-button";
import type { Team, User } from "@/lib/supabase/types";

export default async function EditTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: teamData } = await supabase.from("teams").select("*").eq("id", id).maybeSingle();
  if (!teamData) notFound();
  const team = teamData as Team;

  const { data: usersData } = await supabase
    .from("users")
    .select("id, full_name, role")
    .eq("company_id", team.company_id)
    .eq("is_active", true)
    .in("role", ["admin", "manager", "foreman"]);

  const potentialLeads = (usersData ?? []) as Pick<User, "id" | "full_name" | "role">[];

  const ROLE_LABELS: Record<string, string> = {
    admin: "Admin", manager: "Manager", foreman: "Chef chantier",
  };

  const updateTeamWithId = updateTeam.bind(null, id);
  const deleteTeamWithId = deleteTeam.bind(null, id);

  return (
    <div className="space-y-4 max-w-lg">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/teams/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h2 className="text-2xl font-bold">Modifier l'équipe</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateTeamWithId as unknown as (f: FormData) => void} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nom de l'équipe *</Label>
              <Input id="name" name="name" defaultValue={team.name} required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lead_id">Chef d'équipe</Label>
              <select
                name="lead_id"
                id="lead_id"
                defaultValue={team.lead_id ?? ""}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Aucun</option>
                {potentialLeads.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.full_name ?? "—"} ({ROLE_LABELS[u.role] ?? u.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit">Enregistrer</Button>
              <Button type="button" variant="ghost" asChild>
                <Link href={`/teams/${id}`}>Annuler</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Zone dangereuse</CardTitle>
        </CardHeader>
        <CardContent>
          <DeleteButton
            onConfirm={deleteTeamWithId}
            title="Supprimer cette équipe"
            description="Cette action est irréversible. Les membres seront dissociés de l'équipe."
          />
        </CardContent>
      </Card>
    </div>
  );
}
