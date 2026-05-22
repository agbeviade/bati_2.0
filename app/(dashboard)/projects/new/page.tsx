"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { createProject } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NewProjectPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const name = (form.elements.namedItem("name") as HTMLInputElement)?.value;

    if (!name || name.trim().length < 2) {
      toast.error("Le nom du chantier est requis.");
      return;
    }

    setLoading(true);
    const result = await createProject(new FormData(form));
    setLoading(false);

    if (result?.error) {
      toast.error(result.error);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/projects">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Nouveau chantier</h2>
          <p className="text-muted-foreground text-sm">
            Renseignez les informations de base. Vous pourrez tout modifier ensuite.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations du chantier</CardTitle>
          <CardDescription>
            Seul le nom est obligatoire.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du chantier *</Label>
              <Input
                id="name"
                name="name"
                placeholder="Construction villa Cocody"
                required
                minLength={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                placeholder="Détails du chantier, nature des travaux..."
                rows={3}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Adresse du chantier</Label>
              <Input
                id="address"
                name="address"
                placeholder="Abidjan, Cocody Riviera 3"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budget">Budget (optionnel)</Label>
                <Input
                  id="budget"
                  name="budget"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="5 000 000"
                />
              </div>
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <p className="text-xs text-muted-foreground pt-2">
                  Montant dans la devise de votre entreprise.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Date de début</Label>
                <Input id="start_date" name="start_date" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Date de fin prévue</Label>
                <Input id="end_date" name="end_date" type="date" />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? "Création..." : "Créer le chantier"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Annuler
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
