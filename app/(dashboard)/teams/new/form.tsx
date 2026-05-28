"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { createTeam } from "@/app/(dashboard)/teams/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { User } from "@/lib/supabase/types";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  foreman: "Chef chantier",
};

export default function NewTeamForm({
  leads,
}: {
  leads: Pick<User, "id" | "full_name" | "role">[];
}) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const result = await createTeam(new FormData(e.currentTarget));
    setLoading(false);
    if (result?.error) toast.error(result.error);
  }

  return (
    <div className="max-w-lg space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/teams">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h2 className="text-2xl font-bold">Nouvelle équipe</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nom de l'équipe *</Label>
              <Input id="name" name="name" placeholder="Équipe maçonnerie A" required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lead_id">Chef d'équipe</Label>
              <select
                name="lead_id"
                id="lead_id"
                className="border-input bg-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
              >
                <option value="">Aucun</option>
                {leads.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name ?? "—"} ({ROLE_LABELS[u.role] ?? u.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Création..." : "Créer l'équipe"}
              </Button>
              <Button type="button" variant="ghost" asChild>
                <Link href="/teams">Annuler</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
