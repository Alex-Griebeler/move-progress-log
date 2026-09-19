/**
 * Helper visual de score sit-to-stand pra coach no momento da
 * digitação. Calcula em tempo real `5 - apoios - 0.5 × instabilidades`
 * e mostra ao lado do input final (sit_score ou rise_score).
 *
 * Decisão MVP (PR #116): coach digita o score FINAL — este preview é
 * apenas display, não modifica o form. UI nada faz se coach insistir
 * em digitar valor diferente do sugerido (ele pode ter razão clínica).
 *
 * Visual: badge simples com cor por faixa
 *   • 5 (sem apoios)        → verde claro
 *   • 4-4.5                 → verde
 *   • 3-3.5                 → âmbar
 *   • 0-2.5                 → vermelho
 */

import { Badge } from "@/components/ui/badge";
import { formatNumberBR } from "@/utils/displayFormat";
import { computeSitToStandHemiScore } from "@/utils/assessmentValidation";
import type { SitToStandSupportsInput } from "@/utils/assessmentValidation";

interface SitToStandScorePreviewProps {
  /** Contagem de apoios na fase (sentar ou levantar) */
  supports: SitToStandSupportsInput;
  /** Contagem de instabilidades na fase */
  instabilities: number;
  /** Label opcional (default: "Sugestão") */
  label?: string;
  /** Classe extra do container */
  className?: string;
}

const colorForScore = (score: number): string => {
  // Tom na borda/fundo; o número fica em foreground (texto sobre fundo
  // translúcido nunca usa a cor do tom — contraste).
  if (score >= 3.5) return "bg-success/10 text-foreground border-success/40";
  if (score >= 2.5) return "bg-warning/10 text-foreground border-warning/40";
  return "bg-destructive/10 text-foreground border-destructive/40";
};

/**
 * Preview do score sugerido (Araújo 2012 método Fabrik).
 *
 * @example
 * ```tsx
 * <SitToStandScorePreview
 *   supports={{ hand: 1, knee: 0, forearm: 0, leg_side: 0, hand_on_knee: 0 }}
 *   instabilities={2}
 * />
 * // → renderiza "Sugestão: 3.0" com cor âmbar
 * ```
 */
export const SitToStandScorePreview = ({
  supports,
  instabilities,
  label = "Sugestão",
  className,
}: SitToStandScorePreviewProps) => {
  const score = computeSitToStandHemiScore(supports, instabilities);
  const colorClasses = colorForScore(score);

  return (
    <div
      className={`inline-flex items-center gap-1.5 text-xs ${className ?? ""}`}
      data-testid="sit-to-stand-preview"
      role="status"
      aria-live="polite"
      aria-label={`${label}: ${formatNumberBR(score, 1)} de 5 pontos`}
    >
      <span className="text-muted-foreground">{label}:</span>
      <Badge variant="outline" className={`font-mono ${colorClasses}`}>
        {formatNumberBR(score, 1)}
      </Badge>
      <span className="text-muted-foreground text-xs">
        (5 − apoios − 0,5 × instab.)
      </span>
    </div>
  );
};
