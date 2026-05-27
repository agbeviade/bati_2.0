import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DeboursesCalculator } from "@/components/metres/debourses-calculator";
import { listModels } from "@/app/(dashboard)/metres/actions";

export default async function MetresPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const models = await listModels();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Calculateur de debourses secs</h1>
        <p className="text-muted-foreground text-sm">
          Saisissez vos donnees etape par etape - les quantites sont calculees automatiquement.
        </p>
      </div>
      <DeboursesCalculator models={models} />
    </div>
  );
}
