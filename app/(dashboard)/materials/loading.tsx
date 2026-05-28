import { Skeleton } from "@/components/ui/skeleton";

export default function MaterialsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-10 w-44" />
      </div>

      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-card flex items-center gap-4 rounded-lg border p-4">
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="space-y-1 text-right">
              <Skeleton className="ml-auto h-5 w-16" />
              <Skeleton className="ml-auto h-3 w-10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
