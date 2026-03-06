import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * StudentHeaderSkeleton - Premium loading state para header de detalhes do aluno
 * 
 * Features:
 * - Shimmer effect sincronizado em avatar, badges e botões
 * - Layout responsivo completo
 * - Animação stagger sutil nos badges
 */
export const StudentHeaderSkeleton = () => {
  return (
    <Card className="mb-md animate-fade-in">
      <CardContent className="p-lg">
        <div className="flex flex-col md:flex-row items-start justify-between gap-lg">
          {/* Coluna 1: Perfil */}
          <div className="flex gap-md items-start w-full md:w-auto">
            <Skeleton className="h-20 w-20 md:h-24 md:w-24 rounded-full ring-4 ring-primary/10 ring-offset-4 shrink-0" />
            
            <div className="space-y-sm flex-1 min-w-0">
              <div className="space-y-xs">
                <Skeleton className="h-8 w-56 rounded-radius-sm" />
                <div className="flex items-center gap-xs">
                  <Skeleton className="h-4 w-4 rounded-full shrink-0" />
                  <Skeleton className="h-4 w-24 rounded-radius-sm" />
                  <Skeleton className="h-4 w-28 rounded-radius-sm" />
                </div>
              </div>
              
              {/* Badges Row com stagger visual */}
              <div className="flex flex-wrap gap-xs">
                <Skeleton className="h-6 w-28 rounded-full" style={{ animationDelay: '0ms' }} />
                <Skeleton className="h-6 w-32 rounded-full" style={{ animationDelay: '100ms' }} />
                <Skeleton className="h-6 w-36 rounded-full" style={{ animationDelay: '200ms' }} />
              </div>
            </div>
          </div>
          
          {/* Coluna 2: Ações */}
          <div className="flex flex-col sm:flex-row gap-sm w-full md:w-auto">
            <Skeleton className="h-10 w-full sm:w-36 rounded-radius-md" />
            <Skeleton className="h-10 w-full sm:w-44 rounded-radius-md" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
