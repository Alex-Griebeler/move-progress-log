import type { RefBand } from "@/components/metrics/RefRangeBar";
import type { MetricTone } from "@/components/metrics/ScoreRing";

/**
 * Converte faixas de referência do banco (PR-8a) no formato visual da
 * RefRangeBar (PR-8b) — lógica PURA, testada comportamentalmente.
 *
 * Duas coisas que a barra sozinha não resolve:
 *
 * 1. **Domínio de exibição.** As faixas seedadas vão de 0 até um teto
 *    artificial (120 ml/kg/min, 150 kg) pra cobrir qualquer entrada. Plotar
 *    esse intervalo inteiro espreme a região útil num canto. Aqui o domínio
 *    é recortado em volta das FRONTEIRAS reais da faixa etária.
 * 2. **Valor fora do domínio.** A barra clampa o marcador na borda, o que
 *    faria um valor extremo parecer o teto. O domínio é expandido pra conter
 *    o valor com folga, então o marcador nunca mente.
 */

/** Ordem canônica das classes, do pior ao melhor, por tipo de teste. */
const TONE_BY_CLASSIFICATION: Record<string, MetricTone> = {
  // VO₂ (6 classes)
  "Muito Fraco": "destructive",
  Fraco: "destructive",
  Regular: "warning",
  Bom: "success",
  Excelente: "success",
  Superior: "primary",
  // Handgrip (5 classes) — "Médio" é a média populacional (±1DP): é o normal
  "Muito Baixo": "destructive",
  Baixo: "warning",
  Médio: "success",
  Alto: "success",
  "Muito Alto": "primary",
  // Sit-to-stand (4 classes)
  Alerta: "destructive",
  Atenção: "warning",
};

export const toneForClassification = (classification: string): MetricTone =>
  TONE_BY_CLASSIFICATION[classification] ?? "neutral";

export interface RangeRowLike {
  classification: string;
  min: number;
  max: number;
}

export interface ReferenceBandsResult {
  bands: RefBand[];
  min: number;
  max: number;
}

/**
 * @param rows Faixas JÁ filtradas por sexo/idade (subset relevante).
 * @param value Valor do aluno (null quando ausente).
 * @returns null quando não há faixas — o chamador deve esconder a barra.
 */
export const buildReferenceBands = (
  rows: RangeRowLike[],
  value: number | null,
): ReferenceBandsResult | null => {
  const sorted = rows
    .filter((r) => Number.isFinite(r.min) && Number.isFinite(r.max) && r.max > r.min)
    .sort((a, b) => a.min - b.min);
  if (sorted.length === 0) return null;

  // Fronteiras reais = onde uma classe vira outra (ignora piso 0 e teto artificial).
  const cuts = sorted.slice(1).map((r) => r.min);
  const first = cuts.length ? cuts[0] : sorted[0].min;
  const last = cuts.length ? cuts[cuts.length - 1] : sorted[sorted.length - 1].max;
  const span = last - first;
  const margin = span > 0 ? span * 0.25 : Math.max(1, last * 0.1);

  let min = Math.max(0, first - margin);
  let max = last + margin;

  // O marcador nunca pode ficar preso na borda: expande pra conter o valor.
  if (value !== null && Number.isFinite(value)) {
    if (value < min) min = Math.max(0, value - margin * 0.5);
    if (value > max) max = value + margin * 0.5;
  }

  // Limites REAIS, não recortados: a RefRangeBar imprime "label from–to" no
  // rótulo, então recortar aqui faria a tela dizer que "Muito Fraco" começa
  // em 23,55 quando a faixa real começa em 0. O posicionamento já é clampado
  // pelo próprio componente, então o recorte visual sai de graça.
  const bands: RefBand[] = sorted.map((r) => ({
    label: r.classification,
    from: r.min,
    to: r.max,
    tone: toneForClassification(r.classification),
  }));

  return { bands, min, max };
};
