import { Skeleton } from "@/components/ui/skeleton";

export default function QuotesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-40 self-start sm:self-auto" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-card space-y-2 rounded-lg border p-4 text-center">
            <Skeleton className="mx-auto h-8 w-10" />
            <Skeleton className="mx-auto h-3 w-20" />
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-28" />
      </div>

      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-card flex items-center gap-4 rounded-lg border p-4">
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
