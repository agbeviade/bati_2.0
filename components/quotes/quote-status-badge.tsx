import { cn } from "@/lib/utils";
import type { QuoteStatus } from "@/lib/supabase/types";

const config: Record<QuoteStatus, { label: string; className: string }> = {
  draft:    { label: "Brouillon", className: "bg-muted text-muted-foreground" },
  sent:     { label: "Envoyé",   className: "bg-primary/10 text-primary" },
  approved: { label: "Approuvé", className: "bg-success/15 text-success" },
  rejected: { label: "Refusé",   className: "bg-destructive/15 text-destructive" },
  expired:  { label: "Expiré",   className: "bg-brand-orange/15 text-brand-orange" },
};

export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  const { label, className } = config[status] ?? config.draft;
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", className)}>
      {label}
    </span>
  );
}
