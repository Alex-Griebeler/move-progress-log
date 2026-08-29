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
    zone: recoveryZone(pick.score, pick.source),
    isStale: daysAgo(pick.date, now) >= 2,
  };
};
