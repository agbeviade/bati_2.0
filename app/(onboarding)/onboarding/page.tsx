"use client";

import { useRef, useState } from "react";
import { Building2 } from "lucide-react";
import { toast } from "sonner";
import { createCompany } from "./actions";
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

const CURRENCIES = [
  { value: "XOF", label: "XOF — Franc CFA (UEMOA)" },
  { value: "XAF", label: "XAF — Franc CFA (CEMAC)" },
  { value: "MAD", label: "MAD — Dirham marocain" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "USD", label: "USD — Dollar américain" },
  { value: "GHS", label: "GHS — Cedi ghanéen" },
  { value: "NGN", label: "NGN — Naira nigérian" },
];

export default function OnboardingPage() {
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const name = (form.elements.namedItem("name") as HTMLInputElement)?.value;

    if (!name || name.trim().length < 2) {
      toast.error("Le nom de l'entreprise est requis.");
      return;
    }

    setLoading(true);
    const data = new FormData(form);
    const result = await createCompany(data);
    setLoading(false);

    if (result?.error) {
      toast.error(result.error);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="mb-2 flex items-center gap-3">
          <div className="bg-primary/10 rounded-lg p-2">
            <Building2 className="text-primary h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">Créez votre entreprise</CardTitle>
        </div>
        <CardDescription>Ces informations apparaîtront sur vos devis et factures.</CardDescription>
      </CardHeader>

      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-6">
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom de l&apos;entreprise *</Label>
            <Input id="name" name="name" placeholder="BTP Kouassi & Fils" required minLength={2} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" name="phone" type="tel" placeholder="+225 07 00 00 00 00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email professionnel</Label>
              <Input id="email" name="email" type="email" placeholder="contact@entreprise.com" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Input id="address" name="address" placeholder="Abidjan, Cocody" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Devise</Label>
            <select
              id="currency"
              name="currency"
              defaultValue="XOF"
              className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Création en cours..." : "Créer mon entreprise"}
          </Button>
          <p className="text-muted-foreground text-center text-xs">
            Vous pourrez modifier ces informations dans les Paramètres.
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
