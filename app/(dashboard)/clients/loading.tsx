import { Skeleton } from "@/components/ui/skeleton";

export default function ClientsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>

      <Skeleton className="h-10 w-full" />

      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-card flex items-center gap-4 rounded-lg border p-4">
            <Skeleton className="h-10 w-10 flex-shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <div className="flex gap-4">
                <Skeleton className="h-3 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-9 w-16 flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
