import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * StudentCardSkeleton - espelha as medidas do card de aluno da lista
 * (avatar 48px, nome + nível, ações à direita, linha de leitura do dia),
 * para a grade não "pular" quando os dados chegam.
 */
export const StudentCardSkeleton = () => {
  return (
    <Card aria-hidden="true">
      <CardHeader className="space-y-md pb-md">
        <div className="flex items-start justify-between gap-sm">
          <div className="flex items-center gap-sm">
            <Skeleton className="h-12 w-12 rounded-full shrink-0" />
            <div className="flex flex-col gap-xs">
              <Skeleton className="h-5 w-36 rounded-sm" />
              <Skeleton className="h-3 w-20 rounded-sm" />
            </div>
          </div>
          <Skeleton className="h-10 w-10 rounded-md shrink-0" />
        </div>
        <div className="flex items-end justify-between border-t border-border/50 pt-sm">
          <div className="space-y-xs">
            <Skeleton className="h-3 w-28 rounded-sm" />
            <Skeleton className="h-7 w-10 rounded-sm" />
          </div>
          <Skeleton className="h-4 w-12 rounded-sm" />
        </div>
      </CardHeader>
    </Card>
  );
};
