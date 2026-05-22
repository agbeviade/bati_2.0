"use client";

import { useTransition } from "react";
import { CheckCircle2, Circle, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateTaskStatus } from "../actions";
import type { TaskStatus } from "@/lib/supabase/types";

const statusConfig: Record<TaskStatus, { icon: React.ElementType; label: string; next: TaskStatus }> = {
  todo:        { icon: Circle,        label: "À faire",    next: "in_progress" },
  in_progress: { icon: Clock,         label: "En cours",   next: "done" },
  done:        { icon: CheckCircle2,  label: "Terminé",    next: "todo" },
  blocked:     { icon: AlertCircle,   label: "Bloqué",     next: "todo" },
};

const iconColor: Record<TaskStatus, string> = {
  todo:        "text-muted-foreground",
  in_progress: "text-blue-500",
  done:        "text-green-500",
  blocked:     "text-red-500",
};

export function TaskStatusToggle({
  taskId,
  status,
  projectId,
}: {
  taskId: string;
  status: TaskStatus;
  projectId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const { icon: Icon, next } = statusConfig[status];

  function toggle() {
    startTransition(() => updateTaskStatus(taskId, next, projectId));
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      title={`Marquer comme : ${statusConfig[next].label}`}
      className={cn(
        "flex-shrink-0 rounded-full transition-opacity",
        isPending ? "opacity-50" : "hover:opacity-70"
      )}
    >
      <Icon className={cn("h-5 w-5", iconColor[status])} />
    </button>
  );
}
