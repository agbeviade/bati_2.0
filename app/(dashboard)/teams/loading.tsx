import { Skeleton } from "@/components/ui/skeleton";

export default function TeamsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>

      <Skeleton className="h-10 w-full" />

      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4 flex items-center gap-4">
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <div className="flex gap-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
