import { Badge } from "@/components/ui/badge";
import type { InvoiceStatus } from "@/lib/supabase/types";

const CONFIG: Record<InvoiceStatus, { label: string; className: string }> = {
  draft:    { label: "Brouillon",  className: "bg-gray-100 text-gray-700 border-gray-200" },
  sent:     { label: "Envoyée",    className: "bg-blue-100 text-blue-700 border-blue-200" },
  paid:     { label: "Payée",      className: "bg-green-100 text-green-700 border-green-200" },
  overdue:  { label: "En retard",  className: "bg-red-100 text-red-700 border-red-200" },
  canceled: { label: "Annulée",    className: "bg-gray-100 text-gray-500 border-gray-200 line-through" },
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const { label, className } = CONFIG[status] ?? CONFIG.draft;
  return <Badge variant="outline" className={className}>{label}</Badge>;
}
