import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const PrescriptionCardSkeleton = () => {
  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <div className="flex items-start justify-between gap-sm flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-sm mb-xs">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <div className="flex items-center gap-xs text-sm">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <div className="flex gap-xs">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-xs">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </CardContent>
    </Card>
  );
};
