import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { History } from "lucide-react";
import { useExerciseLoadHistory } from "@/hooks/useExerciseLoadHistory";
import { formatDistanceToNow, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatKg } from "@/utils/displayFormat";

interface ExerciseLoadHistoryPopoverProps {
  exerciseName: string;
  exerciseLibraryId?: string | null;
  prescriptionId: string;
  children: React.ReactNode;
}

/**
 * Histórico da última carga por pessoa atribuída. Usa só tokens do tema
 * (revisão UX-08 do Codex: a paleta hex paralela do modo TV foi removida) e
 * fica acima do overlay do modo TV (z-[110]).
 */
export const ExerciseLoadHistoryPopover = ({
  exerciseName,
  exerciseLibraryId,
  prescriptionId,
  children,
}: ExerciseLoadHistoryPopoverProps) => {
  const [open, setOpen] = useState(false);

  const { data: history, isLoading } = useExerciseLoadHistory({
    exerciseName,
    exerciseLibraryId,
    prescriptionId,
    enabled: open,
  });

  const hasStudents = history && history.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="group inline-flex min-h-10 items-center gap-1 rounded-md px-1 cursor-pointer hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          type="button"
          title="Ver histórico de cargas"
        >
          {children}
          <History className="h-3.5 w-3.5 text-muted-foreground opacity-60" aria-hidden="true" />
          <span className="sr-only">: ver histórico de cargas de {exerciseName}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="z-[110] w-80 p-0" align="center" sideOffset={8}>
        <div className="px-4 py-3 border-b border-border">
          <p className="font-semibold text-sm truncate">{exerciseName}</p>
          <p className="text-xs mt-0.5 text-muted-foreground">Histórico de cargas</p>
        </div>

        <div className="px-4 py-3 space-y-2 max-h-60 overflow-y-auto">
          {isLoading ? (
            <>
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-3/4" />
            </>
          ) : !hasStudents ? (
            <p className="text-xs text-center py-2 text-muted-foreground">
              Ninguém atribuído a esta prescrição
            </p>
          ) : (
            history.map((item) => {
              const isStale =
                item.lastDate &&
                differenceInDays(new Date(), parseISO(item.lastDate)) > 30;

              return (
                <div
                  key={item.studentId}
                  className="flex items-center justify-between gap-2 text-sm py-1 border-b border-border/50 last:border-0"
                >
                  <span className="font-medium truncate flex-1 min-w-0">{item.studentName}</span>
                  {item.lastDate ? (
                    <div className="flex flex-col items-end shrink-0 text-right">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {item.lastLoadKg
                            ? formatKg(item.lastLoadKg)
                            : item.lastLoadDescription || "—"}
                        </span>
                        <span className={`text-xs ${isStale ? "text-warning" : "text-muted-foreground"}`}>
                          {formatDistanceToNow(parseISO(item.lastDate), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                      {item.lastObservations && (
                        <span
                          className="text-xs italic mt-0.5 max-w-[200px] truncate text-muted-foreground"
                          title={item.lastObservations}
                        >
                          {item.lastObservations}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs italic text-muted-foreground">sem registro</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
