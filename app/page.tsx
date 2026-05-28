import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HardHat } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold">
            <HardHat className="h-6 w-6" />
            BatiFlow
          </Link>
          <nav className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">Connexion</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Commencer</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6">
        <div className="max-w-3xl space-y-8 py-24 text-center">
          <h1 className="text-5xl font-bold tracking-tight md:text-6xl">
            Pilotez vos chantiers comme une entreprise moderne.
          </h1>
          <p className="text-muted-foreground mx-auto max-w-2xl text-xl">
            BatiFlow réunit la gestion de chantier, les devis, les équipes et les rapports en une
            seule plateforme — pensée pour le BTP africain.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/register">Démarrer gratuitement</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">J&apos;ai déjà un compte</Link>
            </Button>
          </div>
          <p className="text-muted-foreground text-sm">1 chantier gratuit — sans carte bancaire</p>
        </div>
      </main>

      <footer className="text-muted-foreground border-t py-6 text-center text-sm">
        © {new Date().getFullYear()} BatiFlow — Le système d&apos;exploitation du BTP africain.
      </footer>
    </div>
  );
}
