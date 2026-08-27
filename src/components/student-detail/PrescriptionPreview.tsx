import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePrescriptionDetails } from "@/hooks/usePrescriptions";
import { DataErrorState } from "@/components/metrics";

interface PrescriptionPreviewProps {
  prescriptionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatInterval = (seconds: number | null) => {
  if (seconds === null) return "—";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}min${s}s` : `${m}min`;
};

/**
 * Preview READ-ONLY da prescrição, específico da ficha do aluno.
 * Componente próprio de propósito: PrescriptionCard (da PrescriptionsPage)
 * carrega ações de gestão e importa o TVMode — fora do escopo da ficha.
 */
export const PrescriptionPreview = ({
  prescriptionId,
  open,
  onOpenChange,
}: PrescriptionPreviewProps) => {
  const { data, isLoading, isError, refetch } = usePrescriptionDetails(
    open ? prescriptionId : null,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{data?.name ?? "Prescrição"}</DialogTitle>
          {data?.objective && <DialogDescription>{data.objective}</DialogDescription>}
        </DialogHeader>

        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}
        {isError && <DataErrorState what="o treino desta prescrição" onRetry={() => refetch()} />}

        {data && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-[10.5px] uppercase tracking-widest text-muted-foreground">
                  <th className="py-2 pr-2 font-medium">#</th>
                  <th className="py-2 pr-2 font-medium">Exercício</th>
                  <th className="py-2 pr-2 font-medium">Séries × Reps</th>
                  <th className="py-2 pr-2 font-medium">Intervalo</th>
                  <th className="py-2 pr-2 font-medium">PSE</th>
                  <th className="py-2 font-medium">Obs.</th>
                </tr>
              </thead>
              <tbody>
                {data.exercises.map((ex, idx) => (
                  <tr key={ex.id} className="border-b last:border-b-0">
                    <td className="py-2 pr-2 text-muted-foreground">
                      {ex.group_with_previous ? "↳" : idx + 1}
                    </td>
                    <td className="py-2 pr-2">
                      <span className="font-medium">{ex.exercise_name ?? "Exercício removido"}</span>
                      {ex.training_method && (
                        <Badge variant="outline" className="ml-2 text-[10px] font-normal">
                          {ex.training_method}
                        </Badge>
                      )}
                    </td>
                    <td className="py-2 pr-2 whitespace-nowrap">
                      {ex.sets} × {ex.reps}
                      {ex.load && <span className="text-muted-foreground"> @ {ex.load}</span>}
                    </td>
                    <td className="py-2 pr-2 whitespace-nowrap text-muted-foreground">
                      {formatInterval(ex.interval_seconds)}
                    </td>
                    <td className="py-2 pr-2 text-muted-foreground">{ex.pse ?? "—"}</td>
                    <td className="py-2 max-w-[220px] truncate text-muted-foreground" title={ex.observations ?? undefined}>
                      {ex.observations ?? "—"}
                    </td>
                  </tr>
                ))}
                {data.exercises.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground">
                      Prescrição sem exercícios cadastrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
