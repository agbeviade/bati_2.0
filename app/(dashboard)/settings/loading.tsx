import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function SettingsLoading() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="space-y-1">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Profile card */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
          <Skeleton className="h-9 w-40" />
        </CardContent>
      </Card>

      {/* Company card */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
          <Skeleton className="h-9 w-44" />
        </CardContent>
      </Card>
    </div>
  );
}
