/**
 * Rótulos e variantes do status de uma avaliação.
 *
 * Estavam duplicados byte a byte entre a lista e o sheet de detalhe — duas
 * cópias que só divergiriam com o tempo. Fonte única aqui.
 */

export type AssessmentStatusVariant = "default" | "secondary" | "destructive" | "outline";

const STATUS_LABELS: Record<string, string> = {
  in_progress: "Em andamento",
  completed: "Completa",
  aborted: "Abortada",
  blocked: "Bloqueada (PAR-Q)",
};

const STATUS_VARIANTS: Record<string, AssessmentStatusVariant> = {
  completed: "default",
  in_progress: "secondary",
  aborted: "outline",
  blocked: "destructive",
};

/** Status desconhecido cai no próprio valor — nunca some da tela. */
export const assessmentStatusLabel = (status: string): string =>
  STATUS_LABELS[status] ?? status;

export const assessmentStatusVariant = (status: string): AssessmentStatusVariant =>
  STATUS_VARIANTS[status] ?? "outline";
