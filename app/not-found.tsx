import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-4">
        <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
          <FileQuestion className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Page introuvable</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cette ressource n&apos;existe pas ou a été supprimée.
          </p>
        </div>
        <Button asChild variant="default" size="sm">
          <Link href="/dashboard">
            <Home className="h-3.5 w-3.5 mr-1.5" />
            Retour au tableau de bord
          </Link>
        </Button>
      </div>
    </div>
  );
}
