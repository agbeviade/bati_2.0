import { cn } from "@/lib/utils";
import type { QuoteStatus } from "@/lib/supabase/types";

const config: Record<QuoteStatus, { label: string; className: string }> = {
  draft:    { label: "Brouillon",  className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300" },
  sent:     { label: "Envoyé",    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  approved: { label: "Approuvé",  className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  rejected: { label: "Refusé",    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  expired:  { label: "Expiré",    className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
};

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  const { label, className } = config[status] ?? config.draft;
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", className)}>
      {label}
    </span>
  );
}
