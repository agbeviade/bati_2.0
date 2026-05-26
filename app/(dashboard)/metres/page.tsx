import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DeboursesCalculator } from "@/components/metres/debourses-calculator";

export default async function MetresPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Calculateur de déboursés secs</h1>
        <p className="text-muted-foreground text-sm">
          Saisissez vos données étape par étape — les quantités sont calculées automatiquement.
        </p>
      </div>
      <DeboursesCalculator />
    </div>
  );
}
