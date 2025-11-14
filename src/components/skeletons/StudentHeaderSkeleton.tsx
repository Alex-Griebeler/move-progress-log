import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const StudentHeaderSkeleton = () => {
  return (
    <Card className="card-glass-hover mb-md animate-fade-in">
      <CardContent className="p-lg">
        <div className="flex flex-col md:flex-row items-start justify-between gap-lg">
          {/* Coluna 1: Perfil */}
          <div className="flex gap-md items-start w-full md:w-auto">
            <Skeleton className="h-20 w-20 md:h-24 md:w-24 rounded-full ring-4 ring-primary/10 ring-offset-4" />
            
            <div className="space-y-sm flex-1">
              <div>
                <Skeleton className="h-8 w-48 mb-xs" />
                <div className="flex items-center gap-xs">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              
              {/* Badges Row */}
              <div className="flex flex-wrap gap-xs">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-28 rounded-full" />
                <Skeleton className="h-6 w-32 rounded-full" />
              </div>
            </div>
          </div>
          
          {/* Coluna 2: Ações */}
          <div className="flex flex-col sm:flex-row gap-sm w-full md:w-auto">
            <Skeleton className="h-10 w-full sm:w-32" />
            <Skeleton className="h-10 w-full sm:w-40" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
