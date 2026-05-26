import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@/lib/supabase/types";

const CONFIG: Record<InvoiceStatus, { label: string; className: string }> = {
  draft:    { label: "Brouillon",  className: "bg-muted text-muted-foreground border-border" },
  sent:     { label: "Envoyée",    className: "bg-primary/10 text-primary border-primary/20" },
  paid:     { label: "Payée",      className: "bg-success/15 text-success border-success/20" },
  overdue:  { label: "En retard",  className: "bg-destructive/15 text-destructive border-destructive/20" },
  canceled: { label: "Annulée",    className: "bg-muted text-muted-foreground border-border line-through" },
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const { label, className } = CONFIG[status] ?? CONFIG.draft;
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", className)}>
      {label}
    </span>
  );
}
