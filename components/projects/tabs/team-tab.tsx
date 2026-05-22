"use client";

import { useTransition, useState } from "react";
import { UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { addTeamMember, removeTeamMember } from "@/app/(dashboard)/projects/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { User } from "@/lib/supabase/types";

type Assignment = {
  id: string;
  user_id: string;
  role_on_project: string | null;
  start_date: string | null;
  user: Pick<User, "full_name" | "role" | "avatar_url">;
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin", admin: "Admin", manager: "Manager",
  foreman: "Chef chantier", worker: "Ouvrier", client: "Client",
};

function initials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

export function TeamTab({ projectId, assignments, availableUsers }: {
  projectId: string;
  assignments: Assignment[];
  availableUsers: Pick<User, "id" | "full_name" | "role">[];
}) {
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    startTransition(async () => {
      const result = await addTeamMember(projectId, new FormData(form));
      if (result?.error) { toast.error(result.error); return; }
      form.reset();
      setShowForm(false);
      toast.success("Membre ajouté.");
    });
  }

  function handleRemove(assignmentId: string) {
    startTransition(async () => {
      await removeTeamMember(assignmentId, projectId);
      toast.success("Membre retiré.");
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Équipe</CardTitle>
            <p className="text-sm text-muted-foreground">{assignments.length} membre{assignments.length > 1 ? "s" : ""} assigné{assignments.length > 1 ? "s" : ""}</p>
          </div>
          {availableUsers.length > 0 && (
            <Button size="sm" onClick={() => setShowForm(v => !v)}>
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              Ajouter
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Formulaire ajout */}
        {showForm && (
          <form onSubmit={handleAdd} className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="user_id">Membre *</Label>
                <select name="user_id" id="user_id" required
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="">Sélectionner...</option>
                  {availableUsers.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.full_name ?? "—"} ({ROLE_LABELS[u.role] ?? u.role})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role_on_project">Rôle sur le chantier</Label>
                <Input id="role_on_project" name="role_on_project" placeholder="Maçon, électricien..." />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isPending}>Ajouter</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>Annuler</Button>
            </div>
          </form>
        )}

        {/* Liste membres */}
        {assignments.length === 0 && !showForm ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Aucun membre assigné à ce chantier.</p>
        ) : (
          <ul className="space-y-1">
            {assignments.map((a, i) => (
              <li key={a.id}>
                <div className="flex items-center gap-3 py-2">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="text-xs">{initials(a.user.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{a.user.full_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.role_on_project ?? ROLE_LABELS[a.user.role] ?? a.user.role}
                    </p>
                  </div>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive"
                    disabled={isPending}
                    onClick={() => handleRemove(a.id)}
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {i < assignments.length - 1 && <Separator />}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
