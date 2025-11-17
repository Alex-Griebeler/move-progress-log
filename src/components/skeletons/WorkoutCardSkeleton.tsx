import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * WorkoutCardSkeleton - Premium loading state para cards de sessão
 * 
 * Features:
 * - Shimmer effect sincronizado
 * - Layout fiel ao WorkoutCard real
 * - Inclui icon, badges, e métricas visíveis
 */
export const WorkoutCardSkeleton = () => {
  return (
    <Card className="animate-fade-in card-glass">
      <CardHeader className="pb-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-sm flex-1">
            <Skeleton className="h-16 w-16 rounded-full shrink-0" />
            <div className="flex-1 space-y-xs min-w-0">
              <Skeleton className="h-5 w-36 rounded-radius-sm" />
              <div className="flex items-center gap-xs flex-wrap mt-1">
                <Skeleton className="h-5 w-20 rounded-radius-sm" />
                <Skeleton className="h-5 w-16 rounded-radius-sm" />
              </div>
            </div>
          </div>
          <Skeleton className="h-8 w-8 rounded-radius-sm shrink-0" />
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-sm">
        <div className="flex items-center justify-between p-sm rounded-radius-md border border-border/50 bg-muted/30">
          <Skeleton className="h-4 w-28 rounded-radius-sm" />
          <Skeleton className="h-4 w-16 rounded-radius-sm" />
        </div>
      </CardContent>
    </Card>
  );
};
