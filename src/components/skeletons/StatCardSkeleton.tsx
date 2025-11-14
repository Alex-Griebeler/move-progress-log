import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const StatCardSkeleton = () => {
  return (
    <Card className="animate-fade-in">
      <CardHeader className="pb-sm">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-radius-md" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-9 w-16 mb-xs" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
};
