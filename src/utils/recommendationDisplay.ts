import type { PerceptionResult } from "@/utils/effectiveConduct";

/**
 * Formatação de APRESENTAÇÃO da recomendação de treino (refinamento R1).
 *
 * As strings do motor não mudam (contrato + testes existentes); a tela é que
 * passa a exibir versões enxutas. Princípio ratificado: score → interpretação
 * → recomendação, com a referência completa (zonas/FCmáx) no accordion.
 */

/**
 * Rótulo curto da zona de recuperação do hero, por fonte.
 * O texto longo antigo ("Recuperação alta — pronta pra treinar pesado")
 * competia com a própria recomendação escrita ao lado.
 */
export const SNAPSHOT_ZONE_SHORT: Record<
  "oura" | "whoop",
  Record<"alta" | "media" | "baixa", string>
> = {
  oura: {
    alta: "Alta prontidão",
    media: "Prontidão média",
    baixa: "Prontidão baixa",
  },
  whoop: {
    alta: "Recovery alto",
    media: "Recovery médio",
    baixa: "Recovery baixo",
  },
};

/**
 * "MODERADA-ALTA (70-85% FCMáx)" → "moderada-alta".
 *
 * O % sai do hero por decisão ratificada: a tabela de zonas com bpm
 * calculados vive no accordion da mesma tela. Âncora no FIM da string —
 * um strip genérico de parênteses quebraria textos futuros.
 */
export const formatIntensityShort = (intensity: string): string => {
  const stripped = intensity.replace(/\s+\([^()]*\)\s*$/, "").trim();
  return stripped.toLowerCase();
};

/** "45-55 minutos" → "45–55 min"; "Repouso total" passa intacto. */
export const formatDurationShort = (duration: string): string =>
  duration
    .replace(/(\d+)\s*-\s*(\d+)\s*minutos?/i, "$1–$2 min")
    .replace(/^(\d+)\s*minutos?$/i, "$1 min");

/**
 * Linha única de prescrição do hero: "Intensidade moderada-alta · 45–55 min".
 * Zona 0 não tem intensidade útil ("muito baixa") — vira só "Repouso total".
 */
export const formatPrescriptionLine = (intensity: string, duration: string): string => {
  const shortDuration = formatDurationShort(duration);
  if (/repouso/i.test(shortDuration)) return shortDuration;
  return `Intensidade ${formatIntensityShort(intensity)} · ${shortDuration}`;
};

/**
 * Check-in v3 (PR-B2, mocks aprovados): o veredito na tela é uma DECISÃO,
 * não um rótulo de categoria — mapa de DISPLAY por zona; os nomes internos
 * do motor (PRESCRIPTION_BY_ZONE/trainingType) ficam intocados (contratos e
 * registros usam os internos; a tela usa estes).
 */
export const VERDICT_BY_ZONE: Record<0 | 1 | 2 | 3 | 4, string> = {
  4: "Progredir no treino planejado",
  3: "Manter o treino planejado",
  2: "Reduzir o treino em 20%",
  1: "Apenas recuperação ativa",
  0: "Descanso completo",
};

/** Dose curta da frase de conduta: "moderada-alta · 45–55 min" (sem o
 *  prefixo "Intensidade" — a frase-decisão já carrega o contexto). */
export const formatDoseShort = (intensity: string, duration: string): string => {
  const shortDuration = formatDurationShort(duration);
  if (/repouso/i.test(shortDuration)) return shortDuration.toLowerCase();
  return `${formatIntensityShort(intensity)} · ${shortDuration}`;
};

/** Tom visual da frase de conduta por zona efetiva (dot/cor no desvio). */
export const CONDUCT_TONE_BY_ZONE: Record<0 | 1 | 2 | 3 | 4, "ok" | "warn" | "bad"> = {
  4: "ok",
  3: "ok",
  2: "warn",
  1: "bad",
  0: "bad",
};

const lowerFirst = (text: string): string => text.charAt(0).toLowerCase() + text.slice(1);

/** Veredito do aparelho em minúscula pra frase causal; zona 4 fala de carga
 *  (copy canônica v9.2 Q6). */
const deviceVerdictLower = (zone: 0 | 1 | 2 | 3 | 4): string =>
  zone === 4 ? "aumentar a carga em 5%" : lowerFirst(VERDICT_BY_ZONE[zone]);

/**
 * Frase causal da PSR (spec v9.2 §4.4) — fonte ÚNICA: `conduct.perception`.
 * `strainDisplay` já formatado (formatStrainDisplay) ou null.
 * Retorna null quando a PSR não alterou nem foi vetada.
 */
export const perceptionCausalLine = (
  p: PerceptionResult,
  strainDisplay: string | null,
): string | null => {
  switch (p.outcome) {
    case "unchanged":
      return null;
    case "raised":
    case "lowered":
    case "lowered_to_maintain":
      return `Aparelho: ${deviceVerdictLower(p.baseZone)}. PSR ${p.psr}: ${lowerFirst(VERDICT_BY_ZONE[p.zoneAfterPsr])}.`;
    case "vetoed":
      return p.vetoReason === "strain"
        ? `PSR ${p.psr} não altera a conduta: strain do dia alto${strainDisplay ? ` (${strainDisplay}/21)` : ""}.`
        : `PSR ${p.psr} não altera a conduta: sinais objetivos no piso de segurança.`;
  }
};

/** Eyebrow da conduta quando a PSR agiu (ou tentou agir). */
export const perceptionEyebrow = (p: PerceptionResult): string | null =>
  p.outcome === "vetoed"
    ? "Ajuste por PSR não aplicado"
    : p.outcome !== "unchanged"
      ? "Ajuste por PSR"
      : null;
