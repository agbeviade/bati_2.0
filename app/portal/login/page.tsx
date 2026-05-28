"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Construction } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PortalLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Email ou mot de passe incorrect.");
      return;
    }
    router.push("/portal/quotes");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 shadow-md">
            <Construction className="h-6 w-6 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold">BatiFlow</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Portail client — accès à vos devis et factures
            </p>
          </div>
        </div>

        {/* Formulaire */}
        <div className="space-y-4 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Connexion</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="vous@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Connexion..." : "Se connecter"}
            </Button>
          </form>
        </div>

        <p className="text-muted-foreground text-center text-xs">
          Vous avez un compte entreprise ?{" "}
          <a href="/login" className="hover:text-foreground underline">
            Connexion espace BTP
          </a>
        </p>
      </div>
    </div>
  );
}
