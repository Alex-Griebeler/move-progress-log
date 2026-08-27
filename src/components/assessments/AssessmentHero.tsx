/**
 * Métrica-herói do detalhe de uma avaliação (PR-8b).
 *
 * Abre o sheet com o número que importa, a classificação contra a faixa
 * seedada (PR-8a) e a posição do aluno dentro dessa faixa. Quando não dá pra
 * classificar, diz POR QUÊ — "sem classificação" mudo faria o coach achar
 * que o teste é que estava errado.
 */

import { Info } from "lucide-react";

import { Card } from "@/components/ui/card";
import { RefRangeBar } from "@/components/metrics";
import { cn } from "@/lib/utils";
import { buildReferenceBands, toneForClassification } from "@/utils/referenceBands";
import type { RangeRowLike } from "@/utils/referenceBands";
import type { KeyResult } from "@/utils/assessmentSummary";

const TONE_TEXT: Record<string, string> = {
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  primary: "text-primary",
  neutral: "text-muted-foreground",
};

interface AssessmentHeroProps {
  keyResult: KeyResult;
  classification: string | null;
  /** Faixas já filtradas por sexo/idade; vazio = sem régua aplicável. */
  ranges: RangeRowLike[];
  /** Por que não classificou (só quando classification é null). */
  unclassifiedReason?: string | null;
  /** Ressalva de protocolo (VO₂ que não é esteira máxima). */
  protocolNote?: string | null;
}

export const AssessmentHero = ({
  keyResult,
  classification,
  ranges,
  unclassifiedReason,
  protocolNote,
}: AssessmentHeroProps) => {
  const { value, unit, metricLabel, decimals, hasReference } = keyResult;
  const hasValue = value !== null && Number.isFinite(value);
  if (!hasValue) return null;

  const bands = hasReference ? buildReferenceBands(ranges, value) : null;
  const tone = classification ? toneForClassification(classification) : "neutral";

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {metricLabel}
          </p>
          <p className="mt-1 text-3xl font-semibold leading-none tabular-nums">
            {value!.toFixed(decimals)}
            <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>
          </p>
        </div>
        {classification && (
          <span className={cn("text-sm font-semibold", TONE_TEXT[tone])}>{classification}</span>
        )}
      </div>

      {bands && <RefRangeBar bands={bands.bands} value={value} min={bands.min} max={bands.max} />}

      {!classification && unclassifiedReason && (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          {unclassifiedReason}
        </p>
      )}

      {protocolNote && (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          {protocolNote}
        </p>
      )}
    </Card>
  );
};
