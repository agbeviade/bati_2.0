import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold">
            BatiFlow
          </Link>
          <p className="text-muted-foreground text-sm">
            Pilotez vos chantiers comme une entreprise moderne.
          </p>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
