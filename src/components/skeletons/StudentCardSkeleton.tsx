import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * StudentCardSkeleton - Premium loading state para cards de aluno
 * 
 * Features:
 * - Shimmer effect elegante em todos elementos
 * - Layout completo: avatar, badges, métricas, ações
 * - Animação stagger opcional via delay customizado
 */
export const StudentCardSkeleton = () => {
  return (
    <Card className="animate-fade-in">
      <CardHeader className="space-y-md pb-sm">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-sm">
            <Skeleton className="h-12 w-12 rounded-full shrink-0" />
            <div className="flex flex-col gap-xs">
              <Skeleton className="h-5 w-36 rounded-radius-sm" />
              <Skeleton className="h-4 w-24 rounded-radius-sm" />
            </div>
          </div>
          <Skeleton className="h-6 w-6 rounded-full shrink-0" />
        </CardTitle>
        
        <div className="space-y-sm">
          {/* Métricas Oura */}
          <div className="flex items-center justify-between py-sm border-b border-border/50">
            <div className="space-y-xs">
              <Skeleton className="h-3 w-20 rounded-radius-sm" />
              <Skeleton className="h-6 w-14 rounded-radius-sm" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          
          {/* Observações importantes */}
          <Skeleton className="h-12 w-full rounded-radius-md" />
        </div>
      </CardHeader>
      
      <CardContent className="pt-sm pb-md">
        <div className="flex gap-xs">
          <Skeleton className="h-10 flex-1 rounded-radius-md" />
          <Skeleton className="h-10 w-10 rounded-radius-md shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
};
