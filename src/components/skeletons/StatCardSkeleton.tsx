import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * StatCardSkeleton - Premium loading state para cards de estatística
 * 
 * Features:
 * - Shimmer effect sincronizado em todos os elementos
 * - Layout que espelha o StatCard real
 * - Fade-in suave na montagem
 */
export const StatCardSkeleton = () => {
  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-sm">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24 rounded-radius-sm" />
          <Skeleton className="h-8 w-8 rounded-radius-md" />
        </div>
      </CardHeader>
      <CardContent className="space-y-sm">
        <Skeleton className="h-9 w-20 rounded-radius-sm" />
        <Skeleton className="h-3 w-36 rounded-radius-sm" />
      </CardContent>
    </Card>
  );
};
