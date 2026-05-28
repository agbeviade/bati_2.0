import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/lib/supabase/types";

const config: Record<ProjectStatus, { label: string; className: string }> = {
  planned: { label: "Planifié", className: "bg-primary/10 text-primary" },
  in_progress: { label: "En cours", className: "bg-success/15 text-success" },
  paused: { label: "Pausé", className: "bg-warning/20 text-amber-700 dark:text-amber-400" },
  completed: { label: "Terminé", className: "bg-muted text-muted-foreground" },
  canceled: { label: "Annulé", className: "bg-destructive/15 text-destructive" },
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const { label, className } = config[status] ?? config.planned;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        className,
      )}
    >
      {label}
    </span>
  );
}
