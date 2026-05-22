import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/lib/supabase/types";

const config: Record<ProjectStatus, { label: string; className: string }> = {
  planned:     { label: "Planifié",   className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  in_progress: { label: "En cours",  className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  paused:      { label: "Pausé",     className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  completed:   { label: "Terminé",   className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  canceled:    { label: "Annulé",    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const { label, className } = config[status] ?? config.planned;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        className
      )}
    >
      {label}
    </span>
  );
}
