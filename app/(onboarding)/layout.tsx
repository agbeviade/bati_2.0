import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Toaster } from "@/components/ui/sonner";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="bg-muted/30 flex min-h-screen flex-col">
      <header className="bg-background border-b">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold">
            BatiFlow
          </Link>
          <p className="text-muted-foreground text-sm">Configurez votre espace de travail</p>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">{children}</div>
      </main>
      <Toaster />
    </div>
  );
}
