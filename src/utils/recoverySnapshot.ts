import { daysAgo } from "@/utils/relativeDate";

/**
 * Contrato agnóstico de wearable pro HERO da aba Treinamento (plano Fase 2,
 * consenso Codex): score de recuperação mais recente entre Oura (readiness)
 * e Whoop (recovery), com fonte e data explícitas.
 *
 * Regras ratificadas:
 * - Whoop: só dias com score fechado (`score_state === 'SCORED'`; null é
 *   tratado como fechado — linhas antigas sem o campo) e recovery não-nulo.
 * - Oura: só dias com readiness não-nulo.
 * - Vence o dado mais RECENTE; empate de data → Oura (dispositivo canônico).
 * - `isStale` a partir de 2 dias de CALENDÁRIO (não 48h literais) — a UI
 *   marca com tom de alerta.
 *
 * A RECOMENDAÇÃO de treino continua Oura-only (useTrainingRecommendation é
 * 100% Oura); este contrato alimenta apenas o anel/zona/fonte do hero.
 */

export interface RecoverySnapshot {
  source: "oura" | "whoop";
  score: number;
  /** date-only "YYYY-MM-DD" do dia a que o score se refere. */
  date: string;
  zone: "alta" | "media" | "baixa";
  isStale: boolean;
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

/** Faixas de recuperação usadas no app pro Whoop (67/34) — genéricas 0-100. */
export const recoveryZone = (score: number): RecoverySnapshot["zone"] => {
  if (score >= 67) return "alta";
  if (score >= 34) return "media";
  return "baixa";
};

const latestOura = (rows: OuraLike[]): OuraLike | null =>
  rows
    .filter((r) => r.readiness_score !== null)
    .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;

const latestWhoop = (rows: WhoopLike[]): WhoopLike | null =>
  rows
    .filter(
      (r) =>
        r.recovery_score !== null &&
        (r.score_state === null || r.score_state === "SCORED"),
    )
    .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;

export const buildRecoverySnapshot = (
  ouraMetrics: OuraLike[] | null | undefined,
  whoopMetrics: WhoopLike[] | null | undefined,
  now: Date = new Date(),
): RecoverySnapshot | null => {
  const oura = latestOura(ouraMetrics ?? []);
  const whoop = latestWhoop(whoopMetrics ?? []);

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
    zone: recoveryZone(pick.score),
    isStale: daysAgo(pick.date, now) >= 2,
  };
};
