/**
 * Card de uma avaliação na lista (PR-8b).
 *
 * O card antigo dizia só o TIPO do teste e o status — quem quisesse saber o
 * resultado tinha que abrir cada um. Aqui o número que responde "como foi?"
 * fica no card, com a classificação e a variação contra a avaliação anterior
 * do mesmo tipo.
 */

import { ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatRelativeDay } from "@/utils/relativeDate";
import {
  formatAssessmentValue,
  type AssessmentKind,
  type KeyResult,
} from "@/utils/assessmentSummary";
import { toneForClassification } from "@/utils/referenceBands";
import {
  assessmentStatusLabel,
  assessmentStatusVariant,
} from "@/utils/assessmentStatus";

const TONE_TEXT: Record<string, string> = {
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  primary: "text-primary",
  neutral: "text-muted-foreground",
};

interface AssessmentResultCardProps {
  typeLabel: string;
  category: string;
  kind: AssessmentKind;
  status: string;
  notes?: string | null;
  keyResult: KeyResult;
  /** Classificação computada; null quando não há régua ou dado. */
  classification: string | null;
  /** Variação absoluta vs a anterior válida do mesmo tipo. */
  delta: number | null;
  comparedTo: string | null;
  /** Texto de estado pro questionário, que não tem número. */
  statusSummary?: { label: string; tone: string } | null;
  /** Ressalva de protocolo (VO₂ fora do padrão da norma). */
  hasProtocolCaveat?: boolean;
  onClick: () => void;
}

export const AssessmentResultCard = ({
  typeLabel,
  category,
  kind,
  status,
  notes,
  keyResult,
  classification,
  delta,
  comparedTo,
  statusSummary,
  hasProtocolCaveat,
  onClick,
}: AssessmentResultCardProps) => {
  const { value, unit, decimals, higherIsBetter } = keyResult;
  const hasValue = value !== null && Number.isFinite(value);

  // Direção do "melhor" muda por métrica: cair 2 pontos de gordura é ganho,
  // cair 2 ml/kg/min de VO₂ é perda. Sem isso o verde mentiria no DEXA.
  const deltaIsGood =
    delta === null || delta === 0 ? null : higherIsBetter ? delta > 0 : delta < 0;

  return (
    <button
      type="button"
      className="block w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={onClick}
      aria-label={`Abrir detalhes de ${typeLabel}`}
    >
      <Card className="flex cursor-pointer items-center justify-between gap-3 p-3 transition-colors hover:bg-muted/30">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold">{typeLabel}</span>
            <Badge variant="outline" className="text-[10px]">
              {category}
            </Badge>
            {hasProtocolCaveat && (
              <span
                className="text-[10px] text-muted-foreground"
                title="Protocolo diferente do usado na tabela de referência"
              >
                *
              </span>
            )}
          </div>
          {statusSummary ? (
            <p className={cn("mt-0.5 text-xs", TONE_TEXT[statusSummary.tone] ?? "text-muted-foreground")}>
              {statusSummary.label}
            </p>
          ) : (
            notes && <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{notes}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {hasValue ? (
            <div className="text-right">
              <div className="text-lg font-semibold leading-none tabular-nums">
                {formatAssessmentValue(value!, decimals)}
                <span className="ml-0.5 text-[11px] font-normal text-muted-foreground">
                  {unit}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-end gap-1.5">
                {classification && (
                  <span
                    className={cn(
                      "text-[11px] font-medium",
                      TONE_TEXT[toneForClassification(classification)],
                    )}
                  >
                    {classification}
                  </span>
                )}
                {delta !== null && (
                  <span
                    className={cn(
                      "text-[11px] tabular-nums",
                      deltaIsGood === null
                        ? "text-muted-foreground"
                        : deltaIsGood
                          ? "text-success"
                          : "text-destructive",
                    )}
                    title={comparedTo ? `vs ${formatRelativeDay(comparedTo)}` : undefined}
                  >
                    {delta > 0 ? "+" : ""}
                    {formatAssessmentValue(delta, decimals)}
                  </span>
                )}
              </div>
            </div>
          ) : (
            // Sem número: o status é a informação. Vale também pro
            // questionário, que não produz valor comparável.
            kind !== "questionnaire" && (
              <Badge variant={assessmentStatusVariant(status)}>
                {assessmentStatusLabel(status)}
              </Badge>
            )
          )}
          {hasValue && (
            <Badge variant={assessmentStatusVariant(status)} className="hidden sm:inline-flex">
              {assessmentStatusLabel(status)}
            </Badge>
          )}
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </div>
      </Card>
    </button>
  );
};
