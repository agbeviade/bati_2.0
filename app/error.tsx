"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Le logger côté serveur capture déjà — ici on remonte au client.
    if (typeof window !== "undefined") {
      console.error("[client error]", error);
    }
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <AlertTriangle className="h-6 w-6 text-red-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Une erreur est survenue</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Le problème a été enregistré. Vous pouvez réessayer ou revenir à l&apos;accueil.
          </p>
        </div>
        {error.digest && (
          <p className="text-muted-foreground font-mono text-xs">Référence : {error.digest}</p>
        )}
        <div className="flex justify-center gap-2 pt-2">
          <Button onClick={reset} variant="default" size="sm">
            <RotateCw className="mr-1.5 h-3.5 w-3.5" />
            Réessayer
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">
              <Home className="mr-1.5 h-3.5 w-3.5" />
              Tableau de bord
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
