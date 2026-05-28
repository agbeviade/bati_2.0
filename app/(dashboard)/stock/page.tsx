import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/projects/status-badge";
import { ArrowDown, ArrowUp, Package, Warehouse } from "lucide-react";

type StockItem = {
  materialId: string;
  materialName: string;
  unit: string;
  entries: number;
  exits: number;
  qty: number; // entries - exits
};

type ProjectStock = {
  projectId: string;
  projectName: string;
  status: string;
  items: StockItem[];
  totalItems: number;
};

function fmtNum(n: number) {
  return n.toLocaleString("fr-FR");
}

export default async function StockPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single();
  if (!profile?.company_id) redirect("/onboarding");

  const [{ data: projectsData }, { data: movementsData }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, status")
      .eq("company_id", profile.company_id)
      .order("name"),
    supabase
      .from("stock_movements")
      .select("project_id, material_id, type, quantity, materials(name, unit)")
      .not("project_id", "is", null)
      .in("type", ["purchase", "use", "return"]),
  ]);

  const projects = (projectsData ?? []) as { id: string; name: string; status: string }[];

  type RawMov = {
    project_id: string;
    material_id: string;
    type: string;
    quantity: number;
    materials: { name: string; unit: string } | null;
  };
  const movements = (movementsData ?? []) as unknown as RawMov[];

  // Agréger par projet → matériau
  const byProject: Record<string, Record<string, StockItem>> = {};
  for (const m of movements) {
    if (!m.project_id) continue;
    if (!byProject[m.project_id]) byProject[m.project_id] = {};
    if (!byProject[m.project_id][m.material_id]) {
      byProject[m.project_id][m.material_id] = {
        materialId: m.material_id,
        materialName: m.materials?.name ?? "Matériau inconnu",
        unit: m.materials?.unit ?? "u",
        entries: 0,
        exits: 0,
        qty: 0,
      };
    }
    const item = byProject[m.project_id][m.material_id];
    if (m.type === "purchase" || m.type === "return") {
      item.entries += m.quantity;
      item.qty += m.quantity;
    } else if (m.type === "use") {
      item.exits += m.quantity;
      item.qty -= m.quantity;
    }
  }

  const projectStocks: ProjectStock[] = projects
    .filter((p) => byProject[p.id] && Object.keys(byProject[p.id]).length > 0)
    .map((p) => {
      const items = Object.values(byProject[p.id]).sort((a, b) => a.qty - b.qty); // stock faible/négatif en premier
      return {
        projectId: p.id,
        projectName: p.name,
        status: p.status,
        items,
        totalItems: items.length,
      };
    });

  const totalProjects = projectStocks.length;
  const totalLow = projectStocks.reduce(
    (s, p) => s + p.items.filter((i) => i.qty > 0 && i.qty < 10).length,
    0,
  );
  const totalOut = projectStocks.reduce((s, p) => s + p.items.filter((i) => i.qty <= 0).length, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Stock par chantier</h2>
          <p className="text-muted-foreground">
            {totalProjects === 0
              ? "Aucun mouvement enregistré"
              : `${totalProjects} chantier${totalProjects > 1 ? "s" : ""} avec du stock`}
          </p>
        </div>
      </div>

      {/* KPIs globaux */}
      {totalProjects > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <Card>
            <CardContent className="px-3 pt-3 pb-3 text-center">
              <div className="text-2xl font-bold">{totalProjects}</div>
              <p className="text-muted-foreground text-xs">Chantiers actifs</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="px-3 pt-3 pb-3 text-center">
              <div
                className={`text-2xl font-bold ${totalLow > 0 ? "text-orange-600" : "text-muted-foreground"}`}
              >
                {totalLow}
              </div>
              <p className="text-muted-foreground text-xs">Stock faible</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="px-3 pt-3 pb-3 text-center">
              <div
                className={`text-2xl font-bold ${totalOut > 0 ? "text-destructive" : "text-muted-foreground"}`}
              >
                {totalOut}
              </div>
              <p className="text-muted-foreground text-xs">Épuisé</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Vue par chantier */}
      {projectStocks.length === 0 ? (
        <div className="flex flex-col items-center justify-center space-y-4 py-24 text-center">
          <div className="bg-muted rounded-full p-4">
            <Warehouse className="text-muted-foreground h-10 w-10" />
          </div>
          <div>
            <p className="font-medium">Aucun stock enregistré</p>
            <p className="text-muted-foreground text-sm">
              Les entrées de matériaux sur chaque chantier apparaîtront ici.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {projectStocks.map((ps) => (
            <Card key={ps.projectId}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="min-w-0 flex-1 truncate text-base">
                    <Link
                      href={`/projects/${ps.projectId}?tab=materials`}
                      className="underline-offset-2 hover:underline"
                    >
                      {ps.projectName}
                    </Link>
                  </CardTitle>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <StatusBadge
                      status={ps.status as import("@/lib/supabase/types").ProjectStatus}
                    />
                    <span className="text-muted-foreground text-xs whitespace-nowrap">
                      {ps.totalItems} matériau{ps.totalItems > 1 ? "x" : ""}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {ps.items.map((item, i) => {
                    const isLow = item.qty > 0 && item.qty < 10;
                    const isOut = item.qty <= 0;
                    return (
                      <div key={item.materialId}>
                        <div className="flex items-center gap-3 py-2">
                          <div
                            className={`h-6 w-2 flex-shrink-0 rounded-full ${isOut ? "bg-red-500" : isLow ? "bg-orange-400" : "bg-green-500"}`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{item.materialName}</p>
                            <div className="text-muted-foreground flex items-center gap-3 text-xs">
                              <span className="flex items-center gap-0.5">
                                <ArrowDown className="h-3 w-3 text-green-600" />
                                {fmtNum(item.entries)}
                              </span>
                              <span className="flex items-center gap-0.5">
                                <ArrowUp className="h-3 w-3 text-red-600" />
                                {fmtNum(item.exits)}
                              </span>
                            </div>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <p
                              className={`text-sm font-bold ${isOut ? "text-destructive" : isLow ? "text-orange-600" : "text-foreground"}`}
                            >
                              {fmtNum(item.qty)} {item.unit}
                            </p>
                            {isOut && <p className="text-destructive text-xs">Épuisé</p>}
                            {isLow && <p className="text-xs text-orange-600">Faible</p>}
                          </div>
                        </div>
                        {i < ps.items.length - 1 && <div className="bg-border h-px" />}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
