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
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-4">
        <div className="mx-auto h-12 w-12 rounded-full bg-red-50 flex items-center justify-center">
          <AlertTriangle className="h-6 w-6 text-red-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Une erreur est survenue</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Le problème a été enregistré. Vous pouvez réessayer ou revenir à l&apos;accueil.
          </p>
        </div>
        {error.digest && (
          <p className="text-xs text-muted-foreground font-mono">
            Référence : {error.digest}
          </p>
        )}
        <div className="flex gap-2 justify-center pt-2">
          <Button onClick={reset} variant="default" size="sm">
            <RotateCw className="h-3.5 w-3.5 mr-1.5" />
            Réessayer
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">
              <Home className="h-3.5 w-3.5 mr-1.5" />
              Tableau de bord
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
