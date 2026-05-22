"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { createClient_ } from "../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewClientPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const result = await createClient_(new FormData(e.currentTarget));
    setLoading(false);
    if (result?.error) toast.error(result.error);
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/clients"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold">Nouveau client</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>Informations du client</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Nom complet *</Label>
              <Input id="full_name" name="full_name" placeholder="Jean Dupont" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" name="email" type="email" placeholder="jean@example.com" required />
              <p className="text-xs text-muted-foreground">Le client recevra un lien pour accéder à son portail</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" name="phone" type="tel" placeholder="+225 07 00 00 00 00" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Création..." : "Créer le client"}
              </Button>
              <Button variant="outline" asChild><Link href="/clients">Annuler</Link></Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
