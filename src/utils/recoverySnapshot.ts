/**
 * Contrato agnóstico de wearable pro HERO da aba Treinamento (plano Fase 2,
 * consenso Codex): score de recuperação fechado de hoje entre Oura
 * (readiness) e Whoop (recovery), com fonte e data explícitas.
 *
 * Regras ratificadas:
 * - Whoop: só dias com score fechado (`score_state === 'SCORED'`; null é
 *   tratado como fechado — linhas antigas sem o campo) e recovery não-nulo.
 * - Oura: só dias com readiness não-nulo.
 * - Nunca usa um score de dia anterior; empate de hoje → Oura.
 * - `today` é recebido pelo chamador para respeitar o calendário do produto.
 * - `isStale` é mantido por compatibilidade e é sempre `false`, pois um
 *   snapshot agora só pode representar o próprio dia `today`.
 *
 * Desde a R5, este par {source, date} também decide QUAL recomendação o
 * dashboard monta (Oura via fachada, Whoop via buildWhoopRecommendation) —
 * não é mais só o anel do hero.
 */

export interface RecoverySnapshot {
  source: "oura" | "whoop";
  score: number;
  /** date-only "YYYY-MM-DD" do dia a que o score se refere. */
  date: string;
  zone: "alta" | "media" | "baixa";
  isStale: boolean;
  availability: RecoveryAvailability;
}

export type WhoopAvailability = "scored" | "pending" | "unscorable" | "missing";
export type OuraAvailability = "scored" | "pending" | "missing";

export interface RecoveryAvailability {
  oura: OuraAvailability;
  whoop: WhoopAvailability;
}

interface OuraLike {
  date: string;
  readiness_score: number | null;
}

interface WhoopLike {
  date: string;
  recovery_score: number | null;
  score_state: string | null;
}

/**
 * Faixas do ANEL por aparelho (limiares por aparelho, ratificado 29/08):
 * Whoop usa as bandas nativas 67/34; Oura usa as faixas do próprio app
 * (85+ ótimo / 70-84 bom / <70 atenção — as mesmas dos cards da aba Oura).
 * Aplicar 67/34 ao readiness fazia 81 aparecer como "alta" quando o Oura
 * chama de "bom" e o motor nem cogita progressão abaixo de 85.
 */
export const recoveryZone = (
  score: number,
  source: RecoverySnapshot["source"],
): RecoverySnapshot["zone"] => {
  if (source === "oura") {
    if (score >= 85) return "alta";
    if (score >= 70) return "media";
    return "baixa";
  }
  if (score >= 67) return "alta";
  if (score >= 34) return "media";
  return "baixa";
};

const currentOura = (rows: OuraLike[], today: string): OuraLike | null =>
  rows.find((row) => row.date.localeCompare(today) === 0 && row.readiness_score !== null) ?? null;

const isClosedWhoop = (row: WhoopLike): boolean =>
  row.recovery_score !== null &&
  (row.score_state === null || row.score_state === "SCORED");

const currentWhoop = (rows: WhoopLike[], today: string): WhoopLike | null =>
  rows.find((row) => row.date.localeCompare(today) === 0 && isClosedWhoop(row)) ?? null;

const studioToday = (now: Date = new Date()): string => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Não foi possível determinar a data do estúdio");
  }

  return `${year}-${month}-${day}`;
};

export const classifyTodayRecoveryAvailability = (
  ouraMetrics: OuraLike[] | null | undefined,
  whoopMetrics: WhoopLike[] | null | undefined,
  today: string,
): RecoveryAvailability => {
  const ouraToday = (ouraMetrics ?? []).filter((row) => row.date === today);
  const whoopToday = (whoopMetrics ?? []).filter((row) => row.date === today);

  const oura: OuraAvailability = ouraToday.length === 0
    ? "missing"
    : ouraToday.some((row) => row.readiness_score !== null)
      ? "scored"
      : "pending";

  let whoop: WhoopAvailability = "missing";
  if (whoopToday.some(isClosedWhoop)) {
    whoop = "scored";
  } else if (whoopToday.some((row) => row.score_state === "UNSCORABLE")) {
    whoop = "unscorable";
  } else if (whoopToday.length > 0) {
    whoop = "pending";
  }

  return { oura, whoop };
};

export const buildRecoverySnapshot = (
  ouraMetrics: OuraLike[] | null | undefined,
  whoopMetrics: WhoopLike[] | null | undefined,
  // O dashboard omite `today`; UTC avançaria o dia às 21h em São Paulo.
  today: string = studioToday(),
): RecoverySnapshot | null => {
  const oura = currentOura(ouraMetrics ?? [], today);
  const whoop = currentWhoop(whoopMetrics ?? [], today);
  const availability = classifyTodayRecoveryAvailability(
    ouraMetrics,
    whoopMetrics,
    today,
  );

  let pick: { source: "oura" | "whoop"; score: number; date: string } | null = null;
  if (oura && whoop) {
    // Empate de data → Oura.
    pick =
      whoop.date > oura.date
        ? { source: "whoop", score: whoop.recovery_score!, date: whoop.date }
        : { source: "oura", score: oura.readiness_score!, date: oura.date };
  } else if (oura) {
    pick = { source: "oura", score: oura.readiness_score!, date: oura.date };
  } else if (whoop) {
    pick = { source: "whoop", score: whoop.recovery_score!, date: whoop.date };
  }

  if (!pick) return null;
  return {
    ...pick,
    zone: recoveryZone(pick.score, pick.source),
    isStale: false,
    availability,
  };
};
