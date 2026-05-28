import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md space-y-4 text-center">
        <div className="bg-muted mx-auto flex h-12 w-12 items-center justify-center rounded-full">
          <FileQuestion className="text-muted-foreground h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Page introuvable</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Cette ressource n&apos;existe pas ou a été supprimée.
          </p>
        </div>
        <Button asChild variant="default" size="sm">
          <Link href="/dashboard">
            <Home className="mr-1.5 h-3.5 w-3.5" />
            Retour au tableau de bord
          </Link>
        </Button>
      </div>
    </div>
  );
}
