import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const StudentCardSkeleton = () => {
  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-sm">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-5 w-32" />
        </CardTitle>
        
        <CardDescription className="space-y-sm">
          <div className="grid grid-cols-2 gap-xs">
            <div className="space-y-xs">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="space-y-xs">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          
          <div className="flex items-center gap-xs p-xs rounded-radius-md border">
            <Skeleton className="h-4 w-4" />
            <div className="flex-1">
              <Skeleton className="h-3 w-full mb-xs" />
              <Skeleton className="h-2 w-3/4" />
            </div>
          </div>
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="flex gap-xs">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-9" />
        </div>
      </CardContent>
    </Card>
  );
};
