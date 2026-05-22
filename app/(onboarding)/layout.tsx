import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Toaster } from "@/components/ui/sonner";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <header className="border-b bg-background">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl">
            BatiFlow
          </Link>
          <p className="text-sm text-muted-foreground">
            Configurez votre espace de travail
          </p>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">{children}</div>
      </main>
      <Toaster />
    </div>
  );
}
