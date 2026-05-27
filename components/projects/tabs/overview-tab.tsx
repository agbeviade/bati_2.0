import { Wallet, Calendar, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TaskForm } from "@/app/(dashboard)/projects/[id]/task-form";
import { TaskStatusToggle } from "@/app/(dashboard)/projects/[id]/task-status-toggle";
import type { Project, Task } from "@/lib/supabase/types";

const priorityLabel: Record<string, string> = { low: "Faible", medium: "Normale", high: "Haute" };
const priorityColor: Record<string, string> = { low: "text-muted-foreground", medium: "text-blue-600", high: "text-red-600" };

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}
function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export function OverviewTab({ project, tasks, currency }: { project: Project; tasks: Task[]; currency: string }) {
  const doneTasks = tasks.filter(t => t.status === "done").length;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1"><Wallet className="h-3.5 w-3.5 shrink-0" /><span className="text-xs truncate">Budget</span></div>
          <p className="font-semibold text-sm break-words leading-tight">{project.budget ? fmt(project.budget, currency) : "—"}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1"><Wallet className="h-3.5 w-3.5 shrink-0" /><span className="text-xs truncate">Dépensé</span></div>
          <p className="font-semibold text-sm break-words leading-tight">{fmt(project.spent, currency)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1"><Calendar className="h-3.5 w-3.5 shrink-0" /><span className="text-xs truncate">Début</span></div>
          <p className="font-semibold text-sm break-words leading-tight">{fmtDate(project.start_date)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1"><Calendar className="h-3.5 w-3.5 shrink-0" /><span className="text-xs truncate">Fin prévue</span></div>
          <p className="font-semibold text-sm break-words leading-tight">{fmtDate(project.end_date)}</p>
        </CardContent></Card>
      </div>

      {project.description && (
        <Card className="overflow-hidden"><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground whitespace-pre-line overflow-wrap-anywhere" style={{ overflowWrap: "anywhere" }}>{project.description}</p>
        </CardContent></Card>
      )}

      {/* Tasks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tâches</CardTitle>
              <CardDescription>{tasks.length === 0 ? "Aucune tâche" : `${doneTasks} / ${tasks.length} terminée${doneTasks > 1 ? "s" : ""}`}</CardDescription>
            </div>
            <TaskForm projectId={project.id} />
          </div>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Ajoutez la première tâche.</p>
          ) : (
            <ul className="space-y-1">
              {tasks.map((task, i) => (
                <li key={task.id}>
                  <div className="flex items-center gap-3 py-2">
                    <TaskStatusToggle taskId={task.id} status={task.status} projectId={project.id} />
                    <span className={task.status === "done" ? "flex-1 text-sm line-through text-muted-foreground" : "flex-1 text-sm"}>{task.title}</span>
                    <span className={`text-xs ${priorityColor[task.priority]}`}>{priorityLabel[task.priority]}</span>
                    {task.due_date && <span className="text-xs text-muted-foreground">{fmtDate(task.due_date)}</span>}
                  </div>
                  {i < tasks.length - 1 && <Separator />}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
