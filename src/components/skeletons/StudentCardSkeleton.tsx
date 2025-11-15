import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const StudentCardSkeleton = () => {
  return (
    <Card className="animate-fade-in">
      <CardHeader className="space-y-md pb-sm">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-sm">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex flex-col gap-xs">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
          <Skeleton className="h-6 w-6 rounded-full" />
        </CardTitle>
        
        <CardDescription className="space-y-sm">
          {/* Prontidão */}
          <div className="flex items-center justify-between py-sm border-b border-border/50">
            <div className="space-y-xs">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-12" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          
          {/* Observações */}
          <Skeleton className="h-9 w-full rounded-md" />
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-sm pb-md">
        <div className="flex gap-xs">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-10" />
        </div>
      </CardContent>
    </Card>
  );
};
