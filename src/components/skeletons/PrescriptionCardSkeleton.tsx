import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * PrescriptionCardSkeleton - Premium loading state para cards de prescrição
 * 
 * Features:
 * - Shimmer effect elegante em header + exercises
 * - Layout fidedigno ao card real
 * - Suporta layout drag-and-drop com handle
 */
export const PrescriptionCardSkeleton = () => {
  return (
    <Card className="animate-fade-in card-glass">
      <CardHeader>
        <div className="flex items-start justify-between gap-sm flex-wrap">
          <div className="flex-1 min-w-0 space-y-sm">
            <div className="flex items-center gap-sm">
              <Skeleton className="h-7 w-56 rounded-radius-sm" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <div className="flex items-center gap-xs">
              <Skeleton className="h-4 w-36 rounded-radius-sm" />
              <Skeleton className="h-4 w-28 rounded-radius-sm" />
            </div>
          </div>
          <div className="flex gap-xs shrink-0">
            <Skeleton className="h-9 w-24 rounded-radius-md" />
            <Skeleton className="h-9 w-28 rounded-radius-md" />
            <Skeleton className="h-9 w-9 rounded-radius-md" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-xs">
        {/* Exercise rows */}
        <Skeleton className="h-12 w-full rounded-radius-md" />
        <Skeleton className="h-20 w-full rounded-radius-md" />
        <Skeleton className="h-20 w-full rounded-radius-md" />
        <Skeleton className="h-16 w-full rounded-radius-md" />
      </CardContent>
    </Card>
  );
};
