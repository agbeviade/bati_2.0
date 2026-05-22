import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HardHat } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl flex items-center gap-2">
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

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-3xl text-center space-y-8 py-24">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            Pilotez vos chantiers comme une entreprise moderne.
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            BatiFlow réunit la gestion de chantier, les devis, les équipes et
            les rapports en une seule plateforme — pensée pour le BTP africain.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/register">Démarrer gratuitement</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">J&apos;ai déjà un compte</Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            1 chantier gratuit — sans carte bancaire
          </p>
        </div>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} BatiFlow — Le système d&apos;exploitation du
        BTP africain.
      </footer>
    </div>
  );
}
