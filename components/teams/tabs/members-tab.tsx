"use client";

import { useTransition, useState } from "react";
import { UserMinus, UserPlus, Crown } from "lucide-react";
import { toast } from "sonner";
import { addMemberToTeam, removeMemberFromTeam } from "@/app/(dashboard)/teams/actions";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type { User } from "@/lib/supabase/types";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  manager: "Manager",
  foreman: "Chef chantier",
  worker: "Ouvrier",
  client: "Client",
};

function initials(name: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

type Member = {
  user_id: string;
  user: Pick<User, "full_name" | "role" | "avatar_url">;
};

export function MembersTab({
  teamId,
  leadId,
  members,
  availableUsers,
}: {
  teamId: string;
  leadId: string | null;
  members: Member[];
  availableUsers: Pick<User, "id" | "full_name" | "role">[];
}) {
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const userId = fd.get("user_id") as string;
    if (!userId) return;
    const form = e.currentTarget;
    startTransition(async () => {
      const result = await addMemberToTeam(teamId, userId);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      form.reset();
      setShowForm(false);
      toast.success("Membre ajouté.");
    });
  }

  function handleRemove(userId: string) {
    startTransition(async () => {
      await removeMemberFromTeam(teamId, userId);
      toast.success("Membre retiré.");
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Membres</CardTitle>
            <p className="text-muted-foreground text-sm">
              {members.length} membre{members.length > 1 ? "s" : ""}
            </p>
          </div>
          {availableUsers.length > 0 && (
            <Button size="sm" onClick={() => setShowForm((v) => !v)}>
              <UserPlus className="mr-1.5 h-3.5 w-3.5" />
              Ajouter
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <form onSubmit={handleAdd} className="bg-muted/30 space-y-3 rounded-lg border p-4">
            <div className="space-y-1.5">
              <label htmlFor="user_id" className="text-sm font-medium">
                Membre *
              </label>
              <select
                name="user_id"
                id="user_id"
                required
                className="border-input bg-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
              >
                <option value="">Sélectionner...</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name ?? "—"} ({ROLE_LABELS[u.role] ?? u.role})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isPending}>
                Ajouter
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                Annuler
              </Button>
            </div>
          </form>
        )}

        {members.length === 0 && !showForm ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            Aucun membre dans cette équipe.
          </p>
        ) : (
          <ul className="space-y-1">
            {members.map((m, i) => (
              <li key={m.user_id}>
                <div className="flex items-center gap-3 py-2">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="text-xs">
                      {initials(m.user.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{m.user.full_name ?? "—"}</p>
                      {m.user_id === leadId && (
                        <Badge variant="secondary" className="px-1.5 py-0 text-xs">
                          <Crown className="mr-1 h-2.5 w-2.5" />
                          Chef
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {ROLE_LABELS[m.user.role] ?? m.user.role}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive h-7 w-7 flex-shrink-0"
                    disabled={isPending}
                    onClick={() => handleRemove(m.user_id)}
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {i < members.length - 1 && <Separator />}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
