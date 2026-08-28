import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Trash2, Eye, Plus } from "lucide-react";
import { formatSessionDate } from "@/utils/sessionDate";
import { describeAssignmentAdaptations } from "@/utils/assignmentAdaptations";
import { mapAssignmentCustomAdaptations } from "@/hooks/prescriptionMappers";
import { assignmentStatus, assignmentProgress, AssignmentStatus } from "@/utils/assignmentStatus";
import { useDeletePrescriptionAssignment, usePrescriptions } from "@/hooks/usePrescriptions";
import type { useStudentPrescriptions } from "@/hooks/useStudentDetail";
import { DataErrorState } from "@/components/metrics";
import { PrescriptionPreview } from "./PrescriptionPreview";
import { AssignPrescriptionDialog } from "@/components/AssignPrescriptionDialog";
import { cn } from "@/lib/utils";

type StudentAssignments = NonNullable<ReturnType<typeof useStudentPrescriptions>["data"]>;
type StudentAssignment = StudentAssignments[number];

interface PrescriptionsTabContentProps {
  studentId: string;
  assignments: StudentAssignments | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

const STATUS_META: Record<AssignmentStatus, { label: string; className: string }> = {
  vigente: { label: "Vigente", className: "border-success/50 text-success" },
  futura: { label: "Futura", className: "border-primary/50 text-primary" },
  expirada: { label: "Encerrada", className: "text-muted-foreground" },
};

const AssignmentCard = ({
  assignment,
  status,
  onPreview,
  onDelete,
}: {
  assignment: StudentAssignment;
  status: AssignmentStatus;
  onPreview: (prescriptionId: string) => void;
  onDelete: (assignmentId: string) => void;
}) => {
  const progress = assignmentProgress(assignment);
  const agenda = describeAssignmentAdaptations(
    mapAssignmentCustomAdaptations(assignment.custom_adaptations),
  );
  const meta = STATUS_META[status];

  return (
    <Card className={cn(status === "vigente" && "border-l-2 border-l-primary")}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn("font-normal", meta.className)}>
                {meta.label}
              </Badge>
              {agenda && (
                <span className="text-xs text-muted-foreground">{agenda}</span>
              )}
            </div>
            <CardTitle className="mt-2 text-lg">
              {assignment.prescription?.name ?? (
                <span className="text-muted-foreground">Prescrição removida</span>
              )}
            </CardTitle>
            {assignment.prescription?.objective && (
              <p className="mt-1 text-sm text-muted-foreground">
                {assignment.prescription.objective}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            {assignment.prescription && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => onPreview(assignment.prescription!.id)}
              >
                <Eye className="h-3.5 w-3.5" />
                Ver treino
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                  aria-label="Excluir atribuição"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir esta atribuição de prescrição? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(assignment.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {progress ? (
          <div className="space-y-1">
            <Progress value={progress.percent} className="h-1.5" />
            <p className="text-xs text-muted-foreground">
              Semana {progress.week} de {progress.totalWeeks} ·{" "}
              {formatSessionDate(assignment.start_date)} – {formatSessionDate(assignment.end_date!)}
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {status === "futura"
              ? `Começa em ${formatSessionDate(assignment.start_date)}`
              : assignment.start_date
                ? `Desde ${formatSessionDate(assignment.start_date)}`
                : "Sem período definido"}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Aba Prescrições da ficha do aluno (PR-3 do redesign): a atribuição VIGENTE
 * é o herói; histórico colapsado; atribuição student-scoped direto da ficha.
 */
export const PrescriptionsTabContent = ({
  studentId,
  assignments,
  isLoading,
  isError,
  refetch,
}: PrescriptionsTabContentProps) => {
  const deleteAssignment = useDeletePrescriptionAssignment();
  const {
    data: prescriptions,
    isLoading: loadingPrescriptions,
    isError: prescriptionsError,
    refetch: refetchPrescriptions,
  } = usePrescriptions();
  const [previewPrescriptionId, setPreviewPrescriptionId] = useState<string | null>(null);
  const [assignPrescriptionId, setAssignPrescriptionId] = useState<string>("");
  const [assignOpen, setAssignOpen] = useState(false);

  const grouped = useMemo(() => {
    const groups: Record<AssignmentStatus, StudentAssignment[]> = {
      vigente: [],
      futura: [],
      expirada: [],
    };
    for (const a of assignments ?? []) groups[assignmentStatus(a)].push(a);
    return groups;
  }, [assignments]);

  const sortedPrescriptions = useMemo(
    () => [...(prescriptions ?? [])].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [prescriptions],
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-36 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    );
  }
  if (isError) {
    return <DataErrorState what="as prescrições do aluno" onRetry={refetch} />;
  }

  const hasAny = (assignments?.length ?? 0) > 0;

  const assignCta = prescriptionsError ? (
    <div className="flex items-center gap-3 text-sm text-destructive">
      <span>Não foi possível carregar o catálogo de prescrições.</span>
      <Button variant="outline" size="sm" onClick={() => refetchPrescriptions()}>
        Tentar novamente
      </Button>
    </div>
  ) : (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Select
        value={assignPrescriptionId}
        onValueChange={setAssignPrescriptionId}
        disabled={loadingPrescriptions}
      >
        <SelectTrigger className="sm:w-72" aria-label="Escolher prescrição para atribuir">
          <SelectValue
            placeholder={loadingPrescriptions ? "Carregando prescrições..." : "Escolher prescrição..."}
          />
        </SelectTrigger>
        <SelectContent>
          {sortedPrescriptions.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        disabled={!assignPrescriptionId}
        onClick={() => setAssignOpen(true)}
        className="gap-2"
      >
        <Plus className="h-4 w-4" />
        Atribuir a este aluno
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      {hasAny ? (
        <>
          {grouped.vigente.map((a) => (
            <AssignmentCard
              key={a.id}
              assignment={a}
              status="vigente"
              onPreview={setPreviewPrescriptionId}
              onDelete={(id) => deleteAssignment.mutate(id)}
            />
          ))}
          {grouped.vigente.length === 0 && (
            <Card>
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma prescrição vigente hoje.
              </CardContent>
            </Card>
          )}
          {grouped.futura.map((a) => (
            <AssignmentCard
              key={a.id}
              assignment={a}
              status="futura"
              onPreview={setPreviewPrescriptionId}
              onDelete={(id) => deleteAssignment.mutate(id)}
            />
          ))}
          {grouped.expirada.length > 0 && (
            <Accordion type="single" collapsible>
              <AccordionItem value="historico" className="rounded-lg border px-4">
                <AccordionTrigger className="text-sm font-semibold">
                  Histórico ({grouped.expirada.length})
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  {grouped.expirada.map((a) => (
                    <AssignmentCard
                      key={a.id}
                      assignment={a}
                      status="expirada"
                      onPreview={setPreviewPrescriptionId}
                      onDelete={(id) => deleteAssignment.mutate(id)}
                    />
                  ))}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
          <Card>
            <CardContent className="py-4">{assignCta}</CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
          <FileText className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhuma prescrição atribuída</p>
            {assignCta}
          </CardContent>
        </Card>
      )}

      <PrescriptionPreview
        prescriptionId={previewPrescriptionId}
        open={previewPrescriptionId !== null}
        onOpenChange={(open) => !open && setPreviewPrescriptionId(null)}
      />
      <AssignPrescriptionDialog
        open={assignOpen}
        onOpenChange={(open) => {
          setAssignOpen(open);
          if (!open) setAssignPrescriptionId("");
        }}
        prescriptionId={assignPrescriptionId || null}
        initialStudentIds={[studentId]}
      />
    </div>
  );
};
