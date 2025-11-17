import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * WorkoutCardSkeleton - Premium loading state para cards de sessão
 * 
 * Features:
 * - Shimmer effect sincronizado
 * - Layout fiel ao WorkoutCard real
 * - Inclui icon, badges, e métricas
 */
export const WorkoutCardSkeleton = () => {
  return (
    <Card className="animate-fade-in card-glass">
      <CardHeader className="pb-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-sm flex-1">
            <Skeleton className="h-9 w-9 rounded-radius-md shrink-0" />
            <div className="flex-1 space-y-xs min-w-0">
              <Skeleton className="h-5 w-36 rounded-radius-sm" />
              <div className="flex items-center gap-xs flex-wrap">
                <Skeleton className="h-4 w-24 rounded-radius-sm" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>
          </div>
          <Skeleton className="h-5 w-20 rounded-full shrink-0" />
        </div>
      </CardHeader>
      <CardContent className="space-y-sm">
        <div className="flex items-center justify-between p-sm rounded-radius-md border border-border/50">
          <Skeleton className="h-4 w-28 rounded-radius-sm" />
          <Skeleton className="h-6 w-24 rounded-radius-sm" />
        </div>
      </CardContent>
    </Card>
  );
};
