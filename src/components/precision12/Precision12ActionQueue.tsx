/**
 * E4.2 — Fila de ação read-only do Coach Console Precision 12.
 * E4.4 — Adicionada ação controlada de reissue de link em itens
 *        `questionnaire_pending` (in_progress).
 * E4.5 — Adicionada ação controlada de revogação avulsa de link, condicionada
 *        à existência de link ativo no momento (via prop
 *        `activeLinkAssessmentIds` derivada pelo hook E4.1).
 *
 * Tabela priorizada com os itens derivados pelo hook E4.1. Cada linha tem
 * uma CTA "Abrir" (navegação read-only) e, quando aplicável, ações de
 * "Reemitir link" (`Precision12ReissueLinkDialog`) e "Revogar link"
 * (`Precision12RevokeLinkDialog`). Ambas as ações exigem confirmação
 * explícita e mutam exclusivamente via edge function service-role.
 *
 * Microcopy: triagem operacional, NÃO diagnóstico.
 */

import { useState } from "react";
import { differenceInDays, parseISO } from "date-fns";
import { Ban, ChevronRight, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ASSESSMENT_TYPE_METADATA } from "@/constants/assessmentProtocols";
import type { AssessmentStatus, AssessmentType } from "@/types/assessment";
import {
  buildPrecision12StudentDeepLink,
  canReissueQuestionnaireLink,
  canRevokeQuestionnaireLink,
  type ActionQueueAlertType,
  type ActionQueueItem,
} from "@/utils/precision12CoachConsole";

import { Precision12ReissueLinkDialog } from "./Precision12ReissueLinkDialog";
import { Precision12RevokeLinkDialog } from "./Precision12RevokeLinkDialog";

interface Precision12ActionQueueProps {
  items: readonly ActionQueueItem[];
  /**
   * E4.5 — `assessment_id`s que têm link ativo (não usado, não revogado,
   * não expirado). Quando vazio/undefined, o botão "Revogar link" não
   * aparece (default: nenhum link ativo).
   */
  activeLinkAssessmentIds?: ReadonlySet<string>;
}

interface ReissueTarget {
  studentId: string;
  studentName: string;
  assessmentId: string;
}

interface RevokeTarget {
  studentId: string;
  studentName: string;
  assessmentId: string;
}

const EMPTY_ACTIVE_LINK_IDS: ReadonlySet<string> = new Set<string>();

const ALERT_LABEL: Record<ActionQueueAlertType, string> = {
  parq_blocked: "PAR-Q bloqueado",
  questionnaire_pending: "Questionário pendente",
  assessment_incomplete: "Avaliação incompleta",
  student_no_assessment: "Sem avaliação no ciclo",
  adherence_risk: "Possível risco de adesão",
};

const ALERT_VARIANT: Record<
  ActionQueueAlertType,
  "default" | "secondary" | "destructive" | "outline"
> = {
  parq_blocked: "destructive",
  questionnaire_pending: "secondary",
  assessment_incomplete: "secondary",
  student_no_assessment: "outline",
  adherence_risk: "secondary",
};

const STATUS_LABEL: Record<AssessmentStatus, string> = {
  in_progress: "Em andamento",
  completed: "Completa",
  blocked: "Bloqueada",
  aborted: "Abortada",
};

function ageLabel(dateISO: string | null): string {
  if (!dateISO) return "—";
  try {
    const days = differenceInDays(new Date(), parseISO(dateISO));
    if (days <= 0) return "hoje";
    if (days === 1) return "1 dia";
    return `${days} dias`;
  } catch {
    return "—";
  }
}

function assessmentTypeLabel(type: AssessmentType | null): string | null {
  if (!type) return null;
  return ASSESSMENT_TYPE_METADATA[type].label;
}

export function Precision12ActionQueue({
  items,
  activeLinkAssessmentIds = EMPTY_ACTIVE_LINK_IDS,
}: Precision12ActionQueueProps) {
  const [reissueTarget, setReissueTarget] = useState<ReissueTarget | null>(
    null,
  );
  const [revokeTarget, setRevokeTarget] = useState<RevokeTarget | null>(null);

  if (items.length === 0) {
    return (
      <div
        className="rounded-md border bg-muted/30 p-6 text-sm text-muted-foreground text-center"
        role="status"
        aria-live="polite"
      >
        Nenhuma ação pendente.
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[24%]">Aluno</TableHead>
              <TableHead>Alerta</TableHead>
              <TableHead className="hidden md:table-cell">Status</TableHead>
              <TableHead className="hidden lg:table-cell">Data</TableHead>
              <TableHead className="hidden lg:table-cell">Idade</TableHead>
              <TableHead className="w-[260px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => {
              const typeLabel = assessmentTypeLabel(item.assessmentType);
              const canReissue = canReissueQuestionnaireLink(item);
              const canRevoke = canRevokeQuestionnaireLink(
                item,
                activeLinkAssessmentIds,
              );
              return (
                <TableRow
                  key={`${item.studentId}-${item.assessmentId ?? "no-assessment"}-${index}`}
                >
                  <TableCell className="font-medium">{item.studentName}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <Badge
                        variant={ALERT_VARIANT[item.alertType]}
                        className="w-fit"
                      >
                        {ALERT_LABEL[item.alertType]}
                      </Badge>
                      {typeLabel && (
                        <span className="text-xs text-muted-foreground">
                          {typeLabel}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {item.status ? STATUS_LABEL[item.status] : "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground tabular-nums">
                    {item.assessmentDate ?? "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground tabular-nums">
                    {ageLabel(item.assessmentDate)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      {canRevoke && item.assessmentId !== null && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setRevokeTarget({
                              studentId: item.studentId,
                              studentName: item.studentName,
                              assessmentId: item.assessmentId!,
                            })
                          }
                          aria-label={`Revogar link do questionário de ${item.studentName}`}
                        >
                          <Ban
                            className="mr-1 h-3.5 w-3.5"
                            aria-hidden
                          />
                          Revogar link
                        </Button>
                      )}
                      {canReissue && item.assessmentId !== null && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setReissueTarget({
                              studentId: item.studentId,
                              studentName: item.studentName,
                              assessmentId: item.assessmentId!,
                            })
                          }
                          aria-label={`Reemitir link do questionário de ${item.studentName}`}
                        >
                          <RefreshCw
                            className="mr-1 h-3.5 w-3.5"
                            aria-hidden
                          />
                          Reemitir link
                        </Button>
                      )}
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        aria-label={`Abrir ${item.studentName}`}
                      >
                        <Link
                          to={buildPrecision12StudentDeepLink(
                            item.studentId,
                            item.assessmentId,
                          )}
                        >
                          Abrir
                          <ChevronRight
                            className="ml-1 h-3.5 w-3.5"
                            aria-hidden
                          />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {reissueTarget && (
        <Precision12ReissueLinkDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setReissueTarget(null);
          }}
          studentId={reissueTarget.studentId}
          studentName={reissueTarget.studentName}
          assessmentId={reissueTarget.assessmentId}
        />
      )}

      {revokeTarget && (
        <Precision12RevokeLinkDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setRevokeTarget(null);
          }}
          studentId={revokeTarget.studentId}
          studentName={revokeTarget.studentName}
          assessmentId={revokeTarget.assessmentId}
        />
      )}
    </>
  );
}
