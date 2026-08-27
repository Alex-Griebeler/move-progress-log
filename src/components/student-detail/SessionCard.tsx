import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Check,
  Edit,
  Eye,
  FileText,
  FolderOpen,
  MoreVertical,
  TrendingDown,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatSessionDate } from "@/utils/sessionDate";

export interface SessionCardProps {
  name: string;
  date: string;
  sessionType: "individual" | "group";
  exerciseCount: number;
  /** Volume total (load × sets × reps) — fórmula única do PR-0. */
  totalVolumeKg: number;
  /** Δ% vs a sessão anterior do MESMO tipo; null = sem base de comparação. */
  volumeDeltaPercent: number | null;
  isFinalized?: boolean;
  canReopen?: boolean;
  hasObservations?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onFinalize?: () => void;
  onReopen?: () => void;
}

const fmtVolume = (kg: number) =>
  kg >= 1000 ? `${(kg / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} t` : `${Math.round(kg)} kg`;

/**
 * Card de sessão ESPECÍFICO da ficha (PR-6): WorkoutCard segue intocado no
 * dashboard. Sem avatar (a identidade já está no header da página); o que o
 * coach precisa ver sem abrir: conteúdo (exercícios/volume), status e Δ.
 */
export const SessionCard = ({
  name,
  date,
  sessionType,
  exerciseCount,
  totalVolumeKg,
  volumeDeltaPercent,
  isFinalized = false,
  canReopen = false,
  hasObservations = false,
  onClick,
  onEdit,
  onFinalize,
  onReopen,
}: SessionCardProps) => {
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);

  return (
    <>
      <Card
        className="cursor-pointer transition-colors hover:border-primary/40"
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className="gap-1 text-xs font-normal">
                  {sessionType === "group" ? <Users className="h-3 w-3" /> : <User className="h-3 w-3" />}
                  {sessionType === "group" ? "Grupo" : "Individual"}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs font-normal",
                    isFinalized ? "border-success/50 text-success" : "border-warning/50 text-warning",
                  )}
                >
                  {isFinalized ? "Finalizada" : "Aberta"}
                </Badge>
                {hasObservations && (
                  <Badge variant="outline" className="gap-1 text-xs font-normal text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    Obs.
                  </Badge>
                )}
              </div>
              <h4 className="mt-2 truncate font-semibold">{name}</h4>
              <p className="text-xs text-muted-foreground">{formatSessionDate(date)}</p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Menu de ações da sessão">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {!isFinalized && onEdit && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                    }}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Editar Sessão
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onClick?.();
                  }}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Ver Detalhes
                </DropdownMenuItem>
                {!isFinalized && onFinalize && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFinalizeConfirm(true);
                    }}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Finalizar Sessão
                  </DropdownMenuItem>
                )}
                {isFinalized && canReopen && onReopen && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onReopen();
                    }}
                  >
                    <FolderOpen className="mr-2 h-4 w-4" />
                    Reabrir Sessão
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mt-3 flex items-center gap-4 text-sm">
            <span>
              <span className="font-semibold">{exerciseCount}</span>{" "}
              <span className="text-muted-foreground">exercícios</span>
            </span>
            {totalVolumeKg > 0 && (
              <span>
                <span className="font-semibold">{fmtVolume(totalVolumeKg)}</span>{" "}
                <span className="text-muted-foreground">volume</span>
              </span>
            )}
            {volumeDeltaPercent !== null && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-xs font-semibold",
                  volumeDeltaPercent >= 0 ? "text-success" : "text-destructive",
                )}
              >
                {volumeDeltaPercent >= 0 ? (
                  <TrendingUp className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <TrendingDown className="h-3 w-3" aria-hidden="true" />
                )}
                {volumeDeltaPercent > 0 ? "+" : ""}
                {volumeDeltaPercent}% vs anterior
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showFinalizeConfirm} onOpenChange={setShowFinalizeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar sessão?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja finalizar esta sessão? Após finalizar, você
              ainda poderá reabrir a sessão se necessário.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.stopPropagation();
                onFinalize?.();
              }}
            >
              Finalizar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
